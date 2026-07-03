/**
 * @openbulls/integrations — `webhook-signature` round-trip + tamper tests.
 */
import { describe, expect, it } from "vitest";

import { signWebhookPayload, verifyWebhookSignature } from "./webhook-signature";

const SECRET = "shared-secret-not-committed-please";

describe("signWebhookPayload + verifyWebhookSignature", () => {
  it("verifies a fresh signature", () => {
    const body = JSON.stringify({ event: "ping" });
    const sig = signWebhookPayload(body, SECRET);
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });

  it("accepts both prefixed and bare hex signatures", () => {
    const body = "raw payload";
    const sig = signWebhookPayload(body, SECRET);
    const bare = sig.replace(/^sha256=/, "");
    expect(verifyWebhookSignature(body, bare, SECRET)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const body = '{"amount":100}';
    const sig = signWebhookPayload(body, SECRET);
    expect(verifyWebhookSignature('{"amount":999}', sig, SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = "payload";
    const sig = signWebhookPayload(body, SECRET);
    expect(verifyWebhookSignature(body, sig, "different-secret")).toBe(false);
  });

  it("rejects a malformed signature", () => {
    const body = "payload";
    expect(verifyWebhookSignature(body, "totally-invalid", SECRET)).toBe(false);
  });

  it("works with Buffer body", () => {
    const body = Buffer.from("binary-payload");
    const sig = signWebhookPayload(body, SECRET);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });
});
