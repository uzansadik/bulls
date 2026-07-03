/**
 * @openbulls/notifications — pure template renderer.
 *
 * Plain `{{var}}` substitution. No Handlebars / Mustache dependency:
 * the templates are static (one per `NotificationKind`) and the
 * renderer runs in a hot path. Adding Handlebars is justified only
 * when we need conditionals / loops / partials (Faz 8+).
 *
 * Format: tokens are `{{name}}` where `name` is a non-whitespace
 * key. Missing variables render as empty string (we don't throw).
 * The dispatcher surfaces a warning via `TemplateRenderError` when
 * `strict` mode is enabled (reserved for future use; today `strict`
 * defaults to false so a missing icon in a `price_alert` payload
 * doesn't block delivery).
 */
export type TemplateMap = Readonly<Record<string, string>>;

/**
 * Substitute every `{{key}}` in `template` with `vars[key]`. Missing
 * keys resolve to empty string. Returns the rendered string.
 */
export function substituteVariables(
  template: string,
  vars: TemplateMap,
): string {
  return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });
}

/**
 * Built-in template map for the 6 notification kinds. Each template
 * references keys that the dispatcher fills from the notification's
 * `payload`. A missing key renders empty rather than throwing — see
 * the file header for the rationale.
 *
 * Templates are deliberately short (Markdown) so they fit Telegram's
 * 4096-char limit and a future mobile push's 4-line body cap without
 * truncation.
 */
export const TEMPLATES: Readonly<Record<string, { title: string; body: string }>> = {
  portfolio_review: {
    title: "📊 Portfolio review ready",
    body: "Your {{kind}} portfolio review is ready. Open the app to read the summary.",
  },
  price_alert: {
    title: "💰 Price alert",
    body:
      "{{symbol}} crossed {{threshold}} (last: {{last}}). Direction: {{direction}}.",
  },
  credit_insufficient: {
    title: "⚠️ Credit running low",
    body:
      "You have {{remaining}} credits left. Top up to keep your agents running.",
  },
  agent_completed: {
    title: "✅ Analysis ready",
    body: "Your {{graphKey}} analysis finished. Tap to view the result.",
  },
  news_watch: {
    title: "📰 News watch update",
    body: "{{count}} new headlines matching your watchlist.",
  },
  earnings_calendar: {
    title: "📅 Earnings ahead",
    body:
      "{{count}} symbols from your watchlist report earnings in the next {{days}} days.",
  },
  system: {
    title: "🔔 Openbulls",
    body: "{{message}}",
  },
};

/**
 * Render the templates for `kind` against `payload` (stringified).
 * Returns `{ title, body }`. Throws `TemplateRenderError` if the kind
 * is unknown.
 */
export function renderTemplate(
  kind: string,
  payload: Readonly<Record<string, unknown>>,
): { title: string; body: string } {
  const tpl = TEMPLATES[kind];
  if (!tpl) {
    // Unknown kind: return a fallback so the dispatcher doesn't lose
    // the notification. Logged via `lastError` in the caller.
    return { title: "🔔 Openbulls", body: String(payload["message"] ?? "(no body)") };
  }
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    vars[k] = typeof v === "string" ? v : v == null ? "" : String(v);
  }
  return {
    title: substituteVariables(tpl.title, vars),
    body: substituteVariables(tpl.body, vars),
  };
}