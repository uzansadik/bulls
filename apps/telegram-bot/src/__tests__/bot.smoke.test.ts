/**
 * apps/telegram-bot — bot composition + command unit tests.
 *
 * Each make*Handler factory is invoked directly with a fake Context
 * whose reply is a vi.fn(). Avoids the grammy bot.handleUpdate path
 * (which goes through the real Api proxy and needs network
 * roundtrips + botInfo that don't add real coverage for handlers).
 */
import { describe, expect, it, vi } from "vitest";

import type { Context } from "grammy";

import { logger as pinoLogger } from "@openbulls/logger";

import { type CommandDeps, createBot } from "../bot";
import { makeAnalyzeHandler } from "../commands/analyze";
import { makeBalanceHandler } from "../commands/balance";
import { makeHelpHandler } from "../commands/help";
import { makeNotifyHandler } from "../commands/notify";
import { makePortfolioHandler } from "../commands/portfolio";
import { makeStartHandler } from "../commands/start";

const baseDeps: CommandDeps = {
  start: { logger: pinoLogger },
  balance: { logger: pinoLogger },
  portfolio: { logger: pinoLogger },
  analyze: { logger: pinoLogger },
  notify: { logger: pinoLogger },
};

function makeCtx(overrides: Partial<Context> = {}): {
  ctx: Context;
  reply: ReturnType<typeof vi.fn>;
} {
  const reply = vi.fn(async () => undefined);
  const ctx = {
    from: { id: 1, is_bot: false, first_name: "test" },
    chat: { id: 100, type: "private" },
    match: "",
    reply,
    ...overrides,
  } as unknown as Context;
  return { ctx, reply };
}

describe("bot composition", () => {
  it("createBot registers all six commands without throwing", () => {
    expect(() => createBot({ token: "test-token", logger: pinoLogger }, baseDeps)).not.toThrow();
  });
});

describe("/start", () => {
  it("greets when no link token is given", async () => {
    const { ctx, reply } = makeCtx({ match: "" });
    await makeStartHandler(baseDeps.start)(ctx);
    expect(reply).toHaveBeenCalledOnce();
    expect(String(reply.mock.calls[0]?.[0])).toContain("Welcome to Openbulls");
  });

  it("acknowledges a link token without binding yet", async () => {
    const { ctx, reply } = makeCtx({ match: "abc123" });
    await makeStartHandler(baseDeps.start)(ctx);
    expect(reply).toHaveBeenCalledOnce();
    expect(String(reply.mock.calls[0]?.[0])).toContain("Linking token received");
  });
});

describe("/balance", () => {
  it("returns the Faz 6 skeleton message", async () => {
    const { ctx, reply } = makeCtx();
    await makeBalanceHandler(baseDeps.balance)(ctx);
    expect(reply).toHaveBeenCalledOnce();
    expect(String(reply.mock.calls[0]?.[0])).toContain("Balance query is wired");
  });
});

describe("/portfolio", () => {
  it("returns the Faz 6 skeleton message", async () => {
    const { ctx, reply } = makeCtx();
    await makePortfolioHandler(baseDeps.portfolio)(ctx);
    expect(reply).toHaveBeenCalledOnce();
    expect(String(reply.mock.calls[0]?.[0])).toContain("Portfolio snapshot is wired");
  });
});

describe("/analyze", () => {
  it("asks for usage when no symbol is given", async () => {
    const { ctx, reply } = makeCtx({ match: "" });
    await makeAnalyzeHandler(baseDeps.analyze)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain("Usage: /analyze <SYMBOL>");
  });

  it("rejects a symbol that fails the pattern", async () => {
    const { ctx, reply } = makeCtx({ match: "bad symbol with spaces" });
    await makeAnalyzeHandler(baseDeps.analyze)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain("Invalid symbol");
  });

  it("accepts a well-formed symbol and echoes it", async () => {
    const { ctx, reply } = makeCtx({ match: "THYAO" });
    await makeAnalyzeHandler(baseDeps.analyze)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain("THYAO");
  });
});

describe("/notify", () => {
  it("defaults to status when no mode given", async () => {
    const { ctx, reply } = makeCtx({ match: "" });
    await makeNotifyHandler(baseDeps.notify)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain("Notify status");
  });

  it("acknowledges on mode", async () => {
    const { ctx, reply } = makeCtx({ match: "on" });
    await makeNotifyHandler(baseDeps.notify)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain("Notifications will be enabled");
  });

  it("acknowledges off mode", async () => {
    const { ctx, reply } = makeCtx({ match: "off" });
    await makeNotifyHandler(baseDeps.notify)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain("Notifications will be paused");
  });

  it("rejects unknown mode", async () => {
    const { ctx, reply } = makeCtx({ match: "weirdmode" });
    await makeNotifyHandler(baseDeps.notify)(ctx);
    expect(String(reply.mock.calls[0]?.[0])).toContain('Unknown mode "weirdmode"');
  });
});

describe("/help", () => {
  it("lists the available commands", async () => {
    const { ctx, reply } = makeCtx();
    await makeHelpHandler()(ctx);
    const text = String(reply.mock.calls[0]?.[0]);
    expect(text).toContain("/balance");
    expect(text).toContain("/portfolio");
    expect(text).toContain("/analyze");
    expect(text).toContain("/notify");
    expect(text).toContain("/start");
    expect(text).toContain("/help");
  });
});
