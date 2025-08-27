"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";
import { PencilIcon, TrashIcon } from "./Icons";

export type StaffRow = {
  id: string;
  fullName: string;
  initials: string;
  phone?: string;
  email?: string;
  level?: string;
  awardedOn?: string; // ISO
  expiresOn?: string; // ISO
};

export type TrainingRow = {
  id: string;
  staffId: string;
  type: string;       // e.g. Food Hygiene L2
  awardedOn?: string;
  expiresOn?: string;
  note?: string;
};

const LS_TEAM = "tt_team_v2";
const LS_TRAINING = "tt_training_v1";

function loadTeam(): StaffRow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_TEAM) || "[]") as StaffRow[]; }
  catch { return []; }
}
function saveTeam(list: StaffRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_TEAM, JSON.stringify(list));
}
function loadTraining(): TrainingRow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_TRAINING) || "[]") as TrainingRow[]; }
  catch { return []; }
}
function saveTraining(list: TrainingRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_TRAINING, JSON.stringify(list));
}
const initialsFrom = (name: string) =>
  name.split(" ").filter(Boolean).map(s => s[0]?.toUpperCase() ?? "").slice(0, 2).join("");

export default function TeamManagerLocal() {
  const [team, setTeam] = useState<StaffRow[]>(loadTeam);
  const [training, setTraining] = useState<TrainingRow[]>(loadTraining);
  useEffect(() => saveTeam(team), [team]);
  useEffect(() => saveTraining(training), [training]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return team;
    return team.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.level ?? "").toLowerCase().includes(q)
    );
  }, [team, query]);

  // member modal
  const [memberModal, setMemberModal] = useState<StaffRow | null>(null);
  function openAdd() {
    setMemberModal({
      id: uid(), fullName: "", initials: "", level: "", email: "", phone: "", awardedOn: "", expiresOn: "",
    });
  }
  function saveMember() {
    if (!memberModal) return;
    setTeam(tt => {
      const exists = tt.some(m => m.id === memberModal.id);
      return exists ? tt.map(m => m.id === memberModal.id ? memberModal : m) : [...tt, memberModal];
    });
    setMemberModal(null);
  }

  // training modal (attached to a staff id)
  const [forStaff, setForStaff] = useState<StaffRow | null>(null);
  const [trainDraft, setTrainDraft] = useState<TrainingRow | null>(null);

  function openAddTraining(s: StaffRow) {
    setForStaff(s);
    setTrainDraft({ id: uid(), staffId: s.id, type: "", awardedOn: "", expiresOn: "", note: "" });
  }
  function openEditTraining(row: TrainingRow) {
    setForStaff(team.find(t => t.id === row.staffId) ?? null);
    setTrainDraft({ ...row });
  }
  function saveTrainingDraft() {
    if (!trainDraft) return;
    setTraining(list => {
      const exists = list.some(t => t.id === trainDraft.id);
      return exists ? list.map(t => t.id === trainDraft.id ? trainDraft : t) : [...list, trainDraft];
    });
    setTrainDraft(null);
    setForStaff(null);
  }

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800" onClick={openAdd}>
          + Add staff
        </button>
        <div className="flex-1" />
        <input className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm" placeholder="Search team / email / level" value={query} onChange={(e) => setQuery(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Initials</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Awarded</th>
              <th className="px-3 py-2 font-medium">Expires</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No team members yet.</td></tr>
            )}
            {filtered.map((s) => {
              const expired = s.expiresOn && s.expiresOn < new Date().toISOString().slice(0, 10);
              const staffTrain = training.filter(t => t.staffId === s.id);
              return (
                <React.Fragment key={s.id}>
                  <tr className="border-t">
                    <td className="px-3 py-2">{s.fullName}</td>
                    <td className="px-3 py-2">{s.initials}</td>
                    <td className="px-3 py-2">{s.level ?? ""}</td>
                    <td className="px-3 py-2">{s.awardedOn ?? ""}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${expired ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {s.expiresOn ?? ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">{s.email ?? ""}</td>
                    <td className="px-3 py-2">{s.phone ?? ""}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50" title="Edit" onClick={() => setMemberModal(s)}>
                          <PencilIcon />
                        </button>
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50" title="Delete" onClick={() => setTeam(tt => tt.filter(x => x.id !== s.id))}>
                          <TrashIcon />
                        </button>
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50" onClick={() => openAddTraining(s)}>
                          + Training
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Training rows (inline under member) */}
                  {staffTrain.length > 0 && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={8} className="px-3 py-2">
                        <div className="text-xs font-medium mb-2">Training</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-[700px] w-full text-xs">
                            <thead>
                              <tr className="text-gray-600">
                                <th className="px-2 py-1 text-left">Type</th>
                                <th className="px-2 py-1 text-left">Awarded</th>
                                <th className="px-2 py-1 text-left">Expires</th>
                                <th className="px-2 py-1 text-left">Note</th>
                                <th className="px-2 py-1 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {staffTrain.map(t => {
                                const tExpired = t.expiresOn && t.expiresOn < new Date().toISOString().slice(0,10);
                                return (
                                  <tr key={t.id} className="border-t">
                                    <td className="px-2 py-1">{t.type}</td>
                                    <td className="px-2 py-1">{t.awardedOn ?? ""}</td>
                                    <td className="px-2 py-1">
                                      <span className={`rounded px-1.5 py-0.5 ${tExpired ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                                        {t.expiresOn ?? ""}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1">{t.note ?? ""}</td>
                                    <td className="px-2 py-1 text-right">
                                      <div className="inline-flex gap-2">
                                        <button className="rounded border px-1.5 py-0.5 hover:bg-white" title="Edit" onClick={() => openEditTraining(t)}>
                                          <PencilIcon />
                                        </button>
                                        <button className="rounded border px-1.5 py-0.5 hover:bg-white" title="Delete" onClick={() => setTraining(list => list.filter(x => x.id !== t.id))}>
                                          <TrashIcon />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Member Modal */}
      {memberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow">
            <div className="border-b px-4 py-3 font-semibold">Staff member</div>
            <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Full name</div>
                <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  value={memberModal.fullName}
                  onChange={(e) => setMemberModal(m => m ? { ...m, fullName: e.target.value, initials: initialsFrom(e.target.value) } : m)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Initials</div>
                <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  value={memberModal.initials}
                  onChange={(e) => setMemberModal(m => m ? { ...m, initials: e.target.value.toUpperCase() } : m)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Level</div>
                <input className="w-full rounded-md border border-gray-300 px-2 py-1.5" placeholder="Level 2 Hygiene"
                  value={memberModal.level ?? ""} onChange={(e) => setMemberModal(m => m ? { ...m, level: e.target.value } : m)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Email</div>
                <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  value={memberModal.email ?? ""} onChange={(e) => setMemberModal(m => m ? { ...m, email: e.target.value } : m)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Phone</div>
                <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  value={memberModal.phone ?? ""} onChange={(e) => setMemberModal(m => m ? { ...m, phone: e.target.value } : m)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Awarded</div>
                <input type="date" className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  value={memberModal.awardedOn ?? ""} onChange={(e) => setMemberModal(m => m ? { ...m, awardedOn: e.target.value } : m)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Expires</div>
                <input type="date" className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                  value={memberModal.expiresOn ?? ""} onChange={(e) => setMemberModal(m => m ? { ...m, expiresOn: e.target.value } : m)} />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setMemberModal(null)}>Cancel</button>
              <button className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800" onClick={saveMember}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Training Modal */}
      {trainDraft && forStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow">
            <div className="border-b px-4 py-3 font-semibold">Training – {forStaff.fullName}</div>
            <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Type</div>
                <input className="w-full rounded-md border border-gray-300 px-2 py-1.5" value={trainDraft.type} onChange={(e) => setTrainDraft(d => d ? { ...d, type: e.target.value } : d)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Awarded</div>
                <input type="date" className="w-full rounded-md border border-gray-300 px-2 py-1.5" value={trainDraft.awardedOn ?? ""} onChange={(e) => setTrainDraft(d => d ? { ...d, awardedOn: e.target.value } : d)} />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Expires</div>
                <input type="date" className="w-full rounded-md border border-gray-300 px-2 py-1.5" value={trainDraft.expiresOn ?? ""} onChange={(e) => setTrainDraft(d => d ? { ...d, expiresOn: e.target.value } : d)} />
              </label>
              <label className="sm:col-span-2 text-sm">
                <div className="mb-1 text-gray-600">Note</div>
                <textarea className="w-full rounded-md border border-gray-300 px-2 py-1.5" rows={3} value={trainDraft.note ?? ""} onChange={(e) => setTrainDraft(d => d ? { ...d, note: e.target.value } : d)} />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => { setTrainDraft(null); setForStaff(null); }}>Cancel</button>
              <button className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800" onClick={saveTrainingDraft}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
