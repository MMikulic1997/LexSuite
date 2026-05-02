import { apiFetch } from "../api";

const BASE = "/api";

function getToken() {
  return localStorage.getItem("lexsuite_token");
}

function handleUnauthorized() {
  localStorage.removeItem("lexsuite_token");
  window.location.reload();
}

async function req(method, path, body) {
  const token = getToken();
  if (!token) {
    handleUnauthorized();
    return;
  }

  const res = await apiFetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    handleUnauthorized();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Greška na serveru");
  }
  return res.json();
}

export const api = {
  // Pregled
  getPregled: () => req("GET", "/pregled"),

  // Predmeti
  getPredmeti: () => req("GET", "/predmeti"),
  getPredmet: (id) => req("GET", `/predmeti/${id}`),
  createPredmet: (data) => req("POST", "/predmeti", data),
  updatePredmet: (id, data) => req("PATCH", `/predmeti/${id}`, data),
  deletePredmet: (id) => req("DELETE", `/predmeti/${id}`),

  // Rokovi
  getRokovi: () => req("GET", "/rokovi"),
  createRok: (predmetId, data) => req("POST", `/predmeti/${predmetId}/rokovi`, data),
  updateRok: (predmetId, rokId, data) => req("PATCH", `/predmeti/${predmetId}/rokovi/${rokId}`, data),
  deleteRok: (predmetId, rokId) => req("DELETE", `/predmeti/${predmetId}/rokovi/${rokId}`),

  // Tijek
  createTijek: (predmetId, data) => req("POST", `/predmeti/${predmetId}/tijek`, data),
  deleteTijek: (predmetId, unosId) => req("DELETE", `/predmeti/${predmetId}/tijek/${unosId}`),

  // Dokumenti
  createDokument: (predmetId, data) => req("POST", `/predmeti/${predmetId}/dokumenti`, data),
  deleteDokument: (predmetId, dokId) => req("DELETE", `/predmeti/${predmetId}/dokumenti/${dokId}`),

  uploadDokument: async (predmetId, fajl, meta = {}) => {
    const token = getToken();
    if (!token) { handleUnauthorized(); return; }

    const fd = new FormData();
    fd.append("fajl", fajl);
    if (meta.naziv) fd.append("naziv", meta.naziv);
    if (meta.vrsta) fd.append("vrsta", meta.vrsta);
    if (meta.opis)  fd.append("opis",  meta.opis);

    const res = await apiFetch(`${BASE}/predmeti/${predmetId}/dokumenti/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: fd,
    });

    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Greška pri uploadu");
    }
    return res.json();
  },

  getFajlUrl: (predmetId, dokId) => `${BASE}/predmeti/${predmetId}/dokumenti/${dokId}/fajl`,

  // Zadaci
  createZadatak:  (predmetId, data)           => req("POST",   `/predmeti/${predmetId}/zadaci`, data),
  updateZadatak:  (predmetId, zadatakId, data) => req("PATCH",  `/predmeti/${predmetId}/zadaci/${zadatakId}`, data),
  deleteZadatak:  (predmetId, zadatakId)       => req("DELETE", `/predmeti/${predmetId}/zadaci/${zadatakId}`),

  // Troškovnik
  createStavka:   (predmetId, data)       => req("POST",   `/predmeti/${predmetId}/troskovnik`, data),
  deleteStavka:   (predmetId, stavkaId)   => req("DELETE", `/predmeti/${predmetId}/troskovnik/${stavkaId}`),

  // Klijenti
  getKlijenti:          ()     => req("GET",    "/klijenti"),
  getKlijentiPregled:   ()     => req("GET",    "/klijenti/pregled"),
  getPredmetiByKlijent: (id)   => req("GET",    `/klijenti/${id}/predmeti`),
  getKlijent:     (id)         => req("GET",    `/klijenti/${id}`),
  createKlijent:  (data)       => req("POST",   "/klijenti", data),
  updateKlijent:  (id, data)   => req("PATCH",  `/klijenti/${id}`, data),
  deleteKlijent:  (id)         => req("DELETE", `/klijenti/${id}`),
};
