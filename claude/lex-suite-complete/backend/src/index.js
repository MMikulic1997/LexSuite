import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "./db.js";
import { authMiddleware } from "./authMiddleware.js";

const JWT_SECRET = "lexsuite-secret-2025";

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

// ── Startup migration: is_owner kolona ────────────────────────────────────────
{
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!cols.includes("is_owner")) {
    db.exec("ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0");
    console.log("  + is_owner kolona dodana u tablicu users");
  }
  // Postavi is_owner = 1 za prvog kreiranog admina po officeu (idempotentno)
  // Dodaj zaduzena_osoba u rokovi (idempotentno)
  const rokoviCols = db.prepare("PRAGMA table_info(rokovi)").all().map((c) => c.name);
  if (!rokoviCols.includes("zaduzena_osoba")) {
    db.exec("ALTER TABLE rokovi ADD COLUMN zaduzena_osoba TEXT NOT NULL DEFAULT ''");
    console.log("  + zaduzena_osoba dodana u tablicu rokovi");
  }

  db.prepare(`
    UPDATE users SET is_owner = 1
    WHERE id IN (
      SELECT id FROM users u1
      WHERE role = 'admin'
        AND created_at = (
          SELECT MIN(created_at) FROM users u2
          WHERE u2.office_id = u1.office_id AND u2.role = 'admin'
        )
        AND is_owner = 0
    )
  `).run();
}

// ── Auth ───────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email i lozinka su obavezni." });
  }

  const user = db.prepare(
    "SELECT id, email, password_hash, role, office_id, is_active FROM users WHERE email = ?"
  ).get(email);

  if (!user || user.is_active !== 1) {
    return res.status(401).json({ error: "Neispravni podaci za prijavu." });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Neispravni podaci za prijavu." });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, officeId: user.office_id },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  return res.json({ token });
});

// ── Zaštita svih ostalih /api/ ruta ───────────────────────────────────────────
app.use("/api", authMiddleware);

// ── Promjena lozinke ──────────────────────────────────────────────────────────
app.patch("/api/auth/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Trenutna i nova lozinka su obavezne." });
  }

  const user = db.prepare("SELECT id, password_hash FROM users WHERE id = ?").get(req.user.userId);
  if (!user) return res.status(404).json({ error: "Korisnik nije pronađen." });

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return res.status(400).json({ error: "Trenutna lozinka nije ispravna." });

  const newHash = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);

  return res.json({ message: "Lozinka uspješno promijenjena." });
});

// ── Članovi ureda (dostupno svim korisnicima) ─────────────────────────────────
app.get("/api/office/members", (req, res) => {
  const rows = db.prepare(
    "SELECT id, name FROM users WHERE office_id = ? AND is_active = 1 ORDER BY name ASC"
  ).all(req.user.officeId);
  res.json(rows);
});

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
    id:            r.id,
    naziv:         r.naziv,
    datum:         r.datum,
    vrijeme:       r.vrijeme       || "",
    lokacija:      r.lokacija      || "",
    sudacRoka:     r.sudac_roka    || "",
    dvorana:       r.dvorana       || "",
    napomena:      r.napomena      || "",
    dovrseno:      r.dovrseno === 1,
    vrstaRoka:     r.vrsta_roka    || "ostalo",
    zaduzenaOsoba: r.zaduzena_osoba || "",
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
    WHERE p.office_id = ?
    ORDER BY p.datum_otvaranja DESC
  `).all(req.user.officeId);
  res.json(rows.map((r) => {
    const p = rowToPredmet(r);
    if (r.klijent_naziv) p.klijent = { id: r.klijent_id, naziv: r.klijent_naziv };
    return p;
  }));
});

app.get("/api/predmeti/:id", (req, res) => {
  const owns = db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!owns) return res.status(403).json({ error: "Pristup nije dozvoljen." });
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
      (id, office_id, oznaka, vrsta, naziv_predmeta, stranka_ime, stranka_oib, stranka_uloga, protustranka_ime, protustranka_oib, poslovni_broj, vps, klijent_id, sud, sudac, opis, uloga_klijenta, strana_umjesaca, status, datum_otvaranja)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktivan', ?)
  `).run(id, req.user.officeId, oznaka, vrsta, nazivPredmeta.trim(), sIme.trim(), sOib, sUloga || defaultUloga, pIme.trim(), pOib, poslovniBroj || "", vps || "", klijentId || null, sud || "", sudac || "", opis || "", ulogaKlijenta || sUloga || defaultUloga, stranaUmjesaca || "tuzitelj", new Date().toISOString());

  res.status(201).json(getPredmetFull(id));
});

app.patch("/api/predmeti/:id", (req, res) => {
  const p = db.prepare("SELECT * FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!p) return res.status(403).json({ error: "Pristup nije dozvoljen." });
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
  const owns = db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!owns) return res.status(403).json({ error: "Pristup nije dozvoljen." });
  db.prepare("DELETE FROM predmeti WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Pregled (dashboard) ────────────────────────────────────────────────────────
app.get("/api/pregled", (req, res) => {
  const oid = req.user.officeId;
  const danas = new Date();
  const dow = danas.getDay(); // 0=ned, 1=pon ...
  const diffMon = dow === 0 ? -6 : 1 - dow;
  const pon = new Date(danas); pon.setDate(danas.getDate() + diffMon); pon.setHours(0, 0, 0, 0);
  const ned = new Date(pon);   ned.setDate(pon.getDate() + 6);         ned.setHours(23, 59, 59, 999);
  const monISO = pon.toISOString().slice(0, 10);
  const sunISO = ned.toISOString().slice(0, 10);

  const brKlijenata     = db.prepare("SELECT COUNT(*) AS c FROM klijenti WHERE office_id = ?").get(oid).c;
  const brPredmeta      = db.prepare("SELECT COUNT(*) AS c FROM predmeti WHERE office_id = ?").get(oid).c;
  const brAktivnih      = db.prepare("SELECT COUNT(*) AS c FROM predmeti WHERE office_id = ? AND status = 'aktivan'").get(oid).c;
  const brRokovaTjedan  = db.prepare("SELECT COUNT(*) AS c FROM rokovi r JOIN predmeti p ON p.id = r.predmet_id WHERE p.office_id = ? AND r.datum >= ? AND r.datum <= ? AND r.dovrseno = 0").get(oid, monISO, sunISO).c;

  const rokoviTjedan = db.prepare(`
    SELECT r.id, r.naziv, r.datum, r.vrsta_roka, p.id AS predmet_id, p.oznaka
    FROM rokovi r JOIN predmeti p ON p.id = r.predmet_id
    WHERE p.office_id = ? AND r.datum >= ? AND r.datum <= ? AND r.dovrseno = 0
    ORDER BY r.datum ASC
  `).all(oid, monISO, sunISO);

  const zadaciTjedan = db.prepare(`
    SELECT z.id, z.naziv, z.rok AS datum, z.prioritet, p.id AS predmet_id, p.oznaka
    FROM zadaci z JOIN predmeti p ON p.id = z.predmet_id
    WHERE p.office_id = ? AND z.rok >= ? AND z.rok <= ? AND z.status != 'zavrseno'
    ORDER BY z.rok ASC
  `).all(oid, monISO, sunISO);

  const tjedan = [
    ...rokoviTjedan.map((r) => ({ tip: "rok",     datum: r.datum.slice(0, 10), naziv: r.naziv,  predmetId: r.predmet_id, predmetOznaka: r.oznaka, meta: r.vrsta_roka })),
    ...zadaciTjedan.map((z) => ({ tip: "zadatak", datum: z.datum.slice(0, 10), naziv: z.naziv,  predmetId: z.predmet_id, predmetOznaka: z.oznaka, meta: z.prioritet  })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));

  res.json({ brKlijenata, brPredmeta, brAktivnih, brRokovaTjedan, tjedan });
});

// ── Globalni rokovnik ──────────────────────────────────────────────────────────
app.get("/api/rokovi", (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, p.oznaka, p.stranka_ime, p.stranka_uloga, p.protustranka_ime, p.strana_umjesaca
    FROM rokovi r
    JOIN predmeti p ON p.id = r.predmet_id
    WHERE p.office_id = ?
    ORDER BY r.datum ASC
  `).all(req.user.officeId);
  res.json(rows.map((r) => ({
    ...rowToRok(r),
    predmet: { id: r.predmet_id, oznaka: r.oznaka, strankaIme: r.stranka_ime, strankaUloga: r.stranka_uloga, protustrankaIme: r.protustranka_ime, stranaUmjesaca: r.strana_umjesaca || "tuzitelj" },
  })));
});

// ── Rokovi ─────────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/rokovi", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const { naziv, datum, napomena, vrstaRoka, vrijeme, lokacija, sudacRoka, dvorana, zaduzenaOsoba } = req.body;
  const id = uuidv4();
  db.prepare("INSERT INTO rokovi (id, predmet_id, naziv, datum, napomena, vrsta_roka, vrijeme, lokacija, sudac_roka, dvorana, zaduzena_osoba) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, naziv, datum, napomena || "", vrstaRoka || "ostalo", vrijeme || "", lokacija || "", sudacRoka || "", dvorana || "", zaduzenaOsoba || "");
  res.status(201).json(rowToRok(db.prepare("SELECT * FROM rokovi WHERE id = ?").get(id)));
});

app.patch("/api/predmeti/:id/rokovi/:rokId", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const rok = db.prepare("SELECT * FROM rokovi WHERE id = ? AND predmet_id = ?").get(req.params.rokId, req.params.id);
  if (!rok) return res.status(404).json({ error: "Rok nije pronađen" });
  const naziv     = req.body.naziv     !== undefined ? req.body.naziv                : rok.naziv;
  const datum     = req.body.datum     !== undefined ? req.body.datum                : rok.datum;
  const napomena  = req.body.napomena  !== undefined ? req.body.napomena             : rok.napomena;
  const dovrseno  = req.body.dovrseno  !== undefined ? (req.body.dovrseno ? 1 : 0)  : rok.dovrseno;
  const vrstaRoka = req.body.vrstaRoka !== undefined ? req.body.vrstaRoka            : rok.vrsta_roka;
  const vrijeme   = req.body.vrijeme   !== undefined ? req.body.vrijeme              : rok.vrijeme;
  const lokacija  = req.body.lokacija  !== undefined ? req.body.lokacija             : rok.lokacija;
  const sudacRoka     = req.body.sudacRoka     !== undefined ? req.body.sudacRoka     : rok.sudac_roka;
  const dvorana       = req.body.dvorana       !== undefined ? req.body.dvorana       : rok.dvorana;
  const zaduzenaOsoba = req.body.zaduzenaOsoba !== undefined ? req.body.zaduzenaOsoba : rok.zaduzena_osoba;
  db.prepare("UPDATE rokovi SET naziv = ?, datum = ?, napomena = ?, dovrseno = ?, vrsta_roka = ?, vrijeme = ?, lokacija = ?, sudac_roka = ?, dvorana = ?, zaduzena_osoba = ? WHERE id = ?")
    .run(naziv, datum, napomena, dovrseno, vrstaRoka, vrijeme, lokacija, sudacRoka, dvorana, zaduzenaOsoba, rok.id);
  res.json(rowToRok(db.prepare("SELECT * FROM rokovi WHERE id = ?").get(rok.id)));
});

app.delete("/api/predmeti/:id/rokovi/:rokId", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  db.prepare("DELETE FROM rokovi WHERE id = ? AND predmet_id = ?").run(req.params.rokId, req.params.id);
  res.json({ ok: true });
});

// ── Dokumenti ──────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/dokumenti/upload", upload.single("fajl"), (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
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
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const dok = db.prepare("SELECT * FROM dokumenti WHERE id = ? AND predmet_id = ?")
    .get(req.params.dokId, req.params.id);
  if (!dok || !dok.putanja) return res.status(404).json({ error: "Fajl nije pronađen" });
  if (!fs.existsSync(dok.putanja)) return res.status(404).json({ error: "Fajl ne postoji na disku" });
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(dok.naziv)}"`);
  res.sendFile(dok.putanja);
});

app.post("/api/predmeti/:id/dokumenti", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const { naziv, vrsta, opis } = req.body;
  const id = uuidv4();
  const datumDodavanja = new Date().toISOString();
  db.prepare("INSERT INTO dokumenti (id, predmet_id, naziv, vrsta, opis, datum_dodavanja) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, naziv, vrsta || "ostalo", opis || "", datumDodavanja);
  res.status(201).json({ id, naziv, vrsta: vrsta || "ostalo", opis: opis || "", datumDodavanja });
});

app.delete("/api/predmeti/:id/dokumenti/:dokId", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const dok = db.prepare("SELECT putanja FROM dokumenti WHERE id = ? AND predmet_id = ?")
    .get(req.params.dokId, req.params.id);
  if (dok?.putanja) fs.unlink(dok.putanja, () => {});
  db.prepare("DELETE FROM dokumenti WHERE id = ? AND predmet_id = ?").run(req.params.dokId, req.params.id);
  res.json({ ok: true });
});

// ── Tijek ───────────────────────────────────────────────────────────────────────
app.post("/api/predmeti/:id/tijek", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const { datum, tekst } = req.body;
  if (!datum || !tekst) return res.status(400).json({ error: "Datum i tekst su obavezni" });
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO tijek (id, predmet_id, datum, tekst, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.id, datum, tekst, createdAt);
  res.status(201).json({ id, datum, tekst, createdAt });
});

app.delete("/api/predmeti/:id/tijek/:unosId", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  db.prepare("DELETE FROM tijek WHERE id = ? AND predmet_id = ?").run(req.params.unosId, req.params.id);
  res.json({ ok: true });
});

// ── Zadaci ─────────────────────────────────────────────────────────────────────
app.get("/api/predmeti/:id/zadaci", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const rows = db.prepare("SELECT * FROM zadaci WHERE predmet_id = ? ORDER BY created_at").all(req.params.id);
  res.json(rows.map(rowToZadatak));
});

app.post("/api/predmeti/:id/zadaci", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
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
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const z = db.prepare("SELECT * FROM zadaci WHERE id = ? AND predmet_id = ?").get(req.params.zadatakId, req.params.id);
  if (!z) return res.status(404).json({ error: "Zadatak nije pronađen" });
  if (req.user.role !== "admin" && req.user.userId !== z.zaduzena_osoba)
    return res.status(403).json({ error: "Nemate ovlasti mijenjati ovaj zadatak." });
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
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  db.prepare("DELETE FROM zadaci WHERE id = ? AND predmet_id = ?").run(req.params.zadatakId, req.params.id);
  res.json({ ok: true });
});

// ── Troškovnik ─────────────────────────────────────────────────────────────────
app.get("/api/predmeti/:id/troskovnik", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  res.json(db.prepare("SELECT * FROM troskovnik_stavke WHERE predmet_id = ? ORDER BY datum, created_at").all(req.params.id).map(rowToStavka));
});

app.post("/api/predmeti/:id/troskovnik", (req, res) => {
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
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
  if (!db.prepare("SELECT id FROM predmeti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
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
  const oid = req.user.officeId;
  const klijenti = db.prepare("SELECT * FROM klijenti WHERE office_id = ? ORDER BY naziv COLLATE NOCASE").all(oid);
  const result = klijenti.map((k) => {
    const predmeti = db.prepare(
      "SELECT id, oznaka, vrsta, status FROM predmeti WHERE klijent_id = ? AND office_id = ? ORDER BY datum_otvaranja DESC"
    ).all(k.id, oid);
    const sljedeciRok = db.prepare(`
      SELECT r.datum, r.naziv FROM rokovi r
      JOIN predmeti p ON p.id = r.predmet_id
      WHERE p.klijent_id = ? AND p.office_id = ? AND r.dovrseno = 0
      ORDER BY r.datum ASC LIMIT 1
    `).get(k.id, oid);
    return {
      ...rowToKlijent(k),
      predmeti: predmeti.map((p) => ({ id: p.id, oznaka: p.oznaka, vrsta: p.vrsta, status: p.status })),
      sljedeciRok: sljedeciRok ? { datum: sljedeciRok.datum, naziv: sljedeciRok.naziv } : null,
    };
  });
  res.json(result);
});

app.get("/api/klijenti/:id/predmeti", (req, res) => {
  const oid = req.user.officeId;
  if (!db.prepare("SELECT id FROM klijenti WHERE id = ? AND office_id = ?").get(req.params.id, oid))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  const rows = db.prepare("SELECT * FROM predmeti WHERE klijent_id = ? AND office_id = ? ORDER BY datum_otvaranja DESC").all(req.params.id, oid);
  res.json(rows.map(rowToPredmet));
});

app.get("/api/klijenti", (req, res) => {
  const rows = db.prepare("SELECT * FROM klijenti WHERE office_id = ? ORDER BY naziv COLLATE NOCASE").all(req.user.officeId);
  res.json(rows.map(rowToKlijent));
});

app.get("/api/klijenti/:id", (req, res) => {
  const k = db.prepare("SELECT * FROM klijenti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!k) return res.status(403).json({ error: "Pristup nije dozvoljen." });
  res.json(rowToKlijent(k));
});

app.post("/api/klijenti", (req, res) => {
  const oid = req.user.officeId;
  const { naziv, oib, tip, email, telefon, adresa, biljeske } = req.body;
  if (!naziv?.trim()) return res.status(400).json({ error: "Naziv je obavezan" });
  if (oib) {
    const exists = db.prepare("SELECT id FROM klijenti WHERE oib = ? AND office_id = ?").get(oib.trim(), oid);
    if (exists) return res.status(409).json({ error: "Klijent s tim OIB-om već postoji" });
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO klijenti (id, office_id, naziv, oib, tip, email, telefon, adresa, biljeske, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, oid, naziv.trim(), oib?.trim() || "", tip || "fizicka", email || "", telefon || "", adresa || "", biljeske || "", new Date().toISOString());
  res.status(201).json(rowToKlijent(db.prepare("SELECT * FROM klijenti WHERE id = ?").get(id)));
});

app.patch("/api/klijenti/:id", (req, res) => {
  const oid = req.user.officeId;
  const k = db.prepare("SELECT * FROM klijenti WHERE id = ? AND office_id = ?").get(req.params.id, oid);
  if (!k) return res.status(403).json({ error: "Pristup nije dozvoljen." });
  if (req.body.oib && req.body.oib !== k.oib) {
    const exists = db.prepare("SELECT id FROM klijenti WHERE oib = ? AND office_id = ? AND id != ?").get(req.body.oib.trim(), oid, req.params.id);
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
  if (!db.prepare("SELECT id FROM klijenti WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId))
    return res.status(403).json({ error: "Pristup nije dozvoljen." });
  db.prepare("DELETE FROM klijenti WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Users (admin only) ─────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Samo admin može upravljati korisnicima." });
  }
  next();
}

function generateOTP(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let otp = "";
  for (let i = 0; i < length; i++) otp += chars[Math.floor(Math.random() * chars.length)];
  return otp;
}

function rowToUser(u) {
  return { id: u.id, name: u.name || "", email: u.email, role: u.role, isActive: u.is_active === 1, isOwner: u.is_owner === 1, createdAt: u.created_at };
}

app.get("/api/users", requireAdmin, (req, res) => {
  const rows = db.prepare(
    "SELECT id, name, email, role, is_active, is_owner, created_at FROM users WHERE office_id = ? ORDER BY created_at ASC"
  ).all(req.user.officeId);
  res.json(rows.map(rowToUser));
});

app.post("/api/users", requireAdmin, async (req, res) => {
  const { name, email, role } = req.body;
  if (!name?.trim())  return res.status(400).json({ error: "Ime je obavezno." });
  if (!email?.trim()) return res.status(400).json({ error: "Email je obavezan." });
  const validRoles = ["admin", "odvjetnik", "vjezbenik", "administracija"];
  if (!validRoles.includes(role)) return res.status(400).json({ error: "Uloga nije valjana." });

  const normalEmail = email.trim().toLowerCase();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(normalEmail)) {
    return res.status(409).json({ error: "Korisnik s tim emailom već postoji." });
  }

  const otp = generateOTP();
  const passwordHash = await bcrypt.hash(otp, 10);
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, office_id, name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
  ).run(id, req.user.officeId, name.trim(), normalEmail, passwordHash, role, createdAt);

  res.status(201).json({ user: rowToUser({ id, name: name.trim(), email: normalEmail, role, is_active: 1, is_owner: 0, created_at: createdAt }), otp });
});

app.patch("/api/users/:id/role", requireAdmin, (req, res) => {
  const { role } = req.body;
  const validRoles = ["admin", "odvjetnik", "vjezbenik", "administracija"];
  if (!validRoles.includes(role)) return res.status(400).json({ error: "Uloga nije valjana." });
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!user) return res.status(404).json({ error: "Korisnik nije pronađen." });
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json(rowToUser(db.prepare("SELECT id, name, email, role, is_active, is_owner, created_at FROM users WHERE id = ?").get(req.params.id)));
});

app.patch("/api/users/:id/status", requireAdmin, (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive mora biti boolean." });
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!user) return res.status(404).json({ error: "Korisnik nije pronađen." });
  db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, req.params.id);
  res.json(rowToUser(db.prepare("SELECT id, name, email, role, is_active, is_owner, created_at FROM users WHERE id = ?").get(req.params.id)));
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  const { adminPassword } = req.body;
  if (!adminPassword) return res.status(400).json({ error: "Lozinka je obavezna." });

  // Verificiraj lozinku logiranog admina
  const admin = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.userId);
  if (!admin) return res.status(404).json({ error: "Admin nije pronađen." });
  const match = await bcrypt.compare(adminPassword, admin.password_hash);
  if (!match) return res.status(403).json({ error: "Pogrešna lozinka." });

  // Provjeri da target user postoji i pripada ovom officeu
  const target = db.prepare("SELECT id, is_owner FROM users WHERE id = ? AND office_id = ?").get(req.params.id, req.user.officeId);
  if (!target) return res.status(404).json({ error: "Korisnik nije pronađen." });

  // Vlasnika se ne može obrisati
  if (target.is_owner === 1) return res.status(403).json({ error: "Ne možete obrisati vlasnika ureda." });

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Frontend (production build) ────────────────────────────────────────────────
const FRONTEND_BUILD = join(__dirname, "../../frontend/build");
app.use(express.static(FRONTEND_BUILD));
app.get("*", (_req, res) => res.sendFile(join(FRONTEND_BUILD, "index.html")));

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Backend na http://localhost:${PORT}`));
