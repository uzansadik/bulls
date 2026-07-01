/**
 * In-memory test fakes for repositories and gateways.
 *
 * Tests don't go through Drizzle; they substitute lightweight
 * fakes that satisfy the same `IPortfolioRepository` /
 * `IMarketDataQueryGateway` interfaces. The shape is intentionally
 * minimal — enough to exercise the application layer's
 * orchestration without mocking every code path.
 */
import { err, ok, type Result } from "@openbulls/shared";
import { Currency, type Money } from "../domain/brands";
import { AssetSymbol } from "../domain/symbol";
import { PortfolioId } from "../domain/brands";
import type {
  IPortfolioRepository,
  AddTransactionInput,
  CreatePortfolioInput,
  ListTransactionsQuery,
  UpsertHoldingInput,
} from "@openbulls/db";
import type {
  Portfolio,
  PortfolioTransaction,
  PortfolioHolding,
} from "@openbulls/db";
import type {
  IMarketDataQueryGateway,
  MarketDataQuote,
} from "../domain/ports/market-data.port";
import type { FxRate } from "../domain/fx-rate";
import { RepositoryError } from "../domain/errors";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export class InMemoryPortfolioRepository implements IPortfolioRepository {
  public readonly portfolios = new Map<string, Portfolio>();
  public readonly transactions = new Map<string, PortfolioTransaction>();
  public readonly holdings = new Map<string, PortfolioHolding>();

  private key(portfolioId: string, symbol: string): string {
    return `${portfolioId}|${symbol}`;
  }

  async create(input: CreatePortfolioInput): Promise<Portfolio> {
    const id = uid("portfolio");
    const now = new Date();
    const row: Portfolio = {
      id,
      userId: input.userId,
      name: input.name,
      baseCurrency: input.baseCurrency,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.portfolios.set(id, row);
    return row;
  }

  async listByUser(userId: string): Promise<Portfolio[]> {
    return [...this.portfolios.values()].filter((p) => p.userId === userId);
  }

  async getById(id: string): Promise<Portfolio | null> {
    return this.portfolios.get(id) ?? null;
  }

  async archive(id: string): Promise<void> {
    const p = this.portfolios.get(id);
    if (!p) return;
    this.portfolios.set(id, { ...p, isArchived: true, updatedAt: new Date() });
  }

  async insertTransaction(input: AddTransactionInput): Promise<PortfolioTransaction> {
    const id = uid("tx");
    const row: PortfolioTransaction = {
      id,
      portfolioId: input.portfolioId,
      assetSymbol: input.assetSymbol,
      side: input.side,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      fees: input.fees ?? "0",
      currency: input.currency,
      executedAt: input.executedAt,
      notes: input.notes ?? null,
      createdAt: new Date(),
    };
    this.transactions.set(id, row);
    return row;
  }

  async recordTransaction(input: AddTransactionInput): Promise<PortfolioTransaction> {
    return this.insertTransaction(input);
  }

  async upsertHolding(input: UpsertHoldingInput): Promise<void> {
    const k = this.key(input.portfolioId, input.assetSymbol);
    const existing = this.holdings.get(k);
    const now = new Date();
    const row: PortfolioHolding = {
      id: existing?.id ?? uid("holding"),
      portfolioId: input.portfolioId,
      assetSymbol: input.assetSymbol,
      quantity: input.quantity,
      avgCost: input.avgCost,
      realizedPnl: input.realizedPnl,
      lastComputedAt: now,
    };
    this.holdings.set(k, row);
  }

  async listTransactions(query: ListTransactionsQuery): Promise<PortfolioTransaction[]> {
    const filtered = [...this.transactions.values()].filter((t) => {
      if (query.portfolioId !== "" && t.portfolioId !== query.portfolioId) return false;
      if (query.from && t.executedAt < query.from) return false;
      if (query.to && t.executedAt > query.to) return false;
      if (query.side && t.side !== query.side) return false;
      return true;
    });
    filtered.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    if (query.limit !== undefined) return filtered.slice(0, query.limit);
    return filtered;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  async recomputeHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    return this.getHoldings(portfolioId);
  }

  async getHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    return [...this.holdings.values()].filter((h) => h.portfolioId === portfolioId);
  }
}

export class InMemoryMarketDataGateway implements IMarketDataQueryGateway {
  public readonly quotes = new Map<string, MarketDataQuote>();
  public readonly fxRates = new Map<string, FxRate>();

  public setQuote(symbol: string, price: string, ccy: string): void {
    this.quotes.set(symbol, {
      symbol: AssetSymbol(symbol),
      price: price as Money,
      currency: Currency(ccy),
      asOf: new Date(),
    });
  }

  public setFxRate(base: string, quote: string, rate: number): void {
    this.fxRates.set(`${base}|${quote}`, {
      base: Currency(base),
      quote: Currency(quote),
      rate,
      asOf: new Date(),
      provider: "test",
    });
  }

  async getQuote(input: { symbol: AssetSymbol }): Promise<Result<MarketDataQuote, RepositoryError>> {
    const q = this.quotes.get(input.symbol);
    if (!q) {
      return err(new RepositoryError({ operation: "getQuote", message: `no quote for ${input.symbol}` }));
    }
    return ok(q);
  }

  async getFxRate(input: {
    base: Currency;
    quote: Currency;
  }): Promise<Result<FxRate, RepositoryError>> {
    const key = `${input.base}|${input.quote}`;
    let r = this.fxRates.get(key);
    if (!r) {
      const inverse = this.fxRates.get(`${input.quote}|${input.base}`);
      if (inverse) {
        r = {
          base: input.base,
          quote: input.quote,
          rate: 1 / inverse.rate,
          asOf: inverse.asOf,
          provider: inverse.provider,
        };
      }
    }
    if (!r) {
      return err(new RepositoryError({ operation: "getFxRate", message: `no rate ${key}` }));
    }
    return ok(r);
  }
}

export function makeRepoWithPortfolio(
  repo: InMemoryPortfolioRepository,
  userId = "user-1",
  baseCurrency = "USD",
): Portfolio {
  const id = uid("portfolio");
  const now = new Date();
  const p: Portfolio = {
    id,
    userId,
    name: "Test",
    baseCurrency,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  repo.portfolios.set(id, p);
  return p;
}

export { PortfolioId };
