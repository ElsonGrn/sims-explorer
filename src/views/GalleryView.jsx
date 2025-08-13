// src/views/GalleryView.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import InfoModal from "../shared/InfoModal.jsx";
import { makeIdFromLabel } from "../shared/utils";
import {
  normalizeGender,
  genderizeAge,
  genderizeNoun,
  genderizeByKey,
  GENDER_OPTIONS,
} from "../shared/gender";

export default function GalleryView({
  data,
  onChange,                    // optional – wir feuern zusätzlich IMMER ein CustomEvent
  onFocusInExplorer,
  bgImage, bgOpacity = 0.25,
  onBgUpload, onBgOpacity, onBgClear,
  onRequestCreateSim,          // optional: Parent-Modal (wird hier nicht gebraucht)
}) {
  /* ---------- Daten ---------- */
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  /* ---------- Filter & Suche ---------- */
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("name_asc"); // name_asc | name_desc

  const [fGender, setFGender] = useState("any"); // any | male | female | nb | unknown
  const [fAge, setFAge]       = useState("any"); // any | konkrete Kategorie
  const [fOccult, setFOccult] = useState("any");
  const [fCareer, setFCareer] = useState("any");
  const [fAlive, setFAlive]   = useState("any"); // any | alive | dead

  /* ---------- Mapping/Normalisierung ---------- */
  const getField = (n, keys) => {
    const info = n?.info || {};
    const arr = Array.isArray(info.fields) ? info.fields : [];
    const keyset = keys.map(k => String(k).toLowerCase());
    // 1) info.fields
    for (const f of arr) {
      const id = String(f.id ?? f.key ?? f.name ?? f.label ?? "").toLowerCase();
      if (keyset.includes(id)) return f.value ?? f.text ?? f.label ?? "";
    }
    // 2) info direkt
    for (const k of keyset) {
      if (k in info) return info[k];
    }
    // 3) Top-Level Fallback
    for (const k of keyset) {
      if (k in n) return n[k];
    }
    return "";
  };
  const getTraits = (n) => {
    const info = n?.info || {};
    const fields = Array.isArray(info.fields) ? info.fields : [];
    // fields
    for (const f of fields) {
      const id = String(f.id ?? f.key ?? f.name ?? "").toLowerCase();
      if (["traits","eigenschaften"].includes(id)) {
        if (Array.isArray(f.value)) return f.value.filter(Boolean);
        if (typeof f.value === "string") return f.value.split(",").map(s=>s.trim()).filter(Boolean);
      }
    }
    // info
    if (Array.isArray(info.traits)) return info.traits;
    if (typeof info.traits === "string") return info.traits.split(",").map(s=>s.trim()).filter(Boolean);
    // top-level
    if (Array.isArray(n.traits)) return n.traits;
    if (typeof n.traits === "string") return n.traits.split(",").map(s=>s.trim()).filter(Boolean);
    return [];
  };
  const isAlive = (n) => {
    const infoAlive = n?.info?.alive;
    if (typeof infoAlive === "boolean") return infoAlive;
    return n?.alive !== false;
  };

  const readSimInfo = (n) => {
    const gender = normalizeGender(
      getField(n, ["gender","geschlecht"])
    );
    const age = getField(n, ["age","alter"]);
    const occult = getField(n, ["occult","okkult"]);
    const career = getField(n, ["career","job","karriere"]);
    const careerLevelRaw = getField(n, ["careerLevel","karrierestufe"]);
    const household = getField(n, ["household","haushalt"]);
    const aspiration = getField(n, ["aspiration","bestreben"]);
    const fameRaw = getField(n, ["fame","berühmtheit"]);
    const reputation = getField(n, ["reputation","ruf"]);
    const notes = getField(n, ["notes","notizen","beschreibung"]);

    const fame = Number.isFinite(+fameRaw) ? +fameRaw : (typeof fameRaw==="string" ? parseInt(fameRaw,10)||0 : 0);
    const careerLevel = Number.isFinite(+careerLevelRaw) ? +careerLevelRaw : (typeof careerLevelRaw==="string" ? parseInt(careerLevelRaw,10)||0 : 0);

    return {
      id: n.id,
      label: n.label ?? n.id,
      img: n.img || n.image || "",
      gender,
      age,
      occult,
      career,
      careerLevel,
      household,
      aspiration,
      fame,
      reputation: reputation || "Neutral",
      notes,
      traits: getTraits(n),
      alive: isAlive(n),
    };
  };

  /* ---------- abgeleitete Personen + Filter ---------- */
  const enriched = useMemo(() => nodes.map(readSimInfo), [nodes]);
  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = enriched.filter(p => {
      if (q && !(p.label.toLowerCase().includes(q))) return false;
      if (fGender !== "any" && p.gender !== fGender) return false;
      if (fAge !== "any" && String(p.age||"") !== fAge) return false;
      if (fOccult !== "any" && String(p.occult||"") !== fOccult) return false;
      if (fCareer !== "any" && String(p.career||"") !== fCareer) return false;
      if (fAlive === "alive" && !p.alive) return false;
      if (fAlive === "dead"  &&  p.alive) return false;
      return true;
    });
    list.sort((a,b)=>(a.label).localeCompare(b.label));
    if (sort === "name_desc") list.reverse();
    return list;
  }, [enriched, search, sort, fGender, fAge, fOccult, fCareer, fAlive]);

  /* ---------- Change Helper ---------- */
  const applyChange = (nextNodes, nextEdges = edges) => {
    const payload = { nodes: nextNodes, edges: nextEdges };
    try { window.dispatchEvent(new CustomEvent("sims:updateData", { detail: payload })); } catch {}
    if (typeof onChange === "function") onChange(payload);
  };
  const updateNode = (id, patch) => {
    const next = nodes.map(n => n.id === id ? { ...n, ...patch } : n);
    applyChange(next);
  };

  /* ---------- Kontextmenüs ---------- */
  const [menu, setMenu] = useState({ open:false, x:0, y:0, sim:null });
  const menuRef = useRef(null);

  const [bgMenu, setBgMenu] = useState({ open:false, x:0, y:0 });
  const rootRef = useRef(null);

  const openMenu = (e, sim) => {
    e.preventDefault(); // verhindert "bgMenu"
    setMenu({ open:true, x:e.clientX, y:e.clientY, sim });
    setBgMenu({ open:false, x:0, y:0 });
  };
  const closeMenu = () => setMenu(m => ({ ...m, open:false }));

  // Menüposition clampen
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
    if (!menu.open && !bgMenu.open) return;
    const onDown = (ev) => {
      if (menuRef.current && menu.open && !menuRef.current.contains(ev.target)) closeMenu();
      if (bgMenu.open) setBgMenu({ open:false, x:0, y:0 });
    };
    const onEsc  = (ev) => {
      if (ev.key === "Escape") {
        closeMenu();
        setBgMenu({ open:false, x:0, y:0 });
        setViewerId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, [menu.open, bgMenu.open]);

  // Rechtsklick freier Bereich (nur wenn nicht auf Karte)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onCtx = (e) => {
      if (e.defaultPrevented) return; // Karte hat schon gehandled
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBgMenu({ open:true, x, y });
      setMenu({ open:false, x:0, y:0, sim:null });
    };
    el.addEventListener("contextmenu", onCtx);
    return () => el.removeEventListener("contextmenu", onCtx);
  }, []);

  /* ---------- Edit / Info-Dialog ---------- */
  const [infoSimId, setInfoSimId] = useState(null);
  const openInfo = (id) => setInfoSimId(id);
  const closeInfo = () => setInfoSimId(null);
  const saveInfo = (patch) => {
    if (!infoSimId) return;
    applyChange(nodes.map(n => n.id === infoSimId ? { ...n, ...patch, info: { ...(n.info||{}), ...(patch.info||{}) } } : n));
    closeInfo();
  };

  /* ---------- Großansicht (Viewer) ---------- */
  const [viewerId, setViewerId] = useState(null);
  const viewer = useMemo(() => enriched.find(p => p.id === viewerId) || null, [viewerId, enriched]);
  const viewerRelations = useMemo(() => {
    if (!viewer) return [];
    const list = edges
      .filter(e => e.source === viewer.id || e.target === viewer.id)
      .map(e => {
        const otherId = e.source === viewer.id ? e.target : e.source;
        const other = enriched.find(p => p.id === otherId);
        return {
          id: e.id || `${e.source}-${e.target}-${e.type}`,
          type: e.type,
          strength: e.strength ?? 0.5,
          otherId,
          otherName: other?.label || otherId,
        };
      });
    list.sort((a,b)=> (a.otherName).localeCompare(b.otherName));
    return list;
  }, [viewer, edges, enriched]);
  const closeViewer = () => setViewerId(null);

  /* ---------- Bild-Auswahl-Modal ---------- */
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
      if (viewerId === imgDlg.targetId) setViewerId(v => v); // refresh via state (enriched abgeleitet)
    } else if (imgDlg.mode === "bg") {
      onBgUpload?.(imgDlg.preview);
    }
    cancelImageDialog();
  };

  /* ---------- „Neuen Sim anlegen“-Modal ---------- */
  const [createDlg, setCreateDlg] = useState({ open:false, name:"", gender:"unknown", age:"", occult:"", career:"", file:null, preview:null });
  const openCreate = () => setCreateDlg({ open:true, name:"", gender:"unknown", age:"", occult:"", career:"", file:null, preview:null });
  const closeCreate = () => setCreateDlg({ open:false, name:"", gender:"unknown", age:"", occult:"", career:"", file:null, preview:null });
  const pickCreateImage = async (file) => {
    if (!file) { setCreateDlg(d=>({...d, file:null, preview:null})); return; }
    const dataUrl = await fileToDataUrl(file);
    const small = await shrinkImage(dataUrl, 1200, 0.86);
    setCreateDlg(d=>({...d, file, preview: small }));
  };
  const saveCreate = () => {
    const name = createDlg.name.trim();
    if (!name) { alert("Bitte Namen eingeben"); return; }
    const id = makeIdFromLabel(name);
    if (nodes.some(n => n.id === id)) { alert("ID existiert bereits"); return; }
    const info = {
      gender: normalizeGender(createDlg.gender),
      age: createDlg.age || "",
      occult: createDlg.occult || "",
      career: createDlg.career || "",
    };
    const newNode = { id, label: name, img: createDlg.preview || "", alive: true, info };
    applyChange([...nodes, newNode], edges);
    closeCreate();
    setViewerId(id); // direkt öffnen
  };

  /* ---------- Explorer Fokus ---------- */
  const focusInExplorer = (id) => {
    if (!id) return;
    if (typeof onFocusInExplorer === "function") onFocusInExplorer(id);
    else window.dispatchEvent(new CustomEvent("sims:focusNode", { detail:{ id } }));
  };

  /* ---------- Styles ---------- */
  const rootStyle = {
    minHeight: "calc(100vh - 58px)",
    background:
      `radial-gradient(1000px 500px at 10% -10%, rgba(0,193,118,0.10), transparent 60%),` +
      `linear-gradient(135deg,#EAFBF3 0%,#F7FFFD 40%,#F4F8FF 100%)`,
    ...(bgImage ? {
      backgroundImage: `linear-gradient(rgba(255,255,255,${bgOpacity}), rgba(255,255,255,${bgOpacity})), url(${bgImage})`,
      backgroundSize: "cover", backgroundPosition: "center",
    } : {}),
    color: "#0b1e13",
  };
  const toolbar = { display:"grid", gridTemplateColumns:"1fr auto auto auto auto auto", gap:12, alignItems:"center", padding:"12px 16px" };
  const input = { padding:"8px 10px", borderRadius:10, border:"1px solid #cfeede", background:"#fff" };
  const select = { ...input, minWidth:140 };
  const btn = { ...input, cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.06)" };
  const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16, padding:"0 16px 24px" };
  const card = {
    position:"relative", borderRadius:20, overflow:"hidden",
    border:"1px solid #e6f3ec", boxShadow:"0 8px 22px rgba(0,0,0,0.08)",
    background:"#fff", cursor:"pointer",
    contentVisibility:"auto", containIntrinsicSize:"260px 320px",
  };
  const banner = { position:"relative", aspectRatio:"3 / 2", background:"#e6fff3" };
  const bannerImg = { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" };
  const overlay = { position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05) 60%, transparent)" };
  const meta = { position:"absolute", left:12, right:12, bottom:10, color:"#fff", display:"flex", alignItems:"flex-end", gap:10, justifyContent:"space-between" };
  const name = { fontWeight:800, fontSize:20, textShadow:"0 2px 8px rgba(0,0,0,0.5)" };
  const badges = { display:"flex", gap:6, flexWrap:"wrap" };
  const badge = { padding:"2px 8px", borderRadius:999, fontSize:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", backdropFilter:"blur(2px)" };

  const quick = { position:"absolute", top:8, right:8, display:"flex", gap:6, opacity:0, transition:"opacity .15s ease" };
  const iconBtn = { padding:6, borderRadius:10, border:"1px solid rgba(255,255,255,0.5)", background:"rgba(0,0,0,0.25)", color:"#fff", cursor:"pointer" };

  const menuBox = { position:"fixed", zIndex:1000, background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, minWidth:220, boxShadow:"0 10px 30px rgba(0,0,0,0.15)", overflow:"hidden" };
  const menuItem = { padding:"10px 12px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", userSelect:"none" };

  /* ---------- UI ---------- */
  return (
    <div ref={rootRef} style={rootStyle}>
      {/* Toolbar */}
      <div style={toolbar}>
        <input style={input} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Suche nach Name…" />
        <select style={select} value={sort} onChange={(e)=>setSort(e.target.value)}>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>

        <select style={select} value={fGender} onChange={(e)=>setFGender(e.target.value)}>
          <option value="any">Geschlecht (alle)</option>
          {GENDER_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>

        <select style={select} value={fAge} onChange={(e)=>setFAge(e.target.value)}>
          <option value="any">Alter (alle)</option>
          {["Baby","Kleinkind","Kind","Teen","Junger Erwachsener","Erwachsener","Senior"].map(a=>(
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select style={select} value={fOccult} onChange={(e)=>setFOccult(e.target.value)}>
          <option value="any">Okkult (alle)</option>
          {["Mensch","Vampir","Zauberer/Hexe","Alien","Meerjungfrau","Werwolf","Pflanzensim","Servo","Geist"].map(o=>(
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select style={select} value={fCareer} onChange={(e)=>setFCareer(e.target.value)}>
          <option value="any">Job (alle)</option>
          {[
            "Arbeitslos",
            "Schauspieler/in","Astronaut/in","Athlet/in","Business","Ingenieur/in","Entertainer/in",
            "Kritiker/in","Koch/Köchin","Detektiv/in","Ärztin/Arzt","Gärtner/in","Jurist/in","Militär",
            "Maler/in","Politiker/in","Wissenschaftler/in","Geheimagent/in","Social Media",
            "Mode-Influencer/in","Tech-Guru","Autor/in","Öko-Designer/in","Naturschützer/in",
            "Freelancer: Programmierer/in","Freelancer: Autor/in","Freelancer: Künstler/in","Freelancer: Fotograf/in"
          ].map(c=> <option key={c} value={c}>{c}</option>)}
        </select>

        <select style={select} value={fAlive} onChange={(e)=>setFAlive(e.target.value)}>
          <option value="any">Status (alle)</option>
          <option value="alive">lebend</option>
          <option value="dead">verstorben</option>
        </select>

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, opacity:.75 }}>Hintergrund:</span>
          <button style={btn} onClick={openImageDialogForBg}>Bild setzen</button>
          <label style={{ fontSize:12, opacity:.75 }}>Deckkraft {Math.round((bgOpacity)*100)}%</label>
          <input type="range" min={0} max={1} step={0.05} value={bgOpacity} onChange={(e)=>onBgOpacity?.(parseFloat(e.target.value))}/>
          <button style={btn} onClick={onBgClear}>Entfernen</button>
          <button style={{ ...btn, marginLeft:8 }} onClick={openCreate}>➕ Neuen Sim…</button>
        </div>
      </div>

      {/* Karten */}
      <div style={grid}>
        {people.map(p => (
          <div
            key={p.id}
            data-sim-id={p.id}
            style={card}
            title={p.label}
            onContextMenu={(e)=>openMenu(e, p)}
            onMouseEnter={(e)=>{ const q = e.currentTarget.querySelector(".q"); if (q) q.style.opacity = 1; }}
            onMouseLeave={(e)=>{ const q = e.currentTarget.querySelector(".q"); if (q) q.style.opacity = 0; }}
            onClick={()=>setViewerId(p.id)}
          >
            <div className="q" style={quick}>
              <button title="Info bearbeiten" style={iconBtn} onClick={(ev)=>{ ev.stopPropagation(); openInfo(p.id); }}>📝</button>
              <button title="Im Explorer fokussieren" style={iconBtn} onClick={(ev)=>{ ev.stopPropagation(); focusInExplorer(p.id); }}>🗺️</button>
              <button title="Bild ändern" style={iconBtn} onClick={(ev)=>{ ev.stopPropagation(); openImageDialogForSim(p.id); }}>🖼️</button>
              <button title="Löschen" style={iconBtn} onClick={(ev)=>{ ev.stopPropagation(); deleteSim(p.id); }}>🗑️</button>
            </div>

            <div style={banner}>
              {p.img ? <img src={p.img} alt={p.label} loading="lazy" style={bannerImg} /> : null}
              <div style={overlay}></div>
              <div style={meta}>
                <div>
                  <div style={name}>{p.label}</div>
                  <div style={badges}>
                    <span style={badge}>{p.occult || "Mensch"}</span>
                    <span style={badge}>{p.alive ? "lebend" : "† verstorben"}</span>
                    {p.household ? <span style={badge}>Haushalt: {p.household}</span> : null}
                    {p.age ? <span style={badge}>{genderizeAge(p.age, p.gender, "colon")}</span> : null}
                    {p.career ? <span style={badge}>{genderizeNoun(p.career, p.gender, "colon")}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              {Array.isArray(p.traits) && p.traits.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {p.traits.slice(0,6).map((t,i)=><span style={{ padding:"2px 8px", borderRadius:999, border:"1px solid #cfeede", background:"#fff", fontSize:12 }} key={i}>{t}</span>)}
                </div>
              )}
              {p.notes ? <div style={{ fontSize:13, opacity:.85, lineHeight:1.35 }}>{p.notes}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Kontextmenü SIM */}
      {menu.open && (
        <div ref={menuRef} style={{ ...menuBox, left: menu.x, top: menu.y }}>
          <div style={menuItem} onClick={()=>{ openInfo(menu.sim.id); closeMenu(); }}>📝 Info bearbeiten</div>
          <div style={menuItem} onClick={()=>{ openImageDialogForSim(menu.sim.id); closeMenu(); }}>🖼️ Bild ändern</div>
          <div style={menuItem} onClick={()=>{ focusInExplorer(menu.sim?.id); closeMenu(); }}>🗺️ Im Explorer fokussieren</div>
          <div style={{ ...menuItem, borderBottom:0, color:"#b3261e" }} onClick={()=>{ deleteSim(menu.sim?.id); closeMenu(); }}>🗑️ Sim löschen</div>
        </div>
      )}

      {/* Kontextmenü HINTERGRUND */}
      {bgMenu.open && (
        <div style={{ ...menuBox, left: bgMenu.x, top: bgMenu.y }}>
          <div style={menuItem} onClick={()=>{ openCreate(); setBgMenu({ open:false, x:0, y:0 }); }}>➕ Neuen Sim anlegen…</div>
          <label style={{ ...menuItem, display:"block" }}>
            🖼️ Hintergrund wählen…
            <input type="file" accept="image/*" style={{ display:"none" }}
              onChange={(e)=>{ const f=e.target.files?.[0]; if (f) { const r=new FileReader(); r.onload=()=>onBgUpload?.(String(r.result)); r.readAsDataURL(f);} }} />
          </label>
          <div style={{ ...menuItem }}>
            <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>Deckkraft: {Math.round(bgOpacity*100)}%</div>
            <input type="range" min={0} max={1} step={0.05} value={bgOpacity} onChange={(e)=>onBgOpacity?.(parseFloat(e.target.value))} style={{ width:"100%" }} />
          </div>
          <div style={{ ...menuItem, borderBottom:0, color:"#b3261e" }} onClick={()=>{ onBgClear?.(); setBgMenu({ open:false, x:0, y:0 }); }}>🗑️ Hintergrund entfernen</div>
        </div>
      )}

      {/* Info-Modal (groß, shared) */}
      {infoSimId && (
        <InfoModal
          person={nodes.find(n=>n.id===infoSimId)}
          onClose={closeInfo}
          onSave={saveInfo}
        />
      )}

      {/* Großansicht / Viewer */}
      {viewer && (
        <div onClick={closeViewer} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:"min(960px, 95vw)", maxHeight:"90vh", background:"#fff", borderRadius:18, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column" }}>
            <div style={{ position:"relative", aspectRatio:"16 / 8", background:"#eef7f2" }}>
              {viewer.img ? <img src={viewer.img} alt={viewer.label} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} /> : null}
              <button onClick={closeViewer} title="Schließen" style={{ position:"absolute", top:10, right:10, padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"rgba(255,255,255,0.8)", cursor:"pointer" }}>✕</button>
              <div style={{ position:"absolute", left:16, right:16, bottom:12, color:"#fff", textShadow:"0 2px 8px rgba(0,0,0,0.5)", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontWeight:900, fontSize:28 }}>{viewer.label}</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                    {viewer.occult ? <Chip>{viewer.occult}</Chip> : null}
                    <Chip>{viewer.alive ? "lebend" : "† verstorben"}</Chip>
                    {viewer.household ? <Chip>Haushalt: {viewer.household}</Chip> : null}
                    {viewer.age ? <Chip>{genderizeAge(viewer.age, viewer.gender, "colon")}</Chip> : null}
                    {viewer.career ? <Chip>{genderizeNoun(viewer.career, viewer.gender, "colon")}</Chip> : null}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={viewerBtn} onClick={()=>openInfo(viewer.id)}>📝 Infos bearbeiten</button>
                  <button style={viewerBtn} onClick={()=>openImageDialogForSim(viewer.id)}>🖼️ Bild ändern</button>
                  <button style={viewerBtn} onClick={()=>focusInExplorer(viewer.id)}>🗺️ Im Explorer</button>
                </div>
              </div>
            </div>

            <div style={{ padding:16, overflowY:"auto" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <InfoField label="Alter">{viewer.age ? genderizeAge(viewer.age, viewer.gender, "colon") : "—"}</InfoField>
                <InfoField label="Geschlecht">{GENDER_OPTIONS.find(g=>g.id===viewer.gender)?.label || "keine Angabe"}</InfoField>
                <InfoField label="Okkult">{viewer.occult || "—"}</InfoField>
                <InfoField label="Karriere">{viewer.career ? genderizeNoun(viewer.career, viewer.gender, "colon") : "—"}{viewer.careerLevel ? ` (Stufe ${viewer.careerLevel})` : ""}</InfoField>
                <InfoField label="Bestreben">{viewer.aspiration || "—"}</InfoField>
                <InfoField label="Ruf">{viewer.reputation || "Neutral"}</InfoField>
                <InfoField label="Berühmtheit">{(viewer.fame|0)} ⭐</InfoField>
                <InfoField label="Haushalt">{viewer.household || "—"}</InfoField>
                <InfoField label="Eigenschaften" full>
                  {viewer.traits?.length ? (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {viewer.traits.map((t,i)=><span key={i} style={{ padding:"2px 8px", borderRadius:999, border:"1px solid #e5e7eb" }}>{t}</span>)}
                    </div>
                  ) : "—"}
                </InfoField>
                <InfoField label="Notizen" full>{viewer.notes || "—"}</InfoField>
              </div>

              {/* Beziehungen */}
              <div style={{ marginTop:14 }}>
                <div style={{ fontWeight:800, marginBottom:6 }}>Beziehungen</div>
                {viewerRelations.length ? (
                  <div style={{ display:"grid", gap:8 }}>
                    {viewerRelations.map(r=>(
                      <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}>
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                          <strong>{r.otherName}</strong>
                          <span style={{ opacity:.75 }}>
                            {genderizeByKey(r.type, viewer.gender, "colon")}
                          </span>
                        </div>
                        <div title={`Stärke: ${r.strength.toFixed(2)}`} style={{ fontSize:12, opacity:.7 }}>Stärke {r.strength.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ opacity:.7 }}>Keine Beziehungen eingetragen.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bild-Auswahl-Modal */}
      {imgDlg.open && (
        <div onClick={cancelImageDialog} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:"min(720px, 92vw)", maxHeight:"90vh", background:"#fff", borderRadius:16, padding:16, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontWeight:800 }}>Bild {imgDlg.mode==="bg" ? "für Hintergrund" : "für Sim"} wählen</div>
              <button onClick={cancelImageDialog} style={{ ...btn, padding:"6px 10px" }}>Schließen</button>
            </div>
            <input type="file" accept="image/*" onChange={(e)=>onPickFile(e.target.files?.[0] || null)} />
            {imgDlg.fileName ? <div style={{ fontSize:12, opacity:.8 }}>Ausgewählt: {imgDlg.fileName}</div> : null}
            {imgDlg.preview ? (
              <img src={imgDlg.preview} alt="Vorschau" style={{ width:"100%", maxHeight: "50vh", objectFit:"cover", borderRadius:12, border:"1px solid #e5e7eb" }} />
            ) : (
              <div style={{ fontSize:13, opacity:.8 }}>Bitte ein Bild auswählen.</div>
            )}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button style={btn} onClick={cancelImageDialog}>Abbrechen</button>
              <button style={{ ...btn, background:"#00C176", color:"#fff", borderColor:"#00C176" }} onClick={confirmImageDialog} disabled={!imgDlg.preview}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Neuer Sim – Modal */}
      {createDlg.open && (
        <div onClick={closeCreate} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:"min(640px, 92vw)", maxHeight:"90vh", background:"#fff", borderRadius:16, padding:16, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontWeight:800 }}>Neuen Sim anlegen</div>
              <button onClick={closeCreate} style={{ ...btn, padding:"6px 10px" }}>Schließen</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>
              <Field label="Name">
                <input style={input} value={createDlg.name} onChange={(e)=>setCreateDlg(d=>({...d, name:e.target.value}))}/>
              </Field>
              <Field label="Geschlecht">
                <select style={select} value={createDlg.gender} onChange={(e)=>setCreateDlg(d=>({...d, gender:e.target.value}))}>
                  {GENDER_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Alter">
                <select style={select} value={createDlg.age} onChange={(e)=>setCreateDlg(d=>({...d, age:e.target.value}))}>
                  <option value="">– wählen –</option>
                  {["Baby","Kleinkind","Kind","Teen","Junger Erwachsener","Erwachsener","Senior"].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Okkult">
                <select style={select} value={createDlg.occult} onChange={(e)=>setCreateDlg(d=>({...d, occult:e.target.value}))}>
                  <option value="">– wählen –</option>
                  {["Mensch","Vampir","Zauberer/Hexe","Alien","Meerjungfrau","Werwolf","Pflanzensim","Servo","Geist"].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Job/Karriere">
                <select style={select} value={createDlg.career} onChange={(e)=>setCreateDlg(d=>({...d, career:e.target.value}))}>
                  <option value="">– wählen –</option>
                  {[
                    "Arbeitslos",
                    "Schauspieler/in","Astronaut/in","Athlet/in","Business","Ingenieur/in","Entertainer/in",
                    "Kritiker/in","Koch/Köchin","Detektiv/in","Ärztin/Arzt","Gärtner/in","Jurist/in","Militär",
                    "Maler/in","Politiker/in","Wissenschaftler/in","Geheimagent/in","Social Media",
                    "Mode-Influencer/in","Tech-Guru","Autor/in","Öko-Designer/in","Naturschützer/in",
                    "Freelancer: Programmierer/in","Freelancer: Autor/in","Freelancer: Künstler/in","Freelancer: Fotograf/in"
                  ].map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Bild" full>
                <input type="file" accept="image/*" onChange={(e)=>pickCreateImage(e.target.files?.[0] || null)} />
                {createDlg.preview ? <img src={createDlg.preview} alt="Vorschau" style={{ marginTop:8, width:"100%", borderRadius:12, border:"1px solid #e5e7eb" }}/> : null}
              </Field>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button style={btn} onClick={closeCreate}>Abbrechen</button>
              <button style={{ ...btn, background:"#00C176", color:"#fff", borderColor:"#00C176" }} onClick={saveCreate}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ---------- lokale Funktionen ---------- */
  function deleteSim(simId) {
    const nextNodes = nodes.filter(n => n.id !== simId);
    const nextEdges = edges.filter(e => e.source !== simId && e.target !== simId);
    applyChange(nextNodes, nextEdges);
    if (viewerId === simId) setViewerId(null);
  }
}

/* ---------- Hilfs-UI ---------- */
function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ display:"block", fontSize:12, opacity:.75, marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}
function InfoField({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <div style={{ fontSize:12, opacity:.7, marginBottom:4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}
function Chip({ children }) {
  return <span style={{ padding:"2px 8px", borderRadius:999, fontSize:12, background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.45)", backdropFilter:"blur(2px)" }}>{children}</span>;
}
const viewerBtn = { padding:"8px 10px", borderRadius:10, border:"1px solid rgba(255,255,255,0.35)", background:"rgba(0,0,0,0.25)", color:"#fff", cursor:"pointer" };

/* ---------- File/Image Utils ---------- */
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
