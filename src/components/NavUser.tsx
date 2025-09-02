// src/components/NavUser.tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NavUser() {
  const { t } = useI18n();
  // Replace this with your real signed-in UI later.
  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="rounded border px-3 py-1 text-sm">
        {t("Sign in")}
      </Link>
    </div>
  );
}
