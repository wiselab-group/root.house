import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import type { RegisterInput } from "@/lib/validation/auth";

const BCRYPT_SALT_ROUNDS = 12;

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

/**
 * Registers a new user with a hashed password. Throws
 * EmailAlreadyRegisteredError if the email is taken — callers (the register
 * server action) turn this into a user-facing form error rather than a 500.
 */
export async function registerUser(input: RegisterInput): Promise<{ id: string }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const passwordHash = await hash(input.password, BCRYPT_SALT_ROUNDS);

  const [created] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash })
    .returning({ id: users.id });

  return created;
}
