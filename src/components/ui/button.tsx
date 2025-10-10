import * as React from "react";
import { clsx } from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md";
};

export default function Button({ className, variant = "solid", size = "md", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm";
  const variants = {
    solid:  "bg-black text-white hover:bg-gray-900",
    outline:"border border-gray-300 text-gray-800 hover:bg-gray-50",
    ghost:  "text-gray-700 hover:bg-gray-50",
  } as const;

  return <button {...props} className={clsx(base, sizes, variants[variant], className)} />;
}
