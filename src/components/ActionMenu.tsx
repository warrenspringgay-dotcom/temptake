// src/components/ActionMenu.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export type ActionMenuItem = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "danger" | "default";
};

export default function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  if (!open) return;

  const handleClickOutside = (e: MouseEvent) => {
    if (!wrapperRef.current) return;
    if (!wrapperRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [open]);


  return (
    <div
      ref={wrapperRef}
      className="relative inline-block text-left"
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-xl leading-none shadow-sm hover:bg-gray-50 active:scale-95 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯
      </button>

      {/* Menu */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-[9rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {items.map((item, idx) => {
            const base =
              "flex w-full items-center justify-between px-3 py-2 text-sm text-left";
            const variant =
              item.variant === "danger"
                ? "text-red-700 hover:bg-red-50"
                : "text-gray-800 hover:bg-gray-50";

            const content = (
              <span className={`${base} ${variant}`}>
                {item.label}
              </span>
            );

            if (item.href) {
              return (
                <a
                  key={idx}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className="w-full text-left"
                role="menuitem"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
