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
  /** Use "danger" for destructive actions */
  variant?: "default" | "danger";
};

type ActionMenuProps = {
  items: MenuItem[];
  /** Optional aria-label for the trigger button (default: "Open actions") */
  "aria-label"?: string;
  /** Optional className for the trigger button wrapper */
  className?: string;
  /** If true, renders a small icon-only trigger. */
  size?: "sm" | "md";
  /** Optional tooltip/label text for trigger (visually hidden). */
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
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Portal mount guard (Next.js app router + SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle
  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Calculate position relative to viewport, keep inside screen.
  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 6; // small offset
    const menuWidth = 240; // estimated; we’ll still clamp by viewport
    const vw = window.innerWidth;
    const left = Math.min(Math.max(8, r.left + r.width - menuWidth), vw - menuWidth - 8);
    const top = Math.max(8, r.top + window.scrollY + r.height + gap);
    setPos({ top, left, width: r.width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  // Close on outside click
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

  // Keyboard handling
  const focusItem = useCallback(
    (idx: number) => {
      setActiveIndex(idx);
      // Move focus into the corresponding button/anchor when available
      requestAnimationFrame(() => {
        const el = menuRef.current?.querySelectorAll<HTMLElement>('[data-ak="item"]')[idx];
        el?.focus();
      });
    },
    [setActiveIndex]
  );

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
    const enabled = items.map((it) => !it.disabled);
    const count = enabled.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      let next = activeIndex;
      for (let i = 1; i <= count; i++) {
        const tryIdx = (activeIndex + i) % items.length;
        if (enabled[tryIdx]) {
          next = tryIdx;
          break;
        }
      }
      focusItem(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let next = activeIndex;
      for (let i = 1; i <= count; i++) {
        const tryIdx = (activeIndex - i + items.length) % items.length;
        if (enabled[tryIdx]) {
          next = tryIdx;
          break;
        }
      }
      focusItem(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      for (let i = 0; i < items.length; i++) {
        if (!items[i].disabled) {
          focusItem(i);
          break;
        }
      }
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = items.length - 1; i >= 0; i--) {
        if (!items[i].disabled) {
          focusItem(i);
          break;
        }
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const it = items[activeIndex];
      if (!it || it.disabled) return;
      if (it.href) {
        // Let the element's default click happen via refocus/enter
        (menuRef.current?.querySelectorAll<HTMLElement>('[data-ak="item"]')[activeIndex])?.click();
        return;
      }
      it.onClick?.();
      close();
      triggerRef.current?.focus();
    }
  };

  const triggerClasses = useMemo(
    () =>
      `inline-flex items-center justify-center rounded-md border px-2 ${
        size === "sm" ? "h-8" : "h-9"
      } text-sm hover:bg-gray-50 ${className}`,
    [size, className]
  );

  // Render a single menu row (button or link)
  const renderRow = (it: MenuItem, i: number) => {
    const base =
      "w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none";
    const tone =
      it.variant === "danger"
        ? "text-red-700 hover:bg-red-50 focus:bg-red-50"
        : "text-gray-800 hover:bg-gray-100 focus:bg-gray-100";
    const disabledCls = it.disabled ? "opacity-50 pointer-events-none" : "";
    const className = `${base} ${tone} ${disabledCls}`;

    // Anchor
    if (it.href) {
      return (
        <Link
          key={i}
          href={it.href}
          target={it.target}
          rel={it.rel ?? (it.target === "_blank" ? "noopener noreferrer" : undefined)}
          className={className}
          role="menuitem"
          tabIndex={i === 0 ? 0 : -1}
          data-ak="item"
          onClick={() => {
            if (it.onClick && !it.disabled) it.onClick();
            close();
          }}
        >
          {it.icon && <span className="shrink-0">{it.icon}</span>}
          <span className="truncate">{it.label}</span>
        </Link>
      );
    }

    // Button
    return (
      <button
        key={i}
        type="button"
        className={className}
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
      className="z-[9999] fixed"
      style={{
        top: pos.top,
        left: pos.left,
        minWidth: 200,
        maxWidth: 280,
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
        {/* three-dots icon */}
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
