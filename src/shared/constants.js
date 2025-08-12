export const THEME = {
  bg: "linear-gradient(135deg, #EAFBF3 0%, #F7FFFD 40%, #F4F8FF 100%)",
  glassBg: "rgba(255,255,255,0.78)",
  line: "#cfeede",
  text: "#0b1e13",
  subtext: "#2a4f3a",
  accent: "#00C176",
  accentSoft: "#E6FFF3",
  nodeBg: "#c8ead5",
  nodeBorder: "#7bd389",
  glow: "#1e9e67",
  shadow: "0 10px 30px rgba(0,0,0,0.08)",
};

export const EDGE_STYLE = {
  // ROMANCE
  married:   { emoji: "💍",  color: "#7c3aed", lineStyle: "solid",  width: 4, label: "Verheiratet" },
  engaged:   { emoji: "💎",  color: "#8b5cf6", lineStyle: "solid",  width: 3, label: "Verlobt" },
  partner:   { emoji: "❤️",  color: "#ef4444", lineStyle: "solid",  width: 3, label: "Partner*in" },
  romantic:  { emoji: "❤️‍🔥", color: "#ef4444", lineStyle: "solid",  width: 3, label: "Romantisch" },
  crush:     { emoji: "💘",  color: "#fb7185", lineStyle: "dotted", width: 2, label: "Schwarm" },
  ex:        { emoji: "💔",  color: "#f97316", lineStyle: "dashed", width: 2, label: "Ex" },

  // FAMILY
  parent:    { emoji: "👪",  color: "#0ea5e9", lineStyle: "solid",  width: 3, label: "Eltern/Kind" },
  child:     { emoji: "🧒",  color: "#38bdf8", lineStyle: "solid",  width: 3, label: "Kind" },
  sibling:   { emoji: "👫",  color: "#22c55e", lineStyle: "solid",  width: 3, label: "Geschwister" },
  halfsibling:{emoji:"🧬",  color:"#16a34a", lineStyle:"dashed",    width:2, label:"Halbgeschw."},
  steps:     { emoji: "👨‍👩‍👧", color: "#10b981", lineStyle: "dashed", width: 2, label: "Stiefbezug" },
  grand:     { emoji: "👴",  color: "#06b6d4", lineStyle: "solid",  width: 3, label: "Großeltern/Enkel" },
  cousin:    { emoji: "👫",  color: "#14b8a6", lineStyle: "dotted", width: 2, label: "Cousin/Cousine" },
  inlaw:     { emoji: "🤝",  color: "#0d9488", lineStyle: "dotted", width: 2, label: "Verschwägert" },
  adopted:   { emoji: "🍼",  color: "#22d3ee", lineStyle: "dashed", width: 2, label: "Adoptiert" },

  // SOCIAL
  roommate:  { emoji: "🏠",  color: "#60a5fa", lineStyle: "solid",  width: 2, label: "Mitbewohner*in" },
  friend:    { emoji: "🤝",  color: "#10b981", lineStyle: "dotted", width: 2, label: "Freundschaft" },
  goodfriend:{ emoji: "😊",  color: "#34d399", lineStyle: "dotted", width: 2, label: "Gute Freunde" },
  bestfriend:{ emoji: "🌟",  color: "#22c55e", lineStyle: "solid",  width: 3, label: "Beste Freunde" },
  acquaintance:{emoji:"👋",  color:"#9ca3af", lineStyle:"dotted",   width:1, label:"Bekannte*r"},
  coworker:  { emoji: "💼",  color: "#64748b", lineStyle: "dotted", width: 2, label: "Kolleg*in" },
  classmate: { emoji: "📚",  color: "#94a3b8", lineStyle: "dotted", width: 2, label: "Klassenkamerad*in" },
  neighbor:  { emoji: "🚪",  color: "#93c5fd", lineStyle: "dotted", width: 2, label: "Nachbar*in" },
  mentor:    { emoji: "🧠",  color: "#7dd3fc", lineStyle: "solid",  width: 2, label: "Mentor/Mentee" },

  // DRAMA
  disliked:  { emoji: "😒",  color: "#9ca3af", lineStyle: "dashed", width: 2, label: "Missfallen" },
  enemy:     { emoji: "😡",  color: "#111827", lineStyle: "dashed", width: 3, label: "Feindschaft" },
  rivalry:   { emoji: "⚡",  color: "#64748b", lineStyle: "dashed", width: 2, label: "Rivalität" },
  grudge:    { emoji: "🧨",  color: "#ef4444", lineStyle: "dashed", width: 2, label: "Groll" },

  // PETS
  owner_pet: { emoji: "🐾",  color: "#f59e0b", lineStyle: "solid",  width: 2, label: "Besitzer*in/Haustier" },
};

export const FIELD_TEMPLATES = {
  age:     { kind: "age",     label: "Alter",        type: "number",   singleton: true },
  job:     { kind: "job",     label: "Job",          type: "text",     singleton: true },
  hobbies: { kind: "hobbies", label: "Hobbys",       type: "tags",     singleton: true },
  traits:  { kind: "traits",  label: "Merkmale",     type: "tags",     singleton: true },
  occult:  { kind: "occult",  label: "Okkult",       type: "select",   singleton: true,
             options: ["Mensch","Vampir","Zauberer","Meerjungfrau","Alien","Werwolf","Pflanzensim","Skelett"] },
  notes:   { kind: "notes",   label: "Notizen",      type: "textarea", singleton: true },
  customText: { kind: "customText", label: "Benutzerdefiniert (Text)", type: "text", singleton: false },
  customTags: { kind: "customTags", label: "Benutzerdefiniert (Tags)", type: "tags", singleton: false },
};
// --- Okkult ---
export const OCCULT_TYPES = [
  "Mensch",
  "Alien",
  "Vampir",
  "Meerjungfrau/-mann",
  "Zauberer/Hexe (Spellcaster)",
  "Werwolf",
  "Pflanzensim",
  "Servo",
  "Skelett (temporär)"
];

// --- Alter ---
export const AGE_GROUPS = [
  "Baby",
  "Kleinkind",
  "Kind",
  "Teen",
  "Junger Erwachsener",
  "Erwachsener",
  "Senior"
];

// --- Discover University Studiengänge ---
export const UNIVERSITY_DEGREES = [
  "Kunstgeschichte",
  "Schöne Künste",
  "Kommunikation",
  "Sprache & Literatur",
  "Philosophie",
  "Geschichte",
  "Psychologie",
  "Biologie",
  "Informatik",
  "Physik",
  "Ökonomie",
  "Kulinarik",
  "Schauspiel/Drama",
  "Schurkerei/Villainy"
];

// --- Karrieren nach Gruppen (Basegame + gängige DLCs/Updates) ---
export const CAREERS_BY_GROUP = {
  "Vollzeit": [
    "Astronaut",
    "Athlet",
    "Business",
    "Kriminell",
    "Koch/Kulinarik (Karriere)",
    "Entertainer",
    "Maler",
    "Geheimagent",
    "Tech-Guru",
    "Autor/Schriftsteller",
    "Style-Influencer",
    "Gärtner",
    "Politiker",
    "Kritiker",
    "Social Media",
    "Militär",
    "Civil Designer",
    "Salaryperson",
    "Bildung (Lehrer)",
    "Ingenieur",
    "Jura (Recht)",
    "Naturschützer (Conservationist)"
  ],
  "Aktiv (Pack-Karrieren)": [
    "Arzt (aktiv)",
    "Detektiv (aktiv)",
    "Wissenschaftler (aktiv)",
    "Schauspieler (aktiv)",
    "Innenarchitekt (aktiv)"
  ],
  "Teilzeit/Nebenjob": [
    "Barista",
    "Verkauf (Einzelhandel/Regal)",
    "Fast-Food",
    "Babysitter",
    "Handarbeiter (Manuelle Arbeit)",
    "Fischer",
    "Rettungsschwimmer",
    "Taucher",
    "Kurrier/Essenslieferung",
    "Kurier/Lebensmittel (Dorfboten)",
    "Simfluencer",
    "Video-Game-Streamer",
    "Scout (Aktivität)"
  ],
  "Freelancer": [
    "Freelancer: Programmierer",
    "Freelancer: Schreiber",
    "Freelancer: Künstler (Digital)",
    "Freelancer: Modefotograf",
    "Freelancer: Paranormal-Ermittler"
  ],
  "Unternehmer": [
    "Tierarzt (Klinikbesitzer)",
    "Einzelhandel (Geschäftsinhaber)"
  ]
};

// flache Liste für Dropdowns, wenn ohne <optgroup> gearbeitet wird:
export const CAREERS = Object.values(CAREERS_BY_GROUP).flat();

// --- Sonstiges UI-Default (falls von dir genutzt) ---
export const DEFAULT_UI = {
  galleryBg: null,
  gallerySort: "name_asc",
  galleryFilter: "",
};

// Keys für LocalStorage (falls genutzt)
export const DATA_KEY = "simsExplorerDataV1";
export const UI_KEY   = "simsExplorerUiV1";
