// src/app/suppliers/page.tsx
import AuthGate from "@/components/AuthGate";
import SuppliersManager from "@/components/SuppliersManager";

export default async function SuppliersPage() {
  return (
    <AuthGate requireRole="staff">
      <SuppliersManager />
    </AuthGate>
  );
}
