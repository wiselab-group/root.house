import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Root route has no content of its own — send the visitor to the right place. */
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/families" : "/login");
}
