// src/components/ActionMenu.tsx
"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Item = {
  label: string;
  onClick?: () => void;
  href?: string;                 // NEW: allow direct navigation
  variant?: "normal" | "danger";
  disabled?: boolean;
};

export default function ActionMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const compute = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const top = Math.round(b.bottom + 6);
    const desiredLeft = Math.round(b.right - 200);
    const maxLeft = window.innerWidth - 208;
    const left = Math.max(8, Math.min(desiredLeft, maxLeft));
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (open) compute();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onWin = () => compute();
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("resize", onWin);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("resize", onWin);
    };
  }, [open]);

  const handleItem = (it: Item) => {
    setOpen(false);
    // run click first (for modals etc), then navigate if provided
    it.onClick?.();
    if (it.href) router.push(it.href);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        …
      </button>

      {mounted && open &&
        createPortal(
          <div className="fixed inset-0 z-[1000] pointer-events-none">
            <div
              ref={boxRef}
              className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur px-1 py-1 text-sm"
              style={{
                position: "fixed",
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                minWidth: 200,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => handleItem(it)}
                  className={[
                    "block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50",
                    it.variant === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-800",
                    it.disabled ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
