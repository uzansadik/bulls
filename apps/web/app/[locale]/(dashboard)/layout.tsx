import { AppSidebar } from "@openbulls/ui/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@openbulls/ui/components/sidebar";
import { SiteHeader } from "@openbulls/ui/components/site-header";

import { LanguageSwitcher } from "@/components/language-switcher";
import { getSessionUser } from "@/lib/auth";

/**
 * Auth-gated dashboard layout.
 *
 * Defense-in-depth alongside `proxy.ts`: even if the cookie gate is
 * bypassed, this server-component layer re-checks the session before
 * rendering any dashboard chrome.
 *
 * `AppSidebar` ships with a hard-coded mock user (we do not modify
 * `packages/ui` primitives). The language switcher sits above the
 * site header so it's always visible.
 */
export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  await getSessionUser();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <div className="flex items-center justify-end gap-2 border-b bg-background px-6 py-2">
          <LanguageSwitcher />
        </div>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
