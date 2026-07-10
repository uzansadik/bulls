/**
 * @openbulls/notifications — branded primitive tests.
 *
 * The brand wrappers are identity casts — we verify the cast
 * surface stays stable so other modules can rely on the nominal
 * distinction (`ChannelId` vs `NotificationId`).
 */
import { describe, expect, it } from "vitest";

import { ChannelId, NotificationId } from "./brands";

describe("notifications/brands", () => {
  it("ChannelId is an identity-cast (string passes through)", () => {
    const raw = "11111111-1111-4111-8111-111111111111";
    expect(ChannelId(raw)).toBe(raw);
  });

  it("NotificationId is an identity-cast (string passes through)", () => {
    const raw = "22222222-2222-4222-8222-222222222222";
    expect(NotificationId(raw)).toBe(raw);
  });
});
