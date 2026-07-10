/**
 * @openbulls/storage — composition root tests.
 *
 * Validates that `createStorageAdapter` picks the right backend,
 * propagates config errors from `readStorageEnv`, and passes the
 * `s3ClientFactory` override through.
 */
import { describe, expect, it } from "vitest";

import {
  StorageConfigInvalidError,
  createStorageAdapter,
  LocalFsStorageAdapter,
} from "../index";
import type { ServerEnv } from "@openbulls/config";

function env(over: Partial<ServerEnv> = {}): ServerEnv {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://x",
    BETTER_AUTH_SECRET: "s",
    BETTER_AUTH_URL: "http://localhost",
    LOG_LEVEL: "info",
    REDIS_URL: undefined,
    STRIPE_SECRET_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    IYZICO_API_KEY: undefined,
    IYZICO_SECRET_KEY: undefined,
    AI_GATEWAY_API_KEY: undefined,
    ANTHROPIC_API_KEY: undefined,
    OPENAI_API_KEY: undefined,
    GOOGLE_GENERATIVE_AI_API_KEY: undefined,
    TELEGRAM_BOT_TOKEN: "x",
    TELEGRAM_BOT_USERNAME: "x",
    TELEGRAM_WEBHOOK_URL: undefined,
    TELEGRAM_WEBHOOK_SECRET: undefined,
    TELEGRAM_LINK_TOKEN_TTL_SEC: 300,
    TWELVE_DATA_API_KEY: undefined,
    YAHOO_FINANCE_API_KEY: undefined,
    KAP_API_KEY: undefined,
    TCMB_API_KEY: undefined,
    SENTRY_DSN: undefined,
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    WORKER_QUEUE_NAME: "q",
    WORKER_CONCURRENCY: 1,
    WORKER_RATE_LIMIT_PER_MIN: 60,
    WORKER_HEARTBEAT_INTERVAL_MS: 30000,
    AGENT_GRAPH_DEFAULT_MODEL: "x",
    AGENT_GRAPH_MAX_RETRIES: 3,
    AGENT_GRAPH_CHECKPOINT_EVERY_N_STEPS: 1,
    AGENT_JOB_TIMEOUT_MS: 3600000,
    CRON_QUEUE_NAME: "q",
    CRON_TICK_INTERVAL_MS: 60000,
    CRON_BATCH_SIZE: 50,
    REPORT_STORAGE_BACKEND: undefined,
    REPORT_LOCAL_STORAGE_DIR: undefined,
    REPORT_SIGNED_URL_TTL_SEC: undefined,
    REPORT_MAX_FILE_BYTES: undefined,
    S3_BUCKET: undefined,
    S3_REGION: undefined,
    S3_ACCESS_KEY_ID: undefined,
    S3_SECRET_ACCESS_KEY: undefined,
    S3_ENDPOINT: undefined,
    ...over,
  } as ServerEnv;
}

describe("createStorageAdapter", () => {
  it("returns LocalFsStorageAdapter by default", () => {
    const adapter = createStorageAdapter({ env: env() });
    expect(adapter.backend).toBe("local-fs");
    expect(adapter).toBeInstanceOf(LocalFsStorageAdapter);
  });

  it("uses REPORT_LOCAL_STORAGE_DIR when provided", () => {
    const adapter = createStorageAdapter({
      env: env({ REPORT_LOCAL_STORAGE_DIR: "/var/lib/openbulls/storage" }),
    });
    expect(adapter.backend).toBe("local-fs");
  });

  it("throws StorageConfigInvalidError when S3 backend selected without keys", () => {
    expect(() =>
      createStorageAdapter({
        env: env({ REPORT_STORAGE_BACKEND: "s3" }),
      }),
    ).toThrow(StorageConfigInvalidError);
  });

  it("passes keys through to s3ClientFactory when S3 is fully configured", () => {
    let factoryCalls = 0;
    const factory = (cfg: { region: string; accessKeyId: string; secretAccessKey: string; endpoint?: string }) => {
      factoryCalls += 1;
      expect(cfg.region).toBe("eu-central-1");
      expect(cfg.accessKeyId).toBe("ak");
      expect(cfg.secretAccessKey).toBe("sk");
      expect(cfg.endpoint).toBe("https://minio.local");
      return { send: () => Promise.resolve({}) };
    };

    const adapter = createStorageAdapter({
      env: env({
        REPORT_STORAGE_BACKEND: "s3",
        S3_BUCKET: "openbulls-reports",
        S3_REGION: "eu-central-1",
        S3_ACCESS_KEY_ID: "ak",
        S3_SECRET_ACCESS_KEY: "sk",
        S3_ENDPOINT: "https://minio.local",
      }),
      s3ClientFactory: factory as never,
    });
    expect(adapter.backend).toBe("s3");
    expect(factoryCalls).toBe(1);
  });
});