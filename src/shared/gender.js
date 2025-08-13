// src/shared/gender.js
export const GENDER_OPTIONS = [
  { id: "male",    label: "männlich",    pronouns: { subj: "er",  obj: "ihn", poss: "sein"  } },
  { id: "female",  label: "weiblich",    pronouns: { subj: "sie", obj: "sie", poss: "ihr"   } },
  { id: "nb",      label: "nicht-binär", pronouns: { subj: "they",obj: "they",poss: "their" } },
  { id: "unknown", label: "keine Angabe",pronouns: { subj: "sie", obj: "sie", poss: "ihr"   } },
];

const ALIASES = new Map([
  ["m","male"],["mann","male"],["male","male"],["masc","male"],["männlich","male"],
  ["f","female"],["frau","female"],["weiblich","female"],["fem","female"],
  ["nb","nb"],["divers","nb"],["nonbinary","nb"],["non-binary","nb"],["enby","nb"],
  ["unknown","unknown"],["", "unknown"],[null,"unknown"],[undefined,"unknown"],
]);

export function normalizeGender(g) {
  const k = String(g ?? "").trim().toLowerCase();
  return ALIASES.get(k) || "unknown";
}

export function genderLabel(id) {
  const hit = GENDER_OPTIONS.find(x => x.id === normalizeGender(id));
  return hit ? hit.label : "keine Angabe";
}

/* ---------------- Nomen / Rollen (Lexikon + Heuristik) ---------------- */

const NOUNS = {
  // Beziehungen / Rollen
  friend:      { m:"Freund",     f:"Freundin",     n:"Freund:in" },
  romantic:    { m:"Partner",    f:"Partnerin",    n:"Partner:in" },
  ex:          { m:"Ex-Partner", f:"Ex-Partnerin", n:"Ex-Partner:in" },
  married:     { m:"Ehemann",    f:"Ehefrau",      n:"Ehepartner:in" },
  spouse:      { m:"Ehemann",    f:"Ehefrau",      n:"Ehepartner:in" },
  parent:      { m:"Vater",      f:"Mutter",       n:"Elternteil" },
  child:       { m:"Sohn",       f:"Tochter",      n:"Kind" },
  sibling:     { m:"Bruder",     f:"Schwester",    n:"Geschwister" },
  rivalry:     { m:"Rivale",     f:"Rivalin",      n:"Rival:in" },

  // Beispielberufe
  "Lehrer":          { m:"Lehrer",          f:"Lehrerin",           n:"Lehrkraft" },
  "Arzt":            { m:"Arzt",            f:"Ärztin",             n:"ärztliche Person" },
  "Polizist":        { m:"Polizist",        f:"Polizistin",         n:"Polizeikraft" },
  "Wissenschaftler": { m:"Wissenschaftler", f:"Wissenschaftlerin",  n:"Wissenschaftsperson" },
  "Sportler":        { m:"Sportler",        f:"Sportlerin",         n:"Sportperson" },
  "Verkäufer":       { m:"Verkäufer",       f:"Verkäuferin",        n:"Verkaufskraft" },
  "Ingenieur":       { m:"Ingenieur",       f:"Ingenieurin",        n:"Ingenieur:in" },
  "Student":         { m:"Student",         f:"Studentin",          n:"Studierende:r" },
};

function pickVariant(entry, g, style) {
  if (g === "male") return entry.m;
  if (g === "female") return entry.f;
  if (entry.n) return entry.n;
  const base = entry.m || entry.f;
  return genderizeNoun(base, "nb", style);
}

export function genderizeNoun(base, gender = "unknown", style = "colon") {
  if (!base) return "";
  const b = String(base).trim();
  const g = normalizeGender(gender);

  if (NOUNS[b]) return pickVariant(NOUNS[b], g, style);

  if (g === "male") return b;
  if (g === "female") {
    if (b.endsWith("er")) return b + "in";
    if (b.endsWith("e"))  return b.slice(0, -1) + "in";  // Kollege -> Kollegin
    if (b.endsWith("mann")) return b.slice(0, -4) + "frau";
    return b + "in";
  }
  const joiner = style === "star" ? "*" : style === "slash" ? "/" : ":"; // colon default
  if (b.endsWith("er")) return b + `${joiner}in`;
  if (b.endsWith("e"))  return b.slice(0, -1) + `${joiner}in`;
  return b + `${joiner}in`;
}

export function genderizeByKey(key, gender = "unknown", style = "colon") {
  const k = String(key || "").trim();
  if (NOUNS[k]) return pickVariant(NOUNS[k], normalizeGender(gender), style);
  return genderizeNoun(k, gender, style);
}

/* ---------------- Alterskategorien (Sims) ---------------- */

export function genderizeAge(age, gender = "unknown", style = "colon") {
  if (!age) return "";
  const a = String(age).trim().toLowerCase();
  const g = normalizeGender(gender);
  const joiner = style === "star" ? "*" : style === "slash" ? "/" : ":";

  const MAP = {
    "baby":        { all: "Baby" },
    "kleinkind":   { all: "Kleinkind" },
    "kind":        { all: "Kind" },
    "teen":        { all: "Teen" },      // oder "Teenager"
    "teenager":    { all: "Teenager" },

    "junger erwachsener": {
      m: "Junger Erwachsener",
      f: "Junge Erwachsene",
      n: `Junge${joiner}r Erwachsene${joiner}r`,
      u: `Junge${joiner}r Erwachsene${joiner}r`,
    },

    // Manche Daten können bereits weiblich gespeichert sein:
    "erwachsener": {
      m: "Erwachsener",
      f: "Erwachsene",
      n: `Erwachsene${joiner}r`,
      u: `Erwachsene${joiner}r`,
    },
    "erwachsene": {
      m: "Erwachsener",
      f: "Erwachsene",
      n: `Erwachsene${joiner}r`,
      u: `Erwachsene${joiner}r`,
    },

    "senior": {
      m: "Senior",
      f: "Seniorin",
      n: `Senior${joiner}in`,
      u: `Senior${joiner}in`,
    },
    "seniorin": {
      m: "Senior",
      f: "Seniorin",
      n: `Senior${joiner}in`,
      u: `Senior${joiner}in`,
    },
  };

  const entry = MAP[a];
  if (!entry) return String(age);       // unbekannter Wert → unverändert anzeigen
  if (entry.all) return entry.all;      // neutrale Formen
  if (g === "male")   return entry.m || String(age);
  if (g === "female") return entry.f || String(age);
  return entry.n || entry.u || entry.f || entry.m || String(age);
}

/* ---------------- (Optional) Adjektiv-Endungen ---------------- */

const DEF_END = {
  nom: { m:"e", f:"e", n:"e", pl:"en" },
  acc: { m:"en",f:"e", n:"e", pl:"en" },
  dat: { m:"en",f:"en",n:"en",pl:"en" },
  gen: { m:"en",f:"en",n:"en",pl:"en" },
};

export function adj(base, { gender = "n", kase = "nom", article = "def", plural = false } = {}) {
  const b = String(base||"");
  if (!b) return "";
  const g = plural ? "pl" : (gender === "male" ? "m" : gender === "female" ? "f" : "n");
  const end = (DEF_END[kase] || DEF_END.nom)[g] || "e";
  return b + end;
}
