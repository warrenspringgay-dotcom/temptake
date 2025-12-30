// src/app/four-week-review/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function FourWeekReviewPage() {
  // Redirect to the stable Reports page view
  redirect("/reports?range=4w");
}
