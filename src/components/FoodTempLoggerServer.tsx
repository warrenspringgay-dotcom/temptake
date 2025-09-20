// src/components/FoodTempLoggerServer.tsx
// Server Component: binds server actions and provides initial data
import FoodTempLogger from "@/components/FoodTempLogger"; // your existing client component
import { listTempLogs, listStaffInitials, upsertTempLog, deleteTempLog } from "@/app/actions/db";

export default async function FoodTempLoggerServer() {
  // prime UI so it’s never empty on first render
  const [initialRows, initials] = await Promise.all([
    listTempLogs(200),
    listStaffInitials(),
  ]);

  // Pass bound actions via props – these are stable “server action functions”
  return (
    <FoodTempLogger
      initialRows={initialRows}
      initials={initials}
      onUpsert={upsertTempLog}
      onDelete={deleteTempLog}
    />
  );
}
