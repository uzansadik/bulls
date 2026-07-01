/**
 * Zod schema for the sign-in form.
 *
 * Co-located with the form (`login-form.tsx`); the same schema is
 * consumed by the server action and by the react-hook-form resolver.
 */
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Lütfen geçerli bir e-posta girin"),
  password: z.string().min(8, "Parola en az 8 karakter olmalı"),
  redirect: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signInDefaultValues: SignInInput = {
  email: "",
  password: "",
  redirect: undefined,
};
