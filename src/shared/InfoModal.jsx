// src/shared/InfoModal.jsx
import React, { useEffect } from "react";

export default function InfoModal({ open, title = "Info", children, onClose }) {
  // ESC zum Schliessen
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={modal}>
        <div style={header}>
          <strong>{title}</strong>
          <button type="button" aria-label="Schliessen" onClick={onClose} style={closeBtn}>×</button>
        </div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </div>
    </div>
  );
}

/* Styles ohne Theme-Abhängigkeit */
const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
};
const modal = {
  width: "min(800px, 92vw)", maxHeight: "85vh", overflow: "auto",
  background: "#fff", borderRadius: 12, padding: 16,
  border: "1px solid #e5e7eb", boxShadow: "0 15px 40px rgba(0,0,0,0.25)"
};
const header = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
const closeBtn = {
  width: 32, height: 32, lineHeight: "30px", textAlign: "center",
  border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 18
};
