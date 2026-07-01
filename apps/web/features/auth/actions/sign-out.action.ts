"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@openbulls/auth/server";

/**
 * Server action for sign-out. The auth call is best-effort — even if
 * the session is already invalid (e.g. expired cookie) we still want
 * to redirect the user to the public landing.
 */
export async function signOutAction(): Promise<void> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Swallow — sign-out should always redirect on success or no-op.
  }
  redirect("/");
}
