"use client";
import React from "react";
import NavTabs from "@/components/NavTabs";
import { useSettings } from "@/lib/settings";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>{children}</div>;
}
function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export default function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const lang = settings.language === "auto"
    ? (typeof navigator !== "undefined" ? navigator.language : "en-GB")
    : settings.language;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavTabs />
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <Card>
          <CardHeader><h1 className="text-sm font-medium">Settings</h1></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Temperature */}
              <div>
                <div className="text-sm font-medium mb-2">Temperature unit</div>
                <div className="flex gap-2">
                  {(["C", "F"] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setSettings({ tempUnit: u })}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        settings.tempUnit === u ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-gray-300"
                      }`}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-2">Data is stored in °C internally. Your choice affects inputs and display.</p>
              </div>

              {/* Theme */}
              <div>
                <div className="text-sm font-medium mb-2">Theme</div>
                <div className="flex gap-2">
                  {(["system", "light", "dark"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setSettings({ theme: m })}
                      className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                        settings.theme === m ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-gray-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-2">Uses Tailwind dark mode via class on &lt;html&gt;.</p>
              </div>

              {/* Language */}
              <div>
                <div className="text-sm font-medium mb-2">Language</div>
                <select
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={lang}
                  onChange={(e) => setSettings({ language: e.target.value })}
                >
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                  <option value="fr-FR">Français</option>
                </select>
                <p className="text-xs text-slate-600 mt-2">Auto-detected on first run. You can override it here.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
