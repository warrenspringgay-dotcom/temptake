import { getUserRole } from "@/lib/get-user-role";

export default async function AuthDebug() {
  const role = await getUserRole();
  // ...render `{ role }` along with your session/user display
}
