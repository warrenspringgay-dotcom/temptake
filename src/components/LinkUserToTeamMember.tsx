"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";

/**
 * On mount, ensure the logged-in Supabase user is linked to any
 * team_members rows with the same email and NULL user_id.
 *
 * This fixes the case where a staff member was pre-added by email,
 * then later signs up / sets a password.
 */
export default function LinkUserToTeamMember() {
  useEffect(() => {
    (async () => {
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes?.user) return;

        const user = userRes.user;
        const email = user.email?.toLowerCase();
        if (!email) return;

        // Link any existing team_members rows for this email
        // that don't yet have a user_id
        const { error: updateErr } = await supabase
          .from("team_members")
          .update({ user_id: user.id })
          .is("user_id", null)
          .eq("email", email);

        if (updateErr) {
          console.error("Failed to link team_members.user_id:", updateErr);
        }
      } catch (e) {
        console.error("LinkUserToTeamMember error:", e);
      }
    })();
  }, []);

  return null;
}
