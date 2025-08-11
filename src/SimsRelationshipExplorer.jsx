import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
cytoscape.use(coseBilkent);

// ====== DESIGN (Sims-like Light Theme) ======
const THEME = {
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

// ====== Beziehungstypen inkl. Emojis ======
const EDGE_STYLE = {
  married:   { emoji: "💍",  color: "#7c3aed", lineStyle: "solid",  width: 4, label: "Verheiratet" },
  engaged:   { emoji: "💎",  color: "#8b5cf6", lineStyle: "solid",  width: 3, label: "Verlobt" },
  partner:   { emoji: "❤️",  color: "#ef4444", lineStyle: "solid",  width: 3, label: "Partner*in" },
  romantic:  { emoji: "❤️‍🔥", color: "#ef4444", lineStyle: "solid",  width: 3, label: "Romantisch" },
  crush:     { emoji: "💘",  color: "#fb7185", lineStyle: "dotted", width: 2, label: "Schwarm" },
  ex:        { emoji: "💔",  color: "#f97316", lineStyle: "dashed", width: 2, label: "Ex" },

  parent:    { emoji: "👪",  color: "#0ea5e9", lineStyle: "solid",  width: 3, label: "Eltern/Kind" },
  child:     { emoji: "🧒",  color: "#38bdf8", lineStyle: "solid",  width: 3, label: "Kind" },
  sibling:   { emoji: "👫",  color: "#22c55e", lineStyle: "solid",  width: 3, label: "Geschwister" },
  halfsibling:{emoji:"🧬",  color:"#16a34a", lineStyle:"dashed",    width:2, label:"Halbgeschw."},
  steps:     { emoji: "👨‍👩‍👧", color: "#10b981", lineStyle: "dashed", width: 2, label: "Stiefbezug" },
  grand:     { emoji: "👴",  color: "#06b6d4", lineStyle: "solid",  width: 3, label: "Großeltern/Enkel" },
  cousin:    { emoji: "👫",  color: "#14b8a6", lineStyle: "dotted", width: 2, label: "Cousin/Cousine" },
  inlaw:     { emoji: "🤝",  color: "#0d9488", lineStyle: "dotted", width: 2, label: "Verschwägert" },
  adopted:   { emoji: "🍼",  color: "#22d3ee", lineStyle: "dashed", width: 2, label: "Adoptiert" },

  roommate:  { emoji: "🏠",  color: "#60a5fa", lineStyle: "solid",  width: 2, label: "Mitbewohner*in" },
  friend:    { emoji: "🤝",  color: "#10b981", lineStyle: "dotted", width: 2, label: "Freundschaft" },
  goodfriend:{ emoji: "😊",  color: "#34d399", lineStyle: "dotted", width: 2, label: "Gute Freunde" },
  bestfriend:{ emoji: "🌟",  color: "#22c55e", lineStyle: "solid",  width: 3, label: "Beste Freunde" },
  acquaintance:{emoji:"👋",  color:"#9ca3af", lineStyle:"dotted",   width:1, label:"Bekannte*r"},
  coworker:  { emoji: "💼",  color: "#64748b", lineStyle: "dotted", width: 2, label: "Kolleg*in" },
  classmate: { emoji: "📚",  color: "#94a3b8", lineStyle: "dotted", width: 2, label: "Klassenkamerad*in" },
  neighbor:  { emoji: "🚪",  color: "#93c5fd", lineStyle: "dotted", width: 2, label: "Nachbar*in" },
  mentor:    { emoji: "🧠",  color: "#7dd3fc", lineStyle: "solid",  width: 2, label: "Mentor/Mentee" },

  disliked:  { emoji: "😒",  color: "#9ca3af", lineStyle: "dashed", width: 2, label: "Missfallen" },
  enemy:     { emoji: "😡",  color: "#111827", lineStyle: "dashed", width: 3, label: "Feindschaft" },
  rivalry:   { emoji: "⚡",  color: "#64748b", lineStyle: "dashed", width: 2, label: "Rivalität" },
  grudge:    { emoji: "🧨",  color: "#ef4444", lineStyle: "dashed", width: 2, label: "Groll" },

  owner_pet: { emoji: "🐾",  color: "#f59e0b", lineStyle: "solid",  width: 2, label: "Besitzer*in/Haustier" },
};

// ====== Info-Feld-Typen (Apple-Contacts-like) ======
const FIELD_TEMPLATES = {
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

// ====== Beispiel-Daten ======
const START_SAMPLE = {
  nodes: [
    { id: "a", label: "Antonia", img: "" },
    { id: "b", label: "Livia", img: "" },
    { id: "c", label: "Mimi", img: "" },
    { id: "d", label: "Elias", img: "" },
    { id: "e", label: "Nico", img: "" },
    { id: "f", label: "Hannah", img: "" },
    { id: "g", label: "Sofie", img: "" },
  ],
  edges: [
    { id: "e1", source: "d", target: "a", type: "romantic", strength: 0.9 },
    { id: "e2", source: "d", target: "b", type: "romantic", strength: 0.6 },
    { id: "e3", source: "d", target: "c", type: "ex", strength: 0.3 },
    { id: "e4", source: "a", target: "b", type: "rivalry", strength: 0.7 },
    { id: "e5", source: "b", target: "c", type: "friend", strength: 0.8 },
    { id: "e6", source: "d", target: "f", type: "married", strength: 1 },
    { id: "e7", source: "f", target: "g", type: "parent", strength: 1 },
    { id: "e8", source: "d", target: "g", type: "parent", strength: 1 },
  ],
};

const LS_KEY = "simsExplorerDataV1";
const LS_UI  = "simsExplorerUiV1";
const LS_BG_IMG = "simsExplorerBgImageV1";
const LS_BG_OPA = "simsExplorerBgOpacityV1";

const deepClone = (o) => JSON.parse(JSON.stringify(o));
const makeIdFromLabel = (label) =>
  (label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
  Math.random().toString(36).slice(2, 8);
const rid = () => Math.random().toString(36).slice(2, 10);

export default function SimsRelationshipExplorer() {
  const containerRef = useRef(null);
  const graphWrapRef = useRef(null);
  const cyRef = useRef(null);

  const bgFileRef = useRef(null); // BG-Datei für Rechtsklick
  const T = THEME;

  // --- State ---
  const [data, setData] = useState(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) {
        const o = JSON.parse(s);
        // Backfill: img, alive, info
        o.nodes = o.nodes.map((n) => ({
          img: "",
          alive: n.alive !== false, // default: true
          info: n.info && Array.isArray(n.info.fields) ? n.info : { fields: [] },
          ...n,
        }));
        return o;
      }
    } catch {}
    // Backfill für START_SAMPLE
    return {
      ...START_SAMPLE,
      nodes: START_SAMPLE.nodes.map((n) => ({ alive: true, info: { fields: [] }, ...n })),
    };
  });

  const [focusId, setFocusId] = useState("");
  const [depth, setDepth] = useState(1);
  const [onlyNeighborhood, setOnlyNeighborhood] = useState(true);
  const [visibleTypes, setVisibleTypes] = useState(() => new Set(Object.keys(EDGE_STYLE)));
  const [labelMode, setLabelMode] = useState("always");
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [imgSize] = useState(56);

  // Form / Edit
  const [selectedForImage, setSelectedForImage] = useState("");
  const [newPersonLabel, setNewPersonLabel] = useState("");
  const [newPersonImgFile, setNewPersonImgFile] = useState(null);

  const [relSource, setRelSource] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState("friend");
  const [relStrength, setRelStrength] = useState(0.8);
  const [selectedEdgeId, setSelectedEdgeId] = useState("");

  const [edgeLabelMode, setEdgeLabelMode] = useState("emoji");

  // Kontextmenüs
  const [ctx, setCtx] = useState({ open: false, x: 0, y: 0, nodeId: "" });
  const [edgeCtx, setEdgeCtx] = useState({ open: false, x: 0, y: 0, edgeId: "" });
  const [bgCtx, setBgCtx] = useState({ open: false, x: 0, y: 0 });

  const [edgeEdit, setEdgeEdit] = useState({ open: false, id: "", source: "", target: "", type: "friend", strength: 0.5 });

  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Hintergrund (persistiert)
  const [bgImage, setBgImage] = useState(() => {
    try { return localStorage.getItem(LS_BG_IMG) || ""; } catch {}
    return "";
  });
  const [bgOpacity, setBgOpacity] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(LS_BG_OPA));
      return Number.isFinite(v) ? v : 0.3;
    } catch {}
    return 0.3;
  });

  // Person-Infos Modal
  const [infoModal, setInfoModal] = useState({
    open: false, id: "", alive: true, fields: [],
  });

  const idToLabel = useMemo(() => {
    const m = new Map();
    data.nodes.forEach((n) => m.set(n.id, n.label || n.id));
    return m;
  }, [data]);

  // --- Persistence ---
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    try {
      const ui = JSON.parse(localStorage.getItem(LS_UI) || "null");
      if (ui) {
        setFocusId(ui.focusId || "");
        setDepth(ui.depth ?? 1);
        setOnlyNeighborhood(!!ui.onlyNeighborhood);
      }
    } catch {}
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_UI, JSON.stringify({ focusId, depth, onlyNeighborhood })); } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [focusId, depth, onlyNeighborhood]);

  useEffect(() => {
    const t = setTimeout(() => {
      try { bgImage ? localStorage.setItem(LS_BG_IMG, bgImage) : localStorage.removeItem(LS_BG_IMG); } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [bgImage]);
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_BG_OPA, String(bgOpacity)); } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [bgOpacity]);

  function pushHistory(prev) {
    setHistory((h) => [...h.slice(-49), deepClone(prev)]);
    setFuture([]);
  }
  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [deepClone(data), ...f]);
      setData(prev);
      return h.slice(0, -1);
    });
  }
  function redo() {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, deepClone(data)]);
      setData(next);
      return f.slice(1);
    });
  }

  // --- Cytoscape Setup ---
  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
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
            width: imgSize,
            height: imgSize,
            shape: "ellipse",
            "background-color": T.nodeBg,
            "border-width": 2,
            "border-color": T.nodeBorder,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "background-image": (ele) => ele.data("img") || null,
            "background-fit": "cover",
            "background-clip": "node",
            "background-opacity": 1,
            "shadow-blur": 15,
            "shadow-opacity": 0.25,
            "shadow-color": T.glow,
            "shadow-offset-x": 0,
            "shadow-offset-y": 2,
          },
        },
        { selector: "node[alive = 0]", style: { "border-color": "#6b7280", "background-color": "#e5e7eb", opacity: 0.6 } },
        { selector: "node.hovered", style: { "border-width": 3, "border-color": T.accent } },
        { selector: "node.focused", style: { "border-width": 4, "border-color": T.accent, width: imgSize + 14, height: imgSize + 14 } },
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
      setFocusId(id);
      setSelectedForImage(id);
      setCtx((p) => ({ ...p, open: false }));
      setEdgeCtx((p) => ({ ...p, open: false }));
      setBgCtx({ open: false, x: 0, y: 0 });
    });
    cy.on("mouseover", "node", (evt) => evt.target.addClass("hovered"));
    cy.on("mouseout", "node", (evt) => evt.target.removeClass("hovered"));

    cy.on("tap", "edge", (evt) => {
      const e = evt.target;
      setSelectedEdgeId(e.id());
      setRelSource(e.data("source"));
      setRelTarget(e.data("target"));
      setRelType(e.data("type"));
      setRelStrength(e.data("strength") ?? 0.5);
      setCtx((p) => ({ ...p, open: false }));
      setEdgeCtx((p) => ({ ...p, open: false }));
      setBgCtx({ open: false, x: 0, y: 0 });
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
      setCtx({ open: true, x: p.x, y: p.y, nodeId: id });
      setEdgeCtx({ open: false, x: 0, y: 0, edgeId: "" });
      setBgCtx({ open: false, x: 0, y: 0 });
    });

    // Rechtsklick: Edge
    cy.on("cxttap", "edge", (evt) => {
      const p = evt.renderedPosition;
      const edge = evt.target;
      setSelectedEdgeId(edge.id());
      setEdgeCtx({ open: true, x: p.x, y: p.y, edgeId: edge.id() });
      setCtx({ open: false, x: 0, y: 0, nodeId: "" });
      setBgCtx({ open: false, x: 0, y: 0 });
    });

    // Rechtsklick: Leerer Hintergrund (Core)
    cy.on("cxttap", (evt) => {
      if (evt.target === cy) {
        const p = evt.renderedPosition || { x: 20, y: 20 };
        setBgCtx({ open: true, x: p.x, y: p.y });
        setCtx({ open: false, x: 0, y: 0, nodeId: "" });
        setEdgeCtx({ open: false, x: 0, y: 0, edgeId: "" });
      }
    });

    // Menü schließen bei allgemeinem Tap/Zoom/Drag
    cy.on("tap", (evt) => { if (evt.target === cy) { setCtx((m)=>({ ...m, open:false })); setEdgeCtx((m)=>({ ...m, open:false })); setBgCtx({ open:false, x:0, y:0 }); }});
    cy.on("zoom", () => { setCtx((m)=>({ ...m, open:false })); setEdgeCtx((m)=>({ ...m, open:false })); setBgCtx({ open:false, x:0, y:0 }); });
    cy.on("drag", () => { setCtx((m)=>({ ...m, open:false })); setEdgeCtx((m)=>({ ...m, open:false })); setBgCtx({ open:false, x:0, y:0 }); });

    cyRef.current = cy;
    return () => cy.destroy();
  }, [imgSize, edgeLabelMode]);

  // Build/Update Elemente
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().remove();
    cy.add([
      ...data.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          img: n.img || "",
          alive: n.alive === false ? 0 : 1,
        },
      })),
      ...data.edges.map((e) => ({
        data: {
          id: e.id || `${e.source}-${e.target}-${e.type}`,
          source: e.source,
          target: e.target,
          type: e.type,
          strength: e.strength ?? 0.5,
        },
      })),
    ]);

    Object.entries(EDGE_STYLE).forEach(([type, s]) => {
      cy.style().selector(`edge[type = "${type}"]`).style({
        "line-color": s.color,
        "line-style": s.lineStyle,
        width: s.width,
      }).update();
    });
    cy.edges().forEach((ed) => {
      const t = ed.data("type");
      const def = EDGE_STYLE[t];
      if (!def) return;
      const text =
        edgeLabelMode === "emoji" ? def.emoji :
        edgeLabelMode === "emoji+text" ? `${def.emoji} ${def.label}` : "";
      ed.style("label", text);
      ed.style("font-size", 14);
    });

    runLayout();
  }, [data]);

  // Sichtbarkeit, Fokus, Node-Labels
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.edges().forEach((e) => e.toggleClass("hidden", !visibleTypes.has(e.data("type"))));

    cy.nodes().removeClass("focused dimmed hidden");
    cy.edges().removeClass("dimmed");

    if (focusId && onlyNeighborhood) {
      const root = cy.getElementById(focusId);
      if (root && root.nonempty()) {
        const bfs = cy.elements().bfs({ roots: root, directed: false, maxDepth: depth });
        const visN = new Set(), visE = new Set();
        bfs.path.forEach((el) => {
          if (el.isNode()) visN.add(el.id());
          else if (el.isEdge()) visE.add(el.id());
        });
        cy.nodes().forEach((n) => { if (!visN.has(n.id())) n.addClass("hidden"); });
        cy.edges().forEach((e) => { if (!visE.has(e.id())) e.addClass("hidden"); });
        root.addClass("focused");
      }
    } else if (focusId) {
      const root = cy.getElementById(focusId);
      root.addClass("focused");
      const neigh = root.closedNeighborhood();
      cy.elements().difference(neigh.union(root)).forEach((el) => el.addClass("dimmed"));
    }

    if (labelMode === "off") cy.nodes().style("label", "");
    else if (labelMode === "focus" && focusId) cy.nodes().forEach((n) => n.style("label", n.id() === focusId ? n.data("label") : ""));
    else cy.nodes().forEach((n) => n.style("label", n.data("label")));
  }, [focusId, depth, onlyNeighborhood, visibleTypes, labelMode]);

  function runLayout() {
    const cy = cyRef.current;
    if (!cy) return;
    setLayoutRunning(true);
    cy.layout({
      name: "cose-bilkent",
      animate: false,
      fit: true,
      randomize: true,
      idealEdgeLength: 120,
      nodeRepulsion: 9000,
    }).run();
    setTimeout(() => setLayoutRunning(false), 250);
  }

  // --- Import/Export & Images ---
  function handleImportJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(String(r.result));
        if (!o.nodes || !o.edges) throw new Error("Erwarte keys 'nodes' & 'edges'");
        o.nodes = o.nodes.map((n) => ({
          img: "",
          alive: n.alive !== false,
          info: n.info && Array.isArray(n.info.fields) ? n.info : { fields: [] },
          ...n,
        }));
        pushHistory(data);
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
    a.href = url;
    a.download = "sims-relationships.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleLocalImageUpload(file) {
    if (!file || !selectedForImage) return;
    const r = new FileReader();
    r.onload = () => {
      pushHistory(data);
      setNodeImage(selectedForImage, String(r.result));
    };
    r.readAsDataURL(file);
  }

  // Hintergrund laden/zurücksetzen (+ Menü schließen)
  function handleBgImageUpload(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setBgImage(String(r.result));
      setBgCtx({ open: false, x: 0, y: 0 });
    };
    r.readAsDataURL(file);
  }
  function clearBgImage() {
    setBgImage("");
    setBgCtx({ open: false, x: 0, y: 0 });
  }

  // --- Editing actions (Nodes) ---
  function setNodeImage(nodeId, src) {
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, img: src } : n)),
    }));
  }
  function addPerson() {
    if (!newPersonLabel.trim()) return alert("Bitte Namen eingeben");
    const id = makeIdFromLabel(newPersonLabel);
    if (data.nodes.some((n) => n.id === id)) return alert("ID existiert bereits");
    const commit = (img) => {
      const next = deepClone(data);
      next.nodes.push({ id, label: newPersonLabel.trim(), img: img || "", alive: true, info: { fields: [] } });
      pushHistory(data);
      setData(next);
      setNewPersonLabel("");
      setSelectedForImage(id);
    };
    if (newPersonImgFile) {
      const r = new FileReader();
      r.onload = () => commit(String(r.result));
      r.readAsDataURL(newPersonImgFile);
    } else commit("");
  }
  function upsertRelationship() {
    if (!relSource || !relTarget || relSource === relTarget) return alert("Quelle/Ziel prüfen");
    const next = deepClone(data);
    let e = next.edges.find((x) => x.source === relSource && x.target === relTarget && x.type === relType);
    if (!e) {
      e = { id: `e_${Date.now()}`, source: relSource, target: relTarget, type: relType, strength: relStrength };
      next.edges.push(e);
    } else {
      e.strength = relStrength;
    }
    pushHistory(data);
    setData(next);
  }
  function deleteSelectedEdge() {
    if (!selectedEdgeId) return;
    deleteEdgeById(selectedEdgeId);
  }

  // Person bearbeiten (Name/Bild) – bestehend
  function openEditPerson(id) {
    const n = data.nodes.find((x) => x.id === id);
    if (!n) return;
    setEditId(id);
    setEditLabel(n.label || id);
    setEditImgFile(null);
  }
  const [editId, setEditId] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editImgFile, setEditImgFile] = useState(null);

  function closeEdit() {
    setEditId("");
    setEditLabel("");
    setEditImgFile(null);
    setCtx((p) => ({ ...p, open: false }));
  }
  function saveEditPerson() {
    if (!editId) return;
    const commit = (imgData) => {
      const next = deepClone(data);
      const n = next.nodes.find((x) => x.id === editId);
      if (n) {
        n.label = editLabel.trim() || n.id;
        if (imgData !== undefined) n.img = imgData;
      }
      pushHistory(data);
      setData(next);
      closeEdit();
    };
    if (editImgFile) {
      const r = new FileReader();
      r.onload = () => commit(String(r.result));
      r.readAsDataURL(editImgFile);
    } else commit();
  }
  function deletePerson() {
    if (!editId && !ctx.nodeId) return;
    const id = editId || ctx.nodeId;
    const next = deepClone(data);
    next.nodes = next.nodes.filter((n) => n.id !== id);
    next.edges = next.edges.filter((e) => e.source !== id && e.target !== id);
    pushHistory(data);
    setData(next);
    closeEdit();
    setCtx({ open: false, x: 0, y: 0, nodeId: "" });
  }
  function deleteAllRelationsOf(id) {
    const next = deepClone(data);
    next.edges = next.edges.filter((e) => e.source !== id && e.target !== id);
    pushHistory(data);
    setData(next);
    setCtx({ open: false, x: 0, y: 0, nodeId: "" });
  }

  function openEdgeEdit(edgeId) {
    const e = data.edges.find((x) => (x.id || `${x.source}-${x.target}-${x.type}`) === edgeId);
    if (!e) return;
    setEdgeEdit({
      open: true,
      id: edgeId,
      source: e.source,
      target: e.target,
      type: e.type,
      strength: typeof e.strength === "number" ? e.strength : 0.5,
    });
    setEdgeCtx((m) => ({ ...m, open: false }));
  }
  function saveEdgeEdit() {
    const { id, type, strength } = edgeEdit;
    if (!id) return;
    const next = deepClone(data);
    const idx = next.edges.findIndex((x) => (x.id || `${x.source}-${x.target}-${x.type}`) === id);
    if (idx === -1) return;
    next.edges[idx].type = type;
    next.edges[idx].strength = strength;
    pushHistory(data);
    setData(next);
    setEdgeEdit({ open: false, id: "", source: "", target: "", type: "friend", strength: 0.5 });
  }
  function deleteEdgeById(edgeId) {
    const next = deepClone(data);
    next.edges = next.edges.filter((e) => (e.id || `${e.source}-${e.target}-${e.type}`) !== edgeId);
    pushHistory(data);
    setData(next);
    setSelectedEdgeId("");
    setEdgeCtx({ open: false, x: 0, y: 0, edgeId: "" });
  }

  // --- Person-Infos (neues Modal) ---
  function openInfoModal(nodeId) {
    const n = data.nodes.find((x) => x.id === nodeId);
    if (!n) return;
    const fields = (n.info && Array.isArray(n.info.fields)) ? deepClone(n.info.fields) : [];
    setInfoModal({ open: true, id: nodeId, alive: n.alive !== false, fields });
    setCtx((p) => ({ ...p, open: false }));
  }
  function closeInfoModal() {
    setInfoModal({ open: false, id: "", alive: true, fields: [] });
  }
  function saveInfoModal() {
    const next = deepClone(data);
    const n = next.nodes.find((x) => x.id === infoModal.id);
    if (n) {
      n.alive = !!infoModal.alive;
      n.info = { fields: sanitizeFields(infoModal.fields) };
    }
    pushHistory(data);
    setData(next);
    closeInfoModal();
  }
  function sanitizeFields(fields) {
    // kleine Aufräumroutine
    return fields.map((f) => {
      const t = FIELD_TEMPLATES[f.kind] || {};
      const label = f.label || t.label || f.kind;
      if (t.type === "tags" || f.type === "tags") {
        const vals = (f.values || []).map((s) => String(s).trim()).filter(Boolean);
        return { ...f, label, type: "tags", values: [...new Set(vals)] };
      }
      if (t.type === "number" || f.type === "number") {
        const v = f.value === "" || f.value === null || f.value === undefined ? "" : Number(f.value);
        return { ...f, label, type: "number", value: Number.isFinite(v) ? v : "" };
      }
      if (t.type === "select" || f.type === "select") {
        return { ...f, label, type: "select", value: f.value || "" };
      }
      if (t.type === "textarea" || f.type === "textarea") {
        return { ...f, label, type: "textarea", value: String(f.value || "") };
      }
      return { ...f, label, type: "text", value: String(f.value ?? "") };
    });
  }
  function addField(kind) {
    const tpl = FIELD_TEMPLATES[kind];
    if (!tpl) return;
    setInfoModal((m) => {
      // Singletons nicht doppeln
      if (tpl.singleton && m.fields.some((f) => f.kind === kind)) return m;
      const nf = {
        id: "f_" + rid(),
        kind,
        label: tpl.label,
        type: tpl.type,
        value: tpl.type === "select" ? (tpl.options?.[0] || "") : "",
        values: tpl.type === "tags" ? [] : undefined,
        options: tpl.options,
      };
      return { ...m, fields: [...m.fields, nf] };
    });
  }
  function deleteField(fid) {
    setInfoModal((m) => ({ ...m, fields: m.fields.filter((f) => f.id !== fid) }));
  }
  function setFieldValue(fid, value) {
    setInfoModal((m) => ({ ...m, fields: m.fields.map((f) => (f.id === fid ? { ...f, value } : f)) }));
  }
  function addTag(fid, tag) {
    const t = String(tag).trim();
    if (!t) return;
    setInfoModal((m) => ({
      ...m,
      fields: m.fields.map((f) => (f.id === fid ? { ...f, values: [...(f.values || []), t] } : f)),
    }));
  }
  function removeTag(fid, idx) {
    setInfoModal((m) => ({
      ...m,
      fields: m.fields.map((f) => {
        if (f.id !== fid) return f;
        const vals = [...(f.values || [])];
        vals.splice(idx, 1);
        return { ...f, values: vals };
      }),
    }));
  }

  // --- UI helpers ---
  const nodeOptions = useMemo(
    () => data.nodes.slice().sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id)),
    [data]
  );
  const glass = { background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, backdropFilter: "blur(6px)" };
  const panel = { padding: 14, borderRadius: 16, marginBottom: 12, ...glass };
  const header = { display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, ...glass };
  const labelS = { display: "block", fontSize: 12, color: T.subtext, marginBottom: 6 };
  const inputS = { width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`, borderRadius: 12, background: "rgba(255,255,255,0.65)", color: T.text, outline: "none" };
  const btnBase = { padding: "9px 12px", borderRadius: 12, border: `1px solid ${T.line}`, cursor: "pointer", transition: "all .2s ease", color: T.text, background: T.accentSoft };
  const btn = (filled = false) => ({ ...btnBase, background: filled ? T.accent : T.accentSoft, color: filled ? "#fff" : T.text });

  function zoom(delta) {
    const cy = cyRef.current; if (!cy) return;
    cy.zoom({ level: cy.zoom() + delta, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }
  function fit() {
    const cy = cyRef.current; if (!cy) return;
    cy.fit();
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "380px 1fr",
        gap: 18,
        padding: 18,
        minHeight: "100vh",
        background: bgImage ? "transparent" : T.bg,
        color: T.text,
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        position: "relative",
        zIndex: 0,
      }}
    >
      {/* Globaler Hintergrund-Layer */}
      {bgImage && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: bgOpacity,
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      )}

      {/* Sidebar */}
      <div>
        {/* Top bar */}
        <div style={header}>
          <div style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: `22px solid ${T.accent}` }} />
          <div style={{ fontWeight: 800, letterSpacing: .2 }}>Sims Relationship Explorer</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button style={btn()} onClick={undo} title="Rückgängig (Ctrl+Z)">↶</button>
            <button style={btn()} onClick={redo} title="Wiederholen (Ctrl+Y)">↷</button>
          </div>
        </div>

        {/* Filter & Fokus */}
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Filter & Fokus</div>
          <label style={labelS}>Person fokussieren</label>
          <input
            list="people"
            style={inputS}
            value={idToLabel.get(focusId) || ""}
            onChange={(e) => {
              const val = e.target.value;
              const m = nodeOptions.find((n) => n.label === val || n.id === val);
              setFocusId(m ? m.id : "");
              setSelectedForImage(m ? m.id : "");
            }}
            placeholder="Namen eingeben…"
          />
          <datalist id="people">{nodeOptions.map((n) => <option key={n.id} value={n.label || n.id} />)}</datalist>

          <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
            <label><input type="checkbox" checked={onlyNeighborhood} onChange={(e) => setOnlyNeighborhood(e.target.checked)} /> Nur Umfeld</label>
            <span style={{ flex: 1 }} />
            <button style={btn()} onClick={runLayout}>Auto-Layout</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={labelS}>Tiefe (Hops): {depth}</label>
            <input type="range" min={1} max={3} step={1} value={depth} onChange={(e) => setDepth(parseInt(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={labelS}>Beschriftungen</label>
            {["always", "focus", "off"].map((k) => (
              <button key={k} onClick={() => setLabelMode(k)} style={{ ...btn(labelMode === k), marginRight: 8 }}>
                {k === "always" ? "Immer" : k === "focus" ? "Nur Fokus" : "Aus"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={btn()} onClick={() => zoom(0.2)}>＋</button>
            <button style={btn()} onClick={() => zoom(-0.2)}>－</button>
            <button style={btn(true)} onClick={fit}>Fit</button>
          </div>
        </div>

        {/* Legende */}
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Legende / Beziehungstypen</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.subtext }}>Kantenlabel:</span>
            {["emoji", "emoji+text", "off"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setEdgeLabelMode(m);
                  const cy = cyRef.current; if (!cy) return;
                  cy.edges().forEach((ed) => {
                    const t = ed.data("type"); const def = EDGE_STYLE[t]; if (!def) return;
                    const text = m === "emoji" ? def.emoji : m === "emoji+text" ? `${def.emoji} ${def.label}` : "";
                    ed.style("label", text);
                  });
                }}
                style={{ ...btn(edgeLabelMode === m) }}
              >
                {m === "emoji" ? "Emoji" : m === "emoji+text" ? "Emoji+Text" : "Aus"}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {Object.entries(EDGE_STYLE).map(([k, v]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={visibleTypes.has(k)}
                  onChange={(e) => {
                    const ns = new Set(visibleTypes);
                    e.target.checked ? ns.add(k) : ns.delete(k);
                    setVisibleTypes(ns);
                  }}
                />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 34, height: 0, borderBottom: `${v.width}px ${v.lineStyle} ${v.color}` }} /> {v.emoji} {v.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Personen */}
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Neue Person</div>
          <label style={labelS}>Name</label>
          <input style={inputS} value={newPersonLabel} onChange={(e) => setNewPersonLabel(e.target.value)} placeholder="Name" />
          <label style={labelS}>Bild (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setNewPersonImgFile(e.target.files?.[0] || null)} style={{ marginBottom: 10 }} />
          <button style={btn(true)} onClick={addPerson}>Hinzufügen</button>
          <div style={{ fontSize: 12, color: T.subtext, marginTop: 6 }}>Tipp: quadratisch 512×512 für bestes Ergebnis.</div>
        </div>

        {/* Beziehungen */}
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Beziehung hinzufügen / ändern</div>
          <label style={labelS}>Quelle</label>
          <select value={relSource} onChange={(e) => setRelSource(e.target.value)} style={inputS}>
            <option value="">– wählen –</option>
            {nodeOptions.map((n) => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
          </select>
          <label style={labelS}>Ziel</label>
          <select value={relTarget} onChange={(e) => setRelTarget(e.target.value)} style={inputS}>
            <option value="">– wählen –</option>
            {nodeOptions.map((n) => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
          </select>
          <label style={labelS}>Typ</label>
          <select value={relType} onChange={(e) => setRelType(e.target.value)} style={inputS}>
            {Object.keys(EDGE_STYLE).map((k) => <option key={k} value={k}>{EDGE_STYLE[k].emoji} {EDGE_STYLE[k].label}</option>)}
          </select>
          <label style={labelS}>Stärke: {relStrength.toFixed(2)}</label>
          <input type="range" min={0} max={1} step={0.05} value={relStrength} onChange={(e) => setRelStrength(parseFloat(e.target.value))} style={{ width: "100%", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btn(true)} onClick={upsertRelationship}>Speichern</button>
            <button style={{ ...btn(), background: "#ffecec", border: "1px solid #f5b9b9" }} disabled={!selectedEdgeId} onClick={deleteSelectedEdge}>Ausgewählte Kante löschen</button>
          </div>
          {selectedEdgeId && <div style={{ fontSize: 12, color: T.subtext, marginTop: 6 }}>Ausgewählte Kante: {selectedEdgeId}</div>}
        </div>

        {/* Daten I/O */}
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Daten</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ ...btn(), display: "inline-block" }}>JSON importieren
              <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files && handleImportJson(e.target.files[0])} />
            </label>
            <button onClick={exportJson} style={btn()}>JSON exportieren</button>
          </div>
          <div style={{ fontSize: 12, color: T.subtext, marginTop: 8 }}>Autosave aktiv (LocalStorage). Undo/Redo: Ctrl+Z / Ctrl+Y. Rechtsklick auf Knoten/Kanten → Menü.</div>
        </div>

        {/* Hintergrund (Sidebar) */}
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Hintergrund</div>
          <label style={labelS}>Eigenes Bild auswählen</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleBgImageUpload(e.target.files?.[0] || null)}
            style={{ marginBottom: 10 }}
          />
          <label style={labelS}>Transparenz: {bgOpacity.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={bgOpacity}
            onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
            style={{ width: "100%", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btn()} onClick={clearBgImage} disabled={!bgImage}>Zurücksetzen</button>
          </div>
          <div style={{ fontSize: 12, color: T.subtext, marginTop: 6 }}>
            Tipp: Ruhiges, helles Motiv verwenden. Das Bild bleibt nur lokal (LocalStorage).
          </div>
        </div>
      </div>

      {/* Graph */}
      <div>
        <div
          ref={graphWrapRef}
          style={{ position: "relative", width: "100%", height: "82vh", borderRadius: 18, border: `1px solid ${T.line}`, boxShadow: T.shadow, background: T.glassBg, backdropFilter: "blur(6px)" }}
          onContextMenu={(e)=>e.preventDefault()}
        >
          <div ref={containerRef} style={{ position: "absolute", inset: 0, borderRadius: 18 }} />
          {!focusId && (
            <div style={{ position: "absolute", top: 10, left: 10, fontSize: 12, color: T.subtext, background: T.glassBg, padding: "6px 8px", border: `1px solid ${T.line}`, borderRadius: 8 }}>
              Tipp: Rechtsklick auf Person/Kante oder in einen leeren Bereich öffnet das Menü.
            </div>
          )}

          {/* Kontextmenü (Hintergrund) */}
          {bgCtx.open && (
            <div
              style={{ position: "absolute", left: bgCtx.x, top: bgCtx.y, transform: "translateY(8px)", minWidth: 220, zIndex: 39, borderRadius: 12, background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "8px 10px", fontWeight: 700, color: T.subtext }}>Hintergrund</div>
              <div style={{ height: 1, background: T.line }} />
              <div
                style={{ padding: "8px 10px", cursor: "pointer" }}
                onClick={() => bgFileRef.current && bgFileRef.current.click()}
              >
                🖼️ Bild auswählen…
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: 12, color: T.subtext, marginBottom: 6 }}>Transparenz: {bgOpacity.toFixed(2)}</div>
                <input
                  type="range" min={0.1} max={0.9} step={0.05}
                  value={bgOpacity}
                  onChange={(e)=>setBgOpacity(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ padding: "8px 10px", cursor: "pointer", color: "#b3261e" }} onClick={clearBgImage}>🗑️ Zurücksetzen</div>
              <div style={{ height: 1, background: T.line }} />
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => setBgCtx({ open:false, x:0, y:0 })}>Abbrechen</div>
            </div>
          )}
          <input
            ref={bgFileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e)=>handleBgImageUpload(e.target.files?.[0] || null)}
          />

          {/* Kontextmenü (Nodes) */}
          {ctx.open && (
            <div
              style={{ position: "absolute", left: ctx.x, top: ctx.y, transform: "translateY(8px)", minWidth: 200, zIndex: 40, borderRadius: 12, background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => { openEditPerson(ctx.nodeId); setCtx((p) => ({ ...p, open: false })); }}>✏️ Bearbeiten…</div>
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => openInfoModal(ctx.nodeId)}>ℹ️ Infos…</div>
              <div style={{ height: 1, background: T.line }} />
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => deleteAllRelationsOf(ctx.nodeId)}>🔗 Alle Beziehungen löschen</div>
              <div style={{ padding: "8px 10px", cursor: "pointer", color: "#b3261e" }} onClick={deletePerson}>🗑️ Person entfernen</div>
              <div style={{ height: 1, background: T.line }} />
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => setCtx({ open: false, x: 0, y: 0, nodeId: "" })}>Abbrechen</div>
            </div>
          )}

          {/* Kontextmenü (Edges) */}
          {edgeCtx.open && (
            <div
              style={{ position: "absolute", left: edgeCtx.x, top: edgeCtx.y, transform: "translateY(8px)", minWidth: 200, zIndex: 41, borderRadius: 12, background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "8px 10px", fontWeight: 700, color: T.subtext }}>Beziehung</div>
              <div style={{ height: 1, background: T.line }} />
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => openEdgeEdit(edgeCtx.edgeId)}>✏️ Bearbeiten…</div>
              <div style={{ padding: "8px 10px", cursor: "pointer", color: "#b3261e" }} onClick={() => deleteEdgeById(edgeCtx.edgeId)}>🗑️ Löschen</div>
              <div style={{ height: 1, background: T.line }} />
              <div style={{ padding: "8px 10px", cursor: "pointer" }} onClick={() => setEdgeCtx({ open: false, x: 0, y: 0, edgeId: "" })}>Abbrechen</div>
            </div>
          )}
        </div>
      </div>

      {/* Edit-Modal (Nodes) */}
      {editId && (
        <div onClick={closeEdit} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, padding: 16, borderRadius: 16, background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, backdropFilter: "blur(8px)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Person bearbeiten</div>
            <label style={{ display: "block", fontSize: 12, color: T.subtext, marginBottom: 6 }}>Name</label>
            <input style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.line}`, borderRadius: 12, background: "rgba(255,255,255,0.65)", color: T.text, outline: "none", marginBottom: 8 }} value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            <label style={{ display: "block", fontSize: 12, color: T.subtext, marginBottom: 6 }}>Bild ersetzen (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setEditImgFile(e.target.files?.[0] || null)} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${T.line}`, background: T.accent, color: "#fff" }} onClick={saveEditPerson}>Speichern</button>
              <button style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${T.line}`, background: T.accentSoft }} onClick={closeEdit}>Abbrechen</button>
              <button style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid #f5b9b9", background: "#ffecec" }} onClick={deletePerson}>Person löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Person-Infos Modal */}
      {infoModal.open && (
        <div onClick={closeInfoModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 52 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxHeight: "86vh", overflow: "auto", padding: 16, borderRadius: 16, background: T.glassBg, border: `1px solid ${T.line}`, boxShadow: T.shadow, backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Infos zu {idToLabel.get(infoModal.id) || infoModal.id}</div>
              <span style={{ marginLeft: "auto", fontSize: 12, color: T.subtext }}>Status:</span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={!!infoModal.alive} onChange={(e)=>setInfoModal((m)=>({ ...m, alive: e.target.checked }))} />
                {infoModal.alive ? "Lebendig" : "Verstorben ☠️"}
              </label>
            </div>

            {/* Felder-Liste */}
            <div style={{ display: "grid", gap: 10 }}>
              {infoModal.fields.map((f) => (
                <div key={f.id} style={{ padding: 10, borderRadius: 12, border: `1px solid ${T.line}`, background: "rgba(255,255,255,0.65)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>{f.label || f.kind}</div>
                    <span style={{ fontSize: 12, color: T.subtext }}>({f.type})</span>
                    <button onClick={()=>deleteField(f.id)} style={{ marginLeft: "auto", ...btnBase }}>Entfernen</button>
                  </div>

                  {/* Eingabeelemente je Typ */}
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
                      {(f.options || FIELD_TEMPLATES[f.kind]?.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {f.type === "tags" && (
                    <div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {(f.values || []).map((t, i) => (
                          <span key={i} style={{ padding: "4px 8px", borderRadius: 999, border: `1px solid ${T.line}`, background: "#fff", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {t}
                            <button onClick={()=>removeTag(f.id, i)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
                          </span>
                        ))}
                      </div>
                      <TagAdder onAdd={(tag)=>addTag(f.id, tag)} placeholder="Neuen Eintrag hinzufügen und Enter drücken" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Feld hinzufügen */}
            <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: `1px solid ${T.line}`, background: "rgba(255,255,255,0.65)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Feld hinzufügen</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(FIELD_TEMPLATES).map(([k, t]) => (
                  <button key={k} onClick={()=>addField(k)} style={btnBase}>{t.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button style={btn()} onClick={closeInfoModal}>Abbrechen</button>
              <button style={btn(true)} onClick={saveInfoModal}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- kleine Hilfskomponente für Tags ---
function TagAdder({ onAdd, placeholder }) {
  const [v, setV] = useState("");
  return (
    <input
      style={{ width: "100%", padding: "8px 10px", border: "1px solid #cfeede", borderRadius: 10, background: "rgba(255,255,255,0.9)" }}
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
