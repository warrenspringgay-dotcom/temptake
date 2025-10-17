// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Make the site root the FoodTempLogger
  redirect("/foodtemps");
}
