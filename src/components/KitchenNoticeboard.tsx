// src/components/KitchenWall.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { Pin, Send } from "lucide-react";

type Post = {
  id: string;
  author_initials: string;
  message: string;
  color: string;
  is_pinned: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("");
  const [initials, setInitials] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [myInitials, setMyInitials] = useState("");
  const [myName, setMyName] = useState<string>("");

  // Manager / owner / admin flag
  const [isManager, setIsManager] = useState(false);

  // Leaderboard-related
  const [lbRows, setLbRows] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [myCleaningPoints, setMyCleaningPoints] = useState<number | null>(null);
  const [myTempPoints, setMyTempPoints] = useState<number | null>(null);
  const [myBadges, setMyBadges] = useState<string[]>([]);

  // Current month label for "monthly reset"
  const currentMonthLabel = new Date().toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    (async () => {
      const id = await getActiveOrgIdClient();
      setOrgId(id);

      // Load latest posts + leaderboard
      if (id) {
        await loadPosts(id);
        await loadLeaderboard(id);
      }

      // Try to derive initials + name from the logged-in team member
      let detectedInitials = "";
      let detectedName = "";
      let managerFlag = false;

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (!authError && authData?.user) {
          const email = authData.user.email ?? "";
          if (id && email) {
            const { data: tm } = await supabase
              .from("team_members")
              .select("initials,name,email,role")
              .eq("org_id", id)
              .eq("email", email)
              .limit(1);

            const row = tm?.[0];
            if (row) {
              detectedName = (row.name ?? "").toString().trim();

              const base =
                row.initials?.toString().trim() ||
                detectedName
                  .split(/\s+/)
                  .map((p: string) => p[0] ?? "")
                  .join("") ||
                email[0] ||
                "";

              detectedInitials = base.toUpperCase().slice(0, 4);

              const role = (row.role ?? "").toLowerCase();
              managerFlag =
                role === "owner" || role === "manager" || role === "admin";
            }
          }
        }
      } catch {
        // ignore – we'll fall back to localStorage
      }

      setIsManager(managerFlag);

      // Fallback: previous initials stored locally
      const saved =
        (typeof window !== "undefined" &&
          localStorage.getItem("kitchen_wall_initials")) ||
        "";

      const finalInitials =
        detectedInitials || (saved ? saved.toUpperCase().slice(0, 4) : "");

      setInitials(finalInitials);
      setMyInitials(finalInitials);
      setMyName(detectedName);
    })();
  }, []);

  // Recompute "your rank" + badges whenever leaderboard or myName changes
  useEffect(() => {
    if (!lbRows.length || !myName) return;

    let rank: number | null = null;
    let pts: number | null = null;
    let cPts: number | null = null;
    let tPts: number | null = null;

    lbRows.forEach((row, idx) => {
      const rowName = (row.display_name ?? "").toString().trim().toLowerCase();
      const mine = myName.toString().trim().toLowerCase();
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

    if (pts != null || cPts != null || tPts != null) {
      const badges: string[] = [];

      const p = pts ?? 0;
      const c = cPts ?? 0;
      const t = tPts ?? 0;

      // Simple badge logic
      if (p >= 50) badges.push("Kitchen Hero");
      else if (p >= 25) badges.push("Rising Star");
      else if (p >= 10) badges.push("On the Board");

      if (c >= 20) badges.push("Cleaning Champ");
      else if (c >= 10) badges.push("Sparkle Crew");

      if (t >= 20) badges.push("Temp Pro");
      else if (t >= 10) badges.push("Probe Regular");

      // Streak-ish badge: top 3 in leaderboard
      if (rank && rank <= 3) badges.push("On a Hot Streak");

      setMyBadges(badges);
    } else {
      setMyBadges([]);
    }
  }, [lbRows, myName]);

  async function loadPosts(orgId: string) {
    const { data } = await supabase
      .from("kitchen_wall")
      .select("*")
      .eq("org_id", orgId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

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
    if (!message.trim() || !initials.trim() || !orgId) return;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const normInitials = initials.toUpperCase().slice(0, 4);

    await supabase.from("kitchen_wall").insert({
      org_id: orgId,
      author_initials: normInitials,
      message: message.trim(),
      color,
      is_pinned: false,
      reactions: {},
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("kitchen_wall_initials", normInitials);
    }

    setMessage("");
    setMyInitials(normInitials);
    await loadPosts(orgId);
  }

  async function toggleReaction(postId: string, emoji: string) {
    if (!myInitials) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const users = post.reactions[emoji] || [];
    const hasReacted = users.includes(myInitials);
    const newUsers = hasReacted
      ? users.filter((u) => u !== myInitials)
      : [...users, myInitials];

    const newReactions: Record<string, string[]> = {
      ...post.reactions,
      [emoji]: newUsers.length > 0 ? newUsers : (undefined as any),
    };

    // Clean up empty keys
    Object.keys(newReactions).forEach((k) => {
      if (!newReactions[k] || newReactions[k].length === 0) {
        delete newReactions[k];
      }
    });

    await supabase
      .from("kitchen_wall")
      .update({ reactions: newReactions })
      .eq("id", postId);

    if (orgId) await loadPosts(orgId);
  }

  // Manager-only: delete a note from the wall
  async function deletePost(id: string) {
    if (!orgId) return;
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
      {/* Top stats / leaderboard summary for this month */}
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
            </div>

            {/* Your rank + badges */}
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
                  Your rank:{" "}
                  <span className="font-semibold">No points yet</span>
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
            </div>
          </div>

          {/* Top 3 row */}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {topThree.map((row, idx) => (
              <div
                key={(row.display_name ?? "unknown") + idx}
                className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2 shadow-sm border border-amber-100"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white relative">
                  {idx === 0 && (
                    <span className="absolute -top-4 text-2xl animate-bounce">
                      👑
                    </span>
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

      {/* Clean Composer */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            placeholder="Your initials"
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            className="w-full sm:w-32 rounded-lg border-2 border-orange-400 px-4 py-3 text-center font-bold uppercase text-lg focus:outline-none focus:ring-4 focus:ring-orange-200"
            maxLength={4}
          />
          <input
            placeholder="Say something to the kitchen…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), sendPost())
            }
            className="flex-1 rounded-lg border-2 border-orange-400 px-5 py-3 text-lg focus:outline-none focus:ring-4 focus:ring-orange-200"
          />
          <button
            onClick={sendPost}
            disabled={!message.trim() || !initials.trim()}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Sticky notes wall */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <div className="col-span-full text-center py-32">
            <div className="text-9xl mb-8">🧡</div>
            <h2 className="text-4xl font-black text-orange-600">
              Wall is empty
            </h2>
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

              {/* Manager-only remove button */}
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
                  const hasReacted = users.includes(myInitials);
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(post.id, emoji)}
                      className={`text-xs px-2 py-1 rounded-full transition-all ${
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
