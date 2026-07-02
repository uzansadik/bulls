/**
 * @openbulls/market-data — KAP (Kamuyu Aydınlatma Platformu) adapter.
 *
 * KAP is the Turkish Public Disclosure Platform — every BIST-listed
 * company files its periodic statements (financial tables, material
 * event disclosures, governance announcements) here.
 *
 * Public KAP endpoints do not require an API key; some rate-limiting
 * (≈60 req/min) is implicit. `KAP_API_KEY` is reserved for the
 * forthcoming official API and is currently ignored.
 *
 * Capabilities:
 *
 *   - `news`             → material-event disclosures (bildirimler)
 *   - `financial_statements` → XBRL/CSV financial tables for BIST firms
 *
 * Other capabilities (`candles`, `quote`, `fx`, `financial_ratios`)
 * return `UnsupportedCapabilityError`; the router falls through to
 * Yahoo / SEC for those.
 *
 * Sembol → KAP memberOid mapping: KAP identifies issuers by an opaque
 * `memberOid` integer. Adapter accepts an `AssetSymbol` shaped as
 * either `{TICKER}.IS` (e.g. `THYAO.IS`) or a numeric memberOid string
 * (e.g. `M:12345`). Resolving ticker → memberOid lives in
 * `IAssetResolver` at the application layer, so this adapter takes the
 * resolved OID as part of the input symbol (e.g. `M:12345`).
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Currency, ProviderName } from "../../domain/brands";
import {
  type MarketDataError,
  SymbolNotFoundError,
  UnsupportedCapabilityError,
} from "../../domain/errors";
import type { FinancialStatement } from "../../domain/financial-statement";
import type { NewsItem } from "../../domain/news";
import type { HttpClient } from "../http/http-client";
import type { LoggerLike } from "../log";
import { noopLogger } from "../log";
import type {
  AdapterCapability,
  GetCandlesInput,
  GetFinancialRatiosInput,
  GetFinancialStatementsInput,
  GetFxRateInput,
  GetNewsInput,
  GetQuoteInput,
  MarketDataAdapter,
} from "./market-data-adapter.port";

const KAP_PROVIDER = ProviderName("kap");
const KAP_BASE = "https://www.kap.org.tr/tr/api";

const KAP_CAPABILITIES: ReadonlySet<AdapterCapability> = new Set<AdapterCapability>([
  "news",
  "financial_statements",
]);

interface KapOptions {
  readonly apiKey?: string;
  readonly logger?: LoggerLike;
}

export class KapAdapter implements MarketDataAdapter {
  readonly provider = KAP_PROVIDER;
  readonly capabilities = KAP_CAPABILITIES;

  private readonly http: HttpClient;
  private readonly logger: LoggerLike;
  private readonly apiKey: string | undefined;

  constructor(http: HttpClient, options: KapOptions = {}) {
    this.http = http;
    this.logger = options.logger ?? noopLogger;
    this.apiKey = options.apiKey;
  }

  async getNews(input: GetNewsInput): Promise<Result<NewsItem[], MarketDataError>> {
    const memberOid = parseMemberOid(input.symbol);
    if (input.symbol && !memberOid) {
      return err(
        new SymbolNotFoundError({
          provider: KAP_PROVIDER,
          symbol: input.symbol,
          message: "KAP requires an `M:<oid>` symbol; ticker resolution lives upstream",
        }),
      );
    }

    const result = await this.http.request<KapDisclosureResponse>({
      url: `${KAP_BASE}/disclosure/search`,
      method: "POST",
      headers: this.apiKey ? { "X-KAP-Key": this.apiKey } : {},
      body: {
        fromDate: formatKapDate(input.from),
        toDate: formatKapDate(input.to),
        ...(memberOid ? { memberOid } : {}),
        lang: "tr",
      },
    });
    if (!result.ok) return result;

    const items: NewsItem[] = [];
    const raw = result.value.data?.disclosures ?? [];
    for (const row of raw) {
      if (!row.disclosureId || !row.title) continue;
      const published = row.publishDate ? new Date(row.publishDate) : new Date();
      items.push({
        title: row.title,
        url: row.url ?? `https://www.kap.org.tr/tr/Bildirim/${row.disclosureId}`,
        source: row.source ?? "kap",
        publishedAt: published,
        summary: row.summary ?? "",
        language: "tr",
        symbol: input.symbol ? input.symbol : null,
        sentiment: null,
        provider: KAP_PROVIDER,
      });
    }
    if (input.symbol && items.length === 0) {
      // KAP returns 200 with empty list for unknown tickers — surface as
      // not-found so the router can fall through instead of caching "no news".
      return err(
        new SymbolNotFoundError({
          provider: KAP_PROVIDER,
          symbol: input.symbol,
          message: "no disclosures for this member in window",
        }),
      );
    }
    return ok(items);
  }

  async getFinancialStatements(
    input: GetFinancialStatementsInput,
  ): Promise<Result<FinancialStatement[], MarketDataError>> {
    const memberOid = parseMemberOid(input.symbol);
    if (!memberOid) {
      return err(
        new SymbolNotFoundError({
          provider: KAP_PROVIDER,
          symbol: input.symbol,
          message: "KAP requires an `M:<oid>` symbol",
        }),
      );
    }

    const result = await this.http.request<KapFinancialResponse>({
      url: `${KAP_BASE}/mali-tablo/${memberOid}`,
      method: "GET",
      query: {
        period: input.period,
        statementType: input.statementType,
        limit: input.limit ?? 8,
      },
      headers: this.apiKey ? { "X-KAP-Key": this.apiKey } : {},
    });
    if (!result.ok) return result;

    const raw = result.value.data?.statements ?? [];
    const items: FinancialStatement[] = [];
    for (const row of raw) {
      if (!row.periodEnd) continue;
      items.push({
        symbol: input.symbol,
        statementType: input.statementType,
        period: input.period,
        periodEnd: new Date(row.periodEnd),
        fiscalYear: row.fiscalYear ?? new Date(row.periodEnd).getUTCFullYear(),
        currency: Currency("TRY"),
        rawData: row,
        provider: KAP_PROVIDER,
      });
    }
    return ok(items);
  }

  // ── Unsupported capabilities ─────────────────────────────────────

  getCandles(_input: GetCandlesInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: KAP_PROVIDER,
          capability: "candles",
        }),
      ),
    );
  }

  getQuote(_input: GetQuoteInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: KAP_PROVIDER,
          capability: "quote",
        }),
      ),
    );
  }

  getFinancialRatios(_input: GetFinancialRatiosInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: KAP_PROVIDER,
          capability: "financial_ratios",
        }),
      ),
    );
  }

  getFxRate(_input: GetFxRateInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: KAP_PROVIDER,
          capability: "fx",
        }),
      ),
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** `"M:12345"` → "12345"; null otherwise. */
function parseMemberOid(symbol: { toString(): string } | null | undefined): string | null {
  if (!symbol) return null;
  const raw = symbol.toString();
  if (!raw.startsWith("M:")) return null;
  const oid = raw.slice(2).trim();
  return /^\d+$/.test(oid) ? oid : null;
}

function formatKapDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// ── Raw response shapes (zod-validated by adapter internals) ─────────

interface KapDisclosureResponse {
  readonly disclosures?: ReadonlyArray<KapDisclosureRow>;
}

interface KapDisclosureRow {
  readonly disclosureId?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly url?: string;
  readonly source?: string;
  readonly publishDate?: string;
  readonly memberOid?: string;
}

interface KapFinancialResponse {
  readonly statements?: ReadonlyArray<KapFinancialRow>;
}

interface KapFinancialRow {
  readonly periodEnd?: string;
  readonly fiscalYear?: number;
  readonly [k: string]: unknown;
}
