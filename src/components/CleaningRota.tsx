"use client";
import React from "react";

function daysInMonth(y:number,m:number){ return new Date(y, m+1, 0).getDate(); }
function cls(...p:(string|false|undefined)[]){ return p.filter(Boolean).join(" "); }

type Task = {
  id: string;
  name: string;
  area: string;
  freq: "daily" | "weekly";
  days: number[]; // 0=Sun..6=Sat when weekly
};

export default function CleaningRota(){
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth()); // 0-11
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [tName, setTName] = React.useState("");
  const [tArea, setTArea] = React.useState("");
  const [tFreq, setTFreq] = React.useState<"daily"|"weekly">("daily");
  const [tDays, setTDays] = React.useState<number[]>([1,2,3,4,5]); // Mon-Fri default

  const dim = daysInMonth(year, month);
  const dates = Array.from({length: dim}, (_,i)=>i+1);
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined,{month:"long", year:"numeric"});

  function addTask(){
    if (!tName.trim()) return;
    setTasks(prev=>[
      ...prev,
      { id: crypto.randomUUID(), name: tName.trim(), area: tArea.trim(), freq: tFreq, days: [...tDays] }
    ]);
    setTName(""); setTArea("");
  }

  function removeTask(id:string){ setTasks(prev=>prev.filter(t=>t.id!==id)); }

  function shouldShowCell(task: Task, day: number){
    if (task.freq === "daily") return true;
    const wd = new Date(year, month, day).getDay(); // 0-6
    return task.days.includes(wd);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Month</label>
          <select className="h-10 rounded-xl border px-3"
                  value={month}
                  onChange={(e)=>setMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,m)=>(
              <option key={m} value={m}>{new Date(2000,m,1).toLocaleString(undefined,{month:"long"})}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Year</label>
          <input type="number" className="h-10 rounded-xl border px-3 w-24"
                 value={year} onChange={(e)=>setYear(Number(e.target.value))}/>
        </div>
        <button onClick={()=>window.print()}
                className="ml-auto rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
          Print
        </button>
      </div>

      {/* Add task */}
      <div className="rounded-xl border p-3">
        <div className="mb-2 font-medium">Add task</div>
        <div className="grid gap-3 sm:grid-cols-5">
          <input className="rounded-xl border px-3 py-2 sm:col-span-2" placeholder="Task name"
                 value={tName} onChange={(e)=>setTName(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder="Area / notes"
                 value={tArea} onChange={(e)=>setTArea(e.target.value)} />
          <select className="rounded-xl border px-3 py-2" value={tFreq} onChange={(e)=>setTFreq(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (select days)</option>
          </select>
          <div className="flex items-center gap-2">
            {["S","M","T","W","T","F","S"].map((lbl,idx)=>(
              <label key={idx} className={cls("flex h-9 w-9 items-center justify-center rounded-md border",
                   tDays.includes(idx)&&"bg-black text-white")}>
                <input type="checkbox" className="hidden"
                       checked={tDays.includes(idx)}
                       onChange={(e)=>{
                         setTDays(prev=>{
                           if (e.target.checked) return [...new Set([...prev, idx])].sort();
                           return prev.filter(d=>d!==idx);
                         });
                       }}/>
                {lbl}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={addTask} className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:bg-gray-900">Add</button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border p-3">
        <div className="mb-2 text-lg font-semibold">{monthName} Cleaning Rota</div>
        <table className="min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3 w-56">Task</th>
              <th className="py-2 pr-3 w-40">Area</th>
              {dates.map(d=>(
                <th key={d} className="py-2 px-2 text-center w-8">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length===0 ? (
              <tr><td className="py-8 text-center text-gray-500" colSpan={2+dates.length}>No tasks yet.</td></tr>
            ) : tasks.map(t=>(
              <tr key={t.id} className="border-t">
                <td className="py-2 pr-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.name}</span>
                    <button className="rounded-md border px-2 text-xs hover:bg-gray-50"
                            onClick={()=>removeTask(t.id)}>Remove</button>
                  </div>
                </td>
                <td className="py-2 pr-3">{t.area || "—"}</td>
                {dates.map(d=>(
                  <td key={d} className="py-1 px-1">
                    <div className={cls(
                      "h-8 rounded-md border text-center align-middle print:h-6",
                      shouldShowCell(t,d) ? "bg-white" : "bg-gray-100"
                    )}/>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, header, .no-print { display:none !important; }
          .rounded-2xl, .rounded-xl { border-radius: 0; }
          .shadow-sm { box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
