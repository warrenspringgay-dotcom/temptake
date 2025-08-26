"use client";
import React, { useEffect, useRef, useState } from "react";

/** Cards */
export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>{children}</div>
);
export const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>
);
export const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

/** Buttons */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" };
export function Button({ variant = "primary", className = "", type = "button", ...rest }: BtnProps) {
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50"
      : "text-slate-700 hover:bg-gray-100";
  return <button type={type} className={`${base} ${styles} ${className}`} {...rest} />;
}

/** Click-away hook */
export function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onAway(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onAway]);
  return ref;
}

/** Simple dropdown used for “More ▾” menus */
export function ActionsDropdown({
  trigger = "More ▾",
  children,
  widthClass = "w-48",
}: { trigger?: React.ReactNode; children: React.ReactNode; widthClass?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </Button>
      {open && (
        <div role="menu" className={`absolute right-0 z-50 mt-1 ${widthClass} rounded-md border border-gray-200 bg-white shadow p-1`}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Small helpers shared across screens */
export const CaretCSS = () => (
  <style>{`
    details > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:.5rem; padding:1rem 1.5rem; border-bottom:1px solid #e5e7eb; font-weight:500; user-select:none; }
    details > summary::marker { display:none; }
    .caret { display:inline-block; transition: transform .2s ease; }
    details[open] .caret { transform: rotate(90deg); }
  `}</style>
);
