// no change needed to imports except make sure you import the new signature:
import { signOutAction } from "@/app/actions/auth";

export default function UserMenu({ user }: { user: { email: string } }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{user.email}</span>

      {/* Either apply the action at the form level… */}
      <form action={signOutAction}>
        <button className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          Sign out
        </button>
      </form>

      {/* …or at the button level:
      <form>
        <button formAction={signOutAction} className="…">Sign out</button>
      </form>
      */}
    </div>
  );
}
