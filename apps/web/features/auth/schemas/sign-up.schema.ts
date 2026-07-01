/**
 * Zod schema for the sign-up form.
 *
 * Co-located with the form (`signup-form.tsx`); the same schema is
 * consumed by the server action and by the react-hook-form resolver.
 */
import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, "İsim en az 2 karakter olmalı")
      .max(50, "İsim en fazla 50 karakter olabilir"),
    email: z.string().email("Lütfen geçerli bir e-posta girin"),
    password: z
      .string()
      .min(8, "Parola en az 8 karakter olmalı")
      .regex(/[A-Z]/, "En az bir büyük harf gerekli")
      .regex(/[0-9]/, "En az bir rakam gerekli"),
    confirmPassword: z.string().min(1, "Lütfen parolayı onaylayın"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolalar eşleşmiyor",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signUpDefaultValues: SignUpInput = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};
