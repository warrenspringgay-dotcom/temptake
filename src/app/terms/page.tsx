// src/app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | TempTake",
  description: "Terms of Service for TempTake.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Last updated: {new Date().toLocaleDateString("en-GB")}
        </p>
      </header>

      <section className="prose prose-slate max-w-none">
        <p>
          These Terms of Service (“Terms”) govern your use of TempTake (“we”,
          “us”, “our”). By accessing or using TempTake, you agree to these
          Terms.
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be able to form a legally binding contract to use the
          service.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>You are responsible for maintaining the confidentiality of your account.</li>
          <li>You must provide accurate information and keep it up to date.</li>
          <li>You are responsible for activity that occurs under your account.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service unlawfully or to violate any regulations.</li>
          <li>Attempt to access data you do not have permission to access.</li>
          <li>Disrupt, attack, or reverse engineer the service.</li>
        </ul>

        <h2>Service availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted
          service. We may modify, suspend, or discontinue any part of the
          service.
        </p>

        <h2>Compliance and responsibility</h2>
        <p>
          TempTake helps you record and manage compliance-related information,
          but you remain responsible for your business’s compliance obligations.
          Regulatory outcomes depend on real-world processes, not just software.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The service is provided “as is” and “as available” without warranties
          of any kind, to the maximum extent permitted by law.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, TempTake is not liable for any
          indirect, incidental, special, consequential, or business losses
          arising from your use of the service.
        </p>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate access if you breach these Terms. You may
          stop using the service at any time.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          service after changes means you accept the updated Terms.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these Terms, contact{" "}
          <a href="mailto:info@temptake.com">support@temptake.com</a>.
        </p>

        <hr />

        <p className="text-sm text-slate-600">
          Also see our{" "}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
