/**
 * @openbulls/storage — application-layer types.
 *
 * `StorageDeps` is the shape passed to adapter constructors.
 * `StorageEnv` mirrors a subset of `@openbulls/config`'s
 * `ServerEnv` so the composition root can validate before
 * picking an adapter.
 */
import type { LoggerLike } from "@openbulls/logger";

export type StorageBackend = "local-fs" | "s3";

export interface StorageEnv {
  readonly backend: StorageBackend;
  readonly localDir: string;
  readonly s3?: {
    readonly bucket: string;
    readonly region: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly endpoint?: string;
  };
  readonly signedUrlTtlSec: number;
  readonly maxFileBytes: number;
}

export interface StorageLogger extends LoggerLike {}

/**
 * Common constructor input for every adapter. The adapter-specific
 * shape (e.g. local `dir`, S3 `client`) is layered on top.
 */
export interface StorageAdapterDeps {
  readonly env: StorageEnv;
  readonly logger?: StorageLogger;
  readonly now?: () => Date;
}