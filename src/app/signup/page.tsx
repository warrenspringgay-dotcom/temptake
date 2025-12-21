// src/app/signup/page.tsx
"use client";

import dynamic from "next/dynamic";

const SignupClient = dynamic(() => import("./SignupClient"), {
  ssr: false, // render only on client, no server HTML
});

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <SignupClient />
    </div>
  );
}
