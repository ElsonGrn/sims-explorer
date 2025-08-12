// src/SimsRelationshipExplorer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { THEME, EDGE_STYLE, FIELD_TEMPLATES } from "./shared/constants";
import { deepClone, makeIdFromLabel } from "./shared/utils";
import ExplorerView from "./views/ExplorerView";
import GalleryView from "./views/GalleryView";
import InfoModal from "./shared/InfoModal";

const LS_KEY = "simsExplorerDataV1";
const LS_UI  = "simsExplorerUiV1";
const LS_BG_IMG = "simsExplorerBgImageV1";
const LS_BG_OPA = "simsExplorerBgOpacityV1";

const START_SAMPLE = {
  nodes: [
    { id: "a", label: "Antonia", img: "", alive: true, info: { fields: [] } },
    { id: "b", label: "Livia",   img: "", alive: true, info: { fields: [] } },
    { id: "c", label: "Mimi",    img: "", alive: true, info: { fields: [] } },
    { id: "d", label: "Elias",   img: "", alive: true, info: { fields: [] } },
    { id: "e", label: "Nico",    img: "", alive: true, info: { fields: [] } },
    { id: "f", label: "Hannah",  img: "", alive: true, info: { fields: [] } },
    { id: "g", label: "Sofie",   img: "", alive: true, info: { fields: [] } },
  ],
  edges: [
    { id: "e1", source: "d", target: "a", type: "romantic", strength: 0.9 },
    { id: "e2", source: "d", target: "b", type: "romantic", strength: 0.6 },
    { id: "e3", source: "d", target: "c", type: "ex",       strength: 0.3 },
    { id: "e4", source: "a", target: "b", type: "rivalry",  strength: 0.7 },
    { id: "e5", source: "b", target: "c", type: "friend",   strength: 0.8 },
    { id: "e6", source: "d", target: "f", type: "married",  strength: 1 },
    { id: "e7", source: "f", target: "g", type: "parent",   strength: 1 },
    { id: "e8", source: "d", target: "g", type: "parent",   strength: 1 },
  ],
};

export default function SimsRelationshipExplorer() {
  const T = THEME;

  // Daten + UI
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        o.nodes = o.nodes.map(n => ({
          alive: n.alive !== false,
          info: n.info && Array.isArray(n.info.fields) ? n.info : { fields: [] },
          ...n,
          img: n.img || ""
        }));
        return o;
      }
    } catch {}
    return START_SAMPLE;
  });

  const [view, setView] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_UI) || "{}").view || "explorer"; } catch {}
    return "explorer";
  });

  // Explorer-UI-States
  const [focusId, setFocusId] = useState("");
  const [depth, setDepth] = useState(1);
  const [onlyNeighborhood, setOnlyNeighborhood] = useState(true);
  const [visibleTypes, setVisibleTypes] = useState(() => new Set(Object.keys(EDGE_STYLE)));
  const [labelMode, setLabelMode] = useState("always");
  const [edgeLabelMode, setEdgeLabelMode] = useState("emoji");

  // Beziehungen bearbeiten (Sidebar)
  const [relSource, setRelSource] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState("friend");
  const [relStrength, setRelStrength] = useState(0.8);
  const [selectedEdgeId, setSelectedEdgeId] = useState("");

  // Hintergrund (nur Galerie verwendet)
  const [bgImage, setBgImage] = useState(() => localStorage.getItem(LS_BG_IMG) || "");
  const [bgOpacity, setBgOpacity] = useState(() => {
    const v = parseFloat(localStorage.getItem(LS_BG_OPA));
    return Number.isFinite(v) ? v : 0.3;
  });

  // InfoModal
  const [infoModal, setInfoModal] = useState({ open:false, id:"" });

  // Persistenz
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} }, [data]);
  useEffect(() => { try { localStorage.setItem(LS_UI, JSON.stringify({ view, focusId, depth, onlyNeighborhood })); } catch {} }, [view, focusId, depth, onlyNeighborhood]);
  useEffect(() => { try { bgImage ? localStorage.setItem(LS_BG_IMG, bgImage) : localStorage.removeItem(LS_BG_IMG);} catch {} }, [bgImage]);
  useEffect(() => { try { localStorage.setItem(LS_BG_OPA, String(bgOpacity)); } catch {} }, [bgOpacity]);

  // Event-Fallback – nimmt Updates aus der Galerie (CustomEvent) sicher an
  useEffect(() => {
    const onUpdate = (e) => {
      const { nodes, edges } = e.detail || {};
      if (Array.isArray(nodes) && Array.isArray(edges)) setData({ nodes, edges });
    };
    window.addEventListener("sims:updateData", onUpdate);
    return () => window.removeEventListener("sims:updateData", onUpdate);
  }, []);

  const idToLabel = useMemo(() => {
    const m = new Map(); data.nodes.forEach((n)=>m.set(n.id, n.label||n.id)); return m;
  }, [data]);

  // --- JSON Import/Export ---
  function handleImportJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(String(r.result));
        if (!o.nodes || !o.edges) throw new Error("Erwarte keys 'nodes' & 'edges'");
        o.nodes = o.nodes.map((n) => ({
          alive:n.alive!==false,
          info:n.info&&Array.isArray(n.info.fields)?n.info:{fields:[]},
          img:"",
          ...n
        }));
        setData(o);
        setFocusId("");
      } catch (e) {
        alert("Import fehlgeschlagen: " + e.message);
      }
    };
    r.readAsText(file);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sims-relationships.json"; a.click();
    URL.revokeObjectURL(url);
  }

  // Personen
  const [newPersonLabel, setNewPersonLabel] = useState("");
  const [newPersonImgFile, setNewPersonImgFile] = useState(null);
  function addPerson() {
    if (!newPersonLabel.trim()) return alert("Bitte Namen eingeben");
    const id = makeIdFromLabel(newPersonLabel);
    if (data.nodes.some(n=>n.id===id)) return alert("ID existiert bereits");
    const commit = (img) => {
      setData(prev => ({ ...prev, nodes:[...prev.nodes, { id, label:newPersonLabel.trim(), img: img || "", alive:true, info:{ fields:[] } }] }));
      setNewPersonLabel("");
      setNewPersonImgFile(null);
    };
    if (newPersonImgFile) {
      const r = new FileReader(); r.onload = () => commit(String(r.result)); r.readAsDataURL(newPersonImgFile);
    } else commit("");
  }

  // Beziehungen (Sidebar)
  function upsertRelationship() {
    if (!relSource || !relTarget || relSource===relTarget) return alert("Quelle/Ziel prüfen");
    setData(prev=>{
      const next = deepClone(prev);
      let e = next.edges.find(x=>x.source===relSource && x.target===relTarget && x.type===relType);
      if (!e) next.edges.push({ id:`e_${Date.now()}`, source:relSource, target:relTarget, type:relType, strength:relStrength });
      else e.strength = relStrength;
      return next;
    });
  }
  function deleteSelectedEdge() {
    if (!selectedEdgeId) return;
    setData(prev=>{
      const next = deepClone(prev);
      next.edges = next.edges.filter(e => (e.id || `${e.source}-${e.target}-${e.type}`) !== selectedEdgeId);
      return next;
    });
    setSelectedEdgeId("");
  }

  // BG helpers (nur Galerie nutzt diese Props)
  const onBgUpload = (src) => setBgImage(src);
  const onBgOpacity = (v) => setBgOpacity(v);
  const onBgClear = () => setBgImage("");

  // Info modal
  const openInfo = (id) => setInfoModal({ open:true, id });
  const closeInfo = () => setInfoModal({ open:false, id:"" });
  const saveInfo = (patch) => {
    setData(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === infoModal.id ? { ...n, ...patch } : n) }));
    closeInfo();
  };

  // Sidebar Styles
  const glass = { background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, backdropFilter: "blur(6px)" };
  const panel = { padding: 14, borderRadius: 16, marginBottom: 12, ...glass };
  const header = { display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, ...glass };
  const labelS = { display: "block", fontSize: 12, color: T.subtext, marginBottom: 6 };
  const inputS = { width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`, borderRadius: 12, background: "rgba(255,255,255,0.65)", color: T.text, outline: "none" };
  const btnBase = { padding: "9px 12px", borderRadius: 12, border: `1px solid ${T.line}`, cursor: "pointer", transition: "all .2s ease", color: T.text, background: T.accentSoft };
  const btn = (filled = false) => ({ ...btnBase, background: filled ? T.accent : T.accentSoft, color: filled ? "#fff" : T.text });

  const nodeOptions = useMemo(() => data.nodes.slice().sort((a,b)=>(a.label||a.id).localeCompare(b.label||b.id)), [data]);

  return (
    <div
      style={{
        display:"grid", gridTemplateColumns:"380px 1fr", gap:18, padding:18, minHeight:"100vh",
        background: T.bg, // ⟵ kein globales BG-Bild mehr
        color:T.text, fontFamily:"Inter, system-ui, Arial, sans-serif", position:"relative"
      }}
    >
      {/* Sidebar */}
      <div>
        <div style={header}>
          <div style={{ fontWeight: 800 }}>Sims Relationship Explorer</div>
          <div style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
            <button onClick={()=>setView("explorer")} style={{ ...btnBase, padding:"8px 12px", borderRadius:10, background:view==="explorer" ? T.accent : T.accentSoft, color:view==="explorer"?"#fff":T.text }}>🗺️ Explorer</button>
            <button onClick={()=>setView("gallery")}  style={{ ...btnBase, padding:"8px 12px", borderRadius:10, background:view==="gallery"  ? T.accent : T.accentSoft, color:view==="gallery" ?"#fff":T.text }}>🖼️ Galerie</button>
          </div>
        </div>

        {view === "explorer" ? (
          <>
            <div style={panel}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Filter & Fokus</div>
              <label style={labelS}>Person fokussieren</label>
              <input list="people" style={inputS} value={idToLabel.get(focusId)||""}
                onChange={(e)=>{ const val=e.target.value; const m=nodeOptions.find(n=>n.label===val || n.id===val); setFocusId(m?m.id:""); }}
                placeholder="Namen eingeben…" />
              <datalist id="people">{nodeOptions.map(n => <option key={n.id} value={n.label||n.id} />)}</datalist>
              <div style={{ display:"flex", gap:12, marginTop:8, alignItems:"center" }}>
                <label><input type="checkbox" checked={onlyNeighborhood} onChange={(e)=>setOnlyNeighborhood(e.target.checked)} /> Nur Umfeld</label>
              </div>
              <div style={{ marginTop:10 }}>
                <label style={labelS}>Tiefe (Hops): {depth}</label>
                <input type="range" min={1} max={3} step={1} value={depth} onChange={(e)=>setDepth(parseInt(e.target.value))} style={{ width:"100%" }} />
              </div>
              <div style={{ marginTop:10 }}>
                <label style={labelS}>Beschriftungen</label>
                {["always","focus","off"].map(k=>(
                  <button key={k} onClick={()=>setLabelMode(k)} style={{ ...btn(labelMode===k), marginRight:8 }}>
                    {k==="always"?"Immer":k==="focus"?"Nur Fokus":"Aus"}
                  </button>
                ))}
              </div>
            </div>

            <div style={panel}>
              <div style={{ fontWeight:700, marginBottom:6 }}>Legende / Beziehungstypen</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <span style={{ fontSize:12, color:T.subtext }}>Kantenlabel:</span>
                {["emoji","emoji+text","off"].map(m=>(
                  <button key={m} onClick={()=>setEdgeLabelMode(m)} style={{ ...btn(edgeLabelMode===m) }}>
                    {m==="emoji"?"Emoji":m==="emoji+text"?"Emoji+Text":"Aus"}
                  </button>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
                {Object.entries(EDGE_STYLE).map(([k,v])=>(
                  <label key={k} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
                    <input
                      type="checkbox"
                      checked={visibleTypes.has(k)}
                      onChange={(e)=>{ const ns=new Set(visibleTypes); e.target.checked?ns.add(k):ns.delete(k); setVisibleTypes(ns); }}
                    />
                    <span style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
                      <span style={{ width:34, height:0, borderBottom:`${v.width}px ${v.lineStyle} ${v.color}` }} /> {v.emoji} {v.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={panel}>
              <div style={{ fontWeight:700, marginBottom:6 }}>Neue Person</div>
              <label style={labelS}>Name</label>
              <input style={inputS} value={newPersonLabel} onChange={(e)=>setNewPersonLabel(e.target.value)} placeholder="Name" />
              <label style={labelS}>Bild (optional)</label>
              <input type="file" accept="image/*" onChange={(e)=>setNewPersonImgFile(e.target.files?.[0]||null)} style={{ marginBottom:10 }} />
              <button style={btn(true)} onClick={addPerson}>Hinzufügen</button>
            </div>

            <div style={panel}>
              <div style={{ fontWeight:700, marginBottom:6 }}>Beziehung hinzufügen / ändern</div>
              <label style={labelS}>Quelle</label>
              <select value={relSource} onChange={(e)=>setRelSource(e.target.value)} style={inputS}>
                <option value="">– wählen –</option>
                {nodeOptions.map(n=><option key={n.id} value={n.id}>{n.label||n.id}</option>)}
              </select>
              <label style={labelS}>Ziel</label>
              <select value={relTarget} onChange={(e)=>setRelTarget(e.target.value)} style={inputS}>
                <option value="">– wählen –</option>
                {nodeOptions.map(n=><option key={n.id} value={n.id}>{n.label||n.id}</option>)}
              </select>
              <label style={labelS}>Typ</label>
              <select value={relType} onChange={(e)=>setRelType(e.target.value)} style={inputS}>
                {Object.keys(EDGE_STYLE).map(k=> <option key={k} value={k}>{EDGE_STYLE[k].emoji} {EDGE_STYLE[k].label}</option>)}
              </select>
              <label style={labelS}>Stärke: {relStrength.toFixed(2)}</label>
              <input type="range" min={0} max={1} step={0.05} value={relStrength} onChange={(e)=>setRelStrength(parseFloat(e.target.value))} style={{ width:"100%", marginBottom:10 }} />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button style={btn(true)} onClick={upsertRelationship}>Speichern</button>
                <button style={{ ...btn(), background:"#ffecec", border:"1px solid #f5b9b9" }} disabled={!selectedEdgeId} onClick={deleteSelectedEdge}>Ausgewählte Kante löschen</button>
              </div>
              {selectedEdgeId && <div style={{ fontSize:12, color:T.subtext, marginTop:6 }}>Ausgewählte Kante: {selectedEdgeId}</div>}
            </div>

            <div style={panel}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Daten</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <label style={{ ...btn(), display:"inline-block" }}>JSON importieren
                  <input type="file" accept="application/json" style={{ display:"none" }} onChange={(e)=>e.target.files && handleImportJson(e.target.files[0])} />
                </label>
                <button onClick={exportJson} style={btn()}>JSON exportieren</button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Galerie-Sidebar (nur Daten – Hintergrund steuert die Galerie selbst in ihrer Toolbar) */}
            <div style={panel}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Daten</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <label style={{ ...btn(), display:"inline-block" }}>JSON importieren
                  <input type="file" accept="application/json" style={{ display:"none" }} onChange={(e)=>e.target.files && handleImportJson(e.target.files[0])} />
                </label>
                <button onClick={exportJson} style={btn()}>JSON exportieren</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content – Views */}
      <div key={view}>
        {view === "explorer" ? (
          <ExplorerView
            data={data}
            onDataChange={setData}
            onFocus={setFocusId}
            focusId={focusId}
            depth={depth}
            onlyNeighborhood={onlyNeighborhood}
            visibleTypes={visibleTypes}
            labelMode={labelMode}
            edgeLabelMode={edgeLabelMode}
            onEdgeSelected={({id, source, target, type, strength})=>{
              setSelectedEdgeId(id);
              setRelSource(source);
              setRelTarget(target);
              setRelType(type);
              setRelStrength(typeof strength==="number"?strength:0.5);
            }}
            THEME={THEME}
            EDGE_STYLE={EDGE_STYLE}
            /* ⟵ KEIN bgImage/bgOpacity mehr hier */
            onOpenInfo={openInfo}
          />
        ) : (
          <GalleryView
            data={data}
            THEME={THEME}
            FIELD_TEMPLATES={FIELD_TEMPLATES}
            onOpenInfo={openInfo}
            onFocusInExplorer={(id)=>{ setFocusId(id); setView("explorer"); }}

            /* Hintergrund nur für Galerie */
            bgImage={bgImage}
            bgOpacity={bgOpacity}
            onBgUpload={onBgUpload}
            onBgOpacity={onBgOpacity}
            onBgClear={onBgClear}

            onChange={(next)=>setData(next)}
          />
        )}
      </div>

      {/* InfoModal */}
      {infoModal.open && (
        <InfoModal
          person={data.nodes.find(n=>n.id===infoModal.id)}
          onClose={closeInfo}
          onSave={(patch)=>saveInfo(patch)}
          FIELD_TEMPLATES={FIELD_TEMPLATES}
          THEME={THEME}
        />
      )}
    </div>
  );
}
