import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "../../lexsuite.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS counters (
    key   TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS predmeti (
    id              TEXT PRIMARY KEY,
    oznaka          TEXT NOT NULL,
    vrsta           TEXT NOT NULL,
    tuzitelj_ime    TEXT NOT NULL,
    tuzitelj_oib    TEXT NOT NULL DEFAULT '',
    tuzeni_ime      TEXT NOT NULL,
    tuzeni_oib      TEXT NOT NULL DEFAULT '',
    sud             TEXT NOT NULL DEFAULT '',
    sudac           TEXT NOT NULL DEFAULT '',
    opis            TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'aktivan',
    datum_otvaranja TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rokovi (
    id         TEXT PRIMARY KEY,
    predmet_id TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    naziv      TEXT NOT NULL,
    datum      TEXT NOT NULL,
    napomena   TEXT NOT NULL DEFAULT '',
    dovrseno   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dokumenti (
    id              TEXT PRIMARY KEY,
    predmet_id      TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    naziv           TEXT NOT NULL,
    vrsta           TEXT NOT NULL DEFAULT 'ostalo',
    opis            TEXT NOT NULL DEFAULT '',
    datum_dodavanja TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tijek (
    id         TEXT PRIMARY KEY,
    predmet_id TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    datum      TEXT NOT NULL,
    tekst      TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS klijenti (
    id         TEXT PRIMARY KEY,
    naziv      TEXT NOT NULL,
    oib        TEXT NOT NULL DEFAULT '',
    tip        TEXT NOT NULL DEFAULT 'fizicka',
    email      TEXT NOT NULL DEFAULT '',
    telefon    TEXT NOT NULL DEFAULT '',
    adresa     TEXT NOT NULL DEFAULT '',
    biljeske   TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

// ── Migracije ──────────────────────────────────────────────────────────────────
const predCols = db.prepare("PRAGMA table_info(predmeti)").all().map((c) => c.name);
if (!predCols.includes("poslovni_broj")) db.exec("ALTER TABLE predmeti ADD COLUMN poslovni_broj TEXT NOT NULL DEFAULT ''");
if (!predCols.includes("klijent_id"))    db.exec("ALTER TABLE predmeti ADD COLUMN klijent_id TEXT");
if (!predCols.includes("vps"))           db.exec("ALTER TABLE predmeti ADD COLUMN vps TEXT NOT NULL DEFAULT ''");

const rokCols = db.prepare("PRAGMA table_info(rokovi)").all().map((c) => c.name);
if (!rokCols.includes("tip_pristupa")) db.exec("ALTER TABLE rokovi ADD COLUMN tip_pristupa TEXT NOT NULL DEFAULT 'opci'");
if (!rokCols.includes("vrsta_roka"))   db.exec("ALTER TABLE rokovi ADD COLUMN vrsta_roka   TEXT NOT NULL DEFAULT 'ostalo'");
if (!rokCols.includes("vrijeme"))      db.exec("ALTER TABLE rokovi ADD COLUMN vrijeme      TEXT NOT NULL DEFAULT ''");
if (!rokCols.includes("lokacija"))     db.exec("ALTER TABLE rokovi ADD COLUMN lokacija     TEXT NOT NULL DEFAULT ''");

const dokCols = db.prepare("PRAGMA table_info(dokumenti)").all().map((c) => c.name);
if (!dokCols.includes("putanja"))  db.exec("ALTER TABLE dokumenti ADD COLUMN putanja  TEXT    NOT NULL DEFAULT ''");
if (!dokCols.includes("velicina")) db.exec("ALTER TABLE dokumenti ADD COLUMN velicina INTEGER NOT NULL DEFAULT 0");
if (!dokCols.includes("mime_tip")) db.exec("ALTER TABLE dokumenti ADD COLUMN mime_tip TEXT    NOT NULL DEFAULT ''");

export default db;
