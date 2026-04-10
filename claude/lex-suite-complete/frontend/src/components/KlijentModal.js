import React, { useState } from "react";

const EMPTY_FORM = { naziv: "", oib: "", tip: "fizicka", email: "", telefon: "", adresa: "", biljeske: "" };

export default function KlijentModal({ initialData, onSave, onClose }) {
  const [form, setForm]   = useState(initialData || EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!initialData;

  const submit = async () => {
    if (!form.naziv.trim()) { setError("Naziv je obavezan."); return; }
    setLoading(true); setError("");
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "Uredi klijenta" : "Novi klijent"}</span>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>⚠ {error}</div>}
          <div className="form-grid">
            <div className="form-group full">
              <label>Ime i prezime / naziv tvrtke *</label>
              <input placeholder="npr. Ivan Horvat ili Horvat d.o.o." value={form.naziv} onChange={(e) => set("naziv", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tip</label>
              <select value={form.tip} onChange={(e) => set("tip", e.target.value)}>
                <option value="fizicka">Fizička osoba</option>
                <option value="pravna">Pravna osoba</option>
              </select>
            </div>
            <div className="form-group">
              <label>OIB</label>
              <input
                placeholder="11 znamenki"
                maxLength={11}
                value={form.oib}
                onChange={(e) => set("oib", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="email@primjer.hr" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <input placeholder="+385 91 234 5678" value={form.telefon} onChange={(e) => set("telefon", e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Adresa</label>
              <input placeholder="Ulica i broj, Grad" value={form.adresa} onChange={(e) => set("adresa", e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Bilješke</label>
              <textarea placeholder="Interne napomene o klijentu..." value={form.biljeske} onChange={(e) => set("biljeske", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Odustani</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Spremam..." : isEdit ? "Spremi izmjene" : "Dodaj klijenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
