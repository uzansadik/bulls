import { auth } from "@openbulls/auth/server";
import { headers } from "next/headers";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string | null;
}

/** Return the currently signed-in user, or `null`. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image ?? null,
    role: "role" in session.user ? (session.user.role as string) : null,
  };
}
