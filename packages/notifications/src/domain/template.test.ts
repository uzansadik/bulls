/**
 * @openbulls/notifications — template renderer tests.
 *
 * Locks in the contract:
 *   - `{{var}}` substitution with empty fallback for missing keys
 *   - All built-in templates render without throwing
 *   - Unknown kind returns a fallback title + the `message` payload
 *     (so the dispatcher never loses a notification because of a
 *     typo in the kind slug).
 */
import { describe, expect, it } from "vitest";

import { renderTemplate, substituteVariables } from "./template";

describe("notifications/template — substituteVariables", () => {
  it("substitutes a single var", () => {
    expect(substituteVariables("hello {{name}}", { name: "world" })).toBe("hello world");
  });

  it("substitutes multiple vars", () => {
    expect(
      substituteVariables("{{a}} + {{b}} = {{c}}", {
        a: "1",
        b: "2",
        c: "3",
      }),
    ).toBe("1 + 2 = 3");
  });

  it("renders empty string for missing keys (not undefined)", () => {
    expect(substituteVariables("x={{missing}}", {})).toBe("x=");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(substituteVariables("hi {{ name }}", { name: "ada" })).toBe("hi ada");
  });
});

describe("notifications/template — renderTemplate (built-in kinds)", () => {
  it("renders price_alert", () => {
    const out = renderTemplate("price_alert", {
      symbol: "THYAO",
      threshold: "120",
      last: "123.4",
      direction: "up",
    });
    expect(out.title).toBe("💰 Price alert");
    expect(out.body).toBe("THYAO crossed 120 (last: 123.4). Direction: up.");
  });

  it("renders portfolio_review", () => {
    const out = renderTemplate("portfolio_review", { kind: "weekly" });
    expect(out.title).toContain("Portfolio review");
    expect(out.body).toContain("weekly");
  });

  it("renders news_watch with count", () => {
    const out = renderTemplate("news_watch", { count: 7 });
    expect(out.body).toBe("7 new headlines matching your watchlist.");
  });

  it("falls back to system template when kind is unknown", () => {
    const out = renderTemplate("not_a_real_kind", { message: "hello" });
    expect(out.title).toBe("🔔 Openbulls");
    expect(out.body).toBe("hello");
  });
});
