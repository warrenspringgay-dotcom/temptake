"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import HelpEdgeTab from "@/components/HelpEdgeTab";
import SafePracticesHelpDrawer from "@/components/SafePracticesHelpDrawer";

export default function ProtectedAppChrome() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  const toggleHelp = () => setHelpOpen((prev) => !prev);

  return (
    <>
      <HelpEdgeTab open={helpOpen} onToggle={toggleHelp} />

      <SafePracticesHelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        pathname={pathname}
        title="Safe practices help"
      />
    </>
  );
}