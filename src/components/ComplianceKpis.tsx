// src/components/ComplianceKpis.tsx
"use client";

import Link from "next/link";

type Props = {
  trainingExpiringSoon: number;
  allergenExpiringSoon: number;
  /** Optional count of already-expired allergen review(s). Defaults to 0. */
  allergenExpired?: number;

  /** Optional overrides if you want custom click behavior */
  onClickTraining?: () => void;            // defaults to link to /team
  onClickAllergenExpired?: () => void;     // defaults to link to /allergens
  onClickAllergenExpiring?: () => void;    // defaults to link to /allergens
};

function Box({
  label,
  n,
  warn,
}: {
  label: string;
  n: number;
  warn?: boolean;
}) {
  const badge =
    warn && n > 0
      ? "bg-red-100 text-red-800"
      : n > 0
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{n}</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
          {n > 0 ? (warn ? "Action required" : "Due soon") : "All good"}
        </span>
      </div>
    </div>
  );
}

export default function ComplianceKpis(props: Props) {
  const allergenExpired = props.allergenExpired ?? 0;

  const TrainingWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    props.onClickTraining ? (
      <button onClick={props.onClickTraining} className="text-left">{children}</button>
    ) : (
      <Link href="/team" className="block">{children}</Link>
    );

  const AllergenExpiredWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    props.onClickAllergenExpired ? (
      <button onClick={props.onClickAllergenExpired} className="text-left">{children}</button>
    ) : (
      <Link href="/allergens" className="block">{children}</Link>
    );

  const AllergenExpiringWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    props.onClickAllergenExpiring ? (
      <button onClick={props.onClickAllergenExpiring} className="text-left">{children}</button>
    ) : (
      <Link href="/allergens" className="block">{children}</Link>
    );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TrainingWrapper>
        <Box label="Training expiring (14d)" n={props.trainingExpiringSoon} />
      </TrainingWrapper>

      <AllergenExpiredWrapper>
        <Box label="Allergen review expired" n={allergenExpired} warn />
      </AllergenExpiredWrapper>

      <AllergenExpiringWrapper>
        <Box label="Allergen review expiring (14d)" n={props.allergenExpiringSoon} />
      </AllergenExpiringWrapper>
    </div>
  );
}
