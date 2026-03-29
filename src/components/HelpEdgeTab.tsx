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
      onClick={onToggle}
      initial={{ x: 80 }}
      animate={{ x: open ? -260 : -2 }} // 👈 KEY CHANGE
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="
        fixed right-0 top-[55%] -translate-y-1/2 z-[50]
        flex items-center gap-2
        bg-emerald-600 hover:bg-emerald-800
        text-white text-sm font-semibold
        pl-2 pr-3 py-3
        rounded-l-xl shadow-xl
        border border-emerald-700
      "
    >
      <BookOpen size={16} />
      <span>Help</span>
    </motion.button>
  );
}