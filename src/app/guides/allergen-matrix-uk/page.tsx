import type { Metadata } from "next";
import Link from "next/link";
import GuidesAnalytics from "@/components/GuidesAnalytics";
import BackToGuides from "@/components/BackToGuides";





export const metadata: Metadata = {
  title: "Allergen matrix (UK): how often to review it and what inspectors expect",
  description:
    "A UK guide to allergen matrices: what must be included, how often reviews are required, and how to prove compliance during inspections.",
  alternates: { canonical: "/guides/allergen-matrix-uk" },
};

export default function AllergenMatrixGuide() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <GuidesAnalytics slug="allergen-matrix-uk" />

      <h1 className="text-3xl font-extrabold">
        Allergen matrix (UK): how often to review it and what inspectors expect
      </h1>

      <div className="prose prose-slate mt-6 max-w-none">
        <p>
          An allergen matrix is not optional paperwork. In the UK, it is how you
          prove you can safely answer allergy questions every single day, not
          just when the manager is in.
        </p>

        <h2>What is an allergen matrix?</h2>
        <p>
          An allergen matrix is a structured record showing which of the 14
          legally recognised allergens are present in each menu item.
        </p>

        <h2>How often must it be reviewed?</h2>
        <ul>
          <li>Whenever the menu changes</li>
          <li>When ingredients or suppliers change</li>
          <li>After an allergen-related incident</li>
          <li>At regular intervals, even if nothing has changed</li>
        </ul>

        <p>
          Inspectors typically expect evidence that allergen information is
          reviewed, not just created once and forgotten.
        </p>

        <h2>Common inspection failures</h2>
        <ul>
          <li>Matrix exists but hasn’t been reviewed in months</li>
          <li>Front-of-house staff don’t trust the document</li>
          <li>No record of when it was last checked</li>
        </ul>

        <h2>How TempTake helps</h2>
        <p>
          TempTake records when allergen information was last reviewed and flags
          when it’s due again, so reviews don’t quietly expire.
        </p>

        <p>
          <Link href="/allergens" className="underline font-semibold">
            Set up your allergen review →
          </Link>
          <BackToGuides />
        </p>
      </div>
    </article>
  );
}
