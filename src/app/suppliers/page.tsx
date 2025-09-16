// src/app/suppliers/page.tsx
import SuppliersManager from "@/components/SuppliersManager";

export const metadata = { title: "Suppliers · TempTake" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <SuppliersManager />
    </div>
  );
}
