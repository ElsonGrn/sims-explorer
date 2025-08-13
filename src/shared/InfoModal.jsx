// src/shared/InfoModal.jsx
import React, { useMemo, useState, useEffect } from "react";
import { GENDER_OPTIONS, normalizeGender } from "./gender";

/**
 * Scroll-/Viewport-freundliches InfoModal:
 * - maxHeight: 90vh, width: min(680px, 95vw)
 * - Inhalt scrollt (Header/Buttons sticky)
 * - Responsive Grids
 */

const AGE_GROUPS = [
  "Baby","Kleinkind","Kind","Teen","Junger Erwachsener","Erwachsener","Senior"
];

const OCCULT_TYPES = [
  "Mensch","Vampir","Zauberer/Hexe","Alien","Meerjungfrau","Werwolf","Pflanzensim","Servo","Geist"
];

const CAREERS = [
  "Arbeitslos",
  "Schauspieler/in","Astronaut/in","Athlet/in","Business","Ingenieur/in","Entertainer/in",
  "Kritiker/in","Koch/Köchin","Detektiv/in","Ärztin/Arzt","Gärtner/in","Jurist/in","Militär",
  "Maler/in","Politiker/in","Wissenschaftler/in","Geheimagent/in","Social Media",
  "Mode-Influencer/in","Tech-Guru","Autor/in","Öko-Designer/in","Naturschützer/in",
  "Freelancer: Programmierer/in","Freelancer: Autor/in","Freelancer: Künstler/in","Freelancer: Fotograf/in"
];

const TRAITS = [
  "Aktiv","Kreativ","Genie","Gesellig","Selbstsicher","Ordentlich","Verschmutzt",
  "Faul","Kindisch","Spielverderber","Romantisch","Hitzkopf","Eifersüchtig","Ehrgeizig",
  "Tollpatschig","Clumsy","Musikliebhaber/in","Bücherwurm","Geek","Hundefreund/in","Katzenfreund/in",
  "Vegetarier/in","Bro","Schüchtern","Einsiedler/in","Snob","Materialistisch"
];

const ASPIRATIONS = [
  "Familie","Liebe","Wissen","Natur","Reichtum","Kreativität","Ortgebunden","Athletik","Popularität","Kriminalität"
];

const FAME_STARS = [0,1,2,3,4,5];
const REPUTATIONS = ["Sehr schlecht","Schlecht","Neutral","Gut","Sehr gut"];

export default function InfoModal({ person, onClose, onSave, THEME }) {
  const T = THEME || {
    glassBg: "rgba(255,255,255,0.9)",
    line: "#e5e7eb",
    text: "#111827",
    subtext: "#6b7280",
    accent: "#10b981",
    accentSoft: "#ecfdf5",
    shadow: "0 10px 30px rgba(0,0,0,0.08)",
  };

  const current = person?.info || {};

  const [gender, setGender] = useState(() => normalizeGender(current.gender));
  const [age, setAge] = useState(current.age || "");
  const [occult, setOccult] = useState(current.occult || "");
  const [career, setCareer] = useState(current.career || "");
  const [careerLevel, setCareerLevel] = useState(
    Number.isFinite(current.careerLevel) ? current.careerLevel : 0
  );
  const [traits, setTraits] = useState(Array.isArray(current.traits) ? current.traits : []);
  const [aspiration, setAspiration] = useState(current.aspiration || "");
  const [fame, setFame] = useState(Number.isFinite(current.fame) ? current.fame : 0);
  const [reputation, setReputation] = useState(current.reputation || "Neutral");

  // ESC zum Schließen
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleTrait = (t) => {
    setTraits((prev) => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const valid = useMemo(() => true, [gender, age, occult, career, careerLevel, traits, aspiration, fame, reputation]);

  const save = () => {
    if (!valid) return;
    onSave?.({
      info: {
        ...person.info,
        gender: normalizeGender(gender),
        age,
        occult,
        career,
        careerLevel: Number.isFinite(+careerLevel) ? +careerLevel : 0,
        traits,
        aspiration,
        fame: Number.isFinite(+fame) ? +fame : 0,
        reputation,
      },
    });
  };

  if (!person) return null;

  const labelS = { display: "block", fontSize: 12, color: T.subtext, marginBottom: 6 };
  const inputS = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${T.line}`, borderRadius: 12,
    background: "rgba(255,255,255,0.85)", color: T.text, outline: "none"
  };
  const btnBase = { padding: "9px 12px", borderRadius: 12, border: `1px solid ${T.line}`, cursor: "pointer" };
  const btn = (filled=false) => ({ ...btnBase, background: filled ? T.accent : "#f3f4f6", color: filled ? "#fff" : T.text });

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center", zIndex: 2000,
        overscrollBehavior: "contain"
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{
          width: "min(680px, 95vw)",
          maxHeight: "90vh",
          padding: 0,
          borderRadius: 16,
          background: T.glassBg,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header (sticky) */}
        <div style={{
          position:"sticky", top:0, zIndex:2,
          background: T.glassBg, borderBottom: `1px solid ${T.line}`,
          padding: 12, display:"flex", alignItems:"center", justifyContent:"space-between"
        }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: T.text }}>
            Infos zu: {person.label || person.id}
          </div>
          <button onClick={onClose} style={{ ...btnBase, background:"#f3f4f6" }}>Schliessen</button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: 16 }}>
          {/* Basics */}
          <div
            style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",
              gap:12, marginBottom:12
            }}
          >
            <div>
              <label style={labelS}>Geschlecht</label>
              <select value={gender} onChange={(e)=>setGender(e.target.value)} style={inputS}>
                {GENDER_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label style={labelS}>Alter</label>
              <select value={age} onChange={(e)=>setAge(e.target.value)} style={inputS}>
                <option value="">– wählen –</option>
                {AGE_GROUPS.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label style={labelS}>Okkult (Lebenszustand)</label>
              <select value={occult} onChange={(e)=>setOccult(e.target.value)} style={inputS}>
                <option value="">– wählen –</option>
                {OCCULT_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label style={labelS}>Job/Karriere</label>
              <select value={career} onChange={(e)=>setCareer(e.target.value)} style={inputS}>
                <option value="">– wählen –</option>
                {CAREERS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={labelS}>Karrierestufe</label>
              <input
                type="number" min={0} max={15} step={1}
                value={careerLevel}
                onChange={(e)=>setCareerLevel(parseInt(e.target.value || "0", 10))}
                style={inputS}
              />
            </div>

            <div>
              <label style={labelS}>Bestreben (Aspiration)</label>
              <select value={aspiration} onChange={(e)=>setAspiration(e.target.value)} style={inputS}>
                <option value="">– wählen –</option>
                {ASPIRATIONS.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label style={labelS}>Berühmtheit (0–5 Sterne)</label>
              <select value={String(fame)} onChange={(e)=>setFame(parseInt(e.target.value, 10))} style={inputS}>
                {FAME_STARS.map(s=><option key={s} value={s}>{s} ⭐</option>)}
              </select>
            </div>

            <div>
              <label style={labelS}>Ruf</label>
              <select value={reputation} onChange={(e)=>setReputation(e.target.value)} style={inputS}>
                {REPUTATIONS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Traits (eigener Scrollbereich bei viel Auswahl) */}
          <div style={{ marginTop: 6 }}>
            <label style={labelS}>Eigenschaften (Traits)</label>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))",
              gap:8,
              padding:8,
              border:`1px solid ${T.line}`, borderRadius:12,
              background:"rgba(255,255,255,0.5)",
              maxHeight: 240, overflowY: "auto"
            }}>
              {TRAITS.map(t => (
                <label key={t} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                  <input type="checkbox" checked={traits.includes(t)} onChange={()=>toggleTrait(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer (sticky) */}
        <div style={{
          position:"sticky", bottom:0, zIndex:2,
          background: T.glassBg, borderTop: `1px solid ${T.line}`,
          padding: 12, display:"flex", justifyContent:"flex-end", gap:8
        }}>
          <button onClick={onClose} style={{ ...btn(false) }}>Abbrechen</button>
          <button onClick={save}   style={{ ...btn(true), border:`1px solid ${T.line}` }}>Speichern</button>
        </div>
      </div>
    </div>
  );
}
