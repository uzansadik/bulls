/**
 * @openbulls/market-data — SEC EDGAR adapter.
 *
 * Public, keyless access to U.S. Securities and Exchange Commission
 * filings via the official `data.sec.gov` XBRL JSON endpoints.
 *
 * **User-Agent is required.** EDGAR silently drops requests without
 * a UA header (per their fair-access policy). The default UA used
 * here is conservative and identifying; production deployments
 * should override it.
 *
 * Capabilities:
 *
 *   - `financial_statements` → XBRL company facts (us-gaap taxonomy)
 *   - `financial_ratios`     → derived ratios (where us-gaap exposes them)
 *   - `news`                 → material-event filings (8-K, 10-K, 10-Q, ...)
 *
 * Candles / quote / fx return `UnsupportedCapabilityError`; the router
 * falls through to Yahoo / Twelve Data / TCMB for those.
 *
 * Sembol → CIK mapping: adapters accept a `C:<cik>` symbol (e.g.
 * `C:0000320193` for Apple). Ticker → CIK resolution lives in
 * `IAssetResolver` at the application layer.
 */
import { type Result, err, ok } from "@openbulls/shared";
import { Currency, ProviderName } from "../../domain/brands";
import {
  type MarketDataError,
  ParseError,
  SymbolNotFoundError,
  UnsupportedCapabilityError,
} from "../../domain/errors";
import type { FinancialRatio } from "../../domain/financial-ratio";
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

const SEC_PROVIDER = ProviderName("sec");
const SEC_BASE = "https://data.sec.gov";

const SEC_CAPABILITIES: ReadonlySet<AdapterCapability> = new Set<AdapterCapability>([
  "financial_statements",
  "financial_ratios",
  "news",
]);

interface SecOptions {
  readonly userAgent?: string;
  readonly logger?: LoggerLike;
}

/** us-gaap taxonomy concepts → FinancialStatement.statementType. */
const STATEMENT_FACTS: Record<string, "balance_sheet" | "income_statement" | "cash_flow"> = {
  // Balance sheet
  Assets: "balance_sheet",
  Liabilities: "balance_sheet",
  StockholdersEquity: "balance_sheet",
  // Income statement
  Revenues: "income_statement",
  NetIncomeLoss: "income_statement",
  OperatingIncomeLoss: "income_statement",
  GrossProfit: "income_statement",
  // Cash flow
  NetCashProvidedByUsedInOperatingActivities: "cash_flow",
  NetCashProvidedByUsedInInvestingActivities: "cash_flow",
  NetCashProvidedByUsedInFinancingActivities: "cash_flow",
};

const RATIO_FACTS: Record<string, string> = {
  EarningsPerShareBasic: "eps",
  EarningsPerShareDiluted: "epsDiluted",
};

export class SecEdgarAdapter implements MarketDataAdapter {
  readonly provider = SEC_PROVIDER;
  readonly capabilities = SEC_CAPABILITIES;

  private readonly http: HttpClient;
  private readonly logger: LoggerLike;
  private readonly userAgent: string;

  constructor(http: HttpClient, options: SecOptions = {}) {
    this.http = http;
    this.logger = options.logger ?? noopLogger;
    this.userAgent = options.userAgent ?? "Openbulls openbulls@app (mailto:hello@openbulls.app)";
  }

  async getFinancialStatements(
    input: GetFinancialStatementsInput,
  ): Promise<Result<FinancialStatement[], MarketDataError>> {
    const cik = parseCik(input.symbol);
    if (!cik) {
      const base: {
        provider: ProviderName;
        message: string;
        symbol?: typeof input.symbol;
      } = {
        provider: SEC_PROVIDER,
        message: "SEC adapter requires a `C:<10-digit-CIK>` symbol",
      };
      if (input.symbol) base.symbol = input.symbol;
      return err(new SymbolNotFoundError(base));
    }

    const result = await this.http.request<CompanyFactsResponse>({
      url: `${SEC_BASE}/api/xbrl/companyfacts/CIK${cik}.json`,
      method: "GET",
      headers: { "User-Agent": this.userAgent },
    });
    if (!result.ok) return result;

    const facts = result.value.data?.facts;
    if (!facts) {
      return err(new ParseError({ provider: SEC_PROVIDER, source: "companyfacts" }));
    }

    const items: FinancialStatement[] = [];
    const usGaap = facts["us-gaap"];
    if (!usGaap) return ok(items);

    for (const [concept, mapping] of Object.entries(STATEMENT_FACTS)) {
      if (mapping !== input.statementType) continue;
      const factBlock = usGaap[concept];
      if (!factBlock) continue;
      const limit = input.limit ?? 8;
      const units = factBlock.units ?? {};
      const usd = units.USD ?? units["USD/shares"] ?? [];
      const filtered = usd
        .filter((u) => u.form && /^(10-K|10-Q)$/.test(u.form))
        .filter((u) => (input.period === "annual" ? u.fp === "FY" : u.fp !== "FY"))
        .slice(0, limit);
      for (const u of filtered) {
        items.push({
          symbol: input.symbol,
          statementType: input.statementType,
          period: input.period,
          periodEnd: new Date(u.end),
          fiscalYear: Number.parseInt(u.fy ?? `${new Date(u.end).getUTCFullYear()}`, 10),
          currency: Currency(u.unit ?? "USD"),
          rawData: { concept, value: u.val, form: u.form, fp: u.fp, accn: u.accn },
          provider: SEC_PROVIDER,
        });
      }
    }

    return ok(items);
  }

  async getFinancialRatios(
    input: GetFinancialRatiosInput,
  ): Promise<Result<FinancialRatio[], MarketDataError>> {
    const cik = parseCik(input.symbol);
    if (!cik) {
      const base: {
        provider: ProviderName;
        message: string;
        symbol?: typeof input.symbol;
      } = {
        provider: SEC_PROVIDER,
        message: "SEC adapter requires a `C:<10-digit-CIK>` symbol",
      };
      if (input.symbol) base.symbol = input.symbol;
      return err(new SymbolNotFoundError(base));
    }

    const result = await this.http.request<CompanyFactsResponse>({
      url: `${SEC_BASE}/api/xbrl/companyfacts/CIK${cik}.json`,
      method: "GET",
      headers: { "User-Agent": this.userAgent },
    });
    if (!result.ok) return result;

    const usGaap = result.value.data?.facts?.["us-gaap"];
    if (!usGaap) return ok([]);

    const limit = input.limit ?? 8;
    const ratios: FinancialRatio[] = [];
    for (const [concept, key] of Object.entries(RATIO_FACTS)) {
      const block = usGaap[concept];
      if (!block) continue;
      const units = block.units ?? {};
      const usd = units["USD/shares"] ?? units.USD ?? [];
      const filtered = usd
        .filter((u) => u.form && /^(10-K|10-Q)$/.test(u.form))
        .filter((u) => (input.period === "annual" ? u.fp === "FY" : u.fp !== "FY"))
        .slice(0, limit);
      for (const u of filtered) {
        ratios.push({
          symbol: input.symbol,
          periodEnd: new Date(u.end),
          period: input.period,
          ratios: { [key]: u.val },
          provider: SEC_PROVIDER,
        });
      }
    }
    return ok(ratios);
  }

  async getNews(input: GetNewsInput): Promise<Result<NewsItem[], MarketDataError>> {
    const cik = parseCik(input.symbol);
    if (!cik) {
      const base: {
        provider: ProviderName;
        message: string;
        symbol?: typeof input.symbol;
      } = {
        provider: SEC_PROVIDER,
        message: "SEC adapter requires a `C:<10-digit-CIK>` symbol",
      };
      if (input.symbol) base.symbol = input.symbol;
      return err(new SymbolNotFoundError(base));
    }

    const result = await this.http.request<SubmissionsResponse>({
      url: `${SEC_BASE}/submissions/CIK${cik}.json`,
      method: "GET",
      headers: { "User-Agent": this.userAgent },
    });
    if (!result.ok) return result;

    const recent = result.value.data?.filings?.recent;
    if (!recent) return ok([]);

    const items: NewsItem[] = [];
    const forms = recent.form ?? [];
    const dates = recent.filingDate ?? [];
    const accns = recent.accessionNumber ?? [];
    const docs = recent.primaryDocument ?? [];
    const descs = recent.primaryDocDescription ?? [];

    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      if (!form) continue;
      // Material-event filings only.
      if (!/^(8-K|10-K|10-Q|S-1|DEF 14A)$/.test(form)) continue;
      const filingDate = dates[i];
      if (!filingDate) continue;
      const published = new Date(filingDate);
      if (published < input.from || published > input.to) continue;

      const accn = accns[i] ?? "";
      const doc = docs[i] ?? "";
      const accessionPath = accn.replace(/-/g, "");
      const url = accn
        ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionPath}/${doc}`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${form}`;

      items.push({
        title: `${form} — ${descs[i] ?? form}`,
        url,
        source: "sec-edgar",
        publishedAt: published,
        summary: `${form} filing by CIK ${cik}`,
        language: "en",
        symbol: input.symbol ? input.symbol : null,
        sentiment: null,
        provider: SEC_PROVIDER,
      });
    }

    const limit = input.limit ?? items.length;
    return ok(items.slice(0, limit));
  }

  // ── Unsupported capabilities ─────────────────────────────────────

  getCandles(_input: GetCandlesInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: SEC_PROVIDER,
          capability: "candles",
        }),
      ),
    );
  }

  getQuote(_input: GetQuoteInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: SEC_PROVIDER,
          capability: "quote",
        }),
      ),
    );
  }

  getFxRate(_input: GetFxRateInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: SEC_PROVIDER,
          capability: "fx",
        }),
      ),
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** `"C:0000320193"` → "0000320193"; null otherwise. */
function parseCik(symbol: { toString(): string } | null | undefined): string | null {
  if (!symbol) return null;
  const raw = symbol.toString();
  if (!raw.startsWith("C:")) return null;
  const cik = raw.slice(2).trim();
  return /^\d{6,10}$/.test(cik) ? cik : null;
}

// ── Response shapes (XBRL companyfacts + submissions) ────────────────

interface CompanyFactsResponse {
  readonly facts?: {
    readonly "us-gaap"?: Record<
      string,
      {
        readonly label?: string;
        readonly units?: Record<string, ReadonlyArray<FactUnit>>;
      }
    >;
  };
}

interface FactUnit {
  readonly val: number;
  readonly unit?: string;
  readonly end: string;
  readonly fy?: string;
  readonly fp?: string;
  readonly form?: string;
  readonly accn?: string;
}

interface SubmissionsResponse {
  readonly cik?: string;
  readonly filings?: {
    readonly recent?: {
      readonly form?: ReadonlyArray<string>;
      readonly filingDate?: ReadonlyArray<string>;
      readonly accessionNumber?: ReadonlyArray<string>;
      readonly primaryDocument?: ReadonlyArray<string>;
      readonly primaryDocDescription?: ReadonlyArray<string>;
    };
  };
}
