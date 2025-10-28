"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type MenuItem = {
  label: string;
  onClick?: () => void;
  href?: string;
  target?: "_blank" | "_self";
  rel?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
};

type ActionMenuProps = {
  items: MenuItem[];
  "aria-label"?: string;
  className?: string;
  size?: "sm" | "md";
  triggerLabel?: string;
};

export default function ActionMenu({
  items,
  className = "",
  size = "md",
  "aria-label": ariaLabel = "Open actions",
  triggerLabel = "Actions",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // position + flipping
  const [pos, setPos] = useState<{ top: number; left: number }>(() => ({ top: 0, left: 0 }));
  const [placement, setPlacement] = useState<"down" | "up">("down");

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // estimate width first; refine after first paint
    const estWidth = 240;
    const left = Math.min(Math.max(8, r.left + r.width - estWidth), vw - estWidth - 8);

    // choose up vs down so it never gets hidden off-screen
    const spaceBelow = vh - (r.bottom);
    const needsFlipUp = spaceBelow < 220; // ~ menu height
    setPlacement(needsFlipUp ? "up" : "down");

    const top =
      (needsFlipUp ? r.top + window.scrollY - gap : r.bottom + window.scrollY + gap);

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // second pass after the menu renders to use real width
    requestAnimationFrame(() => {
      const btn = triggerRef.current;
      const m = menuRef.current;
      if (!btn || !m) return;
      const r = btn.getBoundingClientRect();
      const w = Math.min(Math.max(200, m.offsetWidth), 320);
      const vw = window.innerWidth;
      const left = Math.min(Math.max(8, r.left + r.width - w), vw - w - 8);
      setPos(p => ({ ...p, left }));
    });
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, updatePosition]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, close]);

  const focusItem = useCallback((idx: number) => {
    setActiveIndex(idx);
    requestAnimationFrame(() => {
      menuRef.current?.querySelectorAll<HTMLElement>('[data-ak="item"]')[idx]?.focus();
    });
  }, []);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    const enabled = items.map(it => !it.disabled);
    const n = items.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      for (let i = 1; i <= n; i++) {
        const j = (activeIndex + i) % n;
        if (enabled[j]) return focusItem(j);
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      for (let i = 1; i <= n; i++) {
        const j = (activeIndex - i + n) % n;
        if (enabled[j]) return focusItem(j);
      }
    }
    if (e.key === "Home") {
      e.preventDefault();
      const j = items.findIndex(it => !it.disabled);
      if (j >= 0) focusItem(j);
    }
    if (e.key === "End") {
      e.preventDefault();
      for (let j = n - 1; j >= 0; j--) if (!items[j].disabled) return focusItem(j);
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const it = items[activeIndex];
      if (!it || it.disabled) return;
      if (it.href) {
        menuRef.current?.querySelectorAll<HTMLElement>('[data-ak="item"]')[activeIndex]?.click();
      } else {
        it.onClick?.();
        close();
        triggerRef.current?.focus();
      }
    }
  };

  const triggerClasses = useMemo(
    () =>
      `inline-flex items-center justify-center rounded-xl border px-2 ${
        size === "sm" ? "h-8" : "h-9"
      } text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20 ${className}`,
    [size, className]
  );

  const renderRow = (it: MenuItem, i: number) => {
    const base = "w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none";
    const tone =
      it.variant === "danger"
        ? "text-red-700 hover:bg-red-50 focus:bg-red-50"
        : "text-gray-800 hover:bg-gray-100 focus:bg-gray-100";
    const disabledCls = it.disabled ? "opacity-50 pointer-events-none" : "";
    const cls = `${base} ${tone} ${disabledCls}`;

    if (it.href) {
      return (
        <Link
          key={i}
          href={it.href}
          target={it.target}
          rel={it.rel ?? (it.target === "_blank" ? "noopener noreferrer" : undefined)}
          className={cls}
          role="menuitem"
          tabIndex={i === 0 ? 0 : -1}
          data-ak="item"
          onClick={() => {
            if (!it.disabled) it.onClick?.();
            close();
          }}
        >
          {it.icon && <span className="shrink-0">{it.icon}</span>}
          <span className="truncate">{it.label}</span>
        </Link>
      );
    }

    return (
      <button
        key={i}
        type="button"
        className={cls}
        role="menuitem"
        tabIndex={i === 0 ? 0 : -1}
        data-ak="item"
        onClick={() => {
          if (it.disabled) return;
          it.onClick?.();
          close();
        }}
      >
        {it.icon && <span className="shrink-0">{it.icon}</span>}
        <span className="truncate">{it.label}</span>
      </button>
    );
  };

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="actionmenu-trigger"
      onKeyDown={onMenuKeyDown}
      className="fixed z-[9999]"
      style={{
        top: placement === "down" ? pos.top : undefined,
        left: pos.left,
        bottom: placement === "up" ? (window.innerHeight - pos.top) : undefined,
        minWidth: 200,
        maxWidth: 320,
      }}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
        {items.map((it, i) => (
          <div key={i}>{renderRow(it, i)}</div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        id="actionmenu-trigger"
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={triggerClasses}
        onClick={() => {
          if (!open) {
            setOpen(true);
            setTimeout(() => focusItem(0), 0);
          } else {
            close();
          }
        }}
        onKeyDown={onTriggerKeyDown}
        title={triggerLabel}
      >
        {/* 3-dots icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size === "sm" ? 16 : 18}
          height={size === "sm" ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="shrink-0"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {mounted && open ? createPortal(menu, document.body) : null}
    </>
  );
}
