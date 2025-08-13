import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export default function GalleryView({
  data,
  onChange,                    // optional – zusätzlich feuern wir ein CustomEvent
  onOpenInfo,                  // (id) => void  ✅ neu: öffnet Parent-InfoModal
  onFocusInExplorer,
  bgImage, bgOpacity = 0.25,
  onBgUpload, onBgOpacity, onBgClear,
  onRequestCreateSim,          // optional: Parent öffnet „Neuen Sim“-Modal
}) {
  // ---- Daten ----
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  // ---- Suche & Sortierung ----
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("name_asc"); // name_asc | name_desc

  const people = useMemo(() => {
    let list = [...nodes];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(n => (n.label ?? n.id).toLowerCase().includes(q));
    list.sort((a,b)=>(a.label ?? a.id).localeCompare(b.label ?? b.id));
    if (sort === "name_desc") list.reverse();
    return list;
  }, [nodes, search, sort]);

  // ---- Update Helper ----
  const applyChange = (nextNodes, nextEdges = edges) => {
    const payload = { nodes: nextNodes, edges: nextEdges };
    try { window.dispatchEvent(new CustomEvent("sims:updateData", { detail: payload })); } catch {}
    if (typeof onChange === "function") onChange(payload);
  };
  const updateNode = (id, patch) => {
    const next = nodes.map(n => n.id === id ? { ...n, ...patch } : n);
    applyChange(next);
  };

  // ---- EIN Kontextmenü via Delegation ----
  const wrapRef = useRef(null);       // gesamter Grid/Content-Bereich
  const [cardCtx, setCardCtx] = useState({ open:false, x:0, y:0, id:"" });
  const [bgCtx,   setBgCtx]   = useState({ open:false, x:0, y:0 });

  const cardMenuRef = useRef(null);
  const bgMenuRef   = useRef(null);

  // Koordinaten relativ zum Container (und clampen)
  const getRelXY = (clientX, clientY) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    const x = Math.max(6, Math.min(clientX - rect.left, rect.width  - 6));
    const y = Math.max(6, Math.min(clientY - rect.top,  rect.height - 6));
    return { x, y };
  };

  // Einziger native Kontextmenü-Handler am Container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onCtx = (e) => {
      // nur hier behandeln
      e.preventDefault();

      const targetCard = e.target?.closest?.("[data-sim-id]");
      const p = getRelXY(e.clientX, e.clientY);

      if (targetCard) {
        const id = targetCard.getAttribute("data-sim-id") || "";
        setCardCtx({ open:true, x:p.x, y:p.y, id });
        setBgCtx({ open:false, x:0, y:0 });
      } else {
        setBgCtx({ open:true, x:p.x, y:p.y });
        setCardCtx({ open:false, x:0, y:0, id:"" });
      }
    };

    const closeAll = () => {
      setCardCtx({ open:false, x:0, y:0, id:"" });
      setBgCtx({ open:false, x:0, y:0 });
    };

    el.addEventListener("contextmenu", onCtx);
    document.addEventListener("pointerdown", (ev) => {
      // Klicken außerhalb schließt
      if (cardCtx.open && cardMenuRef.current && !cardMenuRef.current.contains(ev.target)) {
        setCardCtx({ open:false, x:0, y:0, id:"" });
      }
      if (bgCtx.open && bgMenuRef.current && !bgMenuRef.current.contains(ev.target)) {
        setBgCtx({ open:false, x:0, y:0 });
      }
    });
    const onKey = (ev)=>{ if (ev.key === "Escape") closeAll(); };
    const onScrollResize = ()=> closeAll();

    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);

    return () => {
      el.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [cardCtx.open, bgCtx.open]);

  // Clamp Menüs in den Viewport (fixed Koordinaten berechnen)
  const clampFixed = (ref, state) => {
    if (!state.open || !ref.current || !wrapRef.current) return;
    const menuRect = ref.current.getBoundingClientRect();
    const containerRect = wrapRef.current.getBoundingClientRect();
    // Zielposition relativ zum Container → in Fixed umrechnen:
    let fx = containerRect.left + state.x;
    let fy = containerRect.top  + state.y;
    // clampen an Fenster
    if (fx + menuRect.width  > window.innerWidth)  fx = Math.max(6, window.innerWidth  - menuRect.width  - 6);
    if (fy + menuRect.height > window.innerHeight) fy = Math.max(6, window.innerHeight - menuRect.height - 6);
    ref.current.style.left = `${fx}px`;
    ref.current.style.top  = `${fy}px`;
  };
  useLayoutEffect(() => clampFixed(cardMenuRef, cardCtx), [cardCtx]);
  useLayoutEffect(() => clampFixed(bgMenuRef,   bgCtx),   [bgCtx]);

  // ---- Daten-Helfer ----
  const removePerson = (id) => {
    const nextNodes = nodes.filter(n => n.id !== id);
    const nextEdges = edges.filter(e => e.source !== id && e.target !== id);
    applyChange(nextNodes, nextEdges);
    setCardCtx({ open:false, x:0, y:0, id:"" });
  };
  const removeAllRelationsOf = (id) => {
    const next = { nodes, edges: edges.filter(e => e.source !== id && e.target !== id) };
    applyChange(next.nodes, next.edges);
    setCardCtx(prev => ({ ...prev, open:false }));
  };

  // ---- Bild-Auswahl (leichter Inline-Modal) ----
  const [imgDlg, setImgDlg] = useState({ open:false, mode:"sim", targetId:null, preview:null, fileName:"" });
  const openImageDialogForSim = (simId) => setImgDlg({ open:true, mode:"sim", targetId:simId, preview:null, fileName:"" });
  const openImageDialogForBg  = () => setImgDlg({ open:true, mode:"bg",  targetId:null,   preview:null, fileName:"" });
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
    } else if (imgDlg.mode === "bg") {
      onBgUpload?.(imgDlg.preview);
    }
    cancelImageDialog();
  };

  // ---- Explorer Fokus ----
  const focusInExplorer = (id) => {
    if (!id) return;
    if (typeof onFocusInExplorer === "function") onFocusInExplorer(id);
    else window.dispatchEvent(new CustomEvent("sims:focusNode", { detail:{ id } }));
  };

  // ---- Styles ----
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
  const card = {
    position:"relative", borderRadius:20, overflow:"hidden",
    border:"1px solid #e6f3ec", boxShadow:"0 8px 22px rgba(0,0,0,0.08)",
    background:"#fff", cursor:"default",
    contentVisibility:"auto", containIntrinsicSize:"260px 320px",
  };
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

  const menuBox = { position:"fixed", zIndex:1000, background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, minWidth:220, boxShadow:"0 10px 30px rgba(0,0,0,0.15)", overflow:"hidden" };
  const menuItem = { padding:"10px 12px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", userSelect:"none" };

  return (
    <div style={rootStyle}>
      {/* Toolbar */}
      <div style={toolbar}>
        <input style={input} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Suche nach Name…" />
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

      {/* Inhalt + Delegation-Root */}
      <div ref={wrapRef} style={{ position:"relative", padding:"0 16px 24px" }}>
        <div style={grid}>
          {people.map(p => (
            <div
              key={p.id}
              data-sim-id={p.id}
              style={card}
              title={p.label ?? p.id}
            >
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

        {/* Kontextmenü: Card */}
        {cardCtx.open && (
          <div
            ref={cardMenuRef}
            style={{ ...menuBox, left: 0, top: 0 }}
            onContextMenu={(e)=>e.preventDefault()}
          >
            <div style={menuItem}
                 onClick={()=>{ onOpenInfo?.(cardCtx.id); setCardCtx({ open:false, x:0, y:0, id:"" }); }}>
              ℹ️ Infos bearbeiten…
            </div>
            <div style={menuItem}
                 onClick={()=>{ openImageDialogForSim(cardCtx.id); setCardCtx({ open:false, x:0, y:0, id:"" }); }}>
              🖼️ Bild ändern
            </div>
            <div style={menuItem}
                 onClick={()=>{ onFocusInExplorer?.(cardCtx.id); setCardCtx({ open:false, x:0, y:0, id:"" }); }}>
              🗺️ Im Explorer fokussieren
            </div>
            <div style={{ ...menuItem, borderBottom:0, color:"#b3261e" }}
                 onClick={()=>removePerson(cardCtx.id)}>
              🗑️ Sim löschen
            </div>
          </div>
        )}

        {/* Kontextmenü: Hintergrund */}
        {bgCtx.open && (
          <div
            ref={bgMenuRef}
            style={{ ...menuBox, left: 0, top: 0 }}
            onContextMenu={(e)=>e.preventDefault()}
          >
            <div style={menuItem}
                 onClick={()=>{
                   if (onRequestCreateSim) onRequestCreateSim();
                   else {
                     // Fallback: sofort anlegen
                     const next = structuredClone(data);
                     const base = "sim";
                     const taken = new Set(next.nodes.map(n => n.id));
                     let i = 1, id = base;
                     while (taken.has(id)) id = `${base}-${++i}`;
                     next.nodes.push({ id, label:`Neuer Sim${i>1?` ${i}`:""}`, img:"", alive:true, info:{ fields:[] } });
                     applyChange(next.nodes, next.edges);
                   }
                   setBgCtx({ open:false, x:0, y:0 });
                 }}>
              ➕ Neuen Sim anlegen…
            </div>

            <div style={menuItem} onClick={()=>{ openImageDialogForBg(); setBgCtx({ open:false, x:0, y:0 }); }}>
              🖼️ Hintergrund wählen…
            </div>

            <div style={menuItem}>
              <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>
                Deckkraft: {Math.round(bgOpacity*100)}%
              </div>
              <input type="range" min={0} max={1} step={0.05} value={bgOpacity}
                     onChange={(e)=>onBgOpacity?.(parseFloat(e.target.value))}
                     style={{ width:"100%" }}/>
            </div>

            <div style={{ ...menuItem, borderBottom:0, color:"#b3261e" }}
                 onClick={()=>{ onBgClear?.(); setBgCtx({ open:false, x:0, y:0 }); }}>
              🗑️ Hintergrund entfernen
            </div>
          </div>
        )}
      </div>

      {/* Leichtgewicht-Modal für Bildauswahl */}
      {imgDlg.open && (
        <div
          onClick={cancelImageDialog}
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000
          }}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            style={{
              width:"min(560px, 95vw)", maxHeight:"90vh",
              padding:16, borderRadius:16, background:"#fff",
              border:"1px solid #e5e7eb", boxShadow:"0 10px 30px rgba(0,0,0,0.12)",
              display:"flex", flexDirection:"column"
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:18 }}>
                {imgDlg.mode === "bg" ? "Hintergrundbild wählen" : "Bild für Sim wählen"}
              </div>
              <button onClick={cancelImageDialog} style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #e5e7eb" }}>
                Schliessen
              </button>
            </div>

            <div style={{ display:"grid", gap:12, overflow:"auto" }}>
              <input type="file" accept="image/*" onChange={(e)=>onPickFile(e.target.files?.[0] || null)} />
              {imgDlg.fileName ? <div style={{ fontSize:12, opacity:.8 }}>Ausgewählt: {imgDlg.fileName}</div> : null}
              {imgDlg.preview ? (
                <img
                  src={imgDlg.preview}
                  alt="Vorschau"
                  style={{ width:"100%", maxHeight:"50vh", objectFit:"cover", borderRadius:12, border:"1px solid #e5e7eb" }}
                />
              ) : (
                <div style={{ fontSize:13, opacity:.8 }}>Bitte ein Bild auswählen.</div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
                <button onClick={cancelImageDialog} style={{ padding:"8px 12px", borderRadius:10, border:"1px solid #e5e7eb" }}>
                  Abbrechen
                </button>
                <button
                  onClick={confirmImageDialog}
                  disabled={!imgDlg.preview}
                  style={{ padding:"8px 12px", borderRadius:10, border:"1px solid #16a34a", background:"#16a34a", color:"#fff" }}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */
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
