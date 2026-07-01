"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openbulls/ui/components/button";
import { Card, CardContent } from "@openbulls/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@openbulls/ui/components/field";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@openbulls/ui/components/form";
import { Input } from "@openbulls/ui/components/input";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";

import { type SignUpState, signUpAction } from "../actions/sign-up.action";
import { type SignUpInput, signUpDefaultValues, signUpSchema } from "../schemas/sign-up.schema";

export function SignupForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUpAction, {});

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: signUpDefaultValues,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <FieldGroup>
              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-bold">{t("signUpTitle")}</h1>
                <p className="text-sm text-balance text-muted-foreground">{t("signUpSubtitle")}</p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Field>
                      <FieldLabel htmlFor={field.name}>{t("nameLabel")}</FieldLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          type="text"
                          placeholder="John Doe"
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                    </Field>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Field>
                      <FieldLabel htmlFor={field.name}>{t("emailLabel")}</FieldLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          type="email"
                          placeholder="ornek@email.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                    </Field>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Field>
                      <FieldLabel htmlFor={field.name}>{t("passwordLabel")}</FieldLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FieldDescription>{t("passwordHint")}</FieldDescription>
                    </Field>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Field>
                      <FieldLabel htmlFor={field.name}>{t("confirmPasswordLabel")}</FieldLabel>
                      <FormControl>
                        <Input
                          id={field.name}
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                    </Field>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

              <Button type="submit" disabled={pending} className="w-full">
                {pending ? <Loader2Icon className="animate-spin" /> : t("submitSignUp")}
              </Button>

              <FieldSeparator>{t("socialDivider")}</FieldSeparator>

              <Button variant="outline" type="button" className="w-full" disabled>
                {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    fill="currentColor"
                  />
                </svg>
                {t("socialGithub")}
              </Button>

              <FieldDescription className="text-center">
                {t("haveAccount")}{" "}
                <Link href="/sign-in" className="underline underline-offset-4">
                  {t("signInLink")}
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
