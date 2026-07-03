/**
 * @openbulls/integrations — HMAC-SHA256 webhook signature helpers.
 *
 * Generic — used by Telegram webhook callbacks, inbound email parsers,
 * and any future service that wants to authenticate inbound HTTP
 * requests. The `secret` is shared between sender and receiver out of
 * band; it never appears in the request itself.
 *
 * Format: `sha256=<hex>` (GitHub-style). Headers can also carry the
 * raw hex; `verifyWebhookSignature` accepts both.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "sha256=";

/**
 * Sign `body` with `secret` and return the prefixed header value.
 */
export function signWebhookPayload(body: string | Buffer, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  return `${PREFIX}${hmac.digest("hex")}`;
}

/**
 * Verify `signatureHeader` against an HMAC of `body` with `secret`.
 * Accepts both `sha256=<hex>` (GitHub-style) and bare hex. Returns
 * `true` when valid.
 *
 * Uses `timingSafeEqual` so the comparison is constant-time. Caller
 * should treat `false` as "reject the request" (HTTP 401).
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = signWebhookPayload(body, secret);
  const provided = signatureHeader.startsWith(PREFIX)
    ? signatureHeader
    : `${PREFIX}${signatureHeader}`;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}
