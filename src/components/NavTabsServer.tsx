// src/components/NavTabsServer.tsx
// Server wrapper for the client NavTabs. We don't need to call Supabase here
// because NavTabs already reads auth on the client.
import NavTabs from "./NavTabs";

export default async function NavTabsServer() {
  return <NavTabs />;
}
