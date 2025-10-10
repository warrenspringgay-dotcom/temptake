// src/components/ui/BrandLogo.tsx
import Image from "next/image";
import Link from "next/link";

export default function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/logo.png" alt="TempTake" width={28} height={28} priority />
      <span className="font-semibold tracking-tight">TempTake</span>
    </Link>
  );
}
