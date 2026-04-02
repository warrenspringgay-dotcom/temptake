import DemoManagerDashboard from "@/components/demo/DemoManagerDashboard";
import { getDemoDashboardData } from "@/lib/demoDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TempTake Demo Dashboard",
  description:
    "Public demo of TempTake's manager dashboard with realistic kitchen sample data.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedDate =
    typeof params.date === "string" ? params.date : undefined;

  const data = await getDemoDashboardData(requestedDate);

  return <DemoManagerDashboard data={data} />;
}