"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@openbulls/auth/server";

import { signInSchema } from "../schemas/sign-in.schema";

export interface SignInState {
  readonly error?: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly redirectTo?: string;
}

/**
 * Server action for the sign-in form.
 *
 * Validation is done by `signInSchema` (Zod) so the same rules run
 * server-side as on the client. On success the user is redirected
 * to `redirectTo` (defaults to `/`); on failure we return a typed
 * `SignInState` that the form's `useActionState` displays.
 *
 * `redirect()` throws an internal Next error to abort the action —
 * we let it bubble.
 */
export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    redirect: formData.get("redirect") ? String(formData.get("redirect")) : undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) {
      const code = e.body?.code;
      const message =
        code === "INVALID_EMAIL_OR_PASSWORD"
          ? "E-posta veya parola hatalı"
          : (e.body?.message ?? "Giriş başarısız");
      return { error: message };
    }
    return { error: "Beklenmeyen bir hata oluştu" };
  }

  redirect(parsed.data.redirect ?? "/");
}
