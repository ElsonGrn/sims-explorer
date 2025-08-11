import React, { useState } from "react";
import { rid } from "./utils";

export default function InfoModal({ person, onClose, onSave, FIELD_TEMPLATES, THEME }) {
  const T = THEME;
  const [alive, setAlive] = useState(person?.alive !== false);
  const [fields, setFields] = useState(() => (person?.info?.fields ? JSON.parse(JSON.stringify(person.info.fields)) : []));

  const inputS = { width:"100%", padding:"10px 12px", border:`1px solid ${T.line}`, borderRadius:12, background:"rgba(255,255,255,0.65)", color:T.text, outline:"none" };
  const btnBase = { padding:"9px 12px", borderRadius:12, border:`1px solid ${T.line}`, cursor:"pointer", transition:"all .2s ease", color:T.text, background:"#fff" };
  const btn = (filled=false)=>({ ...btnBase, background: filled ? T.accent : T.accentSoft, color: filled ? "#fff" : T.text });

  function addField(kind) {
    const tpl = FIELD_TEMPLATES[kind];
    if (!tpl) return;
    setFields((prev) => {
      if (tpl.singleton && prev.some((f)=>f.kind===kind)) return prev;
      return [...prev, {
        id: "f_" + rid(),
        kind,
        label: tpl.label,
        type: tpl.type,
        value: tpl.type === "select" ? (tpl.options?.[0] || "") : "",
        values: tpl.type === "tags" ? [] : undefined,
        options: tpl.options,
      }];
    });
  }

  function setFieldValue(fid, value) {
    setFields(prev => prev.map(f => f.id === fid ? { ...f, value } : f));
  }
  function addTag(fid, tag) {
    const t = String(tag).trim(); if (!t) return;
    setFields(prev => prev.map(f => f.id === fid ? { ...f, values: [...(f.values||[]), t] } : f));
  }
  function removeTag(fid, idx) {
    setFields(prev => prev.map(f => {
      if (f.id !== fid) return f;
      const vals = [...(f.values||[])]; vals.splice(idx, 1);
      return { ...f, values: vals };
    }));
  }
  function deleteField(fid) {
    setFields(prev => prev.filter(f => f.id !== fid));
  }
  function sanitize(fs) {
    return fs.map((f)=>{
      const tpl = FIELD_TEMPLATES[f.kind] || {};
      const label = f.label || tpl.label || f.kind;
      if ((tpl.type||f.type)==="tags") {
        const values = (f.values||[]).map(String).map(s=>s.trim()).filter(Boolean);
        return { ...f, type:"tags", label, values: [...new Set(values)] };
      }
      if ((tpl.type||f.type)==="number") {
        const v = f.value === "" ? "" : Number(f.value);
        return { ...f, type:"number", label, value: Number.isFinite(v) ? v : "" };
      }
      if ((tpl.type||f.type)==="select") {
        return { ...f, type:"select", label, value: f.value || "" };
      }
      if ((tpl.type||f.type)==="textarea") {
        return { ...f, type:"textarea", label, value: String(f.value||"") };
      }
      return { ...f, type:"text", label, value: String(f.value??"") };
    });
  }

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width: 520, maxHeight:"86vh", overflow:"auto", padding:16, borderRadius:16, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>Infos zu {person?.label || person?.id}</div>
          <span style={{ marginLeft:"auto", fontSize:12, color:T.subtext }}>Status:</span>
          <label style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
            <input type="checkbox" checked={alive} onChange={(e)=>setAlive(e.target.checked)} />
            {alive ? "Lebendig" : "Verstorben ☠️"}
          </label>
        </div>

        <div style={{ display:"grid", gap:10 }}>
          {fields.map((f)=>(
            <div key={f.id} style={{ padding:10, borderRadius:12, border:`1px solid ${T.line}`, background:"rgba(255,255,255,0.65)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ fontWeight:700 }}>{f.label || f.kind}</div>
                <span style={{ fontSize:12, color:T.subtext }}>({f.type})</span>
                <button onClick={()=>deleteField(f.id)} style={{ marginLeft:"auto", ...btnBase }}>Entfernen</button>
              </div>

              {f.type === "text" && (
                <input style={inputS} value={f.value || ""} onChange={(e)=>setFieldValue(f.id, e.target.value)} placeholder="Text" />
              )}
              {f.type === "number" && (
                <input style={inputS} type="number" value={f.value ?? ""} onChange={(e)=>setFieldValue(f.id, e.target.value === "" ? "" : Number(e.target.value))} placeholder="Zahl" />
              )}
              {f.type === "textarea" && (
                <textarea style={{ ...inputS, minHeight: 80, resize: "vertical" }} value={f.value || ""} onChange={(e)=>setFieldValue(f.id, e.target.value)} placeholder="Notizen" />
              )}
              {f.type === "select" && (
                <select style={inputS} value={f.value || ""} onChange={(e)=>setFieldValue(f.id, e.target.value)}>
                  {(f.options||[]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {f.type === "tags" && (
                <div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                    {(f.values || []).map((t,i)=>(
                      <span key={i} style={{ padding:"4px 8px", borderRadius:999, border:`1px solid ${T.line}`, background:"#fff", fontSize:12, display:"inline-flex", alignItems:"center", gap:6 }}>
                        {t}
                        <button onClick={()=>removeTag(f.id, i)} style={{ border:"none", background:"transparent", cursor:"pointer" }}>✕</button>
                      </span>
                    ))}
                  </div>
                  <TagAdder onAdd={(tag)=>addTag(f.id, tag)} placeholder="Neuen Eintrag hinzufügen und Enter drücken" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop:12, padding:10, borderRadius:12, border:`1px solid ${T.line}`, background:"rgba(255,255,255,0.65)" }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>Feld hinzufügen</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {Object.entries(FIELD_TEMPLATES).map(([k,t])=>(
              <button key={k} onClick={()=>addField(k)} style={btnBase}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
          <button style={btn()} onClick={onClose}>Abbrechen</button>
          <button
            style={btn(true)}
            onClick={()=>onSave({ alive, info: { fields: sanitize(fields) } })}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function TagAdder({ onAdd, placeholder }) {
  const [v, setV] = useState("");
  return (
    <input
      style={{ width:"100%", padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10, background:"rgba(255,255,255,0.9)" }}
      value={v}
      placeholder={placeholder || "Wert eingeben…"}
      onChange={(e)=>setV(e.target.value)}
      onKeyDown={(e)=>{
        if (e.key === "Enter") {
          const t = v.trim();
          if (t) onAdd(t);
          setV("");
        }
      }}
    />
  );
}
