// src/shared/persist.js
export const STORAGE_KEY = "simsExplorer:data:v1";

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // ganz einfache Validierung
    if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) return parsed;
    return null;
  } catch (e) {
    console.warn("[persist] loadData error", e);
    return null;
  }
}

let _t;
export function saveDataDebounced(data, delay = 300) {
  if (_t) clearTimeout(_t);
  _t = setTimeout(() => saveData(data), delay);
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("[persist] saveData error", e);
    // Optional: Nutzer informieren (kann passieren bei zu vielen/großen Bildern)
    alert("Speichern fehlgeschlagen (Speicher voll?). Bitte kleinere Bilder nutzen oder einige entfernen.");
    return false;
  }
}
