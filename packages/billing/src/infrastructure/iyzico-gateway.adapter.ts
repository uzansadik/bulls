/**
 * @openbulls/billing — Iyzico gateway + webhook verifier.
 *
 * Iyzico's REST API is JSON-based and signs outgoing requests with
 * `Authorization: IYZWSv2 base64(apiKey + secretKey + uri + bodyHash)`
 * where `bodyHash = sha256(body)`. Webhook verification uses
 * `IYZWSv2 base64(apiKey + secretKey + uri + bodyHash)` over the
 * inbound request.
 *
 * Note: iyzico's exact header / signature format has evolved —
 *   always cross-check with the latest iyzico docs in production.
 *   This adapter implements the documented v2 scheme as of writing.
 */
import { createHash } from "node:crypto";

import type { PaymentProvider } from "@openbulls/db/schema";

import type {
  BillingSubscriptionResult,
  CancelSubscriptionRequest,
  CreateSubscriptionRequest,
  IPaymentGateway,
} from "../domain/ports/payment-gateway.port";
import type { IWebhookVerifier, VerifyWebhookInput } from "../domain/ports/webhook.port";

const IYZICO_API_BASE = "https://api.iyzipay.com";

type IyzicoStatus = BillingSubscriptionResult["status"];

export interface IyzicoGatewayOptions {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class IyzicoBillingGateway implements IPaymentGateway {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: IyzicoGatewayOptions) {
    this.apiKey = opts.apiKey;
    this.secretKey = opts.secretKey;
    this.baseUrl = opts.baseUrl ?? IYZICO_API_BASE;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async createSubscription(req: CreateSubscriptionRequest): Promise<BillingSubscriptionResult> {
    if (req.provider !== "iyzico") {
      throw new Error(`IyzicoBillingGateway cannot handle provider ${req.provider}`);
    }
    const body = {
      locale: "tr",
      conversationId: cryptoRandomId(),
      pricingPlanReferenceCode: req.planExternalId,
      subscriptionInitialStatus: "ACTIVE",
    };
    const uri = "/v2/subscription/products";
    const res = await this.iyzicoFetch(uri, "POST", body);
    const data = res.data as {
      referenceCode: string;
      status?: string;
      startDate?: number;
      endDate?: number;
    };
    const result: BillingSubscriptionResult = {
      externalSubscriptionId: data.referenceCode,
      status: mapIyzicoStatus(data.status),
      provider: "iyzico",
    };
    const start = fromMillis(data.startDate);
    if (start) result.currentPeriodStart = start;
    const end = fromMillis(data.endDate);
    if (end) result.currentPeriodEnd = end;
    return result;
  }

  async cancelSubscription(req: CancelSubscriptionRequest): Promise<void> {
    if (req.provider !== "iyzico") {
      throw new Error(`IyzicoBillingGateway cannot handle provider ${req.provider}`);
    }
    const uri = "/v2/subscription/cancel";
    await this.iyzicoFetch(uri, "POST", {
      locale: "tr",
      conversationId: cryptoRandomId(),
      subscriptionReferenceCode: req.externalSubscriptionId,
    });
  }

  async getSubscription(
    provider: PaymentProvider,
    externalSubscriptionId: string,
  ): Promise<BillingSubscriptionResult | null> {
    if (provider !== "iyzico") return null;
    const uri = "/v2/subscription/retrieve";
    try {
      const res = await this.iyzicoFetch(uri, "POST", {
        locale: "tr",
        conversationId: cryptoRandomId(),
        subscriptionReferenceCode: externalSubscriptionId,
      });
      const data = res.data as {
        referenceCode: string;
        status?: string;
        startDate?: number;
        endDate?: number;
      };
      const result: BillingSubscriptionResult = {
        externalSubscriptionId: data.referenceCode,
        status: mapIyzicoStatus(data.status),
        provider: "iyzico",
      };
      const start = fromMillis(data.startDate);
      if (start) result.currentPeriodStart = start;
      const end = fromMillis(data.endDate);
      if (end) result.currentPeriodEnd = end;
      return result;
    } catch (e) {
      if (e instanceof Error && /not.?found/i.test(e.message)) return null;
      throw e;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.iyzicoFetch("/v2/ping", "GET");
      return true;
    } catch {
      return false;
    }
  }

  private async iyzicoFetch(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<{ status: string; data: unknown }> {
    const uri = path;
    const bodyStr = body === undefined ? "" : JSON.stringify(body);
    const bodyHash = createHash("sha256").update(bodyStr).digest("hex");
    const authValue = Buffer.from(`${this.apiKey}${this.secretKey}${uri}${bodyHash}`).toString(
      "base64",
    );

    const init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      method,
      headers: {
        Authorization: `IYZWSv2 ${authValue}`,
        "Content-Type": "application/json",
        "x-iyzi-rnd": cryptoRandomId(),
      },
    };
    if (method === "POST") init.body = bodyStr;

    const res = await this.fetchImpl(`${this.baseUrl}${uri}`, init as RequestInit);
    if (!res.ok) {
      throw new Error(`iyzico ${method} ${uri} failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as { status: string; data: unknown };
  }
}

export class IyzicoWebhookVerifier implements IWebhookVerifier {
  readonly provider = "iyzico" as const;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(opts: { apiKey: string; secretKey: string }) {
    this.apiKey = opts.apiKey;
    this.secretKey = opts.secretKey;
  }

  verify(input: VerifyWebhookInput): boolean {
    const prefix = "IYZWSv2 ";
    if (!input.signature.startsWith(prefix)) return false;
    const provided = input.signature.slice(prefix.length);

    const bodyHash = createHash("sha256").update(input.rawBody).digest("hex");
    const uri = "/v2/subscription/notification";
    const expected = Buffer.from(`${this.apiKey}${this.secretKey}${uri}${bodyHash}`).toString(
      "base64",
    );
    if (provided.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < provided.length; i++) {
      diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function mapIyzicoStatus(s: string | undefined): IyzicoStatus {
  if (!s) return "pending";
  const upper = s.toUpperCase();
  if (upper === "ACTIVE") return "active";
  if (upper === "TRIAL") return "trialing";
  if (upper === "PENDING") return "pending";
  if (upper === "PAUSED" || upper === "SUSPENDED") return "paused";
  if (upper === "CANCELED" || upper === "CANCELLED") return "canceled";
  if (upper === "EXPIRED" || upper === "UNPAID") return "past_due";
  return "pending";
}

function fromMillis(ms?: number): Date | undefined {
  if (typeof ms !== "number") return undefined;
  return new Date(ms);
}

function cryptoRandomId(): string {
  return globalThis.crypto.randomUUID();
}
