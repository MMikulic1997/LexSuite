import React, { useState } from "react";
import LexicLogo from "../components/LexicLogo";
import { apiFetch } from "../api";

function Logo() {
  return (
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
        color: "#FFFFFF", letterSpacing: "-.4px",
      }}>Lexic</span>
      <span style={{
        fontSize: 12, fontWeight: 500,
        color: "rgba(255,255,255,.6)", letterSpacing: "1.4px",
        textTransform: "uppercase", marginTop: 2,
      }}>Legal Suite</span>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: "var(--red-pale)", border: "1px solid #FECACA",
      borderRadius: 6, padding: "10px 14px", marginBottom: 20,
      fontSize: 13, color: "var(--red)",
    }}>{msg}</div>
  );
}

function LoginForm({ onLogin, onShowRegister }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Unesite email i lozinku."); return; }
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Greška pri prijavi."); return; }
      localStorage.setItem("lexsuite_token", data.token);
      onLogin();
    } catch {
      setError("Nije moguće spojiti se na server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "32px 32px 28px",
      boxShadow: "0 8px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.2)",
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Prijava</h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>Prijavite se u vaš ured</p>
      <ErrorBox msg={error} />
      <form onSubmit={submit}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input type="email" placeholder="vaš@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="email" disabled={loading} />
        </div>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Lozinka</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "10px 0" }}>
          {loading ? "Prijava..." : "Prijava"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--ink-3)" }}>
        Nemate račun?{" "}
        <button onClick={onShowRegister} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--blue)", fontWeight: 600, fontSize: 13, padding: 0,
        }}>Registrirajte se</button>
      </p>
    </div>
  );
}

function RegisterForm({ onLogin, onShowLogin }) {
  const [imeUreda, setImeUreda]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!imeUreda || !email || !password || !confirm) { setError("Sva polja su obavezna."); return; }
    if (password !== confirm) { setError("Lozinke se ne podudaraju."); return; }
    if (password.length < 6) { setError("Lozinka mora imati najmanje 6 znakova."); return; }
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imeUreda, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Greška pri registraciji."); return; }
      localStorage.setItem("lexsuite_token", data.token);
      onLogin();
    } catch {
      setError("Nije moguće spojiti se na server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "32px 32px 28px",
      boxShadow: "0 8px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.2)",
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Registracija</h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>Otvorite novi ured</p>
      <ErrorBox msg={error} />
      <form onSubmit={submit}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Ime ureda</label>
          <input type="text" placeholder="npr. Odvjetnički ured Horvat" value={imeUreda}
            onChange={(e) => setImeUreda(e.target.value)} autoFocus disabled={loading} />
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input type="email" placeholder="vaš@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Lozinka</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
        </div>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Potvrda lozinke</label>
          <input type="password" placeholder="••••••••" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" disabled={loading} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "10px 0" }}>
          {loading ? "Registracija..." : "Registriraj se"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--ink-3)" }}>
        Već imate račun?{" "}
        <button onClick={onShowLogin} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--blue)", fontWeight: 600, fontSize: 13, padding: 0,
        }}>Prijavite se</button>
      </p>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundImage: "url('/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center",
      position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.52)", backdropFilter: "blur(1px)" }} />
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px", position: "relative", zIndex: 1 }}>
        <Logo />
        {showRegister
          ? <RegisterForm onLogin={onLogin} onShowLogin={() => setShowRegister(false)} />
          : <LoginForm    onLogin={onLogin} onShowRegister={() => setShowRegister(true)} />
        }
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,.35)" }}>
          LexSuite MVP v0.1
        </p>
      </div>
    </div>
  );
}
