/**
 * @openbulls/billing — environment access for billing adapters.
 *
 * Server only — never imported into client bundles. Wraps
 * `@openbulls/config`'s memoized `serverEnv()` so adapters can
 * require the keys they need at construction time and surface a
 * clear `BillingError` when a provider is selected but its key is
 * missing.
 */
import { type ServerEnv, serverEnv } from "@openbulls/config";

export function billingEnv(): ServerEnv {
  return serverEnv();
}

export function requireStripeKeys(env: ServerEnv): {
  secretKey: string;
  webhookSecret: string;
} {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required to construct StripeBillingGateway");
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required to construct StripeWebhookVerifier");
  }
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  };
}

export function requireIyzicoKeys(env: ServerEnv): {
  apiKey: string;
  secretKey: string;
} {
  if (!env.IYZICO_API_KEY) {
    throw new Error("IYZICO_API_KEY is required to construct IyzicoBillingGateway");
  }
  if (!env.IYZICO_SECRET_KEY) {
    throw new Error("IYZICO_SECRET_KEY is required to construct IyzicoBillingGateway");
  }
  return {
    apiKey: env.IYZICO_API_KEY,
    secretKey: env.IYZICO_SECRET_KEY,
  };
}
