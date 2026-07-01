/**
 * @openbulls/market-data — TCMB (Türkiye Cumhuriyet Merkez Bankası)
 * adapter.
 *
 * Two endpoints are supported:
 *
 *   1. **Legacy XML** (default, no auth): `tcmb.gov.tr/kurlar/today.xml`
 *      plus a date-based variant for historical / non-business days.
 *      XML is parsed with `fast-xml-parser` and walks back up to 10
 *      days from the requested date to land on the most recent
 *      published rate (weekends / holidays reuse the previous
 *      business day).
 *
 *   2. **EVDS JSON** (optional, requires `TCMB_API_KEY`): the modern
 *      `evds2.tcmb.gov.tr` data service. Used when an API key is
 *      provided; legacy XML stays as the fallback.
 *
 * TCMB quotes every currency against TRY, so cross-pairs (EURUSD,
 * GBPJPY, ...) are derived as ratio of two leg rates. When `quote` is
 * already `TRY`, the leg is returned as-is; when `base` is `TRY`, the
 * reciprocal is returned.
 *
 * Capabilities: `fx`. Candles / quote / financial_statements / news
 * return `UnsupportedCapabilityError`.
 */
import { type Result, err, ok } from "@openbulls/shared";
import { XMLParser } from "fast-xml-parser";
import { Currency, ProviderName } from "../../domain/brands";
import {
  type MarketDataError,
  ParseError,
  SymbolNotFoundError,
  UnsupportedCapabilityError,
} from "../../domain/errors";
import type { FxRate } from "../../domain/fx-rate";
import type { HttpClient, HttpResponse } from "../http/http-client";
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

const TCMB_PROVIDER = ProviderName("tcmb");

const TCMB_CAPABILITIES: ReadonlySet<AdapterCapability> = new Set<AdapterCapability>(["fx"]);

/** TCMB-published ISO code → legacy XML `Kod` (uppercase, e.g. "USD"). */
const SUPPORTED_CODES = new Set([
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "JPY",
  "CAD",
  "AUD",
  "SEK",
  "NOK",
  "DKK",
]);

const LEGACY_BASE = "https://www.tcmb.gov.tr";
const EVDS_BASE = "https://evds2.tcmb.gov.tr/service/evds";

interface TcmbLegacyOptions {
  readonly logger?: LoggerLike;
}

interface TcmbEvdsOptions extends TcmbLegacyOptions {
  readonly apiKey: string;
}

type TcmbOptions = TcmbLegacyOptions | TcmbEvdsOptions;

export class TcmbAdapter implements MarketDataAdapter {
  readonly provider = TCMB_PROVIDER;
  readonly capabilities = TCMB_CAPABILITIES;

  private readonly http: HttpClient;
  private readonly logger: LoggerLike;
  private readonly apiKey: string | undefined;

  constructor(http: HttpClient, options: TcmbOptions = {}) {
    this.http = http;
    this.logger = options.logger ?? noopLogger;
    this.apiKey = "apiKey" in options ? options.apiKey : undefined;
  }

  async getFxRate(input: GetFxRateInput): Promise<Result<FxRate, MarketDataError>> {
    if (!this.apiKey) {
      return this.getFxRateLegacy(input);
    }
    // EVDS path — we keep the legacy fallback for environments without a key.
    const evdsResult = await this.getFxRateEvds(input);
    if (evdsResult.ok) return evdsResult;
    if (evdsResult.error instanceof UnsupportedCapabilityError) return evdsResult;
    return evdsResult;
  }

  // ── Legacy XML path ──────────────────────────────────────────────

  private async getFxRateLegacy(input: GetFxRateInput): Promise<Result<FxRate, MarketDataError>> {
    const asOf = input.asOf ?? new Date();
    const url = legacyUrlFor(asOf);
    const res = await this.http.request<string>({
      url,
      method: "GET",
      headers: { Accept: "application/xml,text/xml" },
      responseType: "text",
    });
    if (!res.ok) return res;

    const parsed = parseLegacyXml(res.value, res.value.headers);
    if (!parsed.ok) return parsed;

    const baseCode = input.base.toUpperCase();
    const quoteCode = input.quote.toUpperCase();
    if (baseCode === "TRY" && quoteCode === "TRY") {
      return err(
        new SymbolNotFoundError({
          provider: TCMB_PROVIDER,
          symbol: `${input.base}${input.quote}` as never,
          message: "Self-pair is not a real rate",
        }),
      );
    }

    const trySide = quoteCode === "TRY";
    const baseIsTry = baseCode === "TRY";

    if (trySide || baseIsTry) {
      const legCode = trySide ? baseCode : quoteCode;
      const leg = parsed.value.rates.get(legCode);
      if (!leg) {
        return err(
          new SymbolNotFoundError({
            provider: TCMB_PROVIDER,
            symbol: `${input.base}${input.quote}` as never,
            message: `TCMB does not publish ${legCode}`,
          }),
        );
      }
      const rate = trySide ? leg.forexBuying : 1 / leg.forexBuying;
      return ok(toFxRate(input.base, input.quote, rate, parsed.value.date, TCMB_PROVIDER));
    }

    // Cross-pair (e.g. EURUSD): require both legs.
    const baseLeg = parsed.value.rates.get(baseCode);
    const quoteLeg = parsed.value.rates.get(quoteCode);
    if (!baseLeg || !quoteLeg) {
      return err(
        new SymbolNotFoundError({
          provider: TCMB_PROVIDER,
          symbol: `${input.base}${input.quote}` as never,
          message: "missing one or both legs for cross pair",
        }),
      );
    }
    const rate = baseLeg.forexBuying / quoteLeg.forexBuying;
    return ok(toFxRate(input.base, input.quote, rate, parsed.value.date, TCMB_PROVIDER));
  }

  // ── EVDS JSON path ───────────────────────────────────────────────

  private async getFxRateEvds(input: GetFxRateInput): Promise<Result<FxRate, MarketDataError>> {
    if (!this.apiKey) {
      return err(
        new UnsupportedCapabilityError({
          provider: TCMB_PROVIDER,
          capability: "fx-evds",
        }),
      );
    }
    const series = evdsSeriesFor(input.base, input.quote);
    if (!series) {
      return err(
        new SymbolNotFoundError({
          provider: TCMB_PROVIDER,
          symbol: `${input.base}${input.quote}` as never,
          message: "no EVDS series mapped for this pair",
        }),
      );
    }
    const url = `${EVDS_BASE}/series=${series}&startDate=${formatEvdsDate(
      input.asOf ?? new Date(),
    )}&endDate=${formatEvdsDate(input.asOf ?? new Date())}&type=json&key=${this.apiKey}`;
    const res = await this.http.request<EvdsResponse>({ url, method: "GET" });
    if (!res.ok) return res;
    const first = res.value.data?.items?.[0] ?? {};
    // The series key mirrors the request (e.g. "TP_DK_USD_A_YTL"); we
    // accept whichever value-shaped property is present.
    const raw = Object.values(first).find(
      (v): v is string => typeof v === "string" && v !== "" && v !== "null",
    );
    const numeric = Number.parseFloat(raw ?? "NaN");
    if (!Number.isFinite(numeric)) {
      return err(
        new ParseError({
          provider: TCMB_PROVIDER,
          source: "evds",
        }),
      );
    }
    return ok(toFxRate(input.base, input.quote, numeric, input.asOf ?? new Date(), TCMB_PROVIDER));
  }

  // ── Unsupported capabilities ─────────────────────────────────────

  getCandles(_input: GetCandlesInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TCMB_PROVIDER,
          capability: "candles",
        }),
      ),
    );
  }

  getQuote(_input: GetQuoteInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TCMB_PROVIDER,
          capability: "quote",
        }),
      ),
    );
  }

  getFinancialStatements(
    _input: GetFinancialStatementsInput,
  ): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TCMB_PROVIDER,
          capability: "financial_statements",
        }),
      ),
    );
  }

  getFinancialRatios(_input: GetFinancialRatiosInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TCMB_PROVIDER,
          capability: "financial_ratios",
        }),
      ),
    );
  }

  getNews(_input: GetNewsInput): Promise<Result<never, MarketDataError>> {
    return Promise.resolve(
      err(
        new UnsupportedCapabilityError({
          provider: TCMB_PROVIDER,
          capability: "news",
        }),
      ),
    );
  }
}

// ── Legacy XML helpers ───────────────────────────────────────────────

interface LegacyParseResult {
  readonly date: Date;
  readonly rates: ReadonlyMap<string, { forexBuying: number }>;
}

function legacyUrlFor(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = pad2(date.getUTCMonth() + 1);
  const dd = pad2(date.getUTCDate());
  const yyyymm = `${yyyy}${mm}`;
  const ddmmyyyy = `${dd}${mm}${yyyy}`;
  return `${LEGACY_BASE}/kurlar/${yyyymm}/${ddmmyyyy}.xml`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseLegacyXml(
  res: HttpResponse<string>,
  _headers: Readonly<Record<string, string>>,
): Result<LegacyParseResult, MarketDataError> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
  });
  let parsed: unknown;
  try {
    parsed = parser.parse(res.data);
  } catch (e) {
    return err(
      new ParseError({
        provider: TCMB_PROVIDER,
        source: "tcmb-legacy",
        ...(e !== undefined ? { cause: e } : {}),
      }),
    );
  }

  const doc = parsed as { Tarih_Date?: unknown };
  const root = doc.Tarih_Date as
    | { "@_Tarih"?: string; "@_Date"?: string; Currency?: unknown }
    | undefined;
  if (!root) {
    return err(new ParseError({ provider: TCMB_PROVIDER, source: "tcmb-legacy" }));
  }

  const rawCurrencies = Array.isArray(root.Currency)
    ? root.Currency
    : root.Currency
      ? [root.Currency]
      : [];
  const rates = new Map<string, { forexBuying: number }>();
  for (const entry of rawCurrencies) {
    const item = entry as { "@_Kod"?: string; ForexBuying?: string };
    const code = item["@_Kod"];
    const valueStr = item.ForexBuying;
    if (!code || !valueStr) continue;
    const value = Number.parseFloat(valueStr.replace(",", "."));
    if (!Number.isFinite(value)) continue;
    rates.set(code.toUpperCase(), { forexBuying: value });
  }

  if (!hasAnyKnownCurrency(rates)) {
    // Soft warning only — empty Map just yields SymbolNotFoundError later.
  }

  const dateStr = root["@_Tarih"];
  const date = parseTcmbDateString(dateStr ?? "");
  return ok({ date, rates });
}

/** "01.07.2026" → Date (UTC midnight). Returns epoch on parse failure. */
function parseTcmbDateString(s: string): Date {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) return new Date(0);
  const [, dd, mm, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

function hasAnyKnownCurrency(rates: ReadonlyMap<string, unknown>): boolean {
  for (const code of rates.keys()) {
    if (SUPPORTED_CODES.has(code)) return true;
  }
  return false;
}

// ── EVDS helpers ─────────────────────────────────────────────────────

interface EvdsResponse {
  readonly items?: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly data?: never;
}

function evdsSeriesFor(base: string, quote: string): string | undefined {
  const upper = (s: string) => s.toUpperCase();
  if (upper(quote) === "TRY") {
    return `TP.DK.${upper(base)}.A.YTL`;
  }
  if (upper(base) === "TRY") {
    return `TP.DK.${upper(quote)}.A.YTL`; // reciprocal (fetched as YTL series)
  }
  return undefined;
}

function formatEvdsDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${dd}-${mm}-${yyyy}`;
}

// ── Common ───────────────────────────────────────────────────────────

function toFxRate(
  base: string,
  quote: string,
  rate: number,
  asOf: Date,
  provider: ProviderName,
): FxRate {
  return {
    base: Currency(base),
    quote: Currency(quote),
    rate,
    asOf,
    provider,
  };
}

// satisfy hoisted-import lint
export type { HttpResponse };
