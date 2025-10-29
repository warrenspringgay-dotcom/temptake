export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Help & FAQs</h1>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Getting started</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Add your team in <strong>Team</strong>.</li>
          <li>Set up suppliers in <strong>Suppliers</strong>.</li>
          <li>Build your allergen matrix in <strong>Allergens</strong>.</li>
          <li>Create routines in <strong>Routines</strong>.</li>
        </ol>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Common questions</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium">Why can’t I see the save button on mobile?</summary>
          <p className="mt-2 text-sm text-gray-700">Our modals use a sticky footer; if hidden, make sure your browser UI isn’t covering it and scroll the modal, not the page.</p>
        </details>
        <details className="mt-2 rounded-lg border p-3">
          <summary className="cursor-pointer font-medium">How do categories work for suppliers?</summary>
          <p className="mt-2 text-sm text-gray-700">Pick one or more tags (e.g., Meat, Fish, Produce). They’re saved with the supplier and used in filters and reports.</p>
        </details>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Need more help?</h2>
        <p className="text-sm text-gray-700">
          Email support at <a className="text-blue-600 underline" href="mailto:support@temptake.app">support@temptake.app</a>.
        </p>
      </section>
    </div>
  );
}
