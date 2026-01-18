export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-sm text-slate-800">
      <h1 className="text-2xl font-semibold text-slate-900">Cookie Policy</h1>

      <p>
        This Cookie Policy explains how TempTake uses cookies and similar
        technologies when you use our website and application.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What are cookies?</h2>
        <p>
          Cookies are small text files stored on your device. They help websites
          remember information about your visit, such as login state or
          preferences.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How we use cookies</h2>
        <p>We use cookies for the following purposes:</p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Essential cookies</strong> – required for authentication,
            security, and core application functionality.
          </li>
          <li>
            <strong>Analytics cookies (optional)</strong> – used to understand
            how the app is used and improve features.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Essential cookies</h2>
        <p>
          These cookies are always enabled. They are required for:
        </p>
        <ul className="list-disc pl-5">
          <li>User authentication</li>
          <li>Session security</li>
          <li>Protecting your account</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Analytics cookies</h2>
        <p>
          We use PostHog (EU-hosted) to understand how users interact with
          TempTake. These cookies are:
        </p>
        <ul className="list-disc pl-5">
          <li>Disabled by default</li>
          <li>Only enabled after you give consent</li>
          <li>Used solely to improve the product</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Managing your preferences</h2>
        <p>
          You can accept or reject analytics cookies when prompted. You may also
          clear cookies at any time via your browser settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Any changes will be posted
          on this page.
        </p>
      </section>

      <p className="text-xs text-slate-500">
        Last updated: {new Date().toLocaleDateString("en-GB")}
      </p>
    </div>
  );
}