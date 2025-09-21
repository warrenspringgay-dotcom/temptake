// src/components/FoodTempLoggerServer.tsx
import FoodTempLogger from "@/components/FoodTempLogger"; // the CLIENT component
import { listTempLogs, listStaffInitials, upsertTempLog, deleteTempLog } from "@/app/actions/db";

export default async function FoodTempLoggerServer() {
  const [initialRows, initials] = await Promise.all([
    listTempLogs(200),
    listStaffInitials(),
  ]);

  return (
    <FoodTempLogger
      initialRows={initialRows}
      initials={initials}
      onUpsert={upsertTempLog}
      onDelete={deleteTempLog}
    />
  );
}
