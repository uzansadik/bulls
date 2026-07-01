import { TrendingUp } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * Auth route layout — split screen with a brand panel on the left
 * and the active form on the right. Language switcher sits in the
 * top-right of the brand panel.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrendingUp className="size-4" />
            </div>
            Openbulls
          </a>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-gradient-to-br from-primary/20 via-background to-accent/20 lg:block">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center">
          <TrendingUp className="size-16 text-primary/40" />
          <div className="space-y-3">
            <p className="text-3xl font-semibold tracking-tight">Yatırımlarınızı AI ile yönetin</p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Portföy takibi, gerçek zamanlı piyasa verisi ve LangGraph tabanlı AI agent'lar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
