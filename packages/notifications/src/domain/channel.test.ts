/**
 * @openbulls/notifications — channel value object tests.
 *
 * Verifies the Zod schemas that gate the `config` JSONB column
 * (telegram-only in Faz 6). Also exercises the discriminated-union
 * behavior for the future email / web-push kinds.
 */
import { describe, expect, it } from "vitest";

import { channelConfigSchema, telegramConfigSchema } from "./channel";

describe("notifications/channel — telegramConfigSchema", () => {
  it("accepts a valid telegram config", () => {
    const res = telegramConfigSchema.safeParse({ chatId: "123456789" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.chatId).toBe("123456789");
    }
  });

  it("accepts languageCode when present", () => {
    const res = telegramConfigSchema.safeParse({
      chatId: "1",
      languageCode: "tr-TR",
    });
    expect(res.success).toBe(true);
  });

  it("rejects empty chatId", () => {
    const res = telegramConfigSchema.safeParse({ chatId: "" });
    expect(res.success).toBe(false);
  });

  it("rejects missing chatId", () => {
    const res = telegramConfigSchema.safeParse({});
    expect(res.success).toBe(false);
  });
});

describe("notifications/channel — channelConfigSchema (discriminated union)", () => {
  it("accepts telegram kind", () => {
    const res = channelConfigSchema.safeParse({
      kind: "telegram",
      config: { chatId: "999" },
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown kind (forward-compat: email is future)", () => {
    const res = channelConfigSchema.safeParse({
      kind: "email",
      config: { address: "x@y" },
    });
    expect(res.success).toBe(false);
  });

  it("rejects missing kind", () => {
    const res = channelConfigSchema.safeParse({
      config: { chatId: "1" },
    });
    expect(res.success).toBe(false);
  });
});
