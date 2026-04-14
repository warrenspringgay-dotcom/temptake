import Link from "next/link";
import {
  createStaffAbsenceServer,
  deleteStaffAbsenceServer,
  listStaffAbsenceReferenceDataServer,
  listStaffAbsencesServer,
  setStaffAbsenceStatusServer,
} from "@/app/actions/staffAbsences";

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  holiday: "Holiday",
  sickness: "Sickness",
  unpaid_leave: "Unpaid leave",
  compassionate: "Compassionate",
  medical: "Medical",
  unauthorised: "Unauthorised",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "cancelled";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

function normalizeLocationForCreate(value: unknown): string | null {
  const v = String(value ?? "").trim();

  if (!v) return null;

  const lowered = v.toLowerCase();
  if (
    lowered === "all" ||
    lowered === "__orgwide__" ||
    lowered === "null" ||
    lowered === "undefined"
  ) {
    return null;
  }

  return v;
}

function normalizeLocationFilterValue(value: unknown): string | undefined {
  const v = String(value ?? "").trim();

  if (!v) return undefined;

  const lowered = v.toLowerCase();
  if (lowered === "all" || lowered === "null" || lowered === "undefined") {
    return undefined;
  }

  return v;
}

function normalizeStatus(value: unknown): StatusFilter {
  const v = String(value ?? "").trim();
  if (
    v === "pending" ||
    v === "approved" ||
    v === "rejected" ||
    v === "cancelled" ||
    v === "all"
  ) {
    return v;
  }
  return "all";
}

export default async function TeamAbsencesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    teamMemberId?: string;
    locationId?: string;
    status?: "all" | "pending" | "approved" | "rejected" | "cancelled";
  }>;
}) {
  const params = (await searchParams) ?? {};

  const today = new Date();
  const startDefault = new Date(today);
  startDefault.setDate(1);

  const endDefault = new Date(today);
  endDefault.setMonth(endDefault.getMonth() + 1, 0);

  const preselectedTeamMemberId = String(params.teamMemberId ?? "").trim();
  const from = String(params.from ?? "").trim() || toDateInputValue(startDefault);
  const to = String(params.to ?? "").trim() || toDateInputValue(endDefault);

  const rawLocationId = String(params.locationId ?? "").trim();
  const locationId = rawLocationId;
  const normalizedLocationFilter = normalizeLocationFilterValue(rawLocationId);

  const status = normalizeStatus(params.status);

  const [{ teamMembers, locations, activeLocationId }, absences] = await Promise.all([
    listStaffAbsenceReferenceDataServer(),
    listStaffAbsencesServer({
      from,
      to,
      teamMemberId: preselectedTeamMemberId || undefined,
      locationId: normalizedLocationFilter,
      status,
    }),
  ]);

  const todayStr = toDateInputValue(today);

  const defaultLocationForNewAbsence = (() => {
    const explicit = normalizeLocationForCreate(locationId);
    if (explicit) return explicit;

    const active = normalizeLocationForCreate(activeLocationId);
    if (active) return active;

    return "";
  })();

  const offToday = absences.filter(
    (row: any) =>
      row.start_date <= todayStr &&
      row.end_date >= todayStr &&
      row.status === "approved"
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2">
            <Link
              href="/team"
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ← Back to Team
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Staff absences
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Log holiday, sickness and other leave in one place.
          </p>
        </div>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Log absence</h2>

          <form
            action={async (formData) => {
              "use server";

              await createStaffAbsenceServer({
                teamMemberId: String(formData.get("teamMemberId") || ""),
                locationId: normalizeLocationForCreate(formData.get("locationId")),
                absenceType: String(formData.get("absenceType") || "other") as
                  | "holiday"
                  | "sickness"
                  | "unpaid_leave"
                  | "compassionate"
                  | "medical"
                  | "unauthorised"
                  | "other",
                startDate: String(formData.get("startDate") || ""),
                endDate: String(formData.get("endDate") || ""),
                isHalfDay: formData.get("isHalfDay") === "on",
                halfDayPeriod:
                  (String(formData.get("halfDayPeriod") || "") as "am" | "pm") || null,
                notes: String(formData.get("notes") || ""),
                operationalImpact: String(formData.get("operationalImpact") || ""),
                status: String(formData.get("status") || "approved") as
                  | "pending"
                  | "approved"
                  | "rejected"
                  | "cancelled",
              });
            }}
            className="mt-4 grid gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Team member</span>
                <select
                  name="teamMemberId"
                  required
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                  defaultValue={preselectedTeamMemberId}
                >
                  <option value="" disabled>
                    Select team member
                  </option>
                  {teamMembers.map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.initials ? ` (${member.initials})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Location</span>
                <select
                  name="locationId"
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                  defaultValue={defaultLocationForNewAbsence}
                >
                  <option value="">All / org-wide</option>
                  {locations.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Absence type</span>
                <select
                  name="absenceType"
                  required
                  defaultValue="holiday"
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                >
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  name="status"
                  defaultValue="approved"
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">Start date</span>
                <input
                  type="date"
                  name="startDate"
                  required
                  defaultValue={todayStr}
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">End date</span>
                <input
                  type="date"
                  name="endDate"
                  required
                  defaultValue={todayStr}
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-[auto_160px] sm:items-end">
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-3">
                <input type="checkbox" name="isHalfDay" className="h-4 w-4" />
                <span className="text-sm font-medium text-gray-700">Half day</span>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-gray-700">AM / PM</span>
                <select
                  name="halfDayPeriod"
                  defaultValue=""
                  className="h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-gray-900"
                >
                  <option value="">Not set</option>
                  <option value="am">AM</option>
                  <option value="pm">PM</option>
                </select>
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-gray-700">Notes</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Optional internal notes"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-gray-700">Operational impact</span>
              <textarea
                name="operationalImpact"
                rows={3}
                placeholder="Optional note if this affected staffing or service"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white hover:bg-black"
              >
                Save absence
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Off today</h2>

          <div className="mt-4 space-y-3">
            {offToday.length === 0 ? (
              <p className="text-sm text-gray-500">Nobody currently marked off today.</p>
            ) : (
              offToday.map((row: any) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {row.team_members?.name || "Unknown team member"}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {ABSENCE_TYPE_LABELS[row.absence_type] || row.absence_type}
                    {row.is_half_day && row.half_day_period
                      ? ` · Half day (${String(row.half_day_period).toUpperCase()})`
                      : ""}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {row.locations?.name || "All / org-wide"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Absence log</h2>
            <p className="mt-1 text-sm text-gray-600">
              Filter by date range, team member, location or status.
            </p>
          </div>

          <form className="grid gap-3 sm:grid-cols-5">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-600">From</span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-600">To</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-600">Team member</span>
              <select
                name="teamMemberId"
                defaultValue={preselectedTeamMemberId}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm"
              >
                <option value="">All</option>
                {teamMembers.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.initials ? ` (${member.initials})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-600">Location</span>
              <select
                name="locationId"
                defaultValue={locationId}
                className="h-10 rounded-xl border border-gray-300 px-3 text-sm"
              >
                <option value="">All</option>
                <option value="__orgwide__">Org-wide only</option>
                {locations.map((location: any) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-600">Status</span>
              <div className="flex gap-2">
                <select
                  name="status"
                  defaultValue={status}
                  className="h-10 flex-1 rounded-xl border border-gray-300 px-3 text-sm"
                >
                  <option value="all">All</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Filter
                </button>
              </div>
            </label>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Team member
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Type
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Dates
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Days
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Location
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Status
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold text-gray-700">
                  Notes
                </th>
                <th className="border-b border-gray-200 px-3 py-3 text-right font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {absences.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-gray-500"
                  >
                    No absences found for this filter.
                  </td>
                </tr>
              ) : (
                absences.map((row: any) => (
                  <tr key={row.id}>
                    <td className="border-b border-gray-100 px-3 py-3 align-top">
                      <div className="font-medium text-gray-900">
                        {row.team_members?.name || "Unknown team member"}
                      </div>
                      {row.team_members?.initials ? (
                        <div className="mt-1 text-xs text-gray-500">
                          {row.team_members.initials}
                        </div>
                      ) : null}
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top text-gray-700">
                      {ABSENCE_TYPE_LABELS[row.absence_type] || row.absence_type}
                      {row.is_half_day && row.half_day_period ? (
                        <div className="mt-1 text-xs text-gray-500">
                          Half day ({String(row.half_day_period).toUpperCase()})
                        </div>
                      ) : null}
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top text-gray-700">
                      <div>{formatDate(row.start_date)}</div>
                      <div className="text-xs text-gray-500">
                        to {formatDate(row.end_date)}
                      </div>
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top text-gray-700">
                      {row.is_half_day ? "0.5" : daysInclusive(row.start_date, row.end_date)}
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top text-gray-700">
                      {row.locations?.name || "All / org-wide"}
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top text-gray-700">
                      <div className="max-w-xs whitespace-pre-wrap">
                        {row.notes || row.operational_impact || "—"}
                      </div>
                    </td>

                    <td className="border-b border-gray-100 px-3 py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.status !== "approved" ? (
                          <form
                            action={async () => {
                              "use server";
                              await setStaffAbsenceStatusServer(row.id, "approved");
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Approve
                            </button>
                          </form>
                        ) : null}

                        {row.status !== "rejected" ? (
                          <form
                            action={async () => {
                              "use server";
                              await setStaffAbsenceStatusServer(row.id, "rejected");
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Reject
                            </button>
                          </form>
                        ) : null}

                        {row.status !== "cancelled" ? (
                          <form
                            action={async () => {
                              "use server";
                              await setStaffAbsenceStatusServer(row.id, "cancelled");
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : null}

                        <form
                          action={async () => {
                            "use server";
                            await deleteStaffAbsenceServer(row.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}