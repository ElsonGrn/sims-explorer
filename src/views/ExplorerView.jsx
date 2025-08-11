import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
cytoscape.use(coseBilkent);

export default function ExplorerView({
  data,
  onDataChange,            // (next) => void
  onFocus,                 // (nodeId) => void
  focusId,
  depth,
  onlyNeighborhood,
  visibleTypes,            // Set<string>
  labelMode,               // "always" | "focus" | "off"
  edgeLabelMode,           // "emoji" | "emoji+text" | "off"
  onEdgeSelected,          // ({ id, source, target, type, strength }) => void
  THEME,
  EDGE_STYLE,
  bgImage,
  bgOpacity,
  onBgUpload, onBgOpacity, onBgClear,
  onOpenInfo,              // (nodeId) => void
}) {
  const T = THEME;
  const wrapRef = useRef(null);
  const cyRef = useRef(null);

  // Kontextmenüs & Edit-States innerhalb der View
  const [ctx, setCtx] = useState({ open:false, x:0, y:0, nodeId:"" });
  const [edgeCtx, setEdgeCtx] = useState({ open:false, x:0, y:0, edgeId:"" });
  const [bgCtx, setBgCtx] = useState({ open:false, x:0, y:0 });

  const [editId, setEditId] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editImgFile, setEditImgFile] = useState(null);

  const [edgeEdit, setEdgeEdit] = useState({ open:false, id:"", type:"friend", strength:0.5 });

  // Init cytoscape
  useEffect(() => {
    const cy = cytoscape({
      container: wrapRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            label: (ele) => {
              const base = ele.data("label") ?? ele.id();
              const alive = ele.data("alive") !== 0;
              return alive ? base : `☠️ ${base}`;
            },
            color: T.text,
            "font-size": 12,
            width: 56,
            height: 56,
            shape: "ellipse",
            "background-color": T.nodeBg,
            "border-width": 2,
            "border-color": T.nodeBorder,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "background-image": (ele) => ele.data("img") || null,
            "background-fit": "cover",
            "background-clip": "node",
          },
        },
        { selector: "node[alive = 0]", style: { "border-color": "#6b7280", "background-color": "#e5e7eb", opacity: 0.7 } },
        { selector: "node.hovered", style: { "border-width": 3, "border-color": T.accent } },
        { selector: "node.focused", style: { "border-width": 4, "border-color": T.accent, width: 70, height: 70 } },
        { selector: "node.dimmed", style: { opacity: 0.25 } },
        {
          selector: "edge",
          style: {
            width: 2,
            "curve-style": "bezier",
            "text-rotation": "autorotate",
            "text-margin-y": -8,
            "text-background-color": T.glassBg,
            "text-background-opacity": 0.8,
            "text-background-padding": 2,
          },
        },
        { selector: "edge.dimmed", style: { opacity: 0.15 } },
        { selector: ".hidden", style: { display: "none" } },
      ],
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      onFocus(id);
      setCtx((p)=>({ ...p, open:false }));
      setEdgeCtx((p)=>({ ...p, open:false }));
      setBgCtx({ open:false, x:0, y:0 });
    });
    cy.on("mouseover", "node", (evt) => evt.target.addClass("hovered"));
    cy.on("mouseout", "node", (evt) => evt.target.removeClass("hovered"));

    cy.on("tap", "edge", (evt) => {
      const e = evt.target;
      onEdgeSelected({
        id: e.id(),
        source: e.data("source"),
        target: e.data("target"),
        type: e.data("type"),
        strength: e.data("strength") ?? 0.5,
      });
      setCtx((p)=>({ ...p, open:false }));
      setEdgeCtx((p)=>({ ...p, open:false }));
      setBgCtx({ open:false, x:0, y:0 });
    });

    // Kantenlabels initialisieren
    cy.on("add data", "edge", (e) => {
      const ed = e.target;
      const t = ed.data("type");
      const def = EDGE_STYLE[t];
      if (!def) return;
      const text =
        edgeLabelMode === "emoji" ? def.emoji :
        edgeLabelMode === "emoji+text" ? `${def.emoji} ${def.label}` : "";
      ed.style("label", text);
      ed.style("font-size", 14);
    });

    // Rechtsklick: Node
    cy.on("cxttap", "node", (evt) => {
      const id = evt.target.id();
      const p = evt.renderedPosition;
      setCtx({ open:true, x:p.x, y:p.y, nodeId:id });
      setEdgeCtx({ open:false, x:0, y:0, edgeId:"" });
      setBgCtx({ open:false, x:0, y:0 });
    });

    // Rechtsklick: Edge
    cy.on("cxttap", "edge", (evt) => {
      const e = evt.target;
      const p = evt.renderedPosition;
      setEdgeCtx({ open:true, x:p.x, y:p.y, edgeId:e.id() });
      setCtx({ open:false, x:0, y:0, nodeId:"" });
      setBgCtx({ open:false, x:0, y:0 });
    });

    // Rechtsklick: Hintergrund
    cy.on("cxttap", (evt) => {
      if (evt.target === cy) {
        const p = evt.renderedPosition || { x:20, y:20 };
        setBgCtx({ open:true, x:p.x, y:p.y });
        setCtx({ open:false, x:0, y:0, nodeId:"" });
        setEdgeCtx({ open:false, x:0, y:0, edgeId:"" });
      }
    });

    // schließen
    cy.on("tap zoom drag", () => {
      setCtx((m)=>({ ...m, open:false }));
      setEdgeCtx((m)=>({ ...m, open:false }));
      setBgCtx({ open:false, x:0, y:0 });
    });

    cyRef.current = cy;
    return ()=>cy.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // build/update
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;

    cy.elements().remove();
    cy.add([
      ...data.nodes.map(n=>({
        data:{ id:n.id, label:n.label, img:n.img||"", alive: n.alive === false ? 0 : 1 }
      })),
      ...data.edges.map(e=>({
        data:{ id:e.id || `${e.source}-${e.target}-${e.type}`, source:e.source, target:e.target, type:e.type, strength:e.strength ?? 0.5 }
      })),
    ]);

    // Stil + Labels
    Object.entries(EDGE_STYLE).forEach(([type, s]) => {
      cy.style().selector(`edge[type = "${type}"]`).style({ "line-color": s.color, "line-style": s.lineStyle, width: s.width }).update();
    });
    cy.edges().forEach(ed=>{
      const t = ed.data("type");
      const def = EDGE_STYLE[t]; if (!def) return;
      const text = edgeLabelMode==="emoji" ? def.emoji : edgeLabelMode==="emoji+text" ? `${def.emoji} ${def.label}` : "";
      ed.style("label", text);
      ed.style("font-size", 14);
    });

    cy.layout({ name:"cose-bilkent", animate:false, fit:true, randomize:true, idealEdgeLength:120, nodeRepulsion:9000 }).run();
  }, [data, EDGE_STYLE, edgeLabelMode]);

  // Sichtbarkeit / Fokus / Labels
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;

    cy.edges().forEach((e)=> e.toggleClass("hidden", !visibleTypes.has(e.data("type"))));
    cy.nodes().removeClass("focused dimmed hidden");
    cy.edges().removeClass("dimmed");

    if (focusId && onlyNeighborhood) {
      const root = cy.getElementById(focusId);
      if (root && root.nonempty()) {
        const bfs = cy.elements().bfs({ roots: root, directed:false, maxDepth: depth });
        const visN = new Set(), visE = new Set();
        bfs.path.forEach((el)=>{ if (el.isNode()) visN.add(el.id()); else if (el.isEdge()) visE.add(el.id()); });
        cy.nodes().forEach((n)=>{ if (!visN.has(n.id())) n.addClass("hidden"); });
        cy.edges().forEach((e)=>{ if (!visE.has(e.id())) e.addClass("hidden"); });
        root.addClass("focused");
      }
    } else if (focusId) {
      const root = cy.getElementById(focusId);
      root.addClass("focused");
      const neigh = root.closedNeighborhood();
      cy.elements().difference(neigh.union(root)).forEach((el)=> el.addClass("dimmed"));
    }

    if (labelMode === "off") cy.nodes().style("label", "");
    else if (labelMode === "focus" && focusId) cy.nodes().forEach((n)=> n.style("label", n.id() === focusId ? n.data("label") : ""));
    else cy.nodes().forEach((n)=> n.style("label", n.data("label")));
  }, [focusId, depth, onlyNeighborhood, visibleTypes, labelMode]);

  // Node edit helpers
  function openEditPerson(id) {
    const n = data.nodes.find(x=>x.id===id); if (!n) return;
    setEditId(id);
    setEditLabel(n.label || id);
    setEditImgFile(null);
  }
  function saveEditPerson() {
    if (!editId) return;
    const commit = (imgData) => {
      const next = JSON.parse(JSON.stringify(data));
      const n = next.nodes.find(x=>x.id===editId);
      if (n) {
        n.label = editLabel.trim() || n.id;
        if (imgData !== undefined) n.img = imgData;
      }
      onDataChange(next);
      setEditId("");
    };
    if (editImgFile) {
      const r = new FileReader();
      r.onload = () => commit(String(r.result));
      r.readAsDataURL(editImgFile);
    } else commit();
  }
  function deletePerson(id) {
    const nid = id || editId; if (!nid) return;
    const next = JSON.parse(JSON.stringify(data));
    next.nodes = next.nodes.filter(n=>n.id!==nid);
    next.edges = next.edges.filter(e=> e.source!==nid && e.target!==nid);
    onDataChange(next);
    setEditId("");
  }
  function deleteAllRelationsOf(id) {
    const next = JSON.parse(JSON.stringify(data));
    next.edges = next.edges.filter(e=> e.source!==id && e.target!==id);
    onDataChange(next);
  }

  // Edge edit helpers
  function openEdgeEdit(edgeId) {
    const e = data.edges.find(x => (x.id || `${x.source}-${x.target}-${x.type}`) === edgeId);
    if (!e) return;
    setEdgeEdit({ open:true, id: edgeId, type: e.type, strength: typeof e.strength==="number" ? e.strength : 0.5 });
  }
  function saveEdgeEdit() {
    const { id, type, strength } = edgeEdit;
    if (!id) return;
    const next = JSON.parse(JSON.stringify(data));
    const idx = next.edges.findIndex(x => (x.id || `${x.source}-${x.target}-${x.type}`) === id);
    if (idx >= 0) {
      next.edges[idx].type = type;
      next.edges[idx].strength = strength;
      onDataChange(next);
    }
    setEdgeEdit({ open:false, id:"", type:"friend", strength:0.5 });
  }
  function deleteEdgeById(edgeId) {
    const next = JSON.parse(JSON.stringify(data));
    next.edges = next.edges.filter(e=> (e.id || `${e.source}-${e.target}-${e.type}`) !== edgeId);
    onDataChange(next);
    setEdgeCtx({ open:false, x:0, y:0, edgeId:"" });
  }

  return (
    <div style={{ position:"relative", height:"82vh", borderRadius:18, border:`1px solid ${T.line}`, boxShadow:T.shadow, background:T.glassBg, backdropFilter:"blur(6px)" }}>
      {/* BG Overlay (global kommt aus Parent, hier nur Hinweis) */}
      <div ref={wrapRef} style={{ position:"absolute", inset:0, borderRadius:18 }} />

      {/* Kontextmenü Hintergrund */}
      {bgCtx.open && (
        <div
          style={{ position:"absolute", left:bgCtx.x, top:bgCtx.y, transform:"translateY(8px)", minWidth:220, zIndex:39, borderRadius:12, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, overflow:"hidden" }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div style={{ padding:"8px 10px", fontWeight:700, color:T.subtext }}>Hintergrund</div>
          <div style={{ height:1, background:T.line }} />
          <label style={{ padding:"8px 10px", cursor:"pointer", display:"block" }}>
            🖼️ Bild auswählen…
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={(e)=>{ const f=e.target.files?.[0]; if (f) { const r=new FileReader(); r.onload=()=>onBgUpload(String(r.result)); r.readAsDataURL(f); } }} />
          </label>
          <div style={{ padding:"8px 10px" }}>
            <div style={{ fontSize:12, color:T.subtext, marginBottom:6 }}>Transparenz: {bgOpacity.toFixed(2)}</div>
            <input type="range" min={0.1} max={0.9} step={0.05} value={bgOpacity} onChange={(e)=>onBgOpacity(parseFloat(e.target.value))} style={{ width:"100%" }} />
          </div>
          <div style={{ padding:"8px 10px", cursor:"pointer", color:"#b3261e" }} onClick={onBgClear}>🗑️ Zurücksetzen</div>
          <div style={{ height:1, background:T.line }} />
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>setBgCtx({ open:false, x:0, y:0 })}>Abbrechen</div>
        </div>
      )}

      {/* Kontextmenü Node */}
      {ctx.open && (
        <div
          style={{ position:"absolute", left:ctx.x, top:ctx.y, transform:"translateY(8px)", minWidth:200, zIndex:40, borderRadius:12, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, overflow:"hidden" }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>{ openEditPerson(ctx.nodeId); setCtx((p)=>({ ...p, open:false })); }}>✏️ Bearbeiten…</div>
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>onOpenInfo(ctx.nodeId)}>ℹ️ Infos…</div>
          <div style={{ height:1, background:T.line }} />
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>deleteAllRelationsOf(ctx.nodeId)}>🔗 Alle Beziehungen löschen</div>
          <div style={{ padding:"8px 10px", cursor:"pointer", color:"#b3261e" }} onClick={()=>deletePerson(ctx.nodeId)}>🗑️ Person entfernen</div>
          <div style={{ height:1, background:T.line }} />
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>setCtx({ open:false, x:0, y:0, nodeId:"" })}>Abbrechen</div>
        </div>
      )}

      {/* Kontextmenü Edge */}
      {edgeCtx.open && (
        <div
          style={{ position:"absolute", left:edgeCtx.x, top:edgeCtx.y, transform:"translateY(8px)", minWidth:200, zIndex:41, borderRadius:12, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, overflow:"hidden" }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div style={{ padding:"8px 10px", fontWeight:700, color:T.subtext }}>Beziehung</div>
          <div style={{ height:1, background:T.line }} />
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>openEdgeEdit(edgeCtx.edgeId)}>✏️ Bearbeiten…</div>
          <div style={{ padding:"8px 10px", cursor:"pointer", color:"#b3261e" }} onClick={()=>deleteEdgeById(edgeCtx.edgeId)}>🗑️ Löschen</div>
          <div style={{ height:1, background:T.line }} />
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>setEdgeCtx({ open:false, x:0, y:0, edgeId:"" })}>Abbrechen</div>
        </div>
      )}

      {/* Edit-Modal Node */}
      {editId && (
        <div onClick={()=>setEditId("")} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:380, padding:16, borderRadius:16, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, backdropFilter:"blur(8px)" }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Person bearbeiten</div>
            <label style={{ display:"block", fontSize:12, color:T.subtext, marginBottom:6 }}>Name</label>
            <input style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.line}`, borderRadius:12, background:"rgba(255,255,255,0.65)", color:T.text, outline:"none", marginBottom:8 }} value={editLabel} onChange={(e)=>setEditLabel(e.target.value)} />
            <label style={{ display:"block", fontSize:12, color:T.subtext, marginBottom:6 }}>Bild ersetzen (optional)</label>
            <input type="file" accept="image/*" onChange={(e)=>setEditImgFile(e.target.files?.[0]||null)} style={{ marginBottom:10 }} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button style={{ padding:"9px 12px", borderRadius:12, border:`1px solid ${T.line}`, background:T.accent, color:"#fff" }} onClick={saveEditPerson}>Speichern</button>
              <button style={{ padding:"9px 12px", borderRadius:12, border:`1px solid ${T.line}`, background:T.accentSoft }} onClick={()=>setEditId("")}>Abbrechen</button>
              <button style={{ padding:"9px 12px", borderRadius:12, border:"1px solid #f5b9b9", background:"#ffecec" }} onClick={()=>deletePerson()}>Person löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit-Modal Edge */}
      {edgeEdit.open && (
        <div onClick={()=>setEdgeEdit((s)=>({ ...s, open:false }))} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:51 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:420, padding:16, borderRadius:16, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, backdropFilter:"blur(8px)" }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Beziehung bearbeiten</div>
            <label style={{ display:"block", fontSize:12, color:T.subtext, marginBottom:6 }}>Typ</label>
            <select style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.line}`, borderRadius:12, background:"rgba(255,255,255,0.65)" }}
              value={edgeEdit.type} onChange={(e)=>setEdgeEdit((s)=>({ ...s, type:e.target.value }))}>
              {Object.entries(EDGE_STYLE).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <label style={{ display:"block", fontSize:12, color:T.subtext, margin:"8px 0 6px" }}>Stärke: {edgeEdit.strength.toFixed(2)}</label>
            <input type="range" min={0} max={1} step={0.05} value={edgeEdit.strength} onChange={(e)=>setEdgeEdit((s)=>({ ...s, strength: parseFloat(e.target.value) }))} style={{ width:"100%" }} />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
              <button style={{ padding:"9px 12px", borderRadius:12, border:`1px solid ${T.line}`, background:T.accentSoft }} onClick={()=>setEdgeEdit((s)=>({ ...s, open:false }))}>Abbrechen</button>
              <button style={{ padding:"9px 12px", borderRadius:12, border:`1px solid ${T.line}`, background:T.accent, color:"#fff" }} onClick={saveEdgeEdit}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
