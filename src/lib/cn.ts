// src/lib/cn.ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// Optional: also provide a default export, in case some files use `import cn from ...`
export default cn;
