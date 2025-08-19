export const metadata = { title: "TempTake", description: "Food hygiene temperature logs" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
