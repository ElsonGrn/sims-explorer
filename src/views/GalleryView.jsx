// src/views/GalleryView.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import InfoModal from "../shared/InfoModal.jsx";

export default function GalleryView({
  data,
  onChange,
  onFocusInExplorer,
  bgImage, bgOpacity = 0.25,
  onBgUpload, onBgOpacity, onBgClear,
  onRequestCreateSim,                 // ✅ NEU
}) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("name_asc");

  const people = useMemo(() => {
    let list = [...nodes];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(n => (n.label ?? n.id).toLowerCase().includes(q));
    list.sort((a,b)=>(a.label ?? a.id).localeCompare(b.label ?? b.id));
    if (sort === "name_desc") list.reverse();
    return list;
  }, [nodes, search, sort]);

  const applyChange = (nextNodes, nextEdges = edges) => {
    const payload = { nodes: nextNodes, edges: nextEdges };
    try { window.dispatchEvent(new CustomEvent("sims:updateData", { detail: payload })); } catch {}
    if (typeof onChange === "function") onChange(payload);
  };
  const updateNode = (id, patch) => applyChange(nodes.map(n => n.id===id ? { ...n, ...patch } : n));

  // Personen-Kontextmenü
  const [menu, setMenu] = useState({ open:false, x:0, y:0, sim:null });
  const menuRef = useRef(null);
  const openMenu = (e, sim) => { e.preventDefault(); setMenu({ open:true, x:e.clientX, y:e.clientY, sim }); };
  const closeMenu = () => setMenu(m => ({ ...m, open:false }));

  useLayoutEffect(() => {
    if (!menu.open || !menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    let nx = menu.x, ny = menu.y;
    if (nx + r.width  > window.innerWidth ) nx = window.innerWidth  - r.width  - 6;
    if (ny + r.height > window.innerHeight) ny = window.innerHeight - r.height - 6;
    menuRef.current.style.left = `${nx}px`;
    menuRef.current.style.top  = `${ny}px`;
  }, [menu.open, menu.x, menu.y]);

  useEffect(() => {
    if (!menu.open) return;
    const onDown = (ev) => { if (menuRef.current && !menuRef.current.contains(ev.target)) closeMenu(); };
    const onEsc  = (ev) => { if (ev.key === "Escape") closeMenu(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, [menu.open]);

  // Bild-Auswahl-Dialog (wie zuvor) …
  const [editSimId, setEditSimId] = useState(null);
  const [form, setForm] = useState({ id:"", label:"", alive:true, traits:[], notes:"", img:null, image:null });
  const startEdit = (sim) => { /* … unverändert … */ 
    if (!sim) return;
    setEditSimId(sim.id);
    setForm({
      id: sim.id, label: (sim.label || sim.id || "").toString(),
      alive: sim.alive !== false, traits: Array.isArray(sim.traits) ? sim.traits : [],
      notes: (sim.notes || "").toString(),
      img: sim.img || sim.image || null, image: sim.img || sim.image || null,
    });
  };
  const saveEdit = () => { /* … unverändert … */ 
    const next = nodes.map(n => {
      if (n.id !== form.id) return n;
      const newImage = (form.img || form.image);
      return {
        ...n, label: form.label.trim() || n.id, alive: !!form.alive,
        traits: Array.from(new Set((form.traits||[]).filter(Boolean))),
        notes: form.notes,
        img:   newImage != null ? newImage : (n.img   ?? n.image ?? null),
        image: newImage != null ? newImage : (n.image ?? n.img   ?? null),
      };
    });
    applyChange(next); setEditSimId(null);
  };
  const deleteSim = (simId) => {
    const nextNodes = nodes.filter(n => n.id !== simId);
    const nextEdges = edges.filter(e => e.source !== simId && e.target !== simId);
    applyChange(nextNodes, nextEdges);
  };

  // Bild-Dialog (Firefox-sicher)
  const [imgDlg, setImgDlg] = useState({ open:false, mode:"sim", targetId:null, preview:null, fileName:"" });
  const openImageDialogForSim = (simId) => setImgDlg({ open:true, mode:"sim", targetId:simId, preview:null, fileName:"" });
  const openImageDialogForBg  = () => setImgDlg({ open:true, mode:"bg", targetId:null, preview:null, fileName:"" });
  const cancelImageDialog = () => setImgDlg(d => ({ ...d, open:false, preview:null, fileName:"" }));
  const onPickFile = async (file) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const small = await shrinkImage(dataUrl, 1200, 0.86);
    setImgDlg(d => ({ ...d, preview: small, fileName: file.name || "" }));
  };
  const confirmImageDialog = () => {
    if (!imgDlg.preview) { cancelImageDialog(); return; }
    if (imgDlg.mode === "sim" && imgDlg.targetId) {
      updateNode(imgDlg.targetId, { img: imgDlg.preview, image: imgDlg.preview });
      if (editSimId === imgDlg.targetId) setForm(f => ({ ...f, img: imgDlg.preview, image: imgDlg.preview }));
    } else if (imgDlg.mode === "bg") {
      onBgUpload?.(imgDlg.preview);
    }
    cancelImageDialog();
  };

  // Explorer-Fokus
  const focusInExplorer = (id) => {
    if (!id) return;
    if (typeof onFocusInExplorer === "function") onFocusInExplorer(id);
    else window.dispatchEvent(new CustomEvent("sims:focusNode", { detail:{ id } }));
  };

  // ✅ Hintergrund-Kontextmenü (rechter Mausklick auf freien Bereich)
  const [bgMenu, setBgMenu] = useState({ open:false, x:0, y:0 });
  const bgMenuRef = useRef(null);
  function onRootContextMenu(e){
    const isCard = e.target.closest?.("[data-sim-id]");
    if (isCard) return; // Personenmenü übernimmt
    e.preventDefault();
    setBgMenu({ open:true, x:e.clientX, y:e.clientY });
  }
  useEffect(() => {
    if (!bgMenu.open) return;
    const onDown = (ev) => { if (bgMenuRef.current && !bgMenuRef.current.contains(ev.target)) setBgMenu({open:false,x:0,y:0}); };
    const onEsc  = (ev) => { if (ev.key === "Escape") setBgMenu({open:false,x:0,y:0}); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, [bgMenu.open]);

  // Styles
  const rootStyle = {
    minHeight: "calc(100vh - 58px)",
    background:
      `radial-gradient(1000px 500px at 10% -10%, rgba(0,193,118,0.10), transparent 60%),` +
      `linear-gradient(135deg,#EAFBF3 0%,#F7FFFD 40%,#F4F8FF 100%)`,
    color: "#0b1e13",
    ...(bgImage ? {
      backgroundImage: `linear-gradient(rgba(255,255,255,${bgOpacity}), rgba(255,255,255,${bgOpacity})), url(${bgImage})`,
      backgroundSize: "cover", backgroundPosition: "center",
    } : {}),
  };
  const toolbar = { display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", padding:"12px 16px" };
  const input = { padding:"8px 10px", borderRadius:10, border:"1px solid #cfeede", background:"#fff" };
  const select = { ...input };
  const btn = { ...input, cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.06)" };
  const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16, padding:"0 16px 24px" };
  const card = { position:"relative", borderRadius:20, overflow:"hidden", border:"1px solid #e6f3ec", boxShadow:"0 8px 22px rgba(0,0,0,0.08)", background:"#fff", cursor:"default", contentVisibility:"auto", containIntrinsicSize:"260px 320px" };
  const banner = { position:"relative", aspectRatio:"3 / 2", background:"#e6fff3" };
  const bannerImg = { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" };
  const overlay = { position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05) 60%, transparent)" };
  const meta = { position:"absolute", left:12, right:12, bottom:10, color:"#fff", display:"flex", alignItems:"flex-end", gap:10, justifyContent:"space-between" };
  const name = { fontWeight:800, fontSize:20, textShadow:"0 2px 8px rgba(0,0,0,0.5)" };
  const badges = { display:"flex", gap:6, flexWrap:"wrap" };
  const badge = { padding:"2px 8px", borderRadius:999, fontSize:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", backdropFilter:"blur(2px)" };
  const body = { padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 };
  const traits = { display:"flex", flexWrap:"wrap", gap:6 };
  const trait = { padding:"2px 8px", borderRadius:999, border:"1px solid #cfeede", background:"#fff", fontSize:12 };
  const quick = { position:"absolute", top:8, right:8, display:"flex", gap:6, opacity:0, transition:"opacity .15s ease" };
  const iconBtn = { padding:6, borderRadius:10, border:"1px solid rgba(255,255,255,0.5)", background:"rgba(0,0,0,0.25)", color:"#fff", cursor:"pointer" };
  const menuBox = { position:"fixed", zIndex:1000, background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, minWidth:220, boxShadow:"0 10px 30px rgba(0,0,0,0.15)", overflow:"hidden" };
  const menuItem = { padding:"10px 12px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", userSelect:"none" };

  return (
    <div style={rootStyle} onContextMenu={onRootContextMenu}>
      {/* Toolbar */}
      <div style={toolbar}>
        <input style={input} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Suche nach Name…"/>
        <select style={select} value={sort} onChange={(e)=>setSort(e.target.value)}>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, opacity:.75 }}>Hintergrund:</span>
          <button style={btn} onClick={openImageDialogForBg}>Bild setzen</button>
          <label style={{ fontSize:12, opacity:.75 }}>Deckkraft {Math.round((bgOpacity)*100)}%</label>
          <input type="range" min={0} max={1} step={0.05} value={bgOpacity} onChange={(e)=>onBgOpacity?.(parseFloat(e.target.value))}/>
          <button style={btn} onClick={onBgClear}>Entfernen</button>
        </div>
      </div>

      {/* Karten */}
      <div style={grid}>
        {people.map(p => (
          <div
            key={p.id}
            data-sim-id={p.id}
            style={card}
            title={p.label ?? p.id}
            onContextMenu={(e)=>openMenu(e, p)}
            onMouseEnter={(e)=>{ const q = e.currentTarget.querySelector(".q"); if (q) q.style.opacity = 1; }}
            onMouseLeave={(e)=>{ const q = e.currentTarget.querySelector(".q"); if (q) q.style.opacity = 0; }}
          >
            <div className="q" style={quick}>
              <button title="Bearbeiten" style={iconBtn} onClick={()=>startEdit(p)}>📝</button>
              <button title="Im Explorer fokussieren" style={iconBtn} onClick={()=>focusInExplorer(p.id)}>🗺️</button>
              <button title="Bild ändern" style={iconBtn} onClick={()=>openImageDialogForSim(p.id)}>🖼️</button>
              <button title="Löschen" style={iconBtn} onClick={()=>deleteSim(p.id)}>🗑️</button>
            </div>

            <div style={banner}>
              {(p.img || p.image) ? <img src={p.img || p.image} alt={p.label ?? p.id} loading="lazy" style={bannerImg} /> : null}
              <div style={overlay}></div>
              <div style={meta}>
                <div>
                  <div style={name}>{p.label ?? p.id}</div>
                  <div style={badges}>
                    <span style={badge}>{p.occult || "Mensch"}</span>
                    <span style={badge}>{p.alive === false ? "† verstorben" : "lebend"}</span>
                    {p.household ? <span style={badge}>Haushalt: {p.household}</span> : null}
                    {p.age ? <span style={badge}>{p.age}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div style={body}>
              {Array.isArray(p.traits) && p.traits.length > 0 && (
                <div style={traits}>{p.traits.slice(0,6).map((t,i)=><span style={trait} key={i}>{t}</span>)}</div>
              )}
              {p.notes ? <div style={{ fontSize:13, opacity:.85, lineHeight:1.35 }}>{p.notes}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Personen-Kontextmenü */}
      {menu.open && (
        <div ref={menuRef} style={{ ...menuBox, left: menu.x, top: menu.y }}>
          <div style={menuItem} onClick={()=>{ startEdit(menu.sim); closeMenu(); }}>📝 Info bearbeiten</div>
          <div style={menuItem} onClick={()=>{ openImageDialogForSim(menu.sim.id); closeMenu(); }}>🖼️ Bild ändern</div>
          <div style={menuItem} onClick={()=>{ focusInExplorer(menu.sim?.id); closeMenu(); }}>🗺️ Im Explorer fokussieren</div>
          <div style={{ ...menuItem, borderBottom:0 }} onClick={()=>{ deleteSim(menu.sim?.id); closeMenu(); }}>🗑️ Sim löschen</div>
        </div>
      )}

      {/* ✅ Hintergrund-Menü */}
      {bgMenu.open && (
        <div ref={bgMenuRef} style={{ ...menuBox, left:bgMenu.x, top:bgMenu.y }}>
          <div style={{ ...menuItem, borderBottom:0 }} onClick={()=>{ onRequestCreateSim?.(); setBgMenu({open:false,x:0,y:0}); }}>
            ➕ Neuen Sim anlegen…
          </div>
        </div>
      )}

      {/* Edit-Modal */}
      <InfoModal open={!!editSimId} title="Sim bearbeiten" onClose={()=>setEditSimId(null)}>
        {/* … dein Formular (unverändert) … */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Name"><input style={input} value={form.label} onChange={(e)=>setForm(f=>({...f, label:e.target.value}))}/></Field>
          <Field label="Status">
            <select style={input} value={form.alive ? "alive" : "dead"} onChange={(e)=>setForm(f=>({...f, alive:e.target.value==="alive"}))}>
              <option value="alive">lebend</option><option value="dead">verstorben</option>
            </select>
          </Field>
          <Field label="Traits (kommagetrennt)" full>
            <input style={input} value={(form.traits || []).join(", ")} onChange={(e)=>setForm(f=>({...f, traits: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))} />
          </Field>
          <Field label="Notizen" full>
            <textarea style={{ ...input, minHeight: 90 }} value={form.notes} onChange={(e)=>setForm(f=>({...f, notes:e.target.value}))}/>
          </Field>
          <Field label="Bild" full>
            <button style={btn} onClick={()=>openImageDialogForSim(form.id)}>Bild auswählen…</button>
            {(form.img || form.image) ? <img src={form.img || form.image} alt="Preview" style={{ marginTop:8, width:"100%", borderRadius:12, border:"1px solid #e5e7eb" }}/> : null}
          </Field>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
          <button style={btn} onClick={()=>setEditSimId(null)}>Abbrechen</button>
          <button style={{ ...btn, background:"#00C176", color:"#fff", borderColor:"#00C176" }} onClick={saveEdit}>Speichern</button>
        </div>
      </InfoModal>

      {/* Bild-Auswahl-Modal (SIM / HINTERGRUND) */}
      <InfoModal open={imgDlg.open} title={imgDlg.mode === "bg" ? "Hintergrundbild wählen" : "Bild für Sim wählen"} onClose={cancelImageDialog}>
        <div style={{ display:"grid", gap:12 }}>
          <input type="file" accept="image/*" onChange={(e)=>onPickFile(e.target.files?.[0] || null)} />
          {imgDlg.fileName ? <div style={{ fontSize:12, opacity:.8 }}>Ausgewählt: {imgDlg.fileName}</div> : null}
          {imgDlg.preview ? <img src={imgDlg.preview} alt="Vorschau" style={{ width:"100%", maxHeight:"50vh", objectFit:"cover", borderRadius:12, border:"1px solid #e5e7eb" }}/>
                           : <div style={{ fontSize:13, opacity:.8 }}>Bitte ein Bild auswählen.</div>}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
            <button style={btn} onClick={cancelImageDialog}>Abbrechen</button>
            <button style={{ ...btn, background:"#00C176", color:"#fff", borderColor:"#00C176" }} onClick={confirmImageDialog} disabled={!imgDlg.preview}>Speichern</button>
          </div>
        </div>
      </InfoModal>
    </div>
  );
}

/* helpers / UI */
function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ display:"block", fontSize:12, opacity:.75, marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}
function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function shrinkImage(dataUrl, maxW=1200, quality=0.86){
  try{
    const img = new Image(); img.src = dataUrl; await img.decode();
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", quality);
  }catch{ return dataUrl; }
}
