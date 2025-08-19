import ClientHome from "./clienthome";

// prevent SSG/ISR so build doesn't try to prerender client-only logic
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function Page() {
  return <ClientHome />;
}
