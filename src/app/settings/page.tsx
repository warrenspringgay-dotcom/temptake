export const dynamic = "force-dynamic"; // avoids static prerender if settings rely on client state

import SettingsClient from "./SettingsClient";

export default function SettingsPage() {
  return <SettingsClient />;
}
