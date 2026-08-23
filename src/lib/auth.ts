import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db, getDb } from "@/db/client";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { credentialsSchema } from "@/lib/validation/auth";

/**
 * Auth.js v5 configuration.
 *
 * Session strategy is JWT, not database — Auth.js hard-requires this for
 * CredentialsProvider (there's no OAuth-style external round-trip to persist
 * a database session against; `assertConfig` in @auth/core rejects
 * Credentials + "database" outright: "Signing in with credentials only
 * supported if JWT strategy is enabled"). This does NOT weaken family-level
 * authorization: every server action still calls requireFamilyAccess(),
 * which re-checks FamilyMember role against the database on every request
 * regardless of session strategy — a role change/removal takes effect on
 * the very next action, only the session's own claims (id/email/name)
 * persist for the JWT's lifetime.
 *
 * The Drizzle adapter is still registered (not just a Credentials-only
 * config) so the users/accounts/sessions/verificationTokens tables also
 * back the Google provider below — the adapter is what links a Google
 * sign-in to the `users` row and records it in `accounts`, giving one
 * person two ways to log in to the same account.
 *
 * DrizzleAdapter gets getDb() (the real, concrete instance), not the `db`
 * Proxy — it type-introspects its argument via drizzle-orm's `is(db,
 * PgDatabase)` brand check, which a Proxy wrapping a plain object fails.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      // Explicit, rather than relying on Auth.js's auto-detected env names
      // (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) — this project's .env uses the
      // GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET names Google's own console
      // instructions use, so auto-detection silently misses them.
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // The email Google gives us is already verified by Google, so it's
      // safe to attach this OAuth identity to an existing Credentials
      // account with the same email instead of erroring out — this is what
      // lets one person sign in with either email/password or Google.
      // Without this flag @auth/core refuses the link by default (it can't
      // tell a legitimate "same person, second method" case from an
      // attacker who registered your email first).
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user?.passwordHash) return null;

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    // JWT strategy: carry the user id from authorize()'s return value into
    // the token on sign-in, then from the token into the session on every
    // subsequent request (there's no adapter-persisted `user` object to read
    // per-request under JWT, unlike the database session strategy).
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
