// src/app/entry/[[...slug]]/page.tsx
import FoodTempLogger from "@/components/FoodTempLogger";

export const dynamic = "force-dynamic";

export default function EntryCatchAll() {
  // If your logger accepts a "mode" prop you can pass it here.
  // @ts-expect-error tolerate components without this prop
  return <FoodTempLogger mode="full" />;
}
