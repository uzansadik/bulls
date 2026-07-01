"use client";

import { useTranslations } from "next-intl";

import { LogOutIcon } from "lucide-react";

import { Button } from "@openbulls/ui/components/button";

import { signOutAction } from "../actions/sign-out.action";

export function SignOutButton() {
  const t = useTranslations("dashboard");
  return (
    <form action={signOutAction}>
      <Button variant="ghost" size="sm" type="submit" className="gap-2">
        <LogOutIcon className="size-4" />
        {t("signOut")}
      </Button>
    </form>
  );
}
