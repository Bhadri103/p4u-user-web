const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function stableCode(value: string): string { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0"); }
export function publicReference(value: unknown, prefix: string): string { const raw = String(value || "").trim(); if (!raw) return prefix; return UUID_RE.test(raw) ? `${prefix}-${stableCode(raw)}` : raw; }
