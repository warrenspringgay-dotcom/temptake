"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

type Props = {
  open: boolean;
  onToggle: () => void;
};

export default function HelpEdgeTab({ open, onToggle }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ x: -80 }}
      animate={{ x: open ? 220 : 12 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="
        fixed left-0 top-[55%] -translate-y-1/2 z-[60]
        flex items-center gap-1
        rounded-r-lg border border-emerald-700/60
        bg-emerald-600/95 px-2 py-1.5
        text-xs font-medium text-white shadow-md
        hover:bg-emerald-700
      "
    >
      <BookOpen size={14} />
      <span className="hidden sm:inline">Help</span>
    </motion.button>
  );
}