import React, { useState } from "react";
import LexicLogo from "../components/LexicLogo";
import { apiFetch } from "../api";

export default function ChangePasswordPage({ onBack }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.current || !form.next || !form.confirm) {
      setError("Sva polja su obavezna.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("Nova lozinka i potvrda se ne podudaraju.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Greška pri promjeni lozinke."); return; }
      setSuccess(true);
      setTimeout(() => onBack(), 2000);
    } catch {
      setError("Nije moguće spojiti se na server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface-2)",
      padding: "40px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#1C1C1E",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,.15)",
          }}>
            <LexicLogo size={34} />
          </div>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 26, fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-.4px",
          }}>Lexic</span>
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: "var(--ink-3)", letterSpacing: "1.4px",
            textTransform: "uppercase", marginTop: 2,
          }}>Legal Suite</span>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px 32px 28px",
          boxShadow: "var(--shadow)",
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
            Promjena lozinke
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>
            Unesite trenutnu i novu lozinku
          </p>

          {error && (
            <div style={{
              background: "var(--red-pale)",
              border: "1px solid #FECACA",
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          {success ? (
            <div style={{
              background: "var(--green-pale)",
              border: "1px solid var(--green)",
              borderRadius: 6,
              padding: "14px",
              textAlign: "center",
              fontSize: 14,
              color: "var(--green)",
              fontWeight: 500,
            }}>
              Lozinka uspješno promijenjena
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Trenutna lozinka</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.current}
                  onChange={(e) => setForm({ ...form, current: e.target.value })}
                  autoFocus
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Nova lozinka</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.next}
                  onChange={(e) => setForm({ ...form, next: e.target.value })}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 28 }}>
                <label>Potvrda nove lozinke</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onBack}
                  disabled={loading}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 2, justifyContent: "center", fontSize: 14 }}
                >
                  {loading ? "Spremanje..." : "Spremi lozinku"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--ink-4)" }}>
          LexSuite MVP v0.1
        </p>
      </div>
    </div>
  );
}
