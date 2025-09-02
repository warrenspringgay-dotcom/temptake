// src/app/suppliers/page.tsx
import AuthGate from "@/components/AuthGate";
import SuppliersManager from "@/components/SuppliersManager";

export const metadata = {
  title: "Suppliers – TempTake",
};

export default function SuppliersPage() {
  return (
    <AuthGate requireRole="manager">
      <SuppliersManager />
    </AuthGate>
  );
}
