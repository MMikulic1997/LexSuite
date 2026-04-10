import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import fs from "fs";
import db from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "../../uploads");

// ── Multer ─────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = join(UPLOADS_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "image/gif", "image/webp",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const app = express();
app.use(cors());
app.use(express.json());

// ── Helpers ────────────────────────────────────────────────────────────────────
function generateOznaka(prefix, godina) {
  // prefix može biti "" (nema prefiksa) ili npr. "KP", "OVR" itd.
  const key = `${prefix || "_"}/${godina}`;
  const row = db.prepare("SELECT value FROM counters WHERE key = ?").get(key);
  const newVal = (row ? row.value : 0) + 1;
  if (row) db.prepare("UPDATE counters SET value = ? WHERE key = ?").run(newVal, key);
  else     db.prepare("INSERT INTO counters (key, value) VALUES (?, ?)").run(key, newVal);
  return `${prefix || ""}${String(newVal).padStart(4, "0")}/${godina}`;
}

function rowToRok(r) {
  return {
    id:        r.id,
    naziv:     r.naziv,
    datum:     r.datum,
    vrijeme:   r.vrijeme  || "",
    lokacija:  r.lokacija || "",
    napomena:  r.napomena || "",
    dovrseno:  r.dovrseno === 1,
    vrstaRoka: r.vrsta_roka || "ostalo",
  };
}

function rowToStavka(s) {
  return {
    id:        s.id,
    opis:      s.opis,
    datum:     s.datum,
    iznos:     s.iznos,
    pdv:       s.pdv === 1,
    napomena:  s.napomena || "",
    createdAt: s.created_at,
  };
}

function rowToZadatak(z) {
  return {
    id:            z.id,
    naziv:         z.naziv,
    opis:          z.opis            || "",
    rok:           z.rok             || "",
    zaduzenaOsoba: z.zaduzena_osoba  || "",
    prioritet:     z.prioritet       || "srednji",
    status:        z.status          || "nije_poceto",
    createdAt:     z.created_at,
  };
}

function rowToPredmet(p) {
  return {
    id:             p.id,
    oznaka:         p.oznaka,
    vrsta:          p.vrsta,
    nazivPredmeta:  p.naziv_predmeta || "",
    stranka:        { ime: p.stranka_ime || "", oib: p.stranka_oib || "", uloga: p.stranka_uloga || "Tužitelj" },
    protustranka:   { ime: p.protustranka_ime || "", oib: p.protustranka_oib || "" },
    stranaUmjesaca: p.strana_umjesaca || "tuzitelj",
    poslovniBroj:   p.poslovni_broj || "",
    vps:            p.vps           || "",
    klijentId:      p.klijent_id    || null,
    ulogaKlijenta:  p.uloga_klijenta || "Tužitelj",
    sud:            p.sud,
    sudac:          p.sudac,
    opis:           p.opis,
    status:         p.status,
    datumOtvaranja: p.datum_otvaranja,
  };
}

function getPredmetFull(id) {
  const p = db.prepare("SELECT * FROM predmeti WHERE id = ?").get(id);
  if (!p) return null;
  const base = rowToPredmet(p);
  if (base.klijentId) {
    const k = db.prepare("SELECT id, naziv FROM klijenti WHERE id = ?").get(base.klijentId);
    if (k) base.klijent = { id: k.id, naziv: k.naziv };
  }
  base.rokovi = db
    .prepare("SELECT * FROM rokovi WHERE predmet_id = ? ORDER BY datum")
    .all(id)
    .map(rowToRok);
  base.dokumenti = db
    .prepare("SELECT * FROM dokumenti WHERE predmet_id = ? ORDER BY datum_dodavanja")
    .all(id)
    .map((d) => ({
      id: d.id, naziv: d.naziv, vrsta: d.vrsta, opis: d.opis,
      datumDodavanja: d.datum_dodavanja,
      putanja: d.putanja, velicina: d.velicina, mimeTop: d.mime_tip,
    }));
  base.tijek = db
    .prepare("SELECT * FROM tijek WHERE predmet_id = ? ORDER BY datum, created_at")
    .all(id)
    .map((t) => ({ id: t.id, datum: t.datum, tekst: t.tekst, createdAt: t.created_at }));
  base.zadaci = db
    .prepare("SELECT * FROM zadaci WHERE predmet_id = ? ORDER BY created_at")
    .all(id)
    .map(rowToZadatak);
  base.troskovnikStavke = db
    .prepare("SELECT * FROM troskovnik_stavke WHERE predmet_id = ? ORDER BY datum, created_at")
    .all(id)
    .map(rowToStavka);
  return base;
}

// ── Predmeti ───────────────────────────────────────────────────────────────────
app.get("/api/predmeti", (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, k.naziv AS klijent_naziv
    FROM predmeti p
    LEFT JOIN klijenti k ON k.id = p.klijent_id
    ORDER BY p.datum_otvaranja DESC
  `).all();
  res.json(rows.map((r) => {
    const p = rowToPredmet(r);
    if (r.klijent_naziv) p.klijent = { id: r.klijent_id, naziv: r.klijent_naziv };
    return p;
  }));
});

app.get("/api/predmeti/:id", (req, res) => {
  const p = getPredmetFull(req.params.id);
  if (!p) return res.status(404).json({ error: "Predmet nije pronađen" });
  res.json(p);
});

app.post("/api/predmeti", (req, res) => {
  const { vrsta, oznaka: oznakaSent, oznakaPrefix, nazivPredmeta, stranka, protustranka, poslovniBroj, vps, klijentId, sud, sudac, opis, ulogaKlijenta, stranaUmjesaca } = req.body;
  const sIme   = stranka?.ime   || "";
  const sOib   = stranka?.oib   || "";
  const sUloga = stranka?.uloga || (vrsta === "SPORNI" ? "Tužitelj" : "");
  const pIme   = protustranka?.ime || "";
  const pOib   = protustranka?.oib || "";

  if (!vrsta || !["SPORNI","NESPORNI"].includes(vrsta))
    return res.status(400).json({ error: "Vrsta mora biti SPORNI ili NESPORNI" });
  if (!nazivPredmeta?.trim())
    return res.status(400).json({ error: "Naziv predmeta je obavezan" });
  if (!sIme?.trim())
    return res.status(400).json({ error: "Ime stranke/klijenta je obavezno" });

  const godina = String(new Date().getFullYear()).slice(-2);
  const oznaka = oznakaSent ? oznakaSent.trim() : generateOznaka((oznakaPrefix || "").trim(), godina);
  const id = uuidv4();
  const defaultUloga = vrsta === "SPORNI" ? "Tužitelj" : "Naručitelj";
  db.prepare(`
    INSERT INTO predmeti
      (id, oznaka, vrsta, naziv_predmeta, stranka_ime, stranka_oib, stranka_uloga, protustranka_ime, protustranka_oib, poslovni_broj, vps, klijent_id, sud, sudac, opis, uloga_klijenta, strana_umjesaca, status, datum_otvaranja)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktivan', ?)
  `).run(id, oznaka, vrsta, nazivPredmeta.trim(), sIme.trim(), sOib, sUloga || defaultUloga, pIme.trim(), pOib, poslovniBroj || "", vps || "", klijentId || null, sud || "", sudac || "", opis || "", ulogaKlijenta || sUloga || defaultUloga, stranaUmjesaca || "tuzitelj", new Date().toISOString());

  res.status(201).json(getPredmetFull(id));
});

app.patch("/api/predmeti/:id", (req, res) => {
  const p = db.prepare("SELECT * FROM predmeti WHERE id = ?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "Predmet nije pronađen" });
  const { nazivPredmeta, poslovniBroj, vps, klijentId, sud, sudac, opis, status, ulogaKlijenta, stranaUmjesaca } = req.body;
  db.prepare("UPDATE predmeti SET naziv_predmeta = ?, poslovni_broj = ?, vps = ?, klijent_id = ?, sud = ?, sudac = ?, opis = ?, status = ?, uloga_klijenta = ?, strana_umjesaca = ? WHERE id = ?").run(
    nazivPredmeta  !== undefined ? nazivPredmeta  : p.naziv_predmeta,
    poslovniBroj   !== undefined ? poslovniBroj   : p.poslovni_broj,
    vps            !== undefined ? vps            : p.vps,
    klijentId      !== undefined ? klijentId      : p.klijent_id,
    sud            !== undefined ? sud            : p.sud,
    sudac          !== undefined ? sudac          : p.sudac,
    opis           !== undefined ? opis           : p.opis,
    status         !== undefined ? status         : p.status,
    ulogaKlijenta  !== undefined ? ulogaKlijenta  : p.uloga_klijenta,
    stranaUmjesaca !== undefined ? stranaUmjesaca : p.strana_umjesaca,
    req.params.id
  );
  res.json(getPredmetFull(req.params.id));
});

app.delete("/api/predmeti/:id", (req, res) => {
  db.prepare("DELETE FROM predmeti WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Globalni rokovnik ──────────────────────────────────────────────────────────
app.get("/api/rokovi", (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, p.oznaka, p.stranka_ime, p.stranka_uloga, p.protustranka_ime, p.strana_umjesaca
    FROM rokovi r
    JOIN predmeti p ON p.id = r.predmet_id
    ORDER BY r.datum ASC
  `).all();
  res.json(rows.map((r) => ({
    ...rowToRok(r),
    predmet: { id: r.predmet_id, oznaka: r.oznaka, strankaIme: r.stranka_ime, strankaUloga: r.stranka_uloga, protustrankaIme: r.protustranka_ime, stranaUmjesaca: r.strana_umjesaca || "tuzitelj" },
  })));
});

// ── Rokovi ─────────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/rokovi", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const { naziv, datum, napomena, vrstaRoka, vrijeme, lokacija } = req.body;
  const id = uuidv4();
  db.prepare("INSERT INTO rokovi (id, predmet_id, naziv, datum, napomena, vrsta_roka, vrijeme, lokacija) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, naziv, datum, napomena || "", vrstaRoka || "ostalo", vrijeme || "", lokacija || "");
  res.status(201).json(rowToRok(db.prepare("SELECT * FROM rokovi WHERE id = ?").get(id)));
});

app.patch("/api/predmeti/:id/rokovi/:rokId", (req, res) => {
  const rok = db.prepare("SELECT * FROM rokovi WHERE id = ? AND predmet_id = ?").get(req.params.rokId, req.params.id);
  if (!rok) return res.status(404).json({ error: "Rok nije pronađen" });
  const naziv     = req.body.naziv     !== undefined ? req.body.naziv                : rok.naziv;
  const datum     = req.body.datum     !== undefined ? req.body.datum                : rok.datum;
  const napomena  = req.body.napomena  !== undefined ? req.body.napomena             : rok.napomena;
  const dovrseno  = req.body.dovrseno  !== undefined ? (req.body.dovrseno ? 1 : 0)  : rok.dovrseno;
  const vrstaRoka = req.body.vrstaRoka !== undefined ? req.body.vrstaRoka            : rok.vrsta_roka;
  const vrijeme   = req.body.vrijeme   !== undefined ? req.body.vrijeme              : rok.vrijeme;
  const lokacija  = req.body.lokacija  !== undefined ? req.body.lokacija             : rok.lokacija;
  db.prepare("UPDATE rokovi SET naziv = ?, datum = ?, napomena = ?, dovrseno = ?, vrsta_roka = ?, vrijeme = ?, lokacija = ? WHERE id = ?")
    .run(naziv, datum, napomena, dovrseno, vrstaRoka, vrijeme, lokacija, rok.id);
  res.json(rowToRok(db.prepare("SELECT * FROM rokovi WHERE id = ?").get(rok.id)));
});

app.delete("/api/predmeti/:id/rokovi/:rokId", (req, res) => {
  db.prepare("DELETE FROM rokovi WHERE id = ? AND predmet_id = ?").run(req.params.rokId, req.params.id);
  res.json({ ok: true });
});

// ── Dokumenti ──────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/dokumenti/upload", upload.single("fajl"), (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  if (!req.file)
    return res.status(400).json({ error: "Fajl nije priložen ili vrsta nije dozvoljena (PDF, Word, slike)" });

  const id = uuidv4();
  const naziv = req.body.naziv?.trim() || req.file.originalname;
  const vrsta = req.body.vrsta || "ostalo";
  const opis  = req.body.opis  || "";
  const datumDodavanja = new Date().toISOString();
  db.prepare(`
    INSERT INTO dokumenti (id, predmet_id, naziv, vrsta, opis, datum_dodavanja, putanja, velicina, mime_tip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, naziv, vrsta, opis, datumDodavanja,
         req.file.path, req.file.size, req.file.mimetype);

  res.status(201).json({
    id, naziv, vrsta, opis, datumDodavanja,
    putanja: req.file.path, velicina: req.file.size, mimeTop: req.file.mimetype,
  });
});

app.get("/api/predmeti/:id/dokumenti/:dokId/fajl", (req, res) => {
  const dok = db.prepare("SELECT * FROM dokumenti WHERE id = ? AND predmet_id = ?")
    .get(req.params.dokId, req.params.id);
  if (!dok || !dok.putanja) return res.status(404).json({ error: "Fajl nije pronađen" });
  if (!fs.existsSync(dok.putanja)) return res.status(404).json({ error: "Fajl ne postoji na disku" });
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(dok.naziv)}"`);
  res.sendFile(dok.putanja);
});

app.post("/api/predmeti/:id/dokumenti", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const { naziv, vrsta, opis } = req.body;
  const id = uuidv4();
  const datumDodavanja = new Date().toISOString();
  db.prepare("INSERT INTO dokumenti (id, predmet_id, naziv, vrsta, opis, datum_dodavanja) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, naziv, vrsta || "ostalo", opis || "", datumDodavanja);
  res.status(201).json({ id, naziv, vrsta: vrsta || "ostalo", opis: opis || "", datumDodavanja });
});

app.delete("/api/predmeti/:id/dokumenti/:dokId", (req, res) => {
  const dok = db.prepare("SELECT putanja FROM dokumenti WHERE id = ? AND predmet_id = ?")
    .get(req.params.dokId, req.params.id);
  if (dok?.putanja) fs.unlink(dok.putanja, () => {});
  db.prepare("DELETE FROM dokumenti WHERE id = ? AND predmet_id = ?").run(req.params.dokId, req.params.id);
  res.json({ ok: true });
});

// ── Tijek ───────────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/tijek", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const { datum, tekst } = req.body;
  if (!datum || !tekst) return res.status(400).json({ error: "Datum i tekst su obavezni" });
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO tijek (id, predmet_id, datum, tekst, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.id, datum, tekst, createdAt);
  res.status(201).json({ id, datum, tekst, createdAt });
});

app.delete("/api/predmeti/:id/tijek/:unosId", (req, res) => {
  db.prepare("DELETE FROM tijek WHERE id = ? AND predmet_id = ?").run(req.params.unosId, req.params.id);
  res.json({ ok: true });
});

// ── Zadaci ─────────────────────────────────────────────────────────────────────
app.get("/api/predmeti/:id/zadaci", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const rows = db.prepare("SELECT * FROM zadaci WHERE predmet_id = ? ORDER BY created_at").all(req.params.id);
  res.json(rows.map(rowToZadatak));
});

app.post("/api/predmeti/:id/zadaci", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const { naziv, opis, rok, zaduzenaOsoba, prioritet } = req.body;
  if (!naziv?.trim()) return res.status(400).json({ error: "Naziv je obavezan" });
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO zadaci (id, predmet_id, naziv, opis, rok, zaduzena_osoba, prioritet, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'nije_poceto', ?)
  `).run(id, req.params.id, naziv.trim(), opis || "", rok || "", zaduzenaOsoba || "", prioritet || "srednji", createdAt);
  res.status(201).json(rowToZadatak(db.prepare("SELECT * FROM zadaci WHERE id = ?").get(id)));
});

app.patch("/api/predmeti/:id/zadaci/:zadatakId", (req, res) => {
  const z = db.prepare("SELECT * FROM zadaci WHERE id = ? AND predmet_id = ?").get(req.params.zadatakId, req.params.id);
  if (!z) return res.status(404).json({ error: "Zadatak nije pronađen" });
  const naziv         = req.body.naziv         !== undefined ? req.body.naziv.trim()  : z.naziv;
  const opis          = req.body.opis          !== undefined ? req.body.opis          : z.opis;
  const rok           = req.body.rok           !== undefined ? req.body.rok           : z.rok;
  const zaduzenaOsoba = req.body.zaduzenaOsoba !== undefined ? req.body.zaduzenaOsoba : z.zaduzena_osoba;
  const prioritet     = req.body.prioritet     !== undefined ? req.body.prioritet     : z.prioritet;
  const status        = req.body.status        !== undefined ? req.body.status        : z.status;
  db.prepare("UPDATE zadaci SET naziv = ?, opis = ?, rok = ?, zaduzena_osoba = ?, prioritet = ?, status = ? WHERE id = ?")
    .run(naziv, opis, rok, zaduzenaOsoba, prioritet, status, z.id);
  res.json(rowToZadatak(db.prepare("SELECT * FROM zadaci WHERE id = ?").get(z.id)));
});

app.delete("/api/predmeti/:id/zadaci/:zadatakId", (req, res) => {
  db.prepare("DELETE FROM zadaci WHERE id = ? AND predmet_id = ?").run(req.params.zadatakId, req.params.id);
  res.json({ ok: true });
});

// ── Troškovnik ─────────────────────────────────────────────────────────────────
app.get("/api/predmeti/:id/troskovnik", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  res.json(db.prepare("SELECT * FROM troskovnik_stavke WHERE predmet_id = ? ORDER BY datum, created_at").all(req.params.id).map(rowToStavka));
});

app.post("/api/predmeti/:id/troskovnik", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const { opis, datum, iznos, pdv, napomena } = req.body;
  if (!opis?.trim()) return res.status(400).json({ error: "Opis radnje je obavezan" });
  if (!datum)        return res.status(400).json({ error: "Datum je obavezan" });
  if (iznos === undefined || iznos === null || isNaN(Number(iznos)))
    return res.status(400).json({ error: "Iznos mora biti broj" });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO troskovnik_stavke (id, predmet_id, opis, datum, iznos, pdv, napomena, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, opis.trim(), datum, Number(iznos), pdv ? 1 : 0, napomena?.trim() || "", new Date().toISOString());
  res.status(201).json(rowToStavka(db.prepare("SELECT * FROM troskovnik_stavke WHERE id = ?").get(id)));
});

app.delete("/api/predmeti/:id/troskovnik/:stavkaId", (req, res) => {
  db.prepare("DELETE FROM troskovnik_stavke WHERE id = ? AND predmet_id = ?").run(req.params.stavkaId, req.params.id);
  res.json({ ok: true });
});

// ── Klijenti ───────────────────────────────────────────────────────────────────
function rowToKlijent(k) {
  return {
    id:       k.id,
    naziv:    k.naziv,
    oib:      k.oib      || "",
    tip:      k.tip      || "fizicka",
    email:    k.email    || "",
    telefon:  k.telefon  || "",
    adresa:   k.adresa   || "",
    biljeske: k.biljeske || "",
    createdAt: k.created_at,
  };
}

app.get("/api/klijenti/pregled", (req, res) => {
  const klijenti = db.prepare("SELECT * FROM klijenti ORDER BY naziv COLLATE NOCASE").all();
  const result = klijenti.map((k) => {
    const predmeti = db.prepare(
      "SELECT id, oznaka, vrsta, status FROM predmeti WHERE klijent_id = ? ORDER BY datum_otvaranja DESC"
    ).all(k.id);
    const sljedeciRok = db.prepare(`
      SELECT r.datum, r.naziv FROM rokovi r
      JOIN predmeti p ON p.id = r.predmet_id
      WHERE p.klijent_id = ? AND r.dovrseno = 0
      ORDER BY r.datum ASC LIMIT 1
    `).get(k.id);
    return {
      ...rowToKlijent(k),
      predmeti: predmeti.map((p) => ({ id: p.id, oznaka: p.oznaka, vrsta: p.vrsta, status: p.status })),
      sljedeciRok: sljedeciRok ? { datum: sljedeciRok.datum, naziv: sljedeciRok.naziv } : null,
    };
  });
  res.json(result);
});

app.get("/api/klijenti/:id/predmeti", (req, res) => {
  if (!db.prepare("SELECT id FROM klijenti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Klijent nije pronađen" });
  const rows = db.prepare("SELECT * FROM predmeti WHERE klijent_id = ? ORDER BY datum_otvaranja DESC").all(req.params.id);
  res.json(rows.map(rowToPredmet));
});

app.get("/api/klijenti", (req, res) => {
  const rows = db.prepare("SELECT * FROM klijenti ORDER BY naziv COLLATE NOCASE").all();
  res.json(rows.map(rowToKlijent));
});

app.get("/api/klijenti/:id", (req, res) => {
  const k = db.prepare("SELECT * FROM klijenti WHERE id = ?").get(req.params.id);
  if (!k) return res.status(404).json({ error: "Klijent nije pronađen" });
  res.json(rowToKlijent(k));
});

app.post("/api/klijenti", (req, res) => {
  const { naziv, oib, tip, email, telefon, adresa, biljeske } = req.body;
  if (!naziv?.trim()) return res.status(400).json({ error: "Naziv je obavezan" });
  if (oib) {
    const exists = db.prepare("SELECT id FROM klijenti WHERE oib = ?").get(oib.trim());
    if (exists) return res.status(409).json({ error: "Klijent s tim OIB-om već postoji" });
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO klijenti (id, naziv, oib, tip, email, telefon, adresa, biljeske, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, naziv.trim(), oib?.trim() || "", tip || "fizicka", email || "", telefon || "", adresa || "", biljeske || "", new Date().toISOString());
  res.status(201).json(rowToKlijent(db.prepare("SELECT * FROM klijenti WHERE id = ?").get(id)));
});

app.patch("/api/klijenti/:id", (req, res) => {
  const k = db.prepare("SELECT * FROM klijenti WHERE id = ?").get(req.params.id);
  if (!k) return res.status(404).json({ error: "Klijent nije pronađen" });
  if (req.body.oib && req.body.oib !== k.oib) {
    const exists = db.prepare("SELECT id FROM klijenti WHERE oib = ? AND id != ?").get(req.body.oib.trim(), req.params.id);
    if (exists) return res.status(409).json({ error: "Klijent s tim OIB-om već postoji" });
  }
  const naziv    = req.body.naziv    !== undefined ? req.body.naziv.trim() : k.naziv;
  const oib      = req.body.oib      !== undefined ? req.body.oib.trim()   : k.oib;
  const tip      = req.body.tip      !== undefined ? req.body.tip          : k.tip;
  const email    = req.body.email    !== undefined ? req.body.email        : k.email;
  const telefon  = req.body.telefon  !== undefined ? req.body.telefon      : k.telefon;
  const adresa   = req.body.adresa   !== undefined ? req.body.adresa       : k.adresa;
  const biljeske = req.body.biljeske !== undefined ? req.body.biljeske     : k.biljeske;
  db.prepare("UPDATE klijenti SET naziv = ?, oib = ?, tip = ?, email = ?, telefon = ?, adresa = ?, biljeske = ? WHERE id = ?")
    .run(naziv, oib, tip, email, telefon, adresa, biljeske, req.params.id);
  res.json(rowToKlijent(db.prepare("SELECT * FROM klijenti WHERE id = ?").get(req.params.id)));
});

app.delete("/api/klijenti/:id", (req, res) => {
  db.prepare("DELETE FROM klijenti WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(3001, () => console.log("✅  Backend na http://localhost:3001"));
