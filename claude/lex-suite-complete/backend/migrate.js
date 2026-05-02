import db from "./src/db.js"; // inicijalizira bazu i sve postojeće tablice
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

db.pragma("foreign_keys = OFF"); // isključi FK za trajanja migracije

// ── 1. Tablica offices ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS offices (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// ── 2. Tablica users ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    office_id     TEXT NOT NULL REFERENCES offices(id),
    name          TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    is_active     INTEGER NOT NULL DEFAULT 1,
    otp           TEXT NOT NULL DEFAULT '',
    otp_used      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );
`);

// ── 3. Dodaj office_id u postojeće tablice (idempotentno) ─────────────────────
const TABLICE = [
  "klijenti",
  "predmeti",
  "rokovi",
  "dokumenti",
  "tijek",
  "zadaci",
  "troskovnik_stavke",
];

for (const tablica of TABLICE) {
  const cols = db.prepare(`PRAGMA table_info(${tablica})`).all().map((c) => c.name);
  if (!cols.includes("office_id")) {
    db.exec(`ALTER TABLE ${tablica} ADD COLUMN office_id TEXT`);
    console.log(`  + office_id dodano u: ${tablica}`);
  } else {
    console.log(`  ~ office_id već postoji u: ${tablica}`);
  }
}

// ── 4. Seed ───────────────────────────────────────────────────────────────────
const now = new Date().toISOString();

// Office — umetni samo ako još nema niti jednog
let officeId;
const postojeciOffice = db.prepare("SELECT id FROM offices LIMIT 1").get();

if (postojeciOffice) {
  officeId = postojeciOffice.id;
  console.log(`  ~ Office već postoji (id: ${officeId}), preskačem insert.`);
} else {
  officeId = randomUUID();
  db.prepare("INSERT INTO offices (id, name, created_at) VALUES (?, ?, ?)").run(
    officeId,
    "Glavni ured",
    now
  );
  console.log(`  + Office kreiran (id: ${officeId})`);
}

// Admin — umetni samo ako email još ne postoji
const postojeciAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@lexsuite.com");

if (postojeciAdmin) {
  console.log("  ~ Admin korisnik već postoji, preskačem insert.");
} else {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const adminId = randomUUID();
  db.prepare(`
    INSERT INTO users (id, office_id, name, email, password_hash, role, is_active, otp, otp_used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, '', 0, ?)
  `).run(adminId, officeId, "Administrator", "admin@lexsuite.com", passwordHash, "admin", now);
  console.log(`  + Admin korisnik kreiran (id: ${adminId})`);
}

// Postavi office_id na svim redovima koji ga još nemaju
for (const tablica of TABLICE) {
  const info = db.prepare(
    `UPDATE ${tablica} SET office_id = ? WHERE office_id IS NULL`
  ).run(officeId);
  if (info.changes > 0) {
    console.log(`  + ${tablica}: office_id postavljen na ${info.changes} redova`);
  }
}

db.pragma("foreign_keys = ON");

console.log("\nMigracija uspješna.");
