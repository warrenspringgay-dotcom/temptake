// src/app/suppliers/page.tsx
import SuppliersManager from "@/components/SuppliersManager";

export const metadata = { title: "Suppliers · TempTake" };

export default function Page() {
  return (
    <main className="w-full px-3 sm:px-4 md:mx-auto md:max-w-6xl">

      <SuppliersManager />
    </main>
  );
}
