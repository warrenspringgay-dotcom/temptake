import { getRole } from "@/app/actions/auth";

export default async function AuthDebug() {
  const role = await getRole();
  return (
    <pre className="p-4 text-sm">
      {JSON.stringify({ role }, null, 2)}
    </pre>
  );
}
