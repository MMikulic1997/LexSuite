import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { apiFetch } from "../api";
import DatumBox from "../components/DatumBox";
import { getStrankeOrder } from "../utils/strankeUtils";

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString("hr-HR");
}

// ── Naslovnica ──────────────────────────────────────────────────────────────────
function Naslovnica({ predmet, onUpdate, onSelectKlijent }) {
  const isSporni = predmet.vrsta === "SPORNI";

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    nazivPredmeta:  predmet.nazivPredmeta  || "",
    poslovniBroj:   predmet.poslovniBroj   || "",
    vps:            predmet.vps            || "",
    sud:            predmet.sud            || "",
    sudac:          predmet.sudac          || "",
    opis:           predmet.opis           || "",
    status:         predmet.status,
    stranaUmjesaca: predmet.stranaUmjesaca || "tuzitelj",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    await onUpdate(form);
    setEditMode(false);
  };

  const InfoRow = ({ label, value, mono }) => value ? (
    <div>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}>{value}</div>
    </div>
  ) : null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Osnovne informacije</span>
        {!editMode
          ? <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>✏ Uredi</button>
          : <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Odustani</button>
              <button className="btn btn-gold btn-sm" onClick={save}>Spremi</button>
            </div>
        }
      </div>
      <div className="card-body">
        {editMode ? (
          <div className="form-grid">
            <div className="form-group full">
              <label>Naziv predmeta *</label>
              <input value={form.nazivPredmeta} onChange={(e) => set("nazivPredmeta", e.target.value)} />
            </div>
            {isSporni && (
              <>
                <div className="form-group">
                  <label>Sud</label>
                  <input placeholder="npr. Općinski sud Zagreb" value={form.sud} onChange={(e) => set("sud", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sudac</label>
                  <input value={form.sudac} onChange={(e) => set("sudac", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>VPS – Vrijednost predmeta spora</label>
                  <input placeholder="npr. 50.000,00 EUR" value={form.vps} onChange={(e) => set("vps", e.target.value)} />
                </div>
                {predmet.stranka?.uloga === "Umješač" && (
                  <div className="form-group">
                    <label>Strana umješača</label>
                    <select value={form.stranaUmjesaca} onChange={(e) => set("stranaUmjesaca", e.target.value)}>
                      <option value="tuzitelj">Na strani tužitelja</option>
                      <option value="tuzenik">Na strani tuženika</option>
                    </select>
                  </div>
                )}
              </>
            )}
            <div className="form-group">
              <label>{isSporni ? "Poslovni broj suda" : "Poslovni broj / referenca"}</label>
              <input
                placeholder={isSporni ? "npr. P-123/2025" : "npr. Ugovor-2025-001 (opcionalno)"}
                value={form.poslovniBroj}
                onChange={(e) => set("poslovniBroj", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="aktivan">Aktivan</option>
                <option value="zatvoren">Zatvoren</option>
                <option value="mirovanje">Mirovanje</option>
              </select>
            </div>
            <div className="form-group full">
              <label>Opis predmeta</label>
              <textarea value={form.opis} onChange={(e) => set("opis", e.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: predmet.opis ? 20 : 0 }}>
              {isSporni ? (() => {
                const { lijevo, desno } = getStrankeOrder(predmet);
                return (
                  <>
                    <InfoRow label={`${lijevo.uloga || "Stranka"}${lijevo.isKlijent ? " (naš klijent)" : ""}`} value={lijevo.ime} />
                    {lijevo.oib && <InfoRow label={`${lijevo.uloga || "Stranka"} OIB`} value={lijevo.oib} mono />}
                    {desno.ime && <InfoRow label={`${desno.uloga || "Protustranka"}${desno.isKlijent ? " (naš klijent)" : ""}`} value={desno.ime} />}
                    {desno.oib && <InfoRow label={`${desno.uloga || "Protustranka"} OIB`} value={desno.oib} mono />}
                    {predmet.stranka?.uloga === "Umješač" && (
                      <InfoRow label="Strana umješača" value={predmet.stranaUmjesaca === "tuzenik" ? "Na strani tuženika" : "Na strani tužitelja"} />
                    )}
                  </>
                );
              })() : (
                <>
                  <InfoRow label="Klijent" value={predmet.stranka?.ime} />
                  {predmet.stranka?.oib && <InfoRow label="OIB" value={predmet.stranka.oib} mono />}
                </>
              )}
              {isSporni && predmet.sud && <InfoRow label="Sud" value={predmet.sud} />}
              {isSporni && predmet.sudac && <InfoRow label="Sudac" value={predmet.sudac} />}
              {predmet.poslovniBroj && <InfoRow label={isSporni ? "Poslovni broj suda" : "Poslovni broj / referenca"} value={predmet.poslovniBroj} />}
              {isSporni && predmet.vps && <InfoRow label="VPS" value={predmet.vps} />}
              {predmet.klijent && (
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 3 }}>
                    Klijent ureda
                  </div>
                  <button
                    onClick={() => onSelectKlijent?.(predmet.klijent.id)}
                    style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, textDecoration: "underline" }}
                  >
                    {predmet.klijent.naziv}
                  </button>
                  {predmet.ulogaKlijenta && (
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
                      {predmet.ulogaKlijenta}
                    </div>
                  )}
                </div>
              )}
            </div>
            {predmet.opis && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink-3)", marginBottom: 6 }}>Opis</div>
                <p style={{ lineHeight: 1.7, color: "var(--ink-2)" }}>{predmet.opis}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rokovnik ────────────────────────────────────────────────────────────────────
const VRSTA_LABEL = { rociste: "Ročište", sastanak: "Sastanak", ostalo: "Ostalo" };
const EMPTY_ROK_FORM = { vrstaRoka: "rociste", naziv: "", datum: "", vrijeme: "", lokacija: "", sudacRoka: "", dvorana: "", napomena: "", zaduzenaOsoba: "" };

function Rokovnik({ predmet, onRefresh }) {
  const [modal, setModal]     = useState(false);
  const [editRok, setEditRok] = useState(null);      // null = new, rok = edit
  const [tipRoka, setTipRoka] = useState(null);      // null | "rociste_sastanak" | "procesni"
  const [form, setForm]       = useState(EMPTY_ROK_FORM);
  const [error, setError]     = useState("");
  const [members, setMembers] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    apiFetch("/api/office/members")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMembers(data); })
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditRok(null); setTipRoka(null); setForm(EMPTY_ROK_FORM); setError(""); setModal(true);
  };

  const openEdit = (rok) => {
    const isProc = rok.vrstaRoka === "procesni";
    setEditRok(rok);
    setTipRoka(isProc ? "procesni" : "rociste_sastanak");
    setForm({
      vrstaRoka:     rok.vrstaRoka,
      naziv:         rok.naziv,
      datum:         rok.datum ? rok.datum.slice(0, 10) : "",
      vrijeme:       rok.vrijeme       || "",
      lokacija:      rok.lokacija      || "",
      sudacRoka:     rok.sudacRoka     || "",
      dvorana:       rok.dvorana       || "",
      napomena:      rok.napomena      || "",
      zaduzenaOsoba: rok.zaduzenaOsoba || "",
    });
    setError(""); setModal(true);
  };

  const closeModal = () => {
    setModal(false); setEditRok(null); setTipRoka(null); setForm(EMPTY_ROK_FORM); setError("");
  };

  const submit = async () => {
    if (!form.datum) { setError("Datum je obavezan."); return; }
    if (tipRoka === "procesni" && !form.naziv.trim()) { setError("Naziv roka je obavezan."); return; }
    setError("");
    const isProc = tipRoka === "procesni";
    const isRociste = !isProc && form.vrstaRoka === "rociste";
    const payload = {
      vrstaRoka:     isProc ? "procesni" : form.vrstaRoka,
      naziv:         isProc ? form.naziv.trim() : VRSTA_LABEL[form.vrstaRoka],
      datum:         form.datum,
      vrijeme:       isProc ? "" : form.vrijeme,
      lokacija:      isProc ? "" : form.lokacija,
      sudacRoka:     isRociste ? form.sudacRoka : "",
      dvorana:       isRociste ? form.dvorana   : "",
      napomena:      form.napomena,
      zaduzenaOsoba: form.zaduzenaOsoba,
    };
    if (editRok) {
      await api.updateRok(predmet.id, editRok.id, payload);
    } else {
      await api.createRok(predmet.id, payload);
    }
    closeModal(); onRefresh();
  };

  const toggle = async (rok) => {
    await api.updateRok(predmet.id, rok.id, { dovrseno: !rok.dovrseno });
    onRefresh();
  };

  const del = async (rokId) => {
    if (!window.confirm("Brisanje roka?")) return;
    await api.deleteRok(predmet.id, rokId);
    onRefresh();
  };

  const sorted = [...predmet.rokovi].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const nadolazeci = sorted.filter((r) => !r.dovrseno && new Date(r.datum) >= new Date());
  const prosliDovrseni = sorted.filter((r) => r.dovrseno || new Date(r.datum) < new Date());

  const RokRow = ({ rok }) => {
    const isProc = rok.vrstaRoka === "procesni";
    return (
      <div className={`rok-item${rok.dovrseno ? " rok-dovrseno" : ""}`}>
        <DatumBox iso={rok.datum} />
        <div className="rok-info">
          <div className="rok-naziv">
            {rok.naziv}
            <span style={{
              marginLeft: 8, fontSize: 11, borderRadius: 4, padding: "2px 6px",
              background: isProc ? "var(--blue-pale)" : "var(--border)",
              color:      isProc ? "var(--blue)"      : "var(--ink-2)",
            }}>
              {isProc ? "Procesni rok" : (VRSTA_LABEL[rok.vrstaRoka] || "Ostalo")}
            </span>
          </div>
          {!isProc && (rok.vrijeme || rok.lokacija || rok.dvorana || rok.sudacRoka) && (
            <div className="rok-napomena">
              {[
                rok.vrijeme   && `🕐 ${rok.vrijeme}`,
                rok.lokacija  && `📍 ${rok.lokacija}`,
                rok.dvorana   && `🚪 ${rok.dvorana}`,
                rok.sudacRoka && `⚖️ ${rok.sudacRoka}`,
              ].filter(Boolean).map((item, i, arr) => (
                <React.Fragment key={i}>
                  <span>{item}</span>
                  {i < arr.length - 1 && <span style={{ margin: "0 6px", opacity: .4 }}>·</span>}
                </React.Fragment>
              ))}
            </div>
          )}
          {rok.napomena && <div className="rok-napomena">{rok.napomena}</div>}
          {rok.zaduzenaOsoba && (
            <div className="rok-napomena">
              👤 {members.find((m) => m.id === rok.zaduzenaOsoba)?.name || rok.zaduzenaOsoba}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(rok)} title="Uredi rok">✏</button>
          <button className="btn btn-sm btn-ghost" onClick={() => toggle(rok)} title={rok.dovrseno ? "Označi nedovršenim" : "Označi dovršenim"}>
            {rok.dovrseno ? "↩" : "✓"}
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => del(rok.id)}>×</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Rokovnik</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Dodaj rok</button>
        </div>
        <div className="card-body">
          {predmet.rokovi.length === 0 ? (
            <div className="empty"><div className="empty-icon">📅</div><p>Nema unesenih rokova.</p></div>
          ) : (
            <>
              {nadolazeci.length > 0 && (
                <>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--ink-3)", marginBottom: 8, fontWeight: 500 }}>Nadolazeći</div>
                  {nadolazeci.map((r) => <RokRow key={r.id} rok={r} />)}
                </>
              )}
              {prosliDovrseni.length > 0 && (
                <div style={{ marginTop: nadolazeci.length ? 20 : 0 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--ink-3)", marginBottom: 8, fontWeight: 500 }}>Prošli / Dovršeni</div>
                  {prosliDovrseni.map((r) => <RokRow key={r.id} rok={r} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editRok ? "Uredi rok" : "Novi rok"}</span>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {error && <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 13 }}>⚠ {error}</div>}

              {/* ── Korak 1: odabir vrste (samo za novi rok) ── */}
              {!tipRoka ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <button
                    onClick={() => { setTipRoka("rociste_sastanak"); set("vrstaRoka", "rociste"); }}
                    style={{ padding: "20px 16px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", cursor: "pointer", textAlign: "left", transition: "border-color .15s, background .15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.background = "var(--gold-pale)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-2)"; }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 10 }}>📅</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, color: "var(--ink)" }}>Ročište / Sastanak</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Datum, vrijeme i lokacija</div>
                  </button>
                  <button
                    onClick={() => setTipRoka("procesni")}
                    style={{ padding: "20px 16px", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", cursor: "pointer", textAlign: "left", transition: "border-color .15s, background .15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "var(--blue-pale)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-2)"; }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 10 }}>⏱</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, color: "var(--ink)" }}>Procesni rok</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Naziv (Žalba, Očitovanje...) i datum</div>
                  </button>
                </div>
              ) : (
                <div className="form-grid">
                  {/* Povratak na odabir vrste (samo novi rok) */}
                  {!editRok && (
                    <div className="form-group full" style={{ marginBottom: 0 }}>
                      <button
                        onClick={() => { setTipRoka(null); setError(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 13, padding: "0 0 4px 0", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        ← Promijeni vrstu
                      </button>
                    </div>
                  )}

                  {tipRoka === "rociste_sastanak" ? (
                    <>
                      <div className="form-group">
                        <label>Vrsta *</label>
                        <select value={form.vrstaRoka} onChange={(e) => set("vrstaRoka", e.target.value)}>
                          <option value="rociste">Ročište</option>
                          <option value="sastanak">Sastanak</option>
                          <option value="ostalo">Ostalo</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Datum *</label>
                        <input type="date" value={form.datum} onChange={(e) => set("datum", e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Vrijeme</label>
                        <input type="time" value={form.vrijeme} onChange={(e) => set("vrijeme", e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Lokacija</label>
                        <input placeholder="npr. Općinski sud Zagreb" value={form.lokacija} onChange={(e) => set("lokacija", e.target.value)} />
                      </div>
                      {form.vrstaRoka === "rociste" && (
                        <>
                          <div className="form-group">
                            <label>Sudac</label>
                            <input placeholder="Ime i prezime suca" value={form.sudacRoka} onChange={(e) => set("sudacRoka", e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Dvorana / Ured</label>
                            <input placeholder="npr. Sala 5" value={form.dvorana} onChange={(e) => set("dvorana", e.target.value)} />
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="form-group full">
                        <label>Naziv roka *</label>
                        <input
                          placeholder="npr. Žalba, Očitovanje, Dostava podnesaka..."
                          value={form.naziv}
                          onChange={(e) => set("naziv", e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="form-group full">
                        <label>Datum *</label>
                        <input type="date" value={form.datum} onChange={(e) => set("datum", e.target.value)} />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label>Zadužena osoba</label>
                    <select value={form.zaduzenaOsoba} onChange={(e) => set("zaduzenaOsoba", e.target.value)}>
                      <option value="">— Nije dodijeljeno —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Napomena</label>
                    <textarea placeholder="Dodatne informacije..." value={form.napomena} onChange={(e) => set("napomena", e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Odustani</button>
              {tipRoka && (
                <button className="btn btn-primary" onClick={submit}>
                  {editRok ? "Spremi izmjene" : "Dodaj rok"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Dokumenti ───────────────────────────────────────────────────────────────────
const DOK_IKONE = { tuzba: "📄", odgovor: "📋", presuda: "⚖️", rjesenje: "📑", nalaz: "🔍", ostalo: "📁" };

function formatVelicina(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Dokumenti({ predmet, onRefresh }) {
  const [modal, setModal]         = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm]           = useState({ naziv: "", vrsta: "ostalo", opis: "" });
  const [fajl, setFajl]           = useState(null);
  const [uploadForm, setUploadForm] = useState({ naziv: "", vrsta: "ostalo", opis: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setUF = (k, v) => setUploadForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.naziv) return;
    await api.createDokument(predmet.id, form);
    setForm({ naziv: "", vrsta: "ostalo", opis: "" });
    setModal(false);
    onRefresh();
  };

  const handleUpload = async () => {
    if (!fajl) return;
    setUploading(true);
    setUploadError("");
    try {
      await api.uploadDokument(predmet.id, fajl, uploadForm);
      setFajl(null);
      setUploadForm({ naziv: "", vrsta: "ostalo", opis: "" });
      setUploadModal(false);
      onRefresh();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchBlob = async (dokId) => {
    const res = await apiFetch(api.getFajlUrl(predmet.id, dokId));
    if (!res.ok) throw new Error("Fajl nije dostupan");
    return { blob: await res.blob(), type: res.headers.get("Content-Type") || "" };
  };

  const prikaziFajl = async (d) => {
    const { blob } = await fetchBlob(d.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const downloadFajl = async (d) => {
    const { blob } = await fetchBlob(d.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.naziv;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const del = async (dokId) => {
    if (!window.confirm("Brisanje dokumenta?")) return;
    await api.deleteDokument(predmet.id, dokId);
    onRefresh();
  };

  const DokVrstaSelect = ({ value, onChange }) => (
    <select value={value} onChange={onChange}>
      <option value="tuzba">Tužba</option>
      <option value="odgovor">Odgovor na tužbu</option>
      <option value="presuda">Presuda</option>
      <option value="rjesenje">Rješenje</option>
      <option value="nalaz">Vještački nalaz</option>
      <option value="ostalo">Ostalo</option>
    </select>
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Dokumenti</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(true)}>+ Bilješka</button>
            <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>↑ Upload fajla</button>
          </div>
        </div>
        <div className="card-body">
          {predmet.dokumenti.length === 0 ? (
            <div className="empty"><div className="empty-icon">📂</div><p>Nema dodanih dokumenata.</p></div>
          ) : (
            predmet.dokumenti.map((d) => (
              <div key={d.id} className="dok-item">
                <div className="dok-icon">{DOK_IKONE[d.vrsta] || "📁"}</div>
                <div className="dok-info">
                  <div className="dok-naziv">{d.naziv}</div>
                  <div className="dok-meta">
                    {d.vrsta} · {formatDatum(d.datumDodavanja)}
                    {d.velicina ? ` · ${formatVelicina(d.velicina)}` : ""}
                    {d.opis ? ` · ${d.opis}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {d.putanja && <>
                    <button className="btn btn-sm btn-ghost" onClick={() => prikaziFajl(d)} title="Otvori u novom tabu">Prikaži</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => downloadFajl(d)} title="Preuzmi fajl">Download</button>
                  </>}
                  <button className="btn btn-sm btn-danger" onClick={() => del(d.id)}>Obriši</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: bilješka bez fajla */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nova bilješka dokumenta</span>
              <button className="btn-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Naziv *</label>
                  <input placeholder="npr. Tužba od 15.03.2025." value={form.naziv} onChange={(e) => setF("naziv", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vrsta</label>
                  <DokVrstaSelect value={form.vrsta} onChange={(e) => setF("vrsta", e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Opis / bilješka</label>
                  <textarea placeholder="Kratak opis dokumenta..." value={form.opis} onChange={(e) => setF("opis", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Odustani</button>
              <button className="btn btn-primary" onClick={add}>Dodaj</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: upload fajla */}
      {uploadModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setUploadModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Upload dokumenta</span>
              <button className="btn-close" onClick={() => setUploadModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {uploadError && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>⚠ {uploadError}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label>Fajl * (PDF, Word, slike – max 50 MB)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      setFajl(f || null);
                      if (f && !uploadForm.naziv) setUF("naziv", f.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                </div>
                <div className="form-group full">
                  <label>Naziv dokumenta</label>
                  <input
                    placeholder="Ostavite prazno za naziv fajla"
                    value={uploadForm.naziv}
                    onChange={(e) => setUF("naziv", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Vrsta</label>
                  <DokVrstaSelect value={uploadForm.vrsta} onChange={(e) => setUF("vrsta", e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Opis / bilješka</label>
                  <textarea placeholder="Kratak opis..." value={uploadForm.opis} onChange={(e) => setUF("opis", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setUploadModal(false)}>Odustani</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!fajl || uploading}>
                {uploading ? "Uploading..." : "Spremi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Zadaci ──────────────────────────────────────────────────────────────────────
const PRIORITET = {
  visok:   { bg: "#FEF2F2", color: "#B91C1C", label: "Visok" },
  srednji: { bg: "#FFFBEB", color: "#B45309", label: "Srednji" },
  nizak:   { bg: "#F0FDF4", color: "#15803D", label: "Nizak" },
};

const STATUS_NEXT_LABEL = {
  nije_poceto: "Nije početo",
  u_tijeku:    "U tijeku",
  zavrseno:    "Završeno",
};

function parseJwt(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return {}; }
}

function Zadaci({ predmet, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ naziv: "", opis: "", rok: "", zaduzenaOsoba: "", prioritet: "srednji" });
  const [dodajURokovnik, setDodajURokovnik] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { userId: currentUserId, role: currentRole } = parseJwt(localStorage.getItem("lexsuite_token") || "");
  const membersMap = Object.fromEntries(members.map((m) => [m.id, m.name]));

  useEffect(() => {
    apiFetch("/api/office/members")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMembers(data); })
      .catch(() => {});
  }, []);

  const add = async () => {
    if (!form.naziv.trim()) { setError("Naziv je obavezan."); return; }
    setError("");
    await api.createZadatak(predmet.id, form);
    if (dodajURokovnik && form.rok) {
      await api.createRok(predmet.id, {
        vrstaRoka: "procesni",
        naziv: form.naziv.trim(),
        datum: form.rok,
        vrijeme: "", lokacija: "", sudacRoka: "", dvorana: "", napomena: "",
      });
    }
    setForm({ naziv: "", opis: "", rok: "", zaduzenaOsoba: "", prioritet: "srednji" });
    setDodajURokovnik(false);
    setModal(false);
    onRefresh();
  };

  const changeStatus = async (zadatak, status) => {
    await api.updateZadatak(predmet.id, zadatak.id, { status });
    onRefresh();
  };

  const del = async (zadatakId) => {
    if (!window.confirm("Obrisati zadatak?")) return;
    await api.deleteZadatak(predmet.id, zadatakId);
    onRefresh();
  };

  const formatRok = (iso) => iso ? new Date(iso).toLocaleDateString("hr-HR") : null;

  const zadaci = predmet.zadaci || [];
  const groups = [
    { key: "u_tijeku",    label: "U tijeku",   items: zadaci.filter((z) => z.status === "u_tijeku") },
    { key: "nije_poceto", label: "Nije početo", items: zadaci.filter((z) => z.status === "nije_poceto") },
    { key: "zavrseno",    label: "Završeno",    items: zadaci.filter((z) => z.status === "zavrseno") },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Zadaci</span>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Novi zadatak</button>
        </div>
        <div className="card-body">
          {zadaci.length === 0 ? (
            <div className="empty"><div className="empty-icon">✓</div><p>Nema zadataka za ovaj predmet.</p></div>
          ) : (
            groups.map((g, gi) => (
              <div key={g.key} style={{ marginBottom: gi < groups.length - 1 ? 28 : 0 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--ink-3)", fontWeight: 600, marginBottom: 10 }}>
                  {g.label} <span style={{ fontWeight: 400 }}>· {g.items.length}</span>
                </div>
                {g.items.map((z, i) => {
                  const pr = PRIORITET[z.prioritet] || PRIORITET.srednji;
                  const isZavrseno = z.status === "zavrseno";
                  return (
                    <div key={z.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "12px 0",
                      borderBottom: i < g.items.length - 1 ? "1px solid var(--border)" : "none",
                      opacity: isZavrseno ? .5 : 1,
                    }}>
                      <div style={{ width: 3, borderRadius: 2, background: pr.color, alignSelf: "stretch", flexShrink: 0, minHeight: 20 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14, textDecoration: isZavrseno ? "line-through" : "none" }}>
                          {z.naziv}
                        </div>
                        {z.opis && <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{z.opis}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 11, background: pr.bg, color: pr.color, borderRadius: 4, padding: "2px 7px", fontWeight: 500 }}>
                            {pr.label}
                          </span>
                          {z.rok && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>📅 {formatRok(z.rok)}</span>}
                          {z.zaduzenaOsoba && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>👤 {membersMap[z.zaduzenaOsoba] || z.zaduzenaOsoba}</span>}
                        </div>
                      </div>
                      {(() => {
                          const canEdit = currentRole === "admin" || currentUserId === z.zaduzenaOsoba;
                          return (
                            <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                              <select
                                value={z.status}
                                onChange={(e) => changeStatus(z, e.target.value)}
                                disabled={!canEdit}
                                style={{ fontSize: 12, padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 4, background: canEdit ? "var(--surface)" : "var(--surface-3)", cursor: canEdit ? "pointer" : "not-allowed", color: canEdit ? "var(--ink-2)" : "var(--ink-4)", opacity: canEdit ? 1 : 0.6 }}
                              >
                                {Object.entries(STATUS_NEXT_LABEL).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                              <button className="btn btn-sm btn-danger" onClick={() => del(z.id)}>×</button>
                            </div>
                          );
                        })()}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Novi zadatak</span>
              <button className="btn-close" onClick={() => { setModal(false); setError(""); setDodajURokovnik(false); }}>×</button>
            </div>
            <div className="modal-body">
              {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>⚠ {error}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label>Naziv zadatka *</label>
                  <input placeholder="Što treba napraviti..." value={form.naziv} onChange={(e) => set("naziv", e.target.value)} autoFocus />
                </div>
                <div className="form-group full">
                  <label>Opis / napomena</label>
                  <textarea placeholder="Detalji, upute, napomene..." value={form.opis} onChange={(e) => set("opis", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Rok (opcionalno)</label>
                  <input type="date" value={form.rok} onChange={(e) => { set("rok", e.target.value); if (!e.target.value) setDodajURokovnik(false); }} />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
                  <span title={!form.rok ? "Unesite rok za dodavanje u rokovnik" : ""} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      id="dodaj-rokovnik-chk"
                      checked={dodajURokovnik}
                      disabled={!form.rok}
                      onChange={(e) => setDodajURokovnik(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: form.rok ? "pointer" : "not-allowed" }}
                    />
                    <label
                      htmlFor="dodaj-rokovnik-chk"
                      style={{ fontWeight: 400, fontSize: 13, cursor: form.rok ? "pointer" : "not-allowed", marginBottom: 0, color: form.rok ? "var(--ink)" : "var(--ink-3)" }}
                    >
                      Dodaj u rokovnik kao procesni rok
                    </label>
                  </span>
                </div>
                <div className="form-group">
                  <label>Zadužena osoba</label>
                  <select value={form.zaduzenaOsoba} onChange={(e) => set("zaduzenaOsoba", e.target.value)}>
                    <option value="">— Nije dodijeljeno —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Prioritet</label>
                  <select value={form.prioritet} onChange={(e) => set("prioritet", e.target.value)}>
                    <option value="visok">Visok</option>
                    <option value="srednji">Srednji</option>
                    <option value="nizak">Nizak</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(false); setError(""); setDodajURokovnik(false); }}>Odustani</button>
              <button className="btn btn-primary" onClick={add}>Dodaj zadatak</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Tijek ───────────────────────────────────────────────────────────────────────
function Tijek({ predmet, onRefresh }) {
  const [form, setForm] = useState({ datum: "", tekst: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.datum || !form.tekst.trim()) return;
    setLoading(true);
    await api.createTijek(predmet.id, form);
    setForm({ datum: "", tekst: "" });
    setLoading(false);
    onRefresh();
  };

  const del = async (unosId) => {
    if (!window.confirm("Obrisati ovaj unos?")) return;
    await api.deleteTijek(predmet.id, unosId);
    onRefresh();
  };

  const sorted = [...(predmet.tijek || [])].sort((a, b) => new Date(a.datum) - new Date(b.datum));

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Tijek predmeta</span>
      </div>
      <div className="card-body">
        {/* Unos novog događaja */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, alignItems: "flex-start", background: "var(--surface-2)", padding: 16, borderRadius: 6 }}>
          <input
            type="date"
            value={form.datum}
            onChange={(e) => set("datum", e.target.value)}
            style={{ width: 160, flexShrink: 0 }}
          />
          <input
            placeholder="Upiši što se dogodilo, npr. Podnesena tužba..."
            value={form.tekst}
            onChange={(e) => set("tekst", e.target.value)}
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn btn-primary" onClick={add} disabled={loading || !form.datum || !form.tekst.trim()}>
            + Dodaj
          </button>
        </div>

        {/* Timeline */}
        {sorted.length === 0 ? (
          <div className="empty"><div className="empty-icon">📜</div><p>Nema unosa. Dodaj prvi događaj u tijeku predmeta.</p></div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 28 }}>
            {/* Vertikalna linija */}
            <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "var(--border)" }} />

            {sorted.map((u, i) => {
              const d = new Date(u.datum);
              const jeZadnji = i === sorted.length - 1;
              return (
                <div key={u.id} style={{ position: "relative", marginBottom: jeZadnji ? 0 : 24 }}>
                  {/* Dot na liniji */}
                  <div style={{
                    position: "absolute", left: -24, top: 4,
                    width: 12, height: 12, borderRadius: "50%",
                    background: jeZadnji ? "var(--gold)" : "var(--border)",
                    border: `2px solid ${jeZadnji ? "var(--gold)" : "var(--ink-3)"}`,
                  }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 3 }}>
                        {d.toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.5 }}>{u.tekst}</div>
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ flexShrink: 0 }} onClick={() => del(u.id)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Troškovnik ──────────────────────────────────────────────────────────────────
function Troskovnik({ predmet, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ opis: "", datum: "", iznos: "", pdv: false, napomena: "" });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const stavke = predmet.troskovnikStavke || [];

  const add = async () => {
    if (!form.opis.trim())                                     { setError("Opis radnje je obavezan."); return; }
    if (!form.datum)                                           { setError("Datum je obavezan."); return; }
    const iznos = parseFloat(form.iznos);
    if (!form.iznos || isNaN(iznos) || iznos <= 0)             { setError("Iznos mora biti pozitivan broj."); return; }
    setError("");
    await api.createStavka(predmet.id, { opis: form.opis.trim(), datum: form.datum, iznos, pdv: form.pdv, napomena: form.napomena.trim() });
    setForm({ opis: "", datum: "", iznos: "", pdv: false, napomena: "" });
    setModal(false);
    onRefresh();
  };

  const del = async (stavkaId) => {
    if (!window.confirm("Obrisati stavku?")) return;
    await api.deleteStavka(predmet.id, stavkaId);
    onRefresh();
  };

  const fmtEur = (n) => n.toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR";
  const fmtD   = (iso) => new Date(iso).toLocaleDateString("hr-HR");

  const ukupnoBezPdv = stavke.reduce((s, st) => s + st.iznos, 0);
  const pdvIznos     = stavke.filter((s) => s.pdv).reduce((s, st) => s + st.iznos * 0.25, 0);
  const sveukupno    = ukupnoBezPdv + pdvIznos;

  const generirajPDF = () => {
    const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const today = new Date().toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" });
    const klijent = predmet.klijent?.naziv || predmet.stranka?.ime || "";

    const redovi = stavke.map((s, i) => `
      <tr>
        <td class="rb">${i + 1}.</td>
        <td class="datum">${fmtD(s.datum)}</td>
        <td class="opis">${esc(s.opis)}${s.napomena ? `<div class="nap">${esc(s.napomena)}</div>` : ""}</td>
        <td class="iznos">${fmtEur(s.iznos)}</td>
        <td class="center">${s.pdv ? "Da" : "–"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<title>Troškovnik – ${esc(predmet.oznaka)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;padding:20mm 18mm}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14mm;padding-bottom:8mm;border-bottom:2px solid #1a1a1a}
  .office-name{font-size:15pt;font-weight:700;color:#1a1a1a}
  .office-sub{font-size:9pt;color:#888;margin-top:3px}
  .doc-right{text-align:right}
  .doc-right h1{font-size:20pt;font-weight:700;letter-spacing:2px;color:#1a1a1a}
  .doc-right .sub{font-size:9.5pt;color:#666;margin-top:4px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;background:#f7f7f7;border:1px solid #e0e0e0;border-radius:4px;padding:10px 14px;margin-bottom:9mm;font-size:10pt}
  .mi{display:flex;gap:6px;align-items:baseline}
  .ml{font-size:8.5pt;color:#777;font-weight:600;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
  .mv{font-weight:500}
  table{width:100%;border-collapse:collapse;margin-bottom:7mm}
  thead{background:#1a1a1a;color:#fff}
  thead th{padding:7px 10px;font-size:8.5pt;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  thead th.iznos,thead th.rb{text-align:right}
  thead th.center{text-align:center}
  tbody tr{border-bottom:1px solid #ebebeb}
  tbody tr:nth-child(even){background:#fafafa}
  tbody td{padding:8px 10px;font-size:10pt;vertical-align:top}
  .rb{text-align:right;color:#aaa;width:28px;font-size:9pt}
  .datum{width:88px;color:#555;font-size:9.5pt;white-space:nowrap}
  .iznos{text-align:right;white-space:nowrap;font-size:10.5pt;font-weight:500}
  .center{text-align:center;width:44px;font-size:10pt}
  .nap{font-size:8.5pt;color:#888;margin-top:2px}
  .summary-wrap{display:flex;justify-content:flex-end;margin-bottom:10mm}
  .summary{width:260px;border:1px solid #ddd;border-radius:4px;overflow:hidden}
  .sr{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #ebebeb;font-size:10pt}
  .sr:last-child{border-bottom:none;background:#1a1a1a;color:#fff;font-weight:700;font-size:11pt}
  .sv{font-weight:500}
  .footer{margin-top:auto;padding-top:5mm;border-top:1px solid #e0e0e0;text-align:center;font-size:8.5pt;color:#aaa}
  @media print{body{padding:10mm}@page{margin:8mm}}
</style>
</head>
<body>
<div class="hdr">
  <div class="office">
    <div class="office-name">Odvjetničko društvo</div>
    <div class="office-sub">Odvjetnički ured</div>
  </div>
  <div class="doc-right">
    <h1>TROŠKOVNIK</h1>
    <div class="sub">Predmet: ${esc(predmet.oznaka)}</div>
  </div>
</div>
<div class="meta">
  <div class="mi"><span class="ml">Predmet:</span><span class="mv">${esc(predmet.oznaka)}</span></div>
  <div class="mi"><span class="ml">Klijent:</span><span class="mv">${esc(klijent)}</span></div>
  ${predmet.protustranka?.ime ? `<div class="mi"><span class="ml">Protustranka:</span><span class="mv">${esc(predmet.protustranka.ime)}</span></div>` : ""}
  ${predmet.sud ? `<div class="mi"><span class="ml">Sud:</span><span class="mv">${esc(predmet.sud)}</span></div>` : ""}
  <div class="mi"><span class="ml">Datum izrade:</span><span class="mv">${today}</span></div>
</div>
<table>
  <thead>
    <tr>
      <th class="rb">Rb.</th>
      <th>Datum</th>
      <th>Opis radnje</th>
      <th class="iznos">Iznos (EUR)</th>
      <th class="center">PDV</th>
    </tr>
  </thead>
  <tbody>${redovi}</tbody>
</table>
<div class="summary-wrap">
  <div class="summary">
    <div class="sr"><span>Ukupno bez PDV-a</span><span class="sv">${fmtEur(ukupnoBezPdv)}</span></div>
    <div class="sr"><span>PDV (25%)</span><span class="sv">${fmtEur(pdvIznos)}</span></div>
    <div class="sr"><span>Sveukupno</span><span class="sv">${fmtEur(sveukupno)}</span></div>
  </div>
</div>
<div class="footer">Generirano: ${today} · LexSuite</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=720");
    win.document.write(html);
    win.document.close();
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Troškovnik</span>
          <div style={{ display: "flex", gap: 8 }}>
            {stavke.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={generirajPDF}>↓ Generiraj PDF</button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Dodaj stavku</button>
          </div>
        </div>
        <div className="card-body">
          {stavke.length === 0 ? (
            <div className="empty"><div className="empty-icon">€</div><p>Nema stavki u troškovniku.</p></div>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 32, textAlign: "right" }}>Rb.</th>
                    <th style={{ width: 100 }}>Datum</th>
                    <th>Opis radnje</th>
                    <th style={{ textAlign: "right", width: 140 }}>Iznos (EUR)</th>
                    <th style={{ textAlign: "center", width: 60 }}>PDV</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {stavke.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ textAlign: "right", color: "var(--ink-4)", fontSize: 12 }}>{i + 1}.</td>
                      <td style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{fmtD(s.datum)}</td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.opis}</div>
                        {s.napomena && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{s.napomena}</div>}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {fmtEur(s.iznos)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {s.pdv
                          ? <span style={{ fontSize: 11, background: "#FFFBEB", color: "#B45309", borderRadius: 4, padding: "2px 7px", fontWeight: 500 }}>Da</span>
                          : <span style={{ fontSize: 12, color: "var(--ink-4)" }}>–</span>}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => del(s.id)}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <div style={{ minWidth: 280, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--ink-2)" }}>Ukupno bez PDV-a</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtEur(ukupnoBezPdv)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--ink-2)" }}>PDV (25%)</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtEur(pdvIznos)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-3)", fontSize: 14, fontWeight: 600 }}>
                    <span>Sveukupno</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtEur(sveukupno)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nova stavka troškovnika</span>
              <button className="btn-close" onClick={() => { setModal(false); setError(""); }}>×</button>
            </div>
            <div className="modal-body">
              {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 13 }}>⚠ {error}</div>}
              <div className="form-grid">
                <div className="form-group full">
                  <label>Opis radnje *</label>
                  <input placeholder="npr. Zastupanje na ročištu, Sastavljanje podneska..." value={form.opis} onChange={(e) => set("opis", e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                  <label>Datum radnje *</label>
                  <input type="date" value={form.datum} onChange={(e) => set("datum", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Iznos (EUR) *</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.iznos} onChange={(e) => set("iznos", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>PDV (25%)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
                    <input type="checkbox" id="pdv-chk" checked={form.pdv} onChange={(e) => set("pdv", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    <label htmlFor="pdv-chk" style={{ fontWeight: 400, fontSize: 13, cursor: "pointer", marginBottom: 0 }}>Primjenjuje se PDV</label>
                  </div>
                </div>
                <div className="form-group full">
                  <label>Napomena (opcionalno)</label>
                  <input placeholder="Kratka napomena..." value={form.napomena} onChange={(e) => set("napomena", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModal(false); setError(""); }}>Odustani</button>
              <button className="btn btn-primary" onClick={add}>Dodaj stavku</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────
export default function PredmetPage({ predmetId, onBack, onSelectKlijent }) {
  const [predmet, setPredmet] = useState(null);
  const [tab, setTab] = useState("naslovnica");

  const load = () => api.getPredmet(predmetId).then(setPredmet);
  useEffect(() => { load(); }, [predmetId]);

  if (!predmet) return <div style={{ padding: 40, color: "var(--ink-3)" }}>Učitavanje...</div>;

  const isSporni = predmet.vrsta === "SPORNI";

  const handleUpdate = async (data) => {
    await api.updatePredmet(predmet.id, data);
    load();
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Svi predmeti</button>

      <div className="predmet-header">
        <div className="predmet-oznaka">{predmet.oznaka}</div>
        {predmet.nazivPredmeta && (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", marginBottom: 6, fontStyle: "italic" }}>
            {predmet.nazivPredmeta}
          </div>
        )}
        <div className="predmet-stranke">
          {isSporni ? (() => {
            const { lijevo, desno } = getStrankeOrder(predmet);
            const roleStyle = { color: "rgba(255,255,255,.5)", margin: "0 6px", fontSize: 13, fontWeight: 400 };
            return (
              <>
                <strong>{lijevo.ime || "—"}</strong>
                {lijevo.uloga && <span style={roleStyle}>· {lijevo.uloga}</span>}
                {desno.ime && (
                  <>
                    <span style={{ color: "rgba(255,255,255,.4)", margin: "0 10px" }}>c/a</span>
                    <strong>{desno.ime}</strong>
                    {desno.uloga && <span style={roleStyle}>· {desno.uloga}</span>}
                  </>
                )}
              </>
            );
          })() : (
            <strong>{predmet.stranka?.ime}</strong>
          )}
        </div>
        <div className="predmet-meta">
          {isSporni && predmet.poslovniBroj && <div className="predmet-meta-item">Posl. broj<span>{predmet.poslovniBroj}</span></div>}
          {predmet.klijent && (
            <div className="predmet-meta-item">
              {predmet.ulogaKlijenta || "Klijent"}
              <span>
                <button
                  onClick={() => onSelectKlijent?.(predmet.klijent.id)}
                  style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "inherit", fontWeight: 600, padding: 0, textDecoration: "underline" }}
                >
                  {predmet.klijent.naziv}
                </button>
              </span>
            </div>
          )}
          {isSporni && predmet.sud && <div className="predmet-meta-item">Sud<span>{predmet.sud}</span></div>}
          {isSporni && predmet.sudac && <div className="predmet-meta-item">Sudac<span>{predmet.sudac}</span></div>}
          {isSporni && predmet.vps && <div className="predmet-meta-item">VPS<span>{predmet.vps}</span></div>}
          <div className="predmet-meta-item">Otvoreno<span>{formatDatum(predmet.datumOtvaranja)}</span></div>
          <div className="predmet-meta-item">Status<span style={{ textTransform: "capitalize" }}>{predmet.status}</span></div>
        </div>
      </div>

      <div className="tabs">
        {[["naslovnica","📋 Naslovnica"], ["rokovnik","📅 Rokovnik"], ["zadaci","✓ Zadaci"], ["dokumenti","📂 Dokumenti"], ["tijek","📜 Tijek"], ["troskovnik","€ Troškovnik"]].map(([k, label]) => (
          <button key={k} className={`tab-btn${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "naslovnica" && <Naslovnica predmet={predmet} onUpdate={handleUpdate} onSelectKlijent={onSelectKlijent} />}
      {tab === "rokovnik"   && <Rokovnik predmet={predmet} onRefresh={load} />}
      {tab === "zadaci"     && <Zadaci predmet={predmet} onRefresh={load} />}
      {tab === "dokumenti"  && <Dokumenti predmet={predmet} onRefresh={load} />}
      {tab === "tijek"      && <Tijek predmet={predmet} onRefresh={load} />}
      {tab === "troskovnik" && <Troskovnik predmet={predmet} onRefresh={load} />}
    </div>
  );
}
