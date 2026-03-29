"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import HelpEdgeTab from "@/components/HelpEdgeTab";
import SafePracticesHelpDrawer from "@/components/SafePracticesHelpDrawer";

export default function ProtectedAppChrome() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleHelp = () => setHelpOpen((prev) => !prev);

  const chrome = useMemo(
    () => (
      <>
        <HelpEdgeTab open={helpOpen} onToggle={toggleHelp} />

        <SafePracticesHelpDrawer
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          pathname={pathname}
          title="Safe practices help"
        />
      </>
    ),
    [helpOpen, pathname],
  );

  if (!mounted) return null;

  return createPortal(chrome, document.body);
}