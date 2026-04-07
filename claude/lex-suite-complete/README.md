# LexSuite – Upute za pokretanje

## Što trebaš imati instalirano
- Node.js (provjeri: `node -v` u terminalu)
- VS Code

---

## Korak 1 – Preuzmi kod

Kopiraj cijeli folder `lex-suite` negdje na računalo, npr. u `C:\Users\TvojeIme\Projects\lex-suite`

---

## Korak 2 – Pokreni Backend

Otvori VS Code → **Terminal → New Terminal**

```bash
cd lex-suite/backend
npm install
npm run dev
```

Trebao bi vidjeti:
```
✅  Backend na http://localhost:3001
```

Ostavi ovaj terminal otvoren.

---

## Korak 3 – Pokreni Frontend

Otvori **još jedan terminal** u VS Code (klikni + ikonicu)

```bash
cd lex-suite/frontend
npm install
npm start
```

Automatski će otvoriti browser na `http://localhost:3000`

---

## Struktura predmeta

Oznaka se automatski generira:
- **KP** = Kazneni predmet → `KP0001/25`
- **UP** = Upravni predmet → `UP0001/25`
- **PP** = Parični predmet → `PP0001/25`
- **OS** = Obiteljski predmet → `OS0001/25`

Broj ide od 0001 na dalje po vrsti, godina je zadnje dvije cifre tekuće god.

---

## Napomena o podacima

MVP koristi memoriju – podaci se gube kad se backend restarta.
Sljedeći korak je dodati SQLite bazu (jedna datoteka, nema instalacije servera).

---

## Problemi?

- **Port zauzet**: promijeni 3001 u `backend/src/index.js` i `frontend/package.json` (proxy)
- **npm install grešia**: probaj `npm install --legacy-peer-deps` u frontend folderu
