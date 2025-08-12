// src/shared/ContextMenu.jsx
import React, { useEffect, useLayoutEffect, useRef } from "react";

export default function ContextMenu({ open, x, y, onClose, items = [] }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let nx = x, ny = y;
    if (nx + r.width > window.innerWidth)  nx = window.innerWidth - r.width - 6;
    if (ny + r.height > window.innerHeight) ny = window.innerHeight - r.height - 6;
    ref.current.style.left = `${nx}px`;
    ref.current.style.top  = `${ny}px`;
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev) => { if (ref.current && !ref.current.contains(ev.target)) onClose?.(); };
    const onEsc  = (ev) => { if (ev.key === "Escape") onClose?.(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="menu" style={{ left: x, top: y, position: "fixed" }}>
      {items.map((it, i) => (
        <div
          key={i}
          className="menu-item"
          onClick={() => { if (!it.disabled) { it.onClick?.(); onClose?.(); } }}
          style={{ opacity: it.disabled ? 0.5 : 1, cursor: it.disabled ? "not-allowed" : "pointer" }}
        >
          {it.icon ? <span style={{ marginRight: 8 }}>{it.icon}</span> : null}
          {it.label}
        </div>
      ))}
    </div>
  );
}
