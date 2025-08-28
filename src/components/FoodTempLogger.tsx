// src/components/FoodTempLogger.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import NavTabs from "./NavTabs";
import { supabase } from "@/lib/supabase";

type TempLog = {
  id?: string;
  created_at?: string;
  category: string;
  location: string;
  item: string;
  temperature: number;
  initials: string;
  pass: boolean;
};

const uid = () => Math.random().toString(36).slice(2);
const todayISO = () => new Date().toISOString().slice(0, 10);

const categories = ["Fridge", "Freezer", "Cook", "Hot Hold", "Other"];

export default function FoodTempLogger() {
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [form, setForm] = useState<Omit<TempLog, "id" | "created_at" | "pass">>({
    category: "Fridge",
    location: "",
    item: "",
    temperature: 0,
    initials: "",
  });

  // Load logs from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("temp_logs").select("*").order("created_at", { ascending: false });
      if (error) console.error(error);
      else setLogs(data as TempLog[]);
    }
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.initials || !form.item || !form.location) {
      alert("Fill in all required fields");
      return;
    }
    const pass = withinRange(form.temperature, form.category);
    const newLog: TempLog = { ...form, pass };

    const { data, error } = await supabase.from("temp_logs").insert(newLog).select().single();
    if (error) {
      console.error(error);
      alert("Error saving log");
      return;
    }
    setLogs((prev) => [data as TempLog, ...prev]);
    setForm({ category: "Fridge", location: "", item: "", temperature: 0, initials: "" });
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <NavTabs />
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <h1 className="text-xl font-semibold">Food Temperature Logger</h1>

        {/* Quick entry form */}
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Category</label>
              <select
                className="w-full rounded-md border px-2 py-1"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Location</label>
              <input
                className="w-full rounded-md border px-2 py-1"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm">Item</label>
              <input
                className="w-full rounded-md border px-2 py-1"
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-md border px-2 py-1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm">Initials</label>
              <input
                className="w-full rounded-md border px-2 py-1"
                value={form.initials}
                onChange={(e) => setForm({ ...form, initials: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="rounded-md bg-slate-900 text-white px-4 py-2">Save</button>
          </div>
        </form>

        {/* Logs table */}
        <div className="rounded-xl border bg-white p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Temp</th>
                <th className="py-2 pr-3">Initials</th>
                <th className="py-2 pr-3">Pass</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 pr-3">{r.created_at?.slice(0, 10)}</td>
                    <td className="py-2 pr-3">{r.category}</td>
                    <td className="py-2 pr-3">{r.location}</td>
                    <td className="py-2 pr-3">{r.item}</td>
                    <td className="py-2 pr-3">{r.temperature.toFixed(1)}°C</td>
                    <td className="py-2 pr-3">{r.initials}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${r.pass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                        {r.pass ? "Pass" : "Fail"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={7}>
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function withinRange(temp: number, category: string): boolean {
  if (category === "Fridge") return temp >= 0 && temp <= 5;
  if (category === "Freezer") return temp <= -18;
  if (category === "Cook") return temp >= 75;
  if (category === "Hot Hold") return temp >= 63;
  return true;
}