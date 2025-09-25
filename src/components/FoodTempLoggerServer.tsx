// Server wrapper: fetches rows + team initials, renders client logger
import FoodTempLogger from "@/components/FoodTempLogger";
import { listTempLogs } from "@/app/actions/tempLogs"; // fetch-based (not server actions)
import { getTeamInitials } from "@/app/actions/team";

export default async function FoodTempLoggerServer() {
  const [initialRows, initials] = await Promise.all([
    listTempLogs(),
    getTeamInitials(),
  ]);

  return (
    <FoodTempLogger
      initialRows={initialRows}
      initials={initials}
    />
  );
}
