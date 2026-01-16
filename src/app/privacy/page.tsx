// src/app/privacy/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | TempTake",
  description: "Privacy Policy for TempTake.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Last updated: {new Date().toLocaleDateString("en-GB")}
        </p>
      </header>

      <section className="prose prose-slate max-w-none">
        <p>
          TempTake (“we”, “us”, “our”) collects and processes personal data only
          to provide and operate the TempTake service.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> name, email address, and profile
            information used to create and manage your account.
          </li>
          <li>
            <strong>Authentication data:</strong> login identifiers and session
            tokens required to keep you signed in.
          </li>
          <li>
            <strong>Usage data:</strong> basic technical and usage information
            to help operate and improve the service (e.g. page views, feature
            usage).
          </li>
          <li>
            <strong>Customer data you input:</strong> compliance records,
            temperature logs, cleaning tasks, training records, allergen review
            data and other content you enter into the product.
          </li>
        </ul>

        <h2>Google Sign-In</h2>
        <p>
          If you sign in using Google, we receive your name, email address, and
          profile information as provided by Google. This information is used
          solely for account creation, authentication, and access to the
          TempTake platform.
        </p>

        <h2>How we use data</h2>
        <ul>
          <li>To create and manage your account.</li>
          <li>To authenticate you and keep the service secure.</li>
          <li>To provide core product functionality.</li>
          <li>To maintain, troubleshoot, and improve the service.</li>
        </ul>

        <h2>How we store and share data</h2>
        <p>
          We do not sell personal data to third parties. Data is stored securely
          using industry-standard infrastructure. We may use third-party service
          providers (for example, authentication, hosting, and database
          services) strictly to operate TempTake.
        </p>

        <h2>Retention</h2>
        <p>
          We retain data for as long as needed to provide the service, comply
          with legal obligations, resolve disputes, and enforce agreements. You
          can request deletion of your account and associated data (subject to
          legal retention requirements).
        </p>

        <h2>Your rights</h2>
        <p>
          You may request access, correction, or deletion of your personal data.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy questions or requests, contact{" "}
          <a href="mailto:info@temptake.com">support@temptake.com</a>.
        </p>

        <hr />

        <p className="text-sm text-slate-600">
          Also see our{" "}
          <Link className="underline" href="/terms">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
