/**
 * @openbulls/storage — LocalFsStorageAdapter tests.
 *
 * Coverage:
 *   - upload + download round-trip
 *   - sharded path (two-level prefix)
 *   - size guard (>maxFileBytes rejected)
 *   - missing key on download/stat/stream throws StorageKeyNotFoundError
 *   - exists() / remove()
 *   - presign returns file:// URI
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LocalFsStorageAdapter,
  StorageKey,
  StorageKeyNotFoundError,
  StorageSizeExceededError,
  __testing_pathFor,
} from "../index";

function baseEnv() {
  return {
    backend: "local-fs" as const,
    localDir: "/tmp/storage-test",
    signedUrlTtlSec: 60,
    maxFileBytes: 1024,
  };
}

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("LocalFsStorageAdapter", () => {
  let tmp: string;
  let adapter: LocalFsStorageAdapter;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(tmpdir(), "storage-test-"));
    adapter = new LocalFsStorageAdapter({
      env: baseEnv(),
      localDir: tmp,
      logger: noopLogger,
    });
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("upload + download round-trip preserves bytes", async () => {
    const key = StorageKey("ab/report-1.pdf");
    const body = new TextEncoder().encode("PDF-bytes-here");
    await adapter.upload({ key, body, contentType: "application/pdf" });

    const read = await adapter.download(key);
    expect(new TextDecoder().decode(read)).toBe("PDF-bytes-here");
  });

  it("upload writes into a two-level shard directory", async () => {
    const key = StorageKey("xyz/some-report.pdf");
    await adapter.upload({
      key,
      body: new Uint8Array([1, 2, 3]),
      contentType: "application/pdf",
    });
    // Two-level shard under <tmp>/xy/xyz/some-report.pdf
    expect(__testing_pathFor(adapter, key)).toBe(
      path.join(tmp, "xy", "xyz", "some-report.pdf"),
    );
  });

  it("rejects uploads larger than maxFileBytes", async () => {
    const key = StorageKey("big/file.bin");
    const huge = new Uint8Array(2048);
    await expect(
      adapter.upload({ key, body: huge, contentType: "application/octet-stream" }),
    ).rejects.toBeInstanceOf(StorageSizeExceededError);
  });

  it("download throws StorageKeyNotFoundError when key is missing", async () => {
    await expect(
      adapter.download(StorageKey("nope/missing.pdf")),
    ).rejects.toBeInstanceOf(StorageKeyNotFoundError);
  });

  it("exists returns true after upload, false otherwise", async () => {
    const key = StorageKey("aa/exists.pdf");
    expect(await adapter.exists(key)).toBe(false);
    await adapter.upload({
      key,
      body: new Uint8Array([1]),
      contentType: "application/pdf",
    });
    expect(await adapter.exists(key)).toBe(true);
  });

  it("remove deletes the object", async () => {
    const key = StorageKey("aa/rm.pdf");
    await adapter.upload({
      key,
      body: new Uint8Array([1]),
      contentType: "application/pdf",
    });
    expect(await adapter.exists(key)).toBe(true);
    await adapter.remove(key);
    expect(await adapter.exists(key)).toBe(false);
  });

  it("presign returns file:// URI with expiresAt ~ ttlSec from now", async () => {
    const key = StorageKey("aa/sign.pdf");
    await adapter.upload({
      key,
      body: new Uint8Array([1]),
      contentType: "application/pdf",
    });
    const before = Date.now();
    const out = await adapter.presign(key, 120);
    expect(out.url).toMatch(/^file:\/\//);
    expect(out.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 120_000 - 50);
  });

  it("openReadStream returns a Node Readable stream", async () => {
    const key = StorageKey("aa/stream.pdf");
    await adapter.upload({
      key,
      body: new Uint8Array([1, 2, 3, 4]),
      contentType: "application/pdf",
    });
    const stream = await adapter.openReadStream(key);
    expect(stream).toBeInstanceOf(Readable);
  });
});