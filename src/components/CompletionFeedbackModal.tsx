"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  points?: number;
  compliantDays?: number;
  streak?: number;
};

export default function CompletionFeedbackModal({
  open,
  onClose,
  points = 10,
  compliantDays = 0,
  streak = 0,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-[90%] max-w-md rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">
                All checks complete today ✅
              </h2>

              <p className="text-sm text-gray-500">
                You’re building your compliance score
              </p>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-2xl bg-gray-100 p-3">
                  <p className="text-lg font-semibold">+{points}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>

                <div className="rounded-2xl bg-gray-100 p-3">
                  <p className="text-lg font-semibold">
                    {compliantDays}/7
                  </p>
                  <p className="text-xs text-gray-500">this week</p>
                </div>

                <div className="rounded-2xl bg-gray-100 p-3">
                  <p className="text-lg font-semibold">{streak}</p>
                  <p className="text-xs text-gray-500">day streak</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-xl bg-black text-white py-2 text-sm"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}