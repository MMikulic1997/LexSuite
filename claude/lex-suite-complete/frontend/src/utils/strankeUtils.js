// Maps each uloga to the opposing party's uloga
const OPPOSITE_ULOGA = {
  "Tužitelj":     "Tuženik",
  "Tuženik":      "Tužitelj",
  "Ovrhovoditelj":"Ovršenik",
  "Ovršenik":     "Ovrhovoditelj",
};

/**
 * Returns { lijevo, desno } where each is { ime, oib, uloga, isKlijent }
 * Legal order: Tužitelj/Ovrhovoditelj always LEFT; Tuženik/Ovršenik always RIGHT.
 * Umješač: position determined by stranaUmjesaca ("tuzenik" → right, otherwise left).
 */
export function getStrankeOrder(predmet) {
  const uloga        = predmet.stranka?.uloga || "Ostalo";
  const oppositeUloga = OPPOSITE_ULOGA[uloga] || "";

  const stranka    = { ime: predmet.stranka?.ime || "",    oib: predmet.stranka?.oib || "",    uloga,         isKlijent: true  };
  const protustr   = { ime: predmet.protustranka?.ime || "", oib: predmet.protustranka?.oib || "", uloga: oppositeUloga, isKlijent: false };

  const klijentDesno =
    uloga === "Tuženik" ||
    uloga === "Ovršenik" ||
    (uloga === "Umješač" && predmet.stranaUmjesaca === "tuzenik");

  return klijentDesno
    ? { lijevo: protustr, desno: stranka }
    : { lijevo: stranka,  desno: protustr };
}
