/**
 * @openbulls/storage — local filesystem adapter.
 *
 * Default backend for dev / CI / single-node deploys. Stores files
 * under `env.localDir` using a two-level prefix (`<first-2-chars>/<key>`)
 * so a single directory never grows unbounded. `presign()` returns a
 * `file://` URI with an `expiresAt` set to `now + ttlSec`; the agent-worker
 * resolves that to the same path later. A future iteration can replace
 * this with an `http://` URL when the storage HTTP route ships (Faz 8).
 *
 * Why not pin `path.resolve` once? Because the worker process and the
 * agent-worker run from the monorepo root; an absolute base avoids
 * `process.cwd()` drift when `tsx watch` restarts.
 */
import { createReadStream, type ReadStream } from "node:fs";
import { access, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { LoggerLike } from "@openbulls/logger";

import {
  StorageDownloadError,
  StorageKeyNotFoundError,
  StorageSizeExceededError,
  StorageUploadError,
} from "../domain/errors";
import type {
  IStorageAdapter,
  PresignedUrl,
  StorageContentType,
  StorageKey,
  StorageObjectInfo,
  StorageUploadInput,
} from "../domain/ports";
import type { StorageAdapterDeps } from "../application/types";

export interface LocalFsAdapterDeps extends StorageAdapterDeps {
  readonly localDir: string;
}

const SHARD_PREFIX_LEN = 2;

export class LocalFsStorageAdapter implements IStorageAdapter {
  readonly backend = "local-fs" as const;
  readonly #dir: string;
  readonly #logger: LoggerLike;
  readonly #now: () => Date;
  readonly #maxFileBytes: number;

  constructor(deps: LocalFsAdapterDeps) {
    this.#dir = path.resolve(deps.localDir);
    this.#logger = deps.logger ?? {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
    this.#now = deps.now ?? (() => new Date());
    this.#maxFileBytes = deps.env.maxFileBytes;
  }

  /**
   * Build the absolute filesystem path for a storage key. Two-level
   * prefix. Public for tests (the `#pathFor` style would be unreadable
   * from outside the class at runtime).
   */
  pathFor(key: StorageKey): string {
    const k = String(key);
    if (k.length === 0) {
      throw new StorageUploadError("empty storage key", { key: String(key) });
    }
    const prefix = k.slice(0, SHARD_PREFIX_LEN).replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.#dir, prefix, k);
  }

  async upload(input: StorageUploadInput): Promise<StorageObjectInfo> {
    if (input.body.byteLength > this.#maxFileBytes) {
      throw new StorageSizeExceededError(
        `upload exceeds ${this.#maxFileBytes} bytes (got ${input.body.byteLength})`,
        { size: input.body.byteLength, max: this.#maxFileBytes },
      );
    }
    const target = this.pathFor(input.key);
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, input.body);
      const info = await stat(target);
      this.#logger.info("storage: uploaded (local-fs)", {
        key: input.key,
        bytes: input.body.byteLength,
        contentType: input.contentType,
      });
      return {
        key: input.key,
        size: info.size,
        contentType: input.contentType,
        uploadedAt: this.#now(),
      };
    } catch (err) {
      throw new StorageUploadError(
        `local-fs upload failed: ${(err as Error).message}`,
        { key: String(input.key), cause: String(err) },
      );
    }
  }

  async download(key: StorageKey): Promise<Uint8Array> {
    const target = this.pathFor(key);
    try {
      const bytes = await readFile(target);
      return new Uint8Array(bytes);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StorageKeyNotFoundError(
          `local-fs key not found: ${String(key)}`,
          { key: String(key) },
        );
      }
      throw new StorageDownloadError(
        `local-fs download failed: ${(err as Error).message}`,
        { key: String(key), cause: String(err) },
      );
    }
  }

  async stat(key: StorageKey): Promise<StorageObjectInfo> {
    const target = this.pathFor(key);
    try {
      const info = await stat(target);
      return {
        key,
        size: info.size,
        // Default to octet-stream when no sidecar metadata exists.
        contentType: "application/octet-stream",
        uploadedAt: info.mtime,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StorageKeyNotFoundError(
          `local-fs key not found: ${String(key)}`,
          { key: String(key) },
        );
      }
      throw new StorageDownloadError(
        `local-fs stat failed: ${(err as Error).message}`,
        { key: String(key), cause: String(err) },
      );
    }
  }

  async presign(key: StorageKey, ttlSec?: number): Promise<PresignedUrl> {
    const ttl = ttlSec ?? 900;
    return {
      url: `file://${this.pathFor(key)}`,
      expiresAt: new Date(this.#now().getTime() + ttl * 1000),
    };
  }

  async exists(key: StorageKey): Promise<boolean> {
    try {
      await access(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }

  async remove(key: StorageKey): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        this.#logger.warn("storage: local-fs remove failed", {
          key: String(key),
          err: String(err),
        });
      }
    }
  }

  async openReadStream(key: StorageKey): Promise<ReadStream> {
    try {
      return createReadStream(this.pathFor(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StorageKeyNotFoundError(
          `local-fs key not found: ${String(key)}`,
          { key: String(key) },
        );
      }
      throw new StorageDownloadError(
        `local-fs stream failed: ${(err as Error).message}`,
        { key: String(key), cause: String(err) },
      );
    }
  }
}

/** Tiny helper exported for tests that build paths the same way. */
export const __testing_pathFor = (adapter: LocalFsStorageAdapter, key: StorageKey): string =>
  adapter.pathFor(key);

export const __testing_contentTypeFor = (_key: StorageKey): StorageContentType =>
  "application/octet-stream";