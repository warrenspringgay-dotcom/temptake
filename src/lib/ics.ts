export function downloadICS(events: Array<{ title: string; date: string }>, filename = "training-reminders.ics") {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TempTake//Team Training//EN",
  ];
  for (const ev of events) {
    const dt = ev.date.replace(/-/g, ""); // YYYYMMDD
    lines.push(
      "BEGIN:VEVENT",
      `UID:${cryptoRandom()}`,
      `DTSTAMP:${utcNow()}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${escapeICS(ev.title)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeICS(s: string) {
  return s.replace(/([,;])/g, "\\$1");
}
function utcNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
