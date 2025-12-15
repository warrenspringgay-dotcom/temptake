import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";

export const metadata: Metadata = {
  title: "Food hygiene training expiry (UK): who needs what level and when",
  description:
    "Understand UK food hygiene training levels, expiry expectations, and how to track staff training for inspections.",
  alternates: { canonical: "/guides/food-hygiene-training-expiry-uk" },
};

export default function TrainingExpiryGuide() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <GuidesAnalytics slug="food-hygiene-training-expiry-uk" />
<BackToGuides />
      <h1 className="text-3xl font-extrabold">
        Food hygiene training expiry (UK): who needs what level and when
      </h1>

      <div className="prose prose-slate mt-6 max-w-none">
        <p>
          UK law does not give training certificates a fixed expiry date. EHOs,
          however, absolutely expect training to be <em>current</em>.
        </p>

        <h2>Common training levels</h2>
        <ul>
          <li>Level 1: basic food handling</li>
          <li>Level 2: food handlers</li>
          <li>Level 3: supervisors and managers</li>
        </ul>

        <h2>So when does training expire?</h2>
        <p>
          Most inspectors expect refresher training every 3 years, or sooner if:
        </p>
        <ul>
          <li>The role changes</li>
          <li>There’s a food safety incident</li>
          <li>Standards slip</li>
        </ul>

        <h2>What inspectors look for</h2>
        <ul>
          <li>Who has training</li>
          <li>What level it is</li>
          <li>When it was completed</li>
          <li>Whether refreshers are planned</li>
        </ul>

        <h2>Tracking without chaos</h2>
        <p>
          Writing expiry dates on paper rotas usually fails quietly. Digital
          tracking flags upcoming renewals before they become problems.
        </p>

        <p>
          <Link href="/team" className="underline font-semibold">
            Track staff training →
          </Link>
         
        </p>
      </div>
    </article>
  );
}
