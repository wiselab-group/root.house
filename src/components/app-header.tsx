import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

/** Minimal top bar for the authenticated area — family archive name link + sign out. */
export function AppHeader({ userEmail }: { userEmail: string | null | undefined }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3">
      <Link href="/families" className="font-medium">
        Family Archive
      </Link>
      <div className="flex items-center gap-3">
        {userEmail && <span className="text-sm text-muted-foreground">{userEmail}</span>}
        <SignOutButton />
      </div>
    </header>
  );
}
