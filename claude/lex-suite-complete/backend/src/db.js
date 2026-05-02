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

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    office_id     TEXT NOT NULL DEFAULT '',
    name          TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'user',
    is_active     INTEGER NOT NULL DEFAULT 1,
    is_owner      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS predmeti (
    id               TEXT PRIMARY KEY,
    office_id        TEXT NOT NULL DEFAULT '',
    oznaka           TEXT NOT NULL,
    vrsta            TEXT NOT NULL,
    naziv_predmeta   TEXT NOT NULL DEFAULT '',
    stranka_ime      TEXT NOT NULL DEFAULT '',
    stranka_oib      TEXT NOT NULL DEFAULT '',
    stranka_uloga    TEXT NOT NULL DEFAULT 'Tužitelj',
    protustranka_ime TEXT NOT NULL DEFAULT '',
    protustranka_oib TEXT NOT NULL DEFAULT '',
    poslovni_broj    TEXT NOT NULL DEFAULT '',
    vps              TEXT NOT NULL DEFAULT '',
    klijent_id       TEXT,
    sud              TEXT NOT NULL DEFAULT '',
    sudac            TEXT NOT NULL DEFAULT '',
    opis             TEXT NOT NULL DEFAULT '',
    uloga_klijenta   TEXT NOT NULL DEFAULT 'Tužitelj',
    strana_umjesaca  TEXT NOT NULL DEFAULT 'tuzitelj',
    status           TEXT NOT NULL DEFAULT 'aktivan',
    datum_otvaranja  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rokovi (
    id             TEXT PRIMARY KEY,
    predmet_id     TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    naziv          TEXT NOT NULL,
    datum          TEXT NOT NULL,
    napomena       TEXT NOT NULL DEFAULT '',
    dovrseno       INTEGER NOT NULL DEFAULT 0,
    tip_pristupa   TEXT NOT NULL DEFAULT 'opci',
    vrsta_roka     TEXT NOT NULL DEFAULT 'ostalo',
    vrijeme        TEXT NOT NULL DEFAULT '',
    lokacija       TEXT NOT NULL DEFAULT '',
    sudac_roka     TEXT NOT NULL DEFAULT '',
    dvorana        TEXT NOT NULL DEFAULT '',
    zaduzena_osoba TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS dokumenti (
    id              TEXT PRIMARY KEY,
    predmet_id      TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    naziv           TEXT NOT NULL,
    vrsta           TEXT NOT NULL DEFAULT 'ostalo',
    opis            TEXT NOT NULL DEFAULT '',
    datum_dodavanja TEXT NOT NULL,
    putanja         TEXT NOT NULL DEFAULT '',
    velicina        INTEGER NOT NULL DEFAULT 0,
    mime_tip        TEXT NOT NULL DEFAULT ''
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
    office_id  TEXT NOT NULL DEFAULT '',
    naziv      TEXT NOT NULL,
    oib        TEXT NOT NULL DEFAULT '',
    tip        TEXT NOT NULL DEFAULT 'fizicka',
    email      TEXT NOT NULL DEFAULT '',
    telefon    TEXT NOT NULL DEFAULT '',
    adresa     TEXT NOT NULL DEFAULT '',
    biljeske   TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zadaci (
    id              TEXT PRIMARY KEY,
    predmet_id      TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    naziv           TEXT NOT NULL,
    opis            TEXT NOT NULL DEFAULT '',
    rok             TEXT NOT NULL DEFAULT '',
    zaduzena_osoba  TEXT NOT NULL DEFAULT '',
    prioritet       TEXT NOT NULL DEFAULT 'srednji',
    status          TEXT NOT NULL DEFAULT 'nije_poceto',
    procesni_rok    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS troskovnik_stavke (
    id         TEXT PRIMARY KEY,
    predmet_id TEXT NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
    opis       TEXT NOT NULL,
    datum      TEXT NOT NULL,
    iznos      REAL NOT NULL,
    pdv        INTEGER NOT NULL DEFAULT 0,
    napomena   TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

// ── Migracije ──────────────────────────────────────────────────────────────────
// office_id na predmeti i klijenti (za stare baze bez tih kolona)
{
  const pc = db.prepare("PRAGMA table_info(predmeti)").all().map((c) => c.name);
  if (!pc.includes("office_id")) db.exec("ALTER TABLE predmeti ADD COLUMN office_id TEXT NOT NULL DEFAULT ''");
  const kc = db.prepare("PRAGMA table_info(klijenti)").all().map((c) => c.name);
  if (!kc.includes("office_id")) db.exec("ALTER TABLE klijenti ADD COLUMN office_id TEXT NOT NULL DEFAULT ''");
}

let predCols = db.prepare("PRAGMA table_info(predmeti)").all().map((c) => c.name);
if (!predCols.includes("poslovni_broj"))   db.exec("ALTER TABLE predmeti ADD COLUMN poslovni_broj   TEXT NOT NULL DEFAULT ''");
if (!predCols.includes("klijent_id"))      db.exec("ALTER TABLE predmeti ADD COLUMN klijent_id      TEXT");
if (!predCols.includes("vps"))             db.exec("ALTER TABLE predmeti ADD COLUMN vps             TEXT NOT NULL DEFAULT ''");
if (!predCols.includes("naziv_predmeta"))  db.exec("ALTER TABLE predmeti ADD COLUMN naziv_predmeta  TEXT NOT NULL DEFAULT ''");
if (!predCols.includes("uloga_klijenta"))  db.exec("ALTER TABLE predmeti ADD COLUMN uloga_klijenta  TEXT NOT NULL DEFAULT 'Tužitelj'");

// Rename vrsta values SUDSKI→SPORNI and NESUDSKI→NESPORNI (idempotent)
db.exec("UPDATE predmeti SET vrsta = 'SPORNI'   WHERE vrsta = 'SUDSKI'");
db.exec("UPDATE predmeti SET vrsta = 'NESPORNI' WHERE vrsta = 'NESUDSKI'");

// Rename tuzitelj/tuzeni columns → stranka/protustranka (SQLite 3.25+)
predCols = db.prepare("PRAGMA table_info(predmeti)").all().map((c) => c.name);
if (predCols.includes("tuzitelj_ime")) db.exec("ALTER TABLE predmeti RENAME COLUMN tuzitelj_ime TO stranka_ime");
if (predCols.includes("tuzitelj_oib")) db.exec("ALTER TABLE predmeti RENAME COLUMN tuzitelj_oib TO stranka_oib");
if (predCols.includes("tuzeni_ime"))   db.exec("ALTER TABLE predmeti RENAME COLUMN tuzeni_ime   TO protustranka_ime");
if (predCols.includes("tuzeni_oib"))   db.exec("ALTER TABLE predmeti RENAME COLUMN tuzeni_oib   TO protustranka_oib");

// Add stranka_uloga column if not yet present
predCols = db.prepare("PRAGMA table_info(predmeti)").all().map((c) => c.name);
if (!predCols.includes("stranka_uloga"))    db.exec("ALTER TABLE predmeti ADD COLUMN stranka_uloga    TEXT NOT NULL DEFAULT 'Tužitelj'");
if (!predCols.includes("strana_umjesaca"))  db.exec("ALTER TABLE predmeti ADD COLUMN strana_umjesaca  TEXT NOT NULL DEFAULT 'tuzitelj'");
// Backfill stranka_uloga from uloga_klijenta for existing SPORNI rows
db.exec("UPDATE predmeti SET stranka_uloga = uloga_klijenta WHERE vrsta = 'SPORNI' AND stranka_uloga = 'Tužitelj' AND uloga_klijenta != ''");

const rokCols = db.prepare("PRAGMA table_info(rokovi)").all().map((c) => c.name);
if (!rokCols.includes("tip_pristupa")) db.exec("ALTER TABLE rokovi ADD COLUMN tip_pristupa TEXT NOT NULL DEFAULT 'opci'");
if (!rokCols.includes("vrsta_roka"))   db.exec("ALTER TABLE rokovi ADD COLUMN vrsta_roka   TEXT NOT NULL DEFAULT 'ostalo'");
if (!rokCols.includes("vrijeme"))      db.exec("ALTER TABLE rokovi ADD COLUMN vrijeme      TEXT NOT NULL DEFAULT ''");
if (!rokCols.includes("lokacija"))     db.exec("ALTER TABLE rokovi ADD COLUMN lokacija     TEXT NOT NULL DEFAULT ''");
if (!rokCols.includes("sudac_roka"))   db.exec("ALTER TABLE rokovi ADD COLUMN sudac_roka   TEXT NOT NULL DEFAULT ''");
if (!rokCols.includes("dvorana"))      db.exec("ALTER TABLE rokovi ADD COLUMN dvorana      TEXT NOT NULL DEFAULT ''");

const dokCols = db.prepare("PRAGMA table_info(dokumenti)").all().map((c) => c.name);
if (!dokCols.includes("putanja"))  db.exec("ALTER TABLE dokumenti ADD COLUMN putanja  TEXT    NOT NULL DEFAULT ''");
if (!dokCols.includes("velicina")) db.exec("ALTER TABLE dokumenti ADD COLUMN velicina INTEGER NOT NULL DEFAULT 0");
if (!dokCols.includes("mime_tip")) db.exec("ALTER TABLE dokumenti ADD COLUMN mime_tip TEXT    NOT NULL DEFAULT ''");

export default db;
