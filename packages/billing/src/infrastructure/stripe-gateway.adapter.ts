/**
 * @openbulls/billing — Stripe gateway + webhook verifier.
 *
 * `StripeBillingGateway` is an `IPaymentGateway` impl that hits the
 * Stripe REST API via raw `fetch`. The official `stripe` SDK is
 * intentionally avoided here so we don't pay its bundle / dep cost
 * until we need its webhook auto-handling. Replace later with the
 * SDK if/when the call site grows beyond 4-5 endpoints.
 *
 * `StripeWebhookVerifier` implements HMAC-SHA256 verification of
 * the `Stripe-Signature` header per the official spec:
 *   header = "t=<unix>,v1=<hex hmac of `${t}.${body}` with webhook secret>"
 *   signature is rejected if `|now - t| > toleranceSeconds`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentProvider } from "@openbulls/db/schema";

import type {
  BillingSubscriptionResult,
  CancelSubscriptionRequest,
  CreateSubscriptionRequest,
  IPaymentGateway,
} from "../domain/ports/payment-gateway.port";
import type { IWebhookVerifier, VerifyWebhookInput } from "../domain/ports/webhook.port";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const DEFAULT_TOLERANCE_SECONDS = 300;

type StripeStatus = BillingSubscriptionResult["status"];
type StripeInit = {
  method: string;
  headers: Record<string, string>;
  body?: string;
};

export interface StripeGatewayOptions {
  secretKey: string;
  webhookSecret: string;
  fetchImpl?: typeof fetch;
  toleranceSeconds?: number;
}

export class StripeBillingGateway implements IPaymentGateway {
  private readonly secretKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: StripeGatewayOptions) {
    this.secretKey = opts.secretKey;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async createSubscription(req: CreateSubscriptionRequest): Promise<BillingSubscriptionResult> {
    if (req.provider !== "stripe") {
      throw new Error(`StripeBillingGateway cannot handle provider ${req.provider}`);
    }
    const form = new URLSearchParams();
    form.append("items[0][price]", req.planExternalId);
    form.append("metadata[userId]", req.userId);
    if (req.customerEmail) form.append("customer_email", req.customerEmail);
    if (req.metadata) {
      for (const [k, v] of Object.entries(req.metadata)) {
        form.append(`metadata[${k}]`, v);
      }
    }
    form.append("payment_behavior", "default_incomplete");

    const init: StripeInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    };
    const res = await this.fetchImpl(`${STRIPE_API_BASE}/subscriptions`, init as RequestInit);
    if (!res.ok) {
      throw new Error(`stripe createSubscription failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      id: string;
      status: string;
      customer: string;
      current_period_start?: number;
      current_period_end?: number;
    };
    const result: BillingSubscriptionResult = {
      externalSubscriptionId: data.id,
      externalCustomerId: data.customer,
      status: mapStripeStatus(data.status),
      provider: "stripe",
    };
    const start = fromUnix(data.current_period_start);
    if (start) result.currentPeriodStart = start;
    const end = fromUnix(data.current_period_end);
    if (end) result.currentPeriodEnd = end;
    return result;
  }

  async cancelSubscription(req: CancelSubscriptionRequest): Promise<void> {
    if (req.provider !== "stripe") {
      throw new Error(`StripeBillingGateway cannot handle provider ${req.provider}`);
    }
    const init: StripeInit = {
      method: req.atPeriodEnd ? "POST" : "DELETE",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    };
    if (req.atPeriodEnd) {
      init.body = new URLSearchParams({ cancel_at_period_end: "true" }).toString();
    }
    const res = await this.fetchImpl(
      `${STRIPE_API_BASE}/subscriptions/${encodeURIComponent(req.externalSubscriptionId)}`,
      init as RequestInit,
    );
    if (!res.ok) {
      throw new Error(`stripe cancelSubscription failed: ${res.status} ${await res.text()}`);
    }
  }

  async getSubscription(
    provider: PaymentProvider,
    externalSubscriptionId: string,
  ): Promise<BillingSubscriptionResult | null> {
    if (provider !== "stripe") return null;
    const res = await this.fetchImpl(
      `${STRIPE_API_BASE}/subscriptions/${encodeURIComponent(externalSubscriptionId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.secretKey}` },
      } as RequestInit,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`stripe getSubscription failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      id: string;
      status: string;
      customer: string;
      current_period_start?: number;
      current_period_end?: number;
    };
    const result: BillingSubscriptionResult = {
      externalSubscriptionId: data.id,
      externalCustomerId: data.customer,
      status: mapStripeStatus(data.status),
      provider: "stripe",
    };
    const start = fromUnix(data.current_period_start);
    if (start) result.currentPeriodStart = start;
    const end = fromUnix(data.current_period_end);
    if (end) result.currentPeriodEnd = end;
    return result;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.fetchImpl(`${STRIPE_API_BASE}/balance`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.secretKey}` },
      } as RequestInit);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export class StripeWebhookVerifier implements IWebhookVerifier {
  readonly provider = "stripe" as const;
  private readonly secret: string;
  private readonly toleranceSeconds: number;

  constructor(opts: { webhookSecret: string; toleranceSeconds?: number }) {
    this.secret = opts.webhookSecret;
    this.toleranceSeconds = opts.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  }

  verify(input: VerifyWebhookInput): boolean {
    const parts = parseStripeHeader(input.signature);
    if (!parts || !parts.timestamp || !parts.signature) return false;

    const ts = Number.parseInt(parts.timestamp, 10);
    if (!Number.isFinite(ts)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > (input.toleranceSeconds ?? this.toleranceSeconds)) {
      return false;
    }

    const expected = createHmac("sha256", this.secret)
      .update(`${parts.timestamp}.${input.rawBody}`)
      .digest();
    const provided = Buffer.from(parts.signature, "hex");
    if (provided.length !== expected.length) return false;
    try {
      return timingSafeEqual(expected, provided);
    } catch {
      return false;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function mapStripeStatus(s: string): StripeStatus {
  if (s === "active") return "active";
  if (s === "trialing") return "active";
  if (s === "past_due") return "past_due";
  if (s === "paused") return "paused";
  if (s === "canceled" || s === "incomplete_expired" || s === "unpaid") {
    return "canceled";
  }
  return "pending";
}

function fromUnix(unix?: number): Date | undefined {
  if (typeof unix !== "number") return undefined;
  return new Date(unix * 1000);
}

function parseStripeHeader(header: string): {
  timestamp: string;
  signature: string;
} | null {
  const parts: Record<string, string> = {};
  for (const chunk of header.split(",")) {
    const idx = chunk.indexOf("=");
    if (idx === -1) continue;
    const k = chunk.slice(0, idx).trim();
    const v = chunk.slice(idx + 1).trim();
    if (k) parts[k] = v;
  }
  if (!parts.t || !parts.v1) return null;
  return { timestamp: parts.t, signature: parts.v1 };
}
