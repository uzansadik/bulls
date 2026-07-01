import { serverEnv } from "@openbulls/config";
import { db } from "@openbulls/db/client";
import * as authSchema from "@openbulls/db/schema/auth.schema.ts";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { count, eq } from "drizzle-orm";
export { toNextJsHandler } from "better-auth/next-js";

const env = serverEnv();

/**
 * Process-wide Better Auth instance.
 *
 * Apps wire this to their catch-all route:
 *
 *   export const { GET, POST } = toNextJsHandler(auth);
 *
 * `databaseHooks.user.create.after` implements "first user becomes
 * admin": after a row is inserted, count(*) the table; if total === 1
 * the freshly inserted row is updated to `role = "admin"`. Subsequent
 * sign-ups fall through to the default role. This is a soft race —
 * two simultaneous first-time sign-ups could both see `count == 1`
 * and both be promoted; the auth flow is gated by the application's
 * `autoSignIn: true` which makes that path extremely narrow.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authSchema.user,
      session: authSchema.session,
      account: authSchema.account,
      verification: authSchema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "user", required: false },
      banned: { type: "boolean", defaultValue: false, required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const [row] = await db.select({ total: count() }).from(authSchema.user);
          if (row?.total === 1) {
            await db
              .update(authSchema.user)
              .set({ role: "admin" })
              .where(eq(authSchema.user.id, user.id));
          }
        },
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.NODE_ENV === "development" ? [env.BETTER_AUTH_URL] : undefined,
});

export type Auth = typeof auth;
