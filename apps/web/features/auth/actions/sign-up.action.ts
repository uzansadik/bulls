"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@openbulls/auth/server";

import { signUpSchema } from "../schemas/sign-up.schema";

export interface SignUpState {
  readonly error?: string;
  readonly fieldErrors?: Record<string, string[]>;
}

/**
 * Server action for the sign-up form.
 *
 * Validation is done by `signUpSchema` (Zod). On success the user is
 * created via Better Auth's `signUpEmail` API; the
 * `databaseHooks.user.create.after` hook in `@openbulls/auth/server`
 * promotes the very first user to `role: "admin"`. On success we
 * redirect to `/`.
 */
export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) {
      const code = e.body?.code;
      const message =
        code === "USER_ALREADY_EXISTS"
          ? "Bu e-posta zaten kayıtlı"
          : (e.body?.message ?? "Kayıt başarısız");
      return { error: message };
    }
    return { error: "Beklenmeyen bir hata oluştu" };
  }

  redirect("/");
}
