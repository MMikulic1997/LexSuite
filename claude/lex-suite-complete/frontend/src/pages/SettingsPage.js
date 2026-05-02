import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";

const ROLE_OPTIONS_NEW = [
  { value: "odvjetnik",      label: "Odvjetnik" },
  { value: "vjezbenik",      label: "Vježbenik" },
  { value: "administracija", label: "Administracija" },
];

const ALL_ROLE_OPTIONS = [
  { value: "admin",          label: "Admin" },
  { value: "odvjetnik",      label: "Odvjetnik" },
  { value: "vjezbenik",      label: "Vježbenik" },
  { value: "administracija", label: "Administracija" },
];

// ── Modal wrapper ──────────────────────────────────────────────────────────────
function Modal({ onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: 440,
          padding: "28px 32px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Add user modal ─────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", role: "odvjetnik" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Ime je obavezno."); return; }
    if (!form.email.trim()) { setError("Email je obavezan."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Greška pri kreiranju."); return; }
      onCreated(data.user, data.otp);
    } catch {
      setError("Nije moguće spojiti se na server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Dodaj korisnika</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>
        Generirat će se privremena lozinka koju trebate proslijediti korisniku.
      </p>

      {error && (
        <div style={{
          background: "var(--red-pale)", border: "1px solid #FECACA",
          borderRadius: 6, padding: "10px 14px", marginBottom: 18,
          fontSize: 13, color: "var(--red)",
        }}>{error}</div>
      )}

      <form onSubmit={submit}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Ime i prezime</label>
          <input
            type="text"
            placeholder="Ana Anić"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
            disabled={loading}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Email</label>
          <input
            type="email"
            placeholder="ana@ured.hr"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Uloga</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            disabled={loading}
          >
            {ROLE_OPTIONS_NEW.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Odustani
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Kreiranje..." : "Kreiraj korisnika"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── OTP modal ──────────────────────────────────────────────────────────────────
function OtpModal({ user, otp, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(otp).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--green-pale)", display: "flex",
          alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 11l5 5L18 6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
          Korisnik kreiran
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>
          <strong style={{ color: "var(--ink-2)" }}>{user.name}</strong> ({user.email}) je uspješno dodan.
          <br />
          Proslijedite ovu privremenu lozinku korisniku. Prikazuje se samo jednom.
        </p>

        <div style={{
          background: "var(--surface-3)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          marginBottom: 24,
        }}>
          <code style={{
            fontFamily: "monospace", fontSize: 20, fontWeight: 700,
            letterSpacing: 3, color: "var(--ink)",
          }}>
            {otp}
          </code>
          <button
            onClick={copy}
            style={{
              background: copied ? "var(--green-pale)" : "var(--surface)",
              border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
              borderRadius: 6, padding: "6px 12px",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              color: copied ? "var(--green)" : "var(--ink-2)",
              transition: "all .15s",
            }}
          >
            {copied ? "Kopirano!" : "Kopiraj"}
          </button>
        </div>

        <button
          className="btn btn-primary"
          onClick={onClose}
          style={{ width: "100%", justifyContent: "center" }}
        >
          Zatvori
        </button>
      </div>
    </Modal>
  );
}

// ── Delete user modal ──────────────────────────────────────────────────────────
function DeleteUserModal({ user, onClose, onDeleted }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError("Lozinka je obavezna."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Greška pri brisanju."); return; }
      onDeleted(user.id);
    } catch {
      setError("Nije moguće spojiti se na server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Obriši korisnika</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>
        Sigurno želite obrisati <strong style={{ color: "var(--ink-2)" }}>{user.name || user.email}</strong>?
        Unesite svoju admin lozinku za potvrdu.
      </p>

      {error && (
        <div style={{
          background: "var(--red-pale)", border: "1px solid #FECACA",
          borderRadius: 6, padding: "10px 14px", marginBottom: 18,
          fontSize: 13, color: "var(--red)",
        }}>{error}</div>
      )}

      <form onSubmit={submit}>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Admin lozinka</label>
          <input
            type="password"
            placeholder="Vaša lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={loading}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Odustani
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 18px", borderRadius: "var(--radius)", fontWeight: 600,
              fontSize: 13, cursor: "pointer", border: "1px solid var(--red)",
              background: "var(--red)", color: "#fff", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Brisanje..." : "Obriši korisnika"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Inline role select ─────────────────────────────────────────────────────────
function RoleSelect({ userId, role, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const change = async (e) => {
    const newRole = e.target.value;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) onUpdate(await res.json());
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={role}
      onChange={change}
      disabled={saving}
      style={{
        fontSize: 13, padding: "4px 8px",
        border: "1px solid var(--border)", borderRadius: 6,
        background: "var(--surface)", color: "var(--ink)",
        cursor: "pointer", opacity: saving ? 0.6 : 1,
      }}
    >
      {ALL_ROLE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Status toggle ──────────────────────────────────────────────────────────────
function StatusToggle({ userId, isActive, onToggle }) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) onToggle(await res.json());
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      style={{
        padding: "3px 10px", borderRadius: 99,
        fontSize: 12, fontWeight: 500, cursor: "pointer",
        border: `1px solid ${isActive ? "var(--green)" : "var(--border)"}`,
        background: isActive ? "var(--green-pale)" : "var(--surface-3)",
        color: isActive ? "var(--green)" : "var(--ink-3)",
        transition: "all .15s", opacity: saving ? 0.6 : 1,
      }}
    >
      {isActive ? "Aktivan" : "Neaktivan"}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/users");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Greška pri dohvatu korisnika.");
        return;
      }
      setUsers(await res.json());
    } catch {
      setError("Nije moguće dohvatiti korisnike.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreated = (user, otp) => {
    setShowAdd(false);
    setUsers((prev) => [...prev, user]);
    setOtpData({ user, otp });
  };

  const handleUpdate = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const handleDeleted = (id) => {
    setDeleteTarget(null);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="page-inner">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.4px" }}>
            Korisnici ureda
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 3 }}>
            Upravljajte korisnicima i njihovim ulogama
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Dodaj korisnika
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "var(--red-pale)", border: "1px solid #FECACA",
          borderRadius: 8, padding: "12px 16px", marginBottom: 20,
          fontSize: 13, color: "var(--red)",
        }}>{error}</div>
      )}

      {/* Table card */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-3)", fontSize: 14 }}>
            Učitavanje...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-3)", fontSize: 14 }}>
            Nema korisnika u uredu.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Ime i prezime", "Email", "Uloga", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 20px", textAlign: "left",
                      fontSize: 11, fontWeight: 600, color: "var(--ink-3)",
                      letterSpacing: ".6px", textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: idx < users.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "13px 20px", fontWeight: 500, fontSize: 14, color: "var(--ink)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {u.name || "—"}
                      {u.isOwner && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px",
                          borderRadius: 99, background: "var(--blue-pale, #EFF6FF)",
                          color: "var(--blue)", border: "1px solid var(--blue)",
                          letterSpacing: ".3px",
                        }}>Vlasnik</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: "13px 20px", fontSize: 13, color: "var(--ink-2)" }}>
                    {u.email}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    {u.isOwner
                      ? <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Admin</span>
                      : <RoleSelect userId={u.id} role={u.role} onUpdate={handleUpdate} />
                    }
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <StatusToggle userId={u.id} isActive={u.isActive} onToggle={handleUpdate} />
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    {!u.isOwner && (
                      <button
                        onClick={() => setDeleteTarget(u)}
                        style={{
                          padding: "3px 12px", borderRadius: 6,
                          fontSize: 12, fontWeight: 500, cursor: "pointer",
                          border: "1px solid var(--border)",
                          background: "transparent", color: "var(--red)",
                          transition: "all .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-pale)"; e.currentTarget.style.borderColor = "var(--red)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        Obriši
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
      {otpData && <OtpModal user={otpData.user} otp={otpData.otp} onClose={() => setOtpData(null)} />}
      {deleteTarget && <DeleteUserModal user={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
    </div>
  );
}
