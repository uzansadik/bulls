/**
 * @openbulls/ai — application: tool selector.
 *
 * Chooses which tools to attach to a given model call. The
 * strategy is intentionally simple (keyword + intent matching)
 * because the tool registry is small and static in Faz 4. LLM-
 * assisted selection (a meta-model picks tools based on user
 * intent) is deferred to Faz 5+ once the tool surface stabilises.
 *
 * Three intent buckets cover the common cases:
 *
 *   - "portfolio"   — user mentions their holdings, transactions,
 *                     or wants a health check.
 *   - "financials"  — user asks about a company's statements or
 *                     ratios.
 *   - "news"        — user asks about recent events / headlines.
 *
 * Anything that doesn't match a bucket gets the default subset:
 *   - get-portfolio-overview (cheap read; safe always-on)
 *   - get-delayed-price      (cheap read; safe always-on)
 *   - get-fx-rate            (cheap read; safe always-on)
 *
 * Destructive / write tools (add-transaction, create-scheduled-job)
 * are *never* attached by the selector — they are only surfaced
 * through explicit chat affordances ("Deep action" mode) so a stray
 * keyword match never causes a mutation.
 */
import type { AnyToolSpec } from "../domain/tool/tool-spec";
import type { ToolRegistry } from "./tool-registry.service";

/**
 * Discrete intent categories returned by the rule-based classifier.
 * Multiple intents can match a single prompt; the selector unions
 * the resulting tool sets.
 */
export type Intent = "portfolio" | "financials" | "news" | "default";

/**
 * The small set of tools safe to attach without an explicit user
 * opt-in. Read-only and cheap — these can be left on for any chat
 * turn without surprising the user with a mutation.
 */
const DEFAULT_TOOL_NAMES = ["get-portfolio-overview", "get-delayed-price", "get-fx-rate"] as const;

/**
 * Tools attached when the prompt looks like a portfolio question.
 */
const PORTFOLIO_TOOL_NAMES = [
  ...DEFAULT_TOOL_NAMES,
  "get-positions",
  "get-portfolio-performance",
  "add-transaction",
] as const;

/**
 * Tools attached when the prompt asks about a specific company.
 */
const FINANCIALS_TOOL_NAMES = [
  ...DEFAULT_TOOL_NAMES,
  "get-financial-statement",
  "get-income-statement",
  "get-balance-sheet",
  "get-cash-flow",
  "get-financial-ratios",
  "analyze-financial-statement",
  "get-technical-indicators",
] as const;

/**
 * Tools attached when the prompt is about current events.
 */
const NEWS_TOOL_NAMES = [...DEFAULT_TOOL_NAMES, "search-market-news"] as const;

const PORTFOLIO_KEYWORDS = [
  "portfolio",
  "holding",
  "holdings",
  "position",
  "positions",
  "transaction",
  "transactions",
  "sat",
  "hisse",
  "portföy",
  "varlık",
  "işlem",
  "al",
  "sat",
] as const;

const FINANCIALS_KEYWORDS = [
  "financial",
  "statement",
  "balance sheet",
  "income",
  "cash flow",
  "revenue",
  "earnings",
  "ratio",
  "ratios",
  "pe",
  "roe",
  "debt",
  "equity",
  "analiz",
  "bilanço",
  "gelir",
  "kâr",
  "zarar",
  "fınansal",
  "borç",
  "özsermaye",
] as const;

const NEWS_KEYWORDS = [
  "news",
  "headline",
  "headlines",
  "haber",
  "haberler",
  "son dakika",
  "gündem",
] as const;

/**
 * Lower-case + Unicode-normalise so Turkish dotless-i etc. compare
 * the way a human reader would expect.
 */
function normalise(text: string): string {
  return text.toLocaleLowerCase("tr-TR").trim();
}

function matchesAny(haystack: string, needles: ReadonlyArray<string>): boolean {
  for (const needle of needles) {
    if (haystack.includes(needle)) return true;
  }
  return false;
}

/**
 * Detect intents from a free-text prompt. Returns the de-duplicated
 * set so a single turn can route through both portfolio and news.
 */
export function detectIntents(prompt: string): ReadonlyArray<Intent> {
  const text = normalise(prompt);
  const intents: Intent[] = [];

  if (matchesAny(text, PORTFOLIO_KEYWORDS)) intents.push("portfolio");
  if (matchesAny(text, FINANCIALS_KEYWORDS)) intents.push("financials");
  if (matchesAny(text, NEWS_KEYWORDS)) intents.push("news");
  if (intents.length === 0) intents.push("default");

  return Array.from(new Set(intents));
}

/**
 * Resolve the set of tool names to attach for a given prompt.
 * Destructive tools are *never* selected here regardless of intent.
 */
export function selectToolNames(prompt: string): ReadonlyArray<string> {
  const intents = detectIntents(prompt);
  const names = new Set<string>();
  for (const intent of intents) {
    switch (intent) {
      case "portfolio":
        for (const name of PORTFOLIO_TOOL_NAMES) names.add(name);
        break;
      case "financials":
        for (const name of FINANCIALS_TOOL_NAMES) names.add(name);
        break;
      case "news":
        for (const name of NEWS_TOOL_NAMES) names.add(name);
        break;
      case "default":
        for (const name of DEFAULT_TOOL_NAMES) names.add(name);
        break;
    }
  }
  // Hard-stop: destructive tools must come through an explicit
  // affordance, not the selector.
  for (const name of Array.from(names)) {
    if (name === "add-transaction") names.delete(name);
  }
  return Array.from(names);
}

/**
 * Select tools for a prompt and resolve them through the registry.
 * Names the registry doesn't know are silently dropped — selection
 * never throws on missing names because the registry's job is to
 * serve whatever is currently registered.
 */
export function selectTools(registry: ToolRegistry, prompt: string): ReadonlyArray<AnyToolSpec> {
  return registry.pick(selectToolNames(prompt));
}
