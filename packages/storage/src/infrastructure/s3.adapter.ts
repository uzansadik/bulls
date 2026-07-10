/**
 * @openbulls/storage — S3 adapter.
 *
 * Production backend. Wraps the AWS SDK v3 `S3Client`. The client is
 * injected so tests can pass a mock (the AWS SDK ships its own
 * `S3Client` interface, no extension needed).
 *
 * Region-aware signed URLs via `getSignedUrl` + `GetObjectCommand`.
 * Multipart uploads are NOT implemented in Faz 7 — `PutObjectCommand`
 * with a single buffer suffices up to `maxFileBytes` (default 50MB).
 * The next iteration will switch to `@aws-sdk/lib-storage` for
 * parallel multipart once the report generator emits >50MB files.
 */
import { Readable } from "node:stream";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  StorageKey,
  StorageObjectInfo,
  StorageUploadInput,
} from "../domain/ports";
import type { StorageAdapterDeps } from "../application/types";

export interface S3AdapterDeps extends StorageAdapterDeps {
  readonly client: S3Client;
  readonly bucket: string;
  readonly signedUrlTtlSec: number;
}

export class S3StorageAdapter implements IStorageAdapter {
  readonly backend = "s3" as const;
  readonly #client: S3Client;
  readonly #bucket: string;
  readonly #ttl: number;
  readonly #logger: LoggerLike;
  readonly #now: () => Date;
  readonly #maxFileBytes: number;

  constructor(deps: S3AdapterDeps) {
    this.#client = deps.client;
    this.#bucket = deps.bucket;
    this.#ttl = deps.signedUrlTtlSec;
    this.#logger = deps.logger ?? {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
    this.#now = deps.now ?? (() => new Date());
    this.#maxFileBytes = deps.env.maxFileBytes;
  }

  async upload(input: StorageUploadInput): Promise<StorageObjectInfo> {
    if (input.body.byteLength > this.#maxFileBytes) {
      throw new StorageSizeExceededError(
        `upload exceeds ${this.#maxFileBytes} bytes (got ${input.body.byteLength})`,
        { size: input.body.byteLength, max: this.#maxFileBytes },
      );
    }
    try {
      const cmd = new PutObjectCommand({
        Bucket: this.#bucket,
        Key: String(input.key),
        Body: input.body,
        ContentType: input.contentType,
        ...(input.metadata ? { Metadata: { ...input.metadata } } : {}),
      });
      const out = await this.#client.send(cmd);
      this.#logger.info("storage: uploaded (s3)", {
        key: input.key,
        bytes: input.body.byteLength,
        contentType: input.contentType,
        etag: out.ETag,
      });
      return {
        key: input.key,
        size: input.body.byteLength,
        contentType: input.contentType,
        ...(out.ETag ? { etag: out.ETag } : {}),
        uploadedAt: this.#now(),
      };
    } catch (err) {
      throw new StorageUploadError(
        `s3 upload failed: ${(err as Error).message}`,
        { key: String(input.key), cause: String(err) },
      );
    }
  }

  async download(key: StorageKey): Promise<Uint8Array> {
    try {
      const out = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: String(key) }),
      );
      const body = out.Body;
      if (!body) {
        throw new StorageKeyNotFoundError(
          `s3 object has no body: ${String(key)}`,
          { key: String(key) },
        );
      }
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      return merged;
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound") {
        throw new StorageKeyNotFoundError(
          `s3 key not found: ${String(key)}`,
          { key: String(key) },
        );
      }
      throw new StorageDownloadError(
        `s3 download failed: ${(err as Error).message}`,
        { key: String(key), cause: String(err) },
      );
    }
  }

  async stat(key: StorageKey): Promise<StorageObjectInfo> {
    try {
      const out = await this.#client.send(
        new HeadObjectCommand({ Bucket: this.#bucket, Key: String(key) }),
      );
      return {
        key,
        size: out.ContentLength ?? 0,
        contentType:
          (out.ContentType as StorageObjectInfo["contentType"]) ??
          "application/octet-stream",
        ...(out.ETag ? { etag: out.ETag } : {}),
        uploadedAt: out.LastModified ?? this.#now(),
      };
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound" || code === "NotFoundHeadObject") {
        throw new StorageKeyNotFoundError(
          `s3 key not found: ${String(key)}`,
          { key: String(key) },
        );
      }
      throw new StorageDownloadError(
        `s3 head failed: ${(err as Error).message}`,
        { key: String(key), cause: String(err) },
      );
    }
  }

  async presign(key: StorageKey, ttlSec?: number): Promise<PresignedUrl> {
    const ttl = ttlSec ?? this.#ttl;
    const url = await getSignedUrl(
      this.#client,
      new GetObjectCommand({ Bucket: this.#bucket, Key: String(key) }),
      { expiresIn: ttl },
    );
    return { url, expiresAt: new Date(this.#now().getTime() + ttl * 1000) };
  }

  async exists(key: StorageKey): Promise<boolean> {
    try {
      await this.stat(key);
      return true;
    } catch (err) {
      if (err instanceof StorageKeyNotFoundError) return false;
      throw err;
    }
  }

  async remove(key: StorageKey): Promise<void> {
    try {
      await this.#client.send(
        new (await import("@aws-sdk/client-s3")).DeleteObjectCommand({
          Bucket: this.#bucket,
          Key: String(key),
        }),
      );
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code !== "NoSuchKey" && code !== "NotFound") {
        this.#logger.warn("storage: s3 remove failed", {
          key: String(key),
          err: String(err),
        });
      }
    }
  }

  async openReadStream(key: StorageKey): Promise<Readable> {
    try {
      const out = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: String(key) }),
      );
      if (!out.Body) {
        throw new StorageKeyNotFoundError(
          `s3 object has no body: ${String(key)}`,
          { key: String(key) },
        );
      }
      return out.Body as Readable;
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound") {
        throw new StorageKeyNotFoundError(
          `s3 key not found: ${String(key)}`,
          { key: String(key) },
        );
      }
      throw new StorageDownloadError(
        `s3 stream failed: ${(err as Error).message}`,
        { key: String(key), cause: String(err) },
      );
    }
  }
}

/** Static factory used by the composition root. */
export function createS3Client(config: S3ClientConfig): S3Client {
  return new S3Client(config);
}