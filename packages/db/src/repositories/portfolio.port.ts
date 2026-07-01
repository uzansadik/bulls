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

export interface IPortfolioRepository {
  create(input: CreatePortfolioInput): Promise<Portfolio>;
  listByUser(userId: string): Promise<Portfolio[]>;
  getById(id: string): Promise<Portfolio | null>;
  recordTransaction(input: AddTransactionInput): Promise<PortfolioTransaction>;
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
