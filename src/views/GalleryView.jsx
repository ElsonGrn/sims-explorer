// Pfad ggf. anpassen: view vs views
import React, { useMemo, useState } from "react";
import "../shared/theme.css";
import InfoModal from "../shared/InfoModal.jsx";
import {
  OCCULT_TYPES,
  AGE_GROUPS,
  UNIVERSITY_DEGREES,
  CAREERS_BY_GROUP,
  CAREERS
} from "../shared/constants.js";

export default function GalleryView({
  data,
  onChange,            // optional – sonst Event-Bridge
  onOpenInfo,          // optional
  onFocusInExplorer,   // optional
  bgImage, bgOpacity = 0.25,
  onBgUpload, onBgOpacity, onBgClear,
}) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  // Suche & Filter
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");      // all | alive | dead
  const [fOccult, setFOccult] = useState("");       // "" = alle
  const [fCareer, setFCareer] = useState("");       // "" = alle
  const [fAge, setFAge]       = useState("");       // "" = alle

  // Sort (nur Name)
  const [sort, setSort] = useState("name_asc");     // name_asc | name_desc

  // Liste filtern/sortieren
  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...nodes];
    if (q) list = list.filter(n => (n.label ?? n.id).toLowerCase().includes(q));
    if (status !== "all") {
      const aliveWanted = status === "alive";
      list = list.filter(n => (n.alive !== false) === aliveWanted);
    }
    if (fOccult) list = list.filter(n => (n.occult || "Mensch") === fOccult);
    if (fCareer) list = list.filter(n => (n.career || "") === fCareer);
    if (fAge)    list = list.filter(n => (n.age || "") === fAge);

    list.sort((a,b) => (a.label ?? a.id).localeCompare(b.label ?? b.id));
    if (sort === "name_desc") list.reverse();
    return list;
  }, [nodes, search, status, fOccult, fCareer, fAge, sort]);

  // Kontextmenü minimal (zwei Aktionen)
  const [menu, setMenu] = useState({ open:false, x:0, y:0, sim:null });
  const openMenu = (e, sim) => { e.preventDefault(); setMenu({ open:true, x:e.clientX, y:e.clientY, sim }); };
  const closeMenu = () => setMenu(m => ({ ...m, open:false }));

  // Edit-Modal
  const [editSimId, setEditSimId] = useState(null);
  const [form, setForm] = useState({
    id:"", label:"", alive:true, traits:[], notes:"",
    age:"", occult:"Mensch",
    career:"", careerLevel:"",
    household:"", world:"",
    fame: 0,
    degree: "",
    aspiration: "",
    likes: [], dislikes: []
  });

  const startEdit = (sim) => {
    if (!sim) return;
    setEditSimId(sim.id);
    setForm({
      id: sim.id,
      label: (sim.label || sim.id || "").toString(),
      alive: sim.alive !== false,
      traits: Array.isArray(sim.traits) ? sim.traits : [],
      notes: (sim.notes || "").toString(),
      age: sim.age || "",
      occult: sim.occult || "Mensch",
      career: sim.career || "",
      careerLevel: sim.careerLevel || "",
      household: sim.household || "",
      world: sim.world || "",
      fame: Number.isFinite(sim.fame) ? sim.fame : 0,
      degree: sim.degree || "",
      aspiration: sim.aspiration || "",
      likes: Array.isArray(sim.likes) ? sim.likes : [],
      dislikes: Array.isArray(sim.dislikes) ? sim.dislikes : [],
      img: sim.img || null,
    });
  };

  const applyChange = (nextNodes, nextEdges = edges) => {
    if (typeof onChange === "function") onChange({ nodes: nextNodes, edges: nextEdges });
    else window.dispatchEvent(new CustomEvent("sims:updateData", { detail: { nodes: nextNodes, edges: nextEdges } }));
  };

  const saveEdit = () => {
    const next = nodes.map(n => n.id === form.id ? {
      ...n,
      label: form.label.trim() || n.id,
      alive: !!form.alive,
      traits: Array.from(new Set((form.traits || []).filter(Boolean))),
      notes: form.notes,
      age: form.age || "",
      occult: form.occult || "Mensch",
      career: form.career || "",
      careerLevel: form.careerLevel || "",
      household: form.household || "",
      world: form.world || "",
      fame: Number(form.fame) || 0,
      degree: form.degree || "",
      aspiration: form.aspiration || "",
      likes: Array.from(new Set((form.likes || []).filter(Boolean))),
      dislikes: Array.from(new Set((form.dislikes || []).filter(Boolean))),
      img: form.img || null,
    } : n);
    applyChange(next);
    setEditSimId(null);
  };

  const deleteSim = (simId) => {
    const nextNodes = nodes.filter(n => n.id !== simId);
    const nextEdges = edges.filter(e => e.source !== simId && e.target !== simId);
    applyChange(nextNodes, nextEdges);
  };

  const pickImage = (onLoaded) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => onLoaded(r.result);
      r.readAsDataURL(f);
    };
    input.click();
  };

  const focusInExplorer = (id) => {
    if (typeof onFocusInExplorer === "function") onFocusInExplorer(id);
    else window.dispatchEvent(new CustomEvent("sims:focusNode", { detail:{ id } }));
  };

  const rootStyle = {
    backgroundImage: bgImage
      ? `linear-gradient(rgba(255,255,255,${bgOpacity}), rgba(255,255,255,${bgOpacity})), url(${bgImage})`
      : undefined,
    backgroundSize: bgImage ? "cover" : undefined,
    backgroundPosition: bgImage ? "center" : undefined,
  };

  return (
    <div className="bg-sims" style={rootStyle}>
      {/* Toolbar */}
      <div className="toolbar" style={{ gap: 10 }}>
        <input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Suche nach Name…" />

        <select className="select" value={status} onChange={(e)=>setStatus(e.target.value)}>
          <option value="all">Status: alle</option>
          <option value="alive">nur lebend</option>
          <option value="dead">nur tot</option>
        </select>

        <select className="select" value={fOccult} onChange={(e)=>setFOccult(e.target.value)}>
          <option value="">Okkult: alle</option>
          {OCCULT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select className="select" value={fAge} onChange={(e)=>setFAge(e.target.value)}>
          <option value="">Alter: alle</option>
          {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select className="select" value={fCareer} onChange={(e)=>setFCareer(e.target.value)}>
          <option value="">Beruf: alle</option>
          {/* Mit Gruppen */}
          {Object.entries(CAREERS_BY_GROUP).map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map(c => <option key={group + c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>

        <select className="select" value={sort} onChange={(e)=>setSort(e.target.value)}>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, opacity:.75 }}>Hintergrund:</span>
          <button className="btn" onClick={()=>pickImage((dataUrl)=>onBgUpload?.(dataUrl))}>Bild setzen</button>
          <label style={{ fontSize:12, opacity:.75 }}>Deckkraft {Math.round((bgOpacity)*100)}%</label>
          <input type="range" min={0} max={1} step={0.05} value={bgOpacity} onChange={(e)=>onBgOpacity?.(parseFloat(e.target.value))}/>
          <button className="btn" onClick={onBgClear}>Entfernen</button>
        </div>
      </div>

      {/* Karten (ohne Vernetzungsgrad) */}
      <div className="gallery-grid--big">
        {people.map(p => (
          <div
            key={p.id}
            className="sim-card"
            onContextMenu={(e)=>{ e.preventDefault(); setMenu({ open:true, x:e.clientX, y:e.clientY, sim:p }); }}
            title={p.label ?? p.id}
          >
            <div className="sim-quick">
              <button className="icon-btn" title="Bearbeiten" onClick={() => startEdit(p)}>📝</button>
              <button className="icon-btn" title="Explorer Fokus" onClick={() => focusInExplorer(p.id)}>🗺️</button>
              <button className="icon-btn" title="Löschen" onClick={() => deleteSim(p.id)}>🗑️</button>
            </div>

            <div className="sim-banner">
              {p.img ? <img src={p.img} alt={p.label ?? p.id} loading="lazy" /> : null}
              <div className="sim-overlay"></div>
              <div className="sim-meta">
                <div>
                  <div className="sim-name">{p.label ?? p.id}</div>
                  <div className="sim-badges">
                    {p.age ? <span className="badge">{p.age}</span> : null}
                    <span className="badge">{p.occult || "Mensch"}</span>
                    {p.career ? <span className="badge">{p.career}</span> : null}
                    {Number(p.fame) > 0 ? <span className="badge">★ {Number(p.fame)}</span> : null}
                    {p.household ? <span className="badge">Haushalt: {p.household}</span> : null}
                    {p.world ? <span className="badge">{p.world}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="sim-body">
              {Array.isArray(p.traits) && p.traits.length > 0 && (
                <div className="sim-traits">
                  {p.traits.slice(0,6).map((t,i)=><span className="trait" key={i}>{t}</span>)}
                </div>
              )}
              {p.notes ? <div style={{ fontSize:13, opacity:.85, lineHeight:1.35 }}>{p.notes}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {/* eigenes kleines Kontextmenü */}
      {menu.open && (
        <div
          className="menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={closeMenu}
        >
          <div className="menu-item" onClick={()=>{ onOpenInfo?.(menu.sim.id) ?? startEdit(menu.sim); closeMenu(); }}>📝 Info bearbeiten</div>
          <div className="menu-item" onClick={()=>{ pickImage((dataUrl)=>{ setForm(f => ({ ...f, img:dataUrl })); startEdit(menu.sim); }); closeMenu(); }}>🖼️ Bild ändern</div>
          <div className="menu-item" onClick={()=>{ onFocusInExplorer?.(menu.sim.id) ?? focusInExplorer(menu.sim.id); closeMenu(); }}>🗺️ Im Explorer fokussieren</div>
          <div className="menu-item" onClick={()=>{ deleteSim(menu.sim.id); closeMenu(); }}>🗑️ Sim löschen</div>
        </div>
      )}

      {/* Bearbeiten */}
      <InfoModal open={!!editSimId} title="Sim bearbeiten" onClose={()=>setEditSimId(null)}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Name">
            <input className="input" value={form.label} onChange={(e)=>setForm(f=>({...f, label:e.target.value}))}/>
          </Field>
          <Field label="Status">
            <select className="select" value={form.alive ? "alive" : "dead"} onChange={(e)=>setForm(f=>({...f, alive:e.target.value==="alive"}))}>
              <option value="alive">lebend</option>
              <option value="dead">verstorben</option>
            </select>
          </Field>

          <Field label="Alter">
            <select className="select" value={form.age} onChange={(e)=>setForm(f=>({...f, age:e.target.value}))}>
              <option value="">–</option>
              {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Okkult">
            <select className="select" value={form.occult} onChange={(e)=>setForm(f=>({...f, occult:e.target.value}))}>
              {OCCULT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Beruf">
            <select className="select" value={form.career} onChange={(e)=>setForm(f=>({...f, career:e.target.value}))}>
              <option value="">–</option>
              {Object.entries(CAREERS_BY_GROUP).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map(c => <option key={group + c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Karrierestufe">
            <input className="input" value={form.careerLevel} onChange={(e)=>setForm(f=>({...f, careerLevel:e.target.value}))} placeholder="z.B. Level 5 / Titel" />
          </Field>

          <Field label="Haushalt">
            <input className="input" value={form.household} onChange={(e)=>setForm(f=>({...f, household:e.target.value}))}/>
          </Field>
          <Field label="Welt">
            <input className="input" value={form.world} onChange={(e)=>setForm(f=>({...f, world:e.target.value}))} placeholder="z.B. Oasis Springs" />
          </Field>

          <Field label="Fame (0–5)">
            <input className="input" type="number" min={0} max={5} step={1} value={form.fame} onChange={(e)=>setForm(f=>({...f, fame: Number(e.target.value)||0 }))}/>
          </Field>
          <Field label="Uni-Abschluss">
            <select className="select" value={form.degree} onChange={(e)=>setForm(f=>({...f, degree:e.target.value}))}>
              <option value="">–</option>
              {UNIVERSITY_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Aspiration">
            <input className="input" value={form.aspiration} onChange={(e)=>setForm(f=>({...f, aspiration:e.target.value}))}/>
          </Field>

          <Field label="Traits (kommagetrennt)" full>
            <input
              className="input"
              value={(form.traits || []).join(", ")}
              onChange={(e)=>setForm(f=>({...f, traits: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
              placeholder="z.B. Kreativ, Eifersüchtig, Perfektionist"
            />
          </Field>

          <Field label="Likes (kommagetrennt)" full>
            <input
              className="input"
              value={(form.likes || []).join(", ")}
              onChange={(e)=>setForm(f=>({...f, likes: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
              placeholder="z.B. Farbe Blau, Hip-Hop, Kochen"
            />
          </Field>

          <Field label="Dislikes (kommagetrennt)" full>
            <input
              className="input"
              value={(form.dislikes || []).join(", ")}
              onChange={(e)=>setForm(f=>({...f, dislikes: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
            />
          </Field>

          <Field label="Notizen" full>
            <textarea className="input" style={{ minHeight: 90 }} value={form.notes} onChange={(e)=>setForm(f=>({...f, notes:e.target.value}))}/>
          </Field>

          <Field label="Bild" full>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button className="btn" onClick={()=>pickImage((dataUrl)=>setForm(f=>({...f, img:dataUrl})))}>Bild wählen</button>
              {form.img ? <button className="btn" onClick={()=>setForm(f=>({...f, img:null}))}>Entfernen</button> : null}
            </div>
            {form.img ? <img src={form.img} alt="Preview" style={{ marginTop:8, width:"100%", borderRadius:12, border:"1px solid #e5e7eb" }}/> : null}
          </Field>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
          <button className="btn" onClick={()=>setEditSimId(null)}>Abbrechen</button>
          <button className="btn btn-accent" onClick={saveEdit}>Speichern</button>
        </div>
      </InfoModal>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ display:"block", fontSize:12, opacity:.75, marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}
