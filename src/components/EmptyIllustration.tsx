export default function EmptyIllustration({ label = "Nothing here yet" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
      <svg width="80" height="80" viewBox="0 0 24 24" className="mb-3 opacity-80">
        <path d="M5 7h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
      <div className="text-sm">{label}</div>
    </div>
  );
}
