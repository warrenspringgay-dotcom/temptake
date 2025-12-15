import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";
export const metadata: Metadata = {
  title: "Safer Food Better Business logs: what you must keep vs what’s optional",
  description:
    "A UK guide to Safer Food Better Business records: which logs inspectors expect and how to avoid unnecessary paperwork.",
  alternates: { canonical: "/guides/safer-food-better-business-logs" },
};

export default function SFBBLogsGuide() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <GuidesAnalytics slug="sfbb-logs" />
<BackToGuides />
      <h1 className="text-3xl font-extrabold">
        Safer Food Better Business logs: what you must keep vs what’s optional
      </h1>

      <div className="prose prose-slate mt-6 max-w-none">
        <p>
          Safer Food Better Business (SFBB) is flexible by design. Many kitchens
          over-record because they don’t know what actually matters.
        </p>

        <h2>Logs inspectors usually expect</h2>
        <ul>
          <li>Daily temperature checks</li>
          <li>Cleaning records</li>
          <li>Allergen controls</li>
          <li>Staff training evidence</li>
        </ul>

        <h2>What’s often optional</h2>
        <ul>
          <li>Duplicate paperwork</li>
          <li>Overly detailed tick sheets</li>
          <li>Manual repetition of digital records</li>
        </ul>

        <h2>The golden rule</h2>
        <p>
          If a record helps you stay in control, keep it. If it exists purely
          out of fear, inspectors usually see through that.
        </p>

        <p>
          <Link href="/dashboard" className="underline font-semibold">
            See compliance at a glance →
          </Link>
        </p>
      </div>
    </article>
  );
}
