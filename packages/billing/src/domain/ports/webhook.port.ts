/**
 * @openbulls/billing — webhook signature verification port.
 *
 * Stripe / Iyzico each sign incoming webhooks with HMAC over the
 * raw body using a shared secret. The verifier returns `true`
 * only when the signature is well-formed and matches; any other
 * outcome (missing header, malformed signature, expired timestamp)
 * returns `false` and the use case surfaces `WebhookSignatureError`.
 *
 * The verifier is intentionally side-effect-free: no DB access,
 * no provider HTTP call. Its sole concern is cryptographic
 * comparison.
 */
export interface VerifyWebhookInput {
  /** Raw request body (NOT JSON.parse'd). */
  rawBody: string;
  /** The provider's signature header verbatim. */
  signature: string;
  /** Optional tolerance window for replay attacks. */
  toleranceSeconds?: number;
}

export type Provider = "stripe" | "iyzico";

export interface IWebhookVerifier {
  provider: Provider;
  verify(input: VerifyWebhookInput): boolean;
}
