// src/app/demo-wall/page.tsx
"use client";

import { useMemo, useState } from "react";
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

// Demo leaderboard data – static
const DEMO_LEADERBOARD: LeaderboardRow[] = [
  {
    display_name: "Jess (CDP)",
    points: 52,
    cleaning_count: 18,
    temp_logs_count: 24,
  },
  {
    display_name: "Sam (Sous Chef)",
    points: 41,
    cleaning_count: 14,
    temp_logs_count: 19,
  },
  {
    display_name: "Maya (FOH)",
    points: 33,
    cleaning_count: 9,
    temp_logs_count: 15,
  },
  {
    display_name: "Dan (KP)",
    points: 27,
    cleaning_count: 20,
    temp_logs_count: 7,
  },
];

// Demo wall posts – static starting point
const DEMO_POSTS: Post[] = [
  {
    id: "1",
    author_initials: "JB",
    message:
      "Kept every hot hold above 63°C all night. Zero drama on a fully booked Saturday 🔥",
    color: "bg-yellow-200",
    is_pinned: true,
    reactions: { "🔥": ["SC", "MK", "DW"], "🎉": ["LF"] },
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    author_initials: "SC",
    message:
      "Spotted walk-in creeping up early and saved a full GN of prep from being binned.",
    color: "bg-pink-200",
    is_pinned: false,
    reactions: { "👀": ["JB"], "👍": ["MK", "DW"] },
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    author_initials: "MK",
    message:
      "FOH allergen chat on point tonight – not a single ‘not sure’ when guests asked.",
    color: "bg-cyan-200",
    is_pinned: false,
    reactions: { "❤️": ["SC", "LF"], "🎉": ["JB"] },
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    author_initials: "DW",
    message:
      "Closed down pot wash spotless AND logged every clean as they went. KP wizard. ",
    color: "bg-lime-200",
    is_pinned: false,
    reactions: { "😂": ["NP"], "🔥": ["JB"] },
    created_at: new Date().toISOString(),
  },
];

export default function DemoKitchenWallPage() {
  const [posts, setPosts] = useState<Post[]>(DEMO_POSTS);
  const [message, setMessage] = useState("");
  const [initials, setInitials] = useState("JB");
  const [myInitials, setMyInitials] = useState("JB");

  // Treat Jess as "you" in this demo
  const myName = "Jess (CDP)";

  // This demo wall is open – no manager permissions / deletes
  const isManager = false;

  const currentMonthLabel = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    []
  );

  // Compute "your" rank + badges from demo leaderboard
  const lbRows = DEMO_LEADERBOARD;

  const {
    myRank,
    myPoints,
    myCleaningPoints,
    myTempPoints,
    myBadges,
  }: {
    myRank: number | null;
    myPoints: number | null;
    myCleaningPoints: number | null;
    myTempPoints: number | null;
    myBadges: string[];
  } = useMemo(() => {
    let rank: number | null = null;
    let pts: number | null = null;
    let cPts: number | null = null;
    let tPts: number | null = null;

    lbRows.forEach((row, idx) => {
      const rowName = (row.display_name ?? "").toLowerCase().trim();
      const mine = myName.toLowerCase().trim();
      if (rowName && mine && rowName === mine) {
        rank = idx + 1;
        pts = Number(row.points ?? 0);
        cPts = Number(row.cleaning_count ?? 0);
        tPts = Number(row.temp_logs_count ?? 0);
      }
    });

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

    return {
      myRank: rank,
      myPoints: pts,
      myCleaningPoints: cPts,
      myTempPoints: tPts,
      myBadges: badges,
    };
  }, [lbRows, myName]);

  const topThree = lbRows.slice(0, 3);

  function sendPost() {
    if (!message.trim() || !initials.trim()) return;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const normInitials = initials.toUpperCase().slice(0, 4);

    const newPost: Post = {
      id: String(Date.now()),
      author_initials: normInitials,
      message: message.trim(),
      color,
      is_pinned: false,
      reactions: {},
      created_at: new Date().toISOString(),
    };

    setPosts((prev) => [newPost, ...prev]);
    setMessage("");
    setMyInitials(normInitials);
  }

  function toggleReaction(postId: string, emoji: string) {
    if (!myInitials) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const currentUsers = post.reactions[emoji] || [];
        const hasReacted = currentUsers.includes(myInitials);
        const newUsers = hasReacted
          ? currentUsers.filter((u) => u !== myInitials)
          : [...currentUsers, myInitials];

        const newReactions: Record<string, string[]> = {
          ...post.reactions,
          [emoji]: newUsers,
        };

        // Clean up empties
        Object.keys(newReactions).forEach((k) => {
          if (!newReactions[k] || newReactions[k].length === 0) {
            delete newReactions[k];
          }
        });

        return {
          ...post,
          reactions: newReactions,
        };
      })
    );
  }

  // In this demo, delete just mutates local state if you ever switch isManager to true
  function deletePost(id: string) {
    if (!isManager) return;
    if (!window.confirm("Remove this note from the wall?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

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
                  Kitchen Wall – Team Standings (demo)
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

              {myCleaningPoints != null && myTempPoints != null && (
                <div className="flex flex-wrap gap-2 text-[11px] text-amber-800/90">
                  <span>🧽 {myCleaningPoints} cleans</span>
                  <span>🌡️ {myTempPoints} temps</span>
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

      {/* Composer */}
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

              {/* Manager-only remove button – off in demo */}
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
