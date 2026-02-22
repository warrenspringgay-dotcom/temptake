"use client";

import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import { Pin, Send } from "lucide-react";

// ✅ Workstation operator (PIN user)
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

type Post = {
  id: string;
  author_initials: string;
  message: string;
  color: string;
  is_pinned: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
  location_id?: string | null;
};

type LeaderboardRow = {
  display_name: string | null;
  points: number | null;
  cleaning_count: number | null;
  temp_logs_count: number | null;
};

const EMOJIS = ["🔥", "❤️", "😂", "🎉", "👀", "👍"];

const COLORS = [
  "bg-pink-200",
  "bg-yellow-200",
  "bg-cyan-200",
  "bg-lime-200",
  "bg-purple-200",
  "bg-orange-200",
];

export default function KitchenWall() {
  // Workstation operator (PIN)
  const ws = useWorkstation() as any;
  const operator = ws?.operator as any;
  const locked = !!ws?.locked;

  const operatorInitials = (operator?.initials ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .slice(0, 4);

  const operatorName = (operator?.name ?? operator?.display_name ?? "")
    .toString()
    .trim();

  function openWorkstationLock() {
    if (typeof ws?.openLockModal === "function") return ws.openLockModal();
    if (typeof ws?.open === "function") return ws.open();
    try {
      window.dispatchEvent(new Event("tt-open-workstation-lock"));
    } catch {}
  }

  function requireOperator(actionLabel?: string) {
    if (!locked && operatorInitials) return true;

    // force PIN modal
    openWorkstationLock();

    posthog.capture("workstation_blocked_action", {
      action: actionLabel ?? "unknown",
      locked,
      has_operator_initials: !!operatorInitials,
    });

    return false;
  }

  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("");
  const [initials, setInitials] = useState(""); // will be operator-driven now
  const [orgId, setOrgId] = useState<string | null>(null);

  // Active location
  const [locationId, setLocationId] = useState<string | null>(null);

  // Logged-in user (still used for manager/admin role + fallback name)
  const [myName, setMyName] = useState<string>("");

  // Manager / owner / admin flag (org-level)
  const [isManager, setIsManager] = useState(false);

  // Leaderboard-related
  const [lbRows, setLbRows] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [myCleaningPoints, setMyCleaningPoints] = useState<number | null>(null);
  const [myTempPoints, setMyTempPoints] = useState<number | null>(null);
  const [myBadges, setMyBadges] = useState<string[]>([]);

  const currentMonthLabel = new Date().toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  // ✅ Always drive wall initials from workstation operator
  useEffect(() => {
    setInitials(operatorInitials);
  }, [operatorInitials]);

  // Keep org + location in sync (location switching)
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const nextOrg = await getActiveOrgIdClient();
      const nextLoc = await getActiveLocationIdClient();

      if (cancelled) return;

      setOrgId(nextOrg);
      setLocationId(nextLoc);

      if (nextOrg) {
        await loadPosts(nextOrg, nextLoc);
        await loadLeaderboard(nextOrg); // org-wide for now
      }
    };

    const onStorage = () => void sync();
    const onFocus = () => void sync();
    const onCustom = () => void sync();

    void sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("tt-location-changed" as any, onCustom);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("tt-location-changed" as any, onCustom);
    };
  }, []);

  // Auth-derived org-level role + fallback name
  useEffect(() => {
    if (!orgId) return;

    let alive = true;

    (async () => {
      let detectedName = "";
      let managerFlag = false;

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          if (!alive) return;
          setIsManager(false);
          return;
        }

        // ✅ ORG-LEVEL ROLE (authoritative)
        const { data: roleRow, error: roleErr } = await supabase
          .from("team_members")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .is("location_id", null)
          .maybeSingle();

        if (!roleErr && roleRow) {
          const role = (roleRow.role ?? "").toLowerCase();
          managerFlag = role === "owner" || role === "manager" || role === "admin";
        }

        // ✅ NAME fallback (location row then org row)
        const baseQuery = supabase
          .from("team_members")
          .select("name,initials,email")
          .eq("org_id", orgId)
          .eq("user_id", user.id);

        let memberRow: { name: string | null } | null = null;

        if (locationId) {
          const { data: locRow } = await baseQuery.eq("location_id", locationId).maybeSingle();
          if (locRow) memberRow = locRow as any;
        }

        if (!memberRow) {
          const { data: orgRow } = await baseQuery.is("location_id", null).maybeSingle();
          if (orgRow) memberRow = orgRow as any;
        }

        if (memberRow) {
          detectedName = (memberRow.name ?? "").toString().trim();
        }
      } catch {
        // ignore
      }

      if (!alive) return;

      setIsManager(managerFlag);
      setMyName(detectedName);
    })();

    return () => {
      alive = false;
    };
  }, [orgId, locationId]);

  // ✅ Use workstation operator name for "my rank" where possible
  const leaderboardIdentityName = useMemo(() => {
    // operatorName wins; fallback to logged-in profile name
    return (operatorName || myName || "").toString().trim();
  }, [operatorName, myName]);

  // Recompute "your rank" + badges whenever leaderboard or identity changes
  useEffect(() => {
    if (!lbRows.length || !leaderboardIdentityName) return;

    let rank: number | null = null;
    let pts: number | null = null;
    let cPts: number | null = null;
    let tPts: number | null = null;

    lbRows.forEach((row, idx) => {
      const rowName = (row.display_name ?? "").toString().trim().toLowerCase();
      const mine = leaderboardIdentityName.toLowerCase();
      if (rowName && mine && rowName === mine) {
        rank = idx + 1;
        pts = Number(row.points ?? 0);
        cPts = Number(row.cleaning_count ?? 0);
        tPts = Number(row.temp_logs_count ?? 0);
      }
    });

    setMyRank(rank);
    setMyPoints(pts);
    setMyCleaningPoints(cPts);
    setMyTempPoints(tPts);

    const badges: string[] = [];
    const p = pts ?? 0;
    const c = cPts ?? 0;
    const t = tPts ?? 0;

    if (p >= 50) badges.push("Kitchen Hero");
    else if (p >= 25) badges.push("Rising Star");
    else if (p >= 10) badges.push("On the Board");

    if (c >= 20) badges.push("Cleaning Champ");
    else if (c >= 10) badges.push("Sparkle Crew");

    if (t >= 20) badges.push("Temp Pro");
    else if (t >= 10) badges.push("Probe Regular");

    if (rank && rank <= 3) badges.push("On a Hot Streak");

    setMyBadges(badges);
  }, [lbRows, leaderboardIdentityName]);

  async function loadPosts(orgId: string, locationId: string | null) {
    let q = supabase
      .from("kitchen_wall")
      .select("*")
      .eq("org_id", orgId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (locationId) q = q.eq("location_id", locationId);

    const { data, error } = await q;

    if (error) {
      console.warn("[kitchen_wall] loadPosts failed:", error.message);
      setPosts([]);
      return;
    }

    setPosts((data as Post[]) || []);
  }

  async function loadLeaderboard(orgId: string) {
    try {
      const { data } = await supabase
        .from("leaderboard")
        .select("display_name, points, cleaning_count, temp_logs_count")
        .eq("org_id", orgId)
        .order("points", { ascending: false });

      const safe: LeaderboardRow[] =
        (data ?? []).map((row: any) => ({
          display_name: row.display_name ?? null,
          points: row.points ?? 0,
          cleaning_count: row.cleaning_count ?? 0,
          temp_logs_count: row.temp_logs_count ?? 0,
        })) ?? [];

      setLbRows(safe);
    } catch {
      setLbRows([]);
    }
  }

  async function sendPost() {
    if (!requireOperator("wall_send_post")) return;
    if (!message.trim() || !operatorInitials.trim() || !orgId) return;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const normInitials = operatorInitials.toUpperCase().slice(0, 4);

    const { error } = await supabase.from("kitchen_wall").insert({
      org_id: orgId,
      location_id: locationId, // location-scoped wall
      author_initials: normInitials,
      message: message.trim(),
      color,
      is_pinned: false,
      reactions: {},
    });

    if (error) {
      console.warn("[kitchen_wall] insert failed:", error.message);
      return;
    }

    posthog.capture("wall_post_created", {
      initials: normInitials,
      length: message.trim().length,
      org_id: orgId,
      location_id: locationId ?? null,
    });

    setMessage("");
    await loadPosts(orgId, locationId);
  }

  async function toggleReaction(postId: string, emoji: string) {
    if (!requireOperator("wall_toggle_reaction")) return;
    if (!operatorInitials) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const users = post.reactions[emoji] || [];
    const hasReacted = users.includes(operatorInitials);
    const newUsers = hasReacted
      ? users.filter((u) => u !== operatorInitials)
      : [...users, operatorInitials];

    const newReactions: Record<string, string[]> = {
      ...post.reactions,
      [emoji]: newUsers.length > 0 ? newUsers : (undefined as any),
    };

    Object.keys(newReactions).forEach((k) => {
      if (!newReactions[k] || newReactions[k].length === 0) delete newReactions[k];
    });

    const { error } = await supabase
      .from("kitchen_wall")
      .update({ reactions: newReactions })
      .eq("id", postId);

    if (error) {
      console.warn("[kitchen_wall] reaction update failed:", error.message);
      return;
    }

    posthog.capture("wall_reaction_toggled", {
      post_id: postId,
      emoji,
      added: !hasReacted,
      org_id: orgId ?? null,
      location_id: locationId ?? null,
      operator_initials: operatorInitials,
    });

    if (orgId) await loadPosts(orgId, locationId);
  }

  async function deletePost(id: string) {
    if (!orgId) return;
    // Managers can delete even when locked (your call). If you want it blocked too, add requireOperator here.
    if (!window.confirm("Remove this note from the wall?")) return;

    try {
      const { error } = await supabase
        .from("kitchen_wall")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e?.message ?? "Failed to remove note.");
    }
  }

  if (!orgId) return null;

  const topThree = lbRows.slice(0, 3);

  return (
    <div className="space-y-10">
      {topThree.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧱</span>
                <h2 className="text-lg font-semibold text-amber-900">
                  Kitchen Wall – Team Standings
                </h2>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                Points reset monthly – current period:{" "}
                <span className="font-semibold">{currentMonthLabel}</span>
              </p>
              {locationId && (
                <p className="mt-0.5 text-[11px] text-amber-800/80">
                  Wall is location-specific (selected location).
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-col items-start gap-1 text-xs text-amber-900 sm:items-end">
              {myRank ? (
                <div className="text-sm font-semibold">
                  Your rank: #{myRank}
                  {myPoints != null && (
                    <span className="ml-1 text-[11px] text-amber-800/80">
                      ({myPoints} pts)
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-amber-800">
                  Your rank: <span className="font-semibold">No points yet</span>
                </div>
              )}

              {myBadges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {myBadges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Workstation state indicator */}
              <div className="mt-1 text-[11px] text-amber-800/80">
                {locked || !operatorInitials ? (
                  <span className="font-semibold">Workstation locked</span>
                ) : (
                  <>
                    Operator:{" "}
                    <span className="font-semibold">{operatorInitials}</span>
                    {operatorName ? (
                      <span className="ml-1 opacity-80">({operatorName})</span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {topThree.map((row, idx) => (
              <div
                key={(row.display_name ?? "unknown") + idx}
                className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2 shadow-sm border border-amber-100"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white relative">
                  {idx === 0 && (
                    <span className="absolute -top-4 text-2xl animate-bounce">👑</span>
                  )}
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-amber-950">
                    {row.display_name ?? "Unknown"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-amber-800">
                    <span>{row.points ?? 0} pts</span>
                    <span>🧽 {row.cleaning_count ?? 0}</span>
                    <span>🌡️ {row.temp_logs_count ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border">
        {(locked || !operatorInitials) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Workstation locked. Enter PIN to post or react.
            <button
              type="button"
              onClick={() => openWorkstationLock()}
              className="ml-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              <Pin className="h-4 w-4" />
              Enter PIN
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            placeholder="Initials"
            value={initials}
            readOnly
            onClick={() => {
              if (locked || !operatorInitials) openWorkstationLock();
            }}
            className="w-full sm:w-32 rounded-lg border-2 border-orange-400 px-4 py-3 text-center font-bold uppercase text-lg focus:outline-none focus:ring-4 focus:ring-orange-200 bg-slate-50"
            maxLength={4}
          />
          <input
            placeholder="Say something to the kitchen…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => {
              if (locked || !operatorInitials) openWorkstationLock();
            }}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), sendPost())
            }
            disabled={locked || !operatorInitials}
            className="flex-1 rounded-lg border-2 border-orange-400 px-5 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:opacity-60"
          />
          <button
            onClick={sendPost}
            disabled={!message.trim() || !operatorInitials.trim() || locked}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <div className="col-span-full text-center py-32">
            <div className="text-9xl mb-8">🧡</div>
            <h2 className="text-4xl font-black text-orange-600">Wall is empty</h2>
            <p className="text-2xl text-gray-600">Be the first to post 🔥</p>
          </div>
        ) : (
          posts.map((post, i) => (
            <div
              key={post.id}
              className={`relative rounded-3xl p-10 shadow-2xl ${post.color} transform transition-all hover:scale-105`}
              style={{
                transform: `rotate(${Math.sin(i * 0.8) * 5}deg)`,
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
              }}
            >
              {post.is_pinned && (
                <Pin className="absolute -top-6 -right-6 h-14 w-14 text-red-600 fill-red-600 drop-shadow-2xl" />
              )}

              {isManager && (
                <button
                  type="button"
                  onClick={() => deletePost(post.id)}
                  className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 shadow-sm"
                  aria-label="Remove note"
                >
                  ×
                </button>
              )}

              <div className="text-5xl font-black mb-6 opacity-90">
                {post.author_initials}
              </div>
              <p className="text-2xl leading-relaxed whitespace-pre-wrap mb-8">
                {post.message}
              </p>

              <div className="flex flex-wrap gap-2 justify-end">
                {EMOJIS.map((emoji) => {
                  const users = post.reactions[emoji] || [];
                  const hasReacted = operatorInitials
                    ? users.includes(operatorInitials)
                    : false;

                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(post.id, emoji)}
                      disabled={locked || !operatorInitials}
                      className={`text-xs px-2 py-1 rounded-full transition-all disabled:opacity-60 ${
                        hasReacted
                          ? "bg-white/90 shadow-md ring-2 ring-orange-500 font-bold"
                          : "bg-white/70 hover:bg-white/90"
                      } hover:scale-125 active:scale-95`}
                    >
                      {emoji} {users.length > 0 && users.length}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}