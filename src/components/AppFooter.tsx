// src/components/AppFooter.tsx
import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/70 px-4 py-3 text-[11px] text-slate-500 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} TempTake</span>



        <nav className="flex flex-wrap items-center gap-3">
            <a
  href="mailto:info@temptake.co.uk"
  className="text-slate-500 hover:text-emerald-300"
>
  Contact support
</a>

          <Link href="/privacy" className="hover:text-emerald-600">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-emerald-600">
            Terms
          </Link>
          <Link href="/cookies" className="hover:text-emerald-600">
            Cookies
          </Link>
          <Link href="/help" className="hover:text-emerald-600">
            Support
          </Link>
          
        </nav>
      </div>
    </footer>
  );
}
