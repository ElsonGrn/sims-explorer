import React, { useMemo, useRef, useState } from "react";

export default function GalleryView({
  data,
  THEME,
  onOpenInfo,
  onFocusInExplorer,
  FIELD_TEMPLATES,
  bgImage, bgOpacity,
  onBgUpload, onBgOpacity, onBgClear,
}) {
  const T = THEME;
  const wrapRef = useRef(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [status, setStatus] = useState("all"); // all | alive | dead
  const [occult, setOccult] = useState(new Set());
  const [tagFilter, setTagFilter] = useState("");
  const [ctx, setCtx] = useState({ open:false, x:0, y:0, id:"" });
  const [bgCtx, setBgCtx] = useState({ open:false, x:0, y:0 });

  function getField(n, kind) { return (n.info?.fields||[]).find(f=>f.kind===kind); }
  function getAge(n) { const f=getField(n,"age"); return typeof f?.value==="number" ? f.value : null; }
  function getOccult(n) { const f=getField(n,"occult"); return f?.value || "Mensch"; }
  function getAllTags(n) {
    const list = [];
    const h=getField(n,"hobbies"); if (h?.values) list.push(...h.values);
    const t=getField(n,"traits");  if (t?.values) list.push(...t.values);
    const c=(n.info?.fields||[]).filter(f=>f.kind==="customTags"); c.forEach(f=>{ if (Array.isArray(f.values)) list.push(...f.values); });
    return list.map(String);
  }

  const list = useMemo(()=>{
    let nodes = data.nodes.slice();
    // Status
    if (status !== "all") nodes = nodes.filter(n => status==="alive" ? n.alive!==false : n.alive===false);
    // Okkult
    if (occult.size) nodes = nodes.filter(n => occult.has(getOccult(n)));
    // Tags
    if (tagFilter.trim()) {
      const q = tagFilter.toLowerCase();
      nodes = nodes.filter(n => getAllTags(n).some(t => t.toLowerCase().includes(q)));
    }
    // Suche
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n => {
        if ((n.label||n.id).toLowerCase().includes(q)) return true;
        const textFields = (n.info?.fields||[]).flatMap(f => f.type==="tags" ? (f.values||[]) : (f.value ? [String(f.value)] : []));
        return textFields.some(v => String(v).toLowerCase().includes(q));
      });
    }
    const coll = new Intl.Collator(undefined,{sensitivity:"base"});
    nodes.sort((a,b)=>{
      const nameA=a.label||a.id, nameB=b.label||b.id;
      const ageA=getAge(a), ageB=getAge(b);
      const aliveA=a.alive!==false?1:0, aliveB=b.alive!==false?1:0;
      const occA=getOccult(a), occB=getOccult(b);
      switch (sort) {
        case "name_desc": return coll.compare(nameB, nameA);
        case "age_asc":  return (ageA??1e9) - (ageB??1e9) || coll.compare(nameA,nameB);
        case "age_desc": return (ageB??-1e9) - (ageA??-1e9) || coll.compare(nameA,nameB);
        case "status":   return aliveB - aliveA || coll.compare(nameA,nameB);
        case "occult":   return coll.compare(occA,occB) || coll.compare(nameA,nameB);
        default:         return coll.compare(nameA, nameB);
      }
    });
    return nodes;
  }, [data, search, sort, status, occult, tagFilter]);

  function openCardCtx(e, id) {
    e.preventDefault(); e.stopPropagation();
    const el = wrapRef.current;
    const r = el?.getBoundingClientRect() || { left:0, top:0, width:0, height:0 };
    let x=(e.clientX - r.left) + (el?.scrollLeft||0);
    let y=(e.clientY - r.top) + (el?.scrollTop||0);
    const menuW=220, menuH=150;
    const maxX=(el?.scrollLeft||0)+(el?.clientWidth||0)-menuW-8;
    const maxY=(el?.scrollTop||0)+(el?.clientHeight||0)-menuH-8;
    x = Math.max(8, Math.min(x, maxX));
    y = Math.max(8, Math.min(y, maxY));
    setCtx({ open:true, x, y, id });
    setBgCtx({ open:false, x:0, y:0 });
  }
  function openBgCtx(e) {
    e.preventDefault();
    const el = wrapRef.current;
    const r = el?.getBoundingClientRect() || { left:0, top:0, width:0, height:0 };
    let x=(e.clientX - r.left) + (el?.scrollLeft||0);
    let y=(e.clientY - r.top) + (el?.scrollTop||0);
    const menuW=220, menuH=160;
    const maxX=(el?.scrollLeft||0)+(el?.clientWidth||0)-menuW-8;
    const maxY=(el?.scrollTop||0)+(el?.clientHeight||0)-menuH-8;
    x = Math.max(8, Math.min(x, maxX));
    y = Math.max(8, Math.min(y, maxY));
    setCtx({ open:false, x:0, y:0, id:"" });
    setBgCtx({ open:true, x, y });
  }

  return (
    <div
      ref={wrapRef}
      style={{ position:"relative", minHeight:"82vh", borderRadius:18, border:`1px solid ${T.line}`, boxShadow:T.shadow, background:T.glassBg, backdropFilter:"blur(6px)", padding:14, overflow:"auto" }}
      onContextMenu={openBgCtx}
      onClick={()=>{ setCtx({ open:false, x:0, y:0, id:"" }); setBgCtx({ open:false, x:0, y:0 }); }}
    >
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Suche…" style={{ flex:1, padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10 }} />
        <select value={sort} onChange={(e)=>setSort(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10 }}>
          <option value="name_asc">Name (A–Z)</option>
          <option value="name_desc">Name (Z–A)</option>
          <option value="age_asc">Alter (aufsteigend)</option>
          <option value="age_desc">Alter (absteigend)</option>
          <option value="status">Status (Lebendig zuerst)</option>
          <option value="occult">Okkult → Name</option>
        </select>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10 }}>
          <option value="all">Alle</option>
          <option value="alive">Nur lebendig</option>
          <option value="dead">Nur verstorben</option>
        </select>
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:12, color:T.subtext, marginBottom:6 }}>Okkult-Filter</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {FIELD_TEMPLATES.occult.options.map(o=>(
            <label key={o} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 8px", border:`1px solid ${T.line}`, borderRadius:10, background:"rgba(255,255,255,0.7)" }}>
              <input type="checkbox" checked={occult.has(o)} onChange={(e)=>{
                setOccult(prev=>{ const ns=new Set(prev); e.target.checked?ns.add(o):ns.delete(o); return ns; });
              }} />
              {o}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:12, color:T.subtext, marginBottom:6 }}>Tags enthalten (Hobbys/Merkmale)</div>
        <input value={tagFilter} onChange={(e)=>setTagFilter(e.target.value)} placeholder="z. B. Musik, Ordentlich…" style={{ width:"100%", padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10 }} />
      </div>

      {list.length === 0 ? (
        <div style={{ fontSize:14, color:T.subtext }}>Keine Treffer. Prüfe Suche/Filter.</div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:14 }}>
          {list.map(n=>{
            const alive = n.alive !== false;
            const occ = getOccult(n);
            const age = getAge(n);
            const job = getField(n,"job")?.value || "";
            const tags = getAllTags(n);
            return (
              <div
                key={n.id}
                onContextMenu={(e)=>openCardCtx(e, n.id)}
                style={{ border:`1px solid ${T.line}`, borderRadius:16, padding:10, background:"rgba(255,255,255,0.75)", boxShadow:T.shadow, opacity:alive?1:.7, filter:alive?"none":"grayscale(20%)" }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{alive ? "" : "☠️ "}{n.label || n.id}</div>
                  <span style={{ marginLeft:"auto", fontSize:12, color:T.subtext }}>{occ}</span>
                </div>
                <div style={{ width:"100%", aspectRatio:"1/1", borderRadius:14, overflow:"hidden", border:`1px solid ${T.line}`, background:"#f3f4f6", display:"grid", placeItems:"center" }}>
                  {n.img ? <img src={n.img} alt={n.label} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                         : <div style={{ fontSize:38, color:"#64748b", fontWeight:700 }}>{(n.label||n.id).slice(0,2).toUpperCase()}</div>}
                </div>
                <div style={{ marginTop:8, fontSize:13, color:T.subtext }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {typeof age==="number" && <Chip>Alter: {age}</Chip>}
                    {job && <Chip>Job: {job}</Chip>}
                    {occ && <Chip>Okkult: {occ}</Chip>}
                  </div>
                  {!!tags.length && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                      {tags.slice(0,12).map((t,i)=> <Tag key={i}>{t}</Tag>)}
                      {tags.length>12 && <span style={{ fontSize:12, opacity:.7 }}>+{tags.length-12} weitere</span>}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={()=>onOpenInfo(n.id)} style={{ padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10, background:"#E6FFF3" }}>Infos…</button>
                  <button onClick={()=>onFocusInExplorer(n.id)} style={{ padding:"8px 10px", border:"1px solid #cfeede", borderRadius:10, background:"#E6FFF3" }}>Im Explorer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Karten-Kontextmenü */}
      {ctx.open && (
        <div
          style={{ position:"absolute", left:ctx.x, top:ctx.y, transform:"translateY(8px)", minWidth:180, zIndex:60, borderRadius:12, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, overflow:"hidden" }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>onOpenInfo(ctx.id)}>ℹ️ Infos…</div>
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>onFocusInExplorer(ctx.id)}>🗺️ Im Explorer fokussieren</div>
          <div style={{ height:1, background:T.line }} />
          <div style={{ padding:"8px 10px", cursor:"pointer" }} onClick={()=>setCtx({ open:false, x:0, y:0, id:"" })}>Abbrechen</div>
        </div>
      )}

      {/* Hintergrund-Kontextmenü */}
      {bgCtx.open && (
        <div
          style={{ position:"absolute", left:bgCtx.x, top:bgCtx.y, transform:"translateY(8px)", minWidth:220, zIndex:59, borderRadius:12, background:T.glassBg, border:`1px solid ${T.line}`, boxShadow:T.shadow, overflow:"hidden" }}
          onClick={(e)=>e.stopPropagation()}
        >
          <div style={{ padding:"8px 10px", fontWeight:700, color:T.subtext }}>Hintergrund</div>
          <div style={{ height:1, background:T.line }} />
          <label style={{ padding:"8px 10px", cursor:"pointer", display:"block" }}>
            🖼️ Bild auswählen…
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={(e)=>{ const f=e.target.files?.[0]; if (f) { const r=new FileReader(); r.onload=()=>onBgUpload(String(r.result)); r.readAsDataURL(f);} }} />
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
    </div>
  );
}

function Chip({ children }) {
  return <span style={{ padding:"2px 8px", borderRadius:999, border:"1px solid #cfeede", background:"#fff", fontSize:12 }}>{children}</span>;
}
function Tag({ children }) {
  return <span style={{ padding:"2px 8px", borderRadius:999, border:"1px solid #cfeede", background:"#ffffffc7", fontSize:12 }}>{children}</span>;
}
