// src/app/page.tsx  ← SERVER COMPONENT (metadata allowed)
import ClientLanding from "./client-landing";

export const metadata = {
  title: "TempTake • Food Safety That Doesn’t Suck",
  description: "Log temps in 3 seconds. The HACCP app your chefs will actually love.",
};

export default function LandingPage() {
  return <ClientLanding />;
}