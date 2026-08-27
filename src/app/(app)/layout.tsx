import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userExists } from "@/domain/auth/auth.service";
import { AppHeader } from "@/components/app-header";
import { BreadcrumbsProvider } from "@/components/breadcrumbs-context";
import { FamilyNavProvider } from "@/components/family-nav-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // A JWT session can outlive the user it names — e.g. in development, when
  // DATABASE_URL is repointed at a different/reset database, an old browser
  // session still carries a signed token for a user id that no longer
  // exists. Every server action would otherwise fail deep inside a foreign-
  // key violation (confusing 500) instead of a clear "please sign in
  // again". Checked here, once, for the whole protected area rather than in
  // every action.
  //
  // Redirecting to a Route Handler rather than calling signOut() directly:
  // signOut() clears cookies, and Next.js only allows cookie mutation from a
  // Server Action or Route Handler, not a Server Component (this layout) —
  // calling it here throws "Cookies can only be modified in a Server Action
  // or Route Handler" instead of actually signing out. The route lives at
  // /api/sign-out-stale, NOT under /api/auth/* — Auth.js's own catch-all
  // route intercepts anything under that prefix and rejects it as an
  // "UnknownAction" before a sibling custom route ever runs.
  if (!(await userExists(session.user.id))) {
    redirect("/api/sign-out-stale");
  }

  return (
    <BreadcrumbsProvider>
      <FamilyNavProvider>
        <div className="min-h-svh">
          <AppHeader userEmail={session.user.email} />
          {children}
        </div>
      </FamilyNavProvider>
    </BreadcrumbsProvider>
  );
}
