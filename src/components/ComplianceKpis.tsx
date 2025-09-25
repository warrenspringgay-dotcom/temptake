// src/components/ComplianceKpis.tsx
export default function ComplianceKpis(props: {

  trainingExpiringSoon: number;
 
  allergenExpiringSoon: number;
}) {
  const Box = ({ label, n, warn }: { label: string; n: number; warn?: boolean }) => (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${warn && n > 0 ? "text-red-600" : ""}`}>{n}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
     
      <Box label="Training expiring (14d)" n={props.trainingExpiringSoon} />
      <Box label="Allergen review expired" n={props.allergenExpired} warn />
      <Box label="Allergen review expiring (14d)" n={props.allergenExpiringSoon} />
    </div>
  );
}
