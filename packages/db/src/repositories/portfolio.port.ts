import type {
  NewPortfolio,
  NewPortfolioTransaction,
  Portfolio,
  PortfolioHolding,
  PortfolioTransaction,
} from "../schema/portfolio.schema";

export interface CreatePortfolioInput {
  userId: string;
  name: string;
  baseCurrency: string;
}

export interface AddTransactionInput {
  portfolioId: string;
  assetSymbol: string;
  side: PortfolioTransaction["side"];
  quantity: string;
  unitPrice: string;
  fees?: string;
  currency: string;
  executedAt: Date;
  notes?: string;
}

export interface ListTransactionsQuery {
  portfolioId: string;
  from?: Date;
  to?: Date;
  side?: PortfolioTransaction["side"];
  limit?: number;
}

export interface IPortfolioRepository {
  create(input: CreatePortfolioInput): Promise<Portfolio>;
  listByUser(userId: string): Promise<Portfolio[]>;
  getById(id: string): Promise<Portfolio | null>;
  archive(id: string): Promise<void>;
  recordTransaction(input: AddTransactionInput): Promise<PortfolioTransaction>;
  listTransactions(query: ListTransactionsQuery): Promise<PortfolioTransaction[]>;
  deleteTransaction(id: string): Promise<void>;
  recomputeHoldings(portfolioId: string): Promise<PortfolioHolding[]>;
  getHoldings(portfolioId: string): Promise<PortfolioHolding[]>;
}

export type {
  NewPortfolio,
  NewPortfolioTransaction,
  Portfolio,
  PortfolioHolding,
  PortfolioTransaction,
};
