export const deepClone = (o) => JSON.parse(JSON.stringify(o));

export const makeIdFromLabel = (label) =>
  (label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") ||
  Math.random().toString(36).slice(2, 8);

export const rid = () => Math.random().toString(36).slice(2, 10);
