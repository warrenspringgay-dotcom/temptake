// Simple, safe uid for both server + older browsers (no crypto.randomUUID needed)
export function uid(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
}
