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
function generateOznaka(vrsta, godina) {
  const key = `${vrsta}/${godina}`;
  const row = db.prepare("SELECT value FROM counters WHERE key = ?").get(key);
  const newVal = (row ? row.value : 0) + 1;
  if (row) db.prepare("UPDATE counters SET value = ? WHERE key = ?").run(newVal, key);
  else     db.prepare("INSERT INTO counters (key, value) VALUES (?, ?)").run(key, newVal);
  return `${vrsta}${String(newVal).padStart(4, "0")}/${godina}`;
}

function rowToRok(r) {
  return {
    id:          r.id,
    naziv:       r.naziv,
    datum:       r.datum,
    vrijeme:     r.vrijeme     || "",
    lokacija:    r.lokacija    || "",
    napomena:    r.napomena    || "",
    dovrseno:    r.dovrseno === 1,
    tipPristupa: r.tip_pristupa || "opci",
    vrstaRoka:   r.vrsta_roka   || "ostalo",
  };
}

function rowToPredmet(p) {
  return {
    id:             p.id,
    oznaka:         p.oznaka,
    vrsta:          p.vrsta,
    tuzitelj:       { ime: p.tuzitelj_ime, oib: p.tuzitelj_oib },
    tuzeni:         { ime: p.tuzeni_ime,   oib: p.tuzeni_oib   },
    poslovniBroj:   p.poslovni_broj || "",
    vps:            p.vps           || "",
    klijentId:      p.klijent_id    || null,
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
  const { vrsta, oznaka: oznakaSent, tuzitelj, tuzeni, poslovniBroj, vps, klijentId, sud, sudac, opis } = req.body;
  const tIme = typeof tuzitelj === "object" ? tuzitelj.ime  : tuzitelj;
  const tOib = typeof tuzitelj === "object" ? (tuzitelj.oib || "") : "";
  const nIme = typeof tuzeni   === "object" ? tuzeni.ime    : tuzeni;
  const nOib = typeof tuzeni   === "object" ? (tuzeni.oib   || "") : "";
  if (!vrsta || !tIme || !nIme)
    return res.status(400).json({ error: "Vrsta, tužitelj i tuženi su obavezni" });

  const godina = String(new Date().getFullYear()).slice(-2);
  const oznaka = oznakaSent ? oznakaSent.trim() : generateOznaka(vrsta, godina);
  const id = uuidv4();
  db.prepare(`
    INSERT INTO predmeti
      (id, oznaka, vrsta, tuzitelj_ime, tuzitelj_oib, tuzeni_ime, tuzeni_oib, poslovni_broj, vps, klijent_id, sud, sudac, opis, status, datum_otvaranja)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktivan', ?)
  `).run(id, oznaka, vrsta, tIme, tOib, nIme, nOib, poslovniBroj || "", vps || "", klijentId || null, sud || "", sudac || "", opis || "", new Date().toISOString());

  res.status(201).json(getPredmetFull(id));
});

app.patch("/api/predmeti/:id", (req, res) => {
  const p = db.prepare("SELECT * FROM predmeti WHERE id = ?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "Predmet nije pronađen" });
  const { poslovniBroj, vps, klijentId, sud, sudac, opis, status } = req.body;
  db.prepare("UPDATE predmeti SET poslovni_broj = ?, vps = ?, klijent_id = ?, sud = ?, sudac = ?, opis = ?, status = ? WHERE id = ?").run(
    poslovniBroj !== undefined ? poslovniBroj : p.poslovni_broj,
    vps          !== undefined ? vps          : p.vps,
    klijentId    !== undefined ? klijentId    : p.klijent_id,
    sud          !== undefined ? sud          : p.sud,
    sudac        !== undefined ? sudac        : p.sudac,
    opis         !== undefined ? opis         : p.opis,
    status       !== undefined ? status       : p.status,
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
    SELECT r.*, p.oznaka, p.tuzitelj_ime, p.tuzeni_ime
    FROM rokovi r
    JOIN predmeti p ON p.id = r.predmet_id
    ORDER BY r.datum ASC
  `).all();
  res.json(rows.map((r) => ({
    ...rowToRok(r),
    predmet: { id: r.predmet_id, oznaka: r.oznaka, tuziteljIme: r.tuzitelj_ime, tuzeniIme: r.tuzeni_ime },
  })));
});

// ── Rokovi ─────────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/rokovi", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ?").get(req.params.id))
    return res.status(404).json({ error: "Predmet nije pronađen" });
  const { naziv, datum, napomena, tipPristupa, vrstaRoka, vrijeme, lokacija } = req.body;
  const id = uuidv4();
  db.prepare("INSERT INTO rokovi (id, predmet_id, naziv, datum, napomena, tip_pristupa, vrsta_roka, vrijeme, lokacija) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, naziv, datum, napomena || "", tipPristupa || "opci", vrstaRoka || "ostalo", vrijeme || "", lokacija || "");
  res.status(201).json(rowToRok(db.prepare("SELECT * FROM rokovi WHERE id = ?").get(id)));
});

app.patch("/api/predmeti/:id/rokovi/:rokId", (req, res) => {
  const rok = db.prepare("SELECT * FROM rokovi WHERE id = ? AND predmet_id = ?").get(req.params.rokId, req.params.id);
  if (!rok) return res.status(404).json({ error: "Rok nije pronađen" });
  const naziv       = req.body.naziv       !== undefined ? req.body.naziv       : rok.naziv;
  const datum       = req.body.datum       !== undefined ? req.body.datum       : rok.datum;
  const napomena    = req.body.napomena    !== undefined ? req.body.napomena    : rok.napomena;
  const dovrseno    = req.body.dovrseno    !== undefined ? (req.body.dovrseno ? 1 : 0) : rok.dovrseno;
  const tipPristupa = req.body.tipPristupa !== undefined ? req.body.tipPristupa : rok.tip_pristupa;
  const vrstaRoka   = req.body.vrstaRoka   !== undefined ? req.body.vrstaRoka   : rok.vrsta_roka;
  const vrijeme     = req.body.vrijeme     !== undefined ? req.body.vrijeme     : rok.vrijeme;
  const lokacija    = req.body.lokacija    !== undefined ? req.body.lokacija    : rok.lokacija;
  db.prepare("UPDATE rokovi SET naziv = ?, datum = ?, napomena = ?, dovrseno = ?, tip_pristupa = ?, vrsta_roka = ?, vrijeme = ?, lokacija = ? WHERE id = ?")
    .run(naziv, datum, napomena, dovrseno, tipPristupa, vrstaRoka, vrijeme, lokacija, rok.id);
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
