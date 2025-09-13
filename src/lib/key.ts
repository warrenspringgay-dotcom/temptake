// src/lib/key.ts
/** Build a stable React key from primitives. */
export function keyFrom(...parts: Array<string | number | boolean | null | undefined>) {
  return parts.map(p => (p === null || p === undefined ? "" : String(p))).join("::");
}

/** Build a stable key from an object + optional extra parts. */
export function keyFromObj<T extends Record<string, unknown>>(
  obj: T,
  ...extra: Array<string | number | boolean | null | undefined>
) {
  // Use a stable set of fields if present; fall back to JSON+length guard.
  const id = (obj as any).id ?? (obj as any).value ?? (obj as any).code ?? (obj as any).slug;
  if (id !== undefined && id !== null) return keyFrom("id", id, ...extra);
  const label = (obj as any).label ?? (obj as any).name ?? (obj as any).title;
  if (label !== undefined && label !== null) return keyFrom("lbl", label, ...extra);
  return keyFrom("obj", JSON.stringify(obj), (JSON.stringify(obj) || "").length, ...extra);
}
