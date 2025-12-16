// src/components/ActionMenu.tsx
"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Item = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "normal" | "danger";
  disabled?: boolean;
};

const MENU_W = 220;
const PAD = 8;
const GAP = 6;

export default function ActionMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const compute = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;

    // clamp left
    const desiredLeft = Math.round(b.right - MENU_W);
    const maxLeft = window.innerWidth - MENU_W - PAD;
    const left = Math.max(PAD, Math.min(desiredLeft, maxLeft));

    // decide up vs down based on available space
    const approxMenuH = Math.min(360, 44 * items.length + 10); // rough estimate
    const spaceBelow = window.innerHeight - b.bottom - PAD;
    const spaceAbove = b.top - PAD;

    const openUp = spaceBelow < approxMenuH && spaceAbove > spaceBelow;

    const top = openUp
      ? Math.round(b.top - GAP) // we'll translateY(-100%) via style below
      : Math.round(b.bottom + GAP);

    setPos({ top, left, openUp });
  };

  useLayoutEffect(() => {
    if (open) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onWin = () => compute();

    document.addEventListener("mousedown", onDoc as any, true);
    document.addEventListener("touchstart", onDoc as any, true);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("resize", onWin);

    return () => {
      document.removeEventListener("mousedown", onDoc as any, true);
      document.removeEventListener("touchstart", onDoc as any, true);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("resize", onWin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  const handleItem = (it: Item) => {
    setOpen(false);
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

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[1000]" aria-hidden={!open}>
            {/* click-catcher */}
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />

            <div
              ref={boxRef}
              className="absolute rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur px-1 py-1 text-sm"
              style={{
                position: "fixed",
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                width: MENU_W,
                maxHeight: 320,
                overflowY: "auto",
                transform: pos?.openUp ? "translateY(-100%)" : "none",
              }}
              onClick={(e) => e.stopPropagation()}
              role="menu"
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
                  role="menuitem"
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
