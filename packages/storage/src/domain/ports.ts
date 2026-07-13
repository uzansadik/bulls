/**
 * @openbulls/storage — storage adapter port.
 *
 * The only contract callers (notably `packages/reports`) depend on.
 * `LocalFsStorageAdapter` and `S3StorageAdapter` both implement it.
 *
 * `StorageKey` is opaque to callers — an adapter writes whatever
 * scheme makes sense (filesystem path, `s3://bucket/key`,
 * `minio://host/key`). `presign()` returns a short-lived URL the
 * client can hand to a browser/curl. The TTL is per-adapter
 * (filesystem returns a static path; S3 returns a presigned
 * `GetObject` URL that expires after `signedUrlTtlSec`).
 */
import type { Readable } from "node:stream";

/** Opaque storage key. Constructors MUST be deterministic per (userId, kind, suffix). */
export type StorageKey = string & { readonly __brand: "StorageKey" };
export const StorageKey = (s: string): StorageKey => s as StorageKey;

/**
 * Content type advertised by the adapter when serving the object.
 * Optional — adapters may default to `application/octet-stream`.
 */
export type StorageContentType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "text/markdown"
  | "application/octet-stream";

export interface StorageUploadInput {
  readonly key: StorageKey;
  /** Bytes — adapters that want streaming can wrap into a Readable internally. */
  readonly body: Uint8Array;
  readonly contentType: StorageContentType;
  /** Optional metadata persisted alongside the object (S3 user-meta, fs sidecar). */
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface StorageObjectInfo {
  readonly key: StorageKey;
  readonly size: number;
  readonly contentType: StorageContentType;
  readonly etag?: string;
  readonly uploadedAt: Date;
}

export interface PresignedUrl {
  readonly url: string;
  readonly expiresAt: Date;
}

export interface IStorageAdapter {
  readonly backend: "local-fs" | "s3";

  upload(input: StorageUploadInput): Promise<StorageObjectInfo>;

  /** Returns the bytes for `key`. Throws `StorageKeyNotFoundError` if missing. */
  download(key: StorageKey): Promise<Uint8Array>;

  /** Returns the metadata for `key` without downloading. */
  stat(key: StorageKey): Promise<StorageObjectInfo>;

  /** Issues a short-lived URL. S3 adapters use `getSignedUrl`; local-fs returns a static path. */
  presign(key: StorageKey, ttlSec?: number): Promise<PresignedUrl>;

  /** True if the object exists. Cheap HEAD call on S3, fs.stat on local. */
  exists(key: StorageKey): Promise<boolean>;

  /** Best-effort delete. S3 swallows 404; local-fs unlinks. */
  remove(key: StorageKey): Promise<void>;

  /**
   * Streams the object back as a Node Readable. Used by the
   * reports HTTP route (Faz 8) to pipe the PDF/Excel without
   * buffering the whole file in memory.
   */
  openReadStream(key: StorageKey): Promise<Readable>;
}