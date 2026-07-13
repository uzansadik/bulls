/**
 * @openbulls/storage — public barrel.
 *
 * Domain + application types compose the contract callers depend on.
 * Infrastructure adapters are exported so advanced consumers (admin
 * tooling, custom tests) can construct them directly; most callers
 * use `createStorageAdapter()`.
 */
export type {
  IStorageAdapter,
  PresignedUrl,
  StorageContentType,
  StorageObjectInfo,
  StorageUploadInput,
} from "./domain/ports";
// `StorageKey` is a smart constructor (value) AND a branded string
// (type). It must be exported as both via re-export from the same
// module — TS resolves this when we drop `export type` and just
// re-export the binding.
export { StorageKey } from "./domain/ports";

export {
  StorageBackendUnavailableError,
  StorageConfigInvalidError,
  StorageDownloadError,
  StorageKeyNotFoundError,
  StorageSizeExceededError,
  StorageUploadError,
  isStorageError,
} from "./domain/errors";
export type { StorageErrorCode } from "./domain/errors";

export type { StorageAdapterDeps, StorageBackend, StorageEnv } from "./application/types";

export { readStorageEnv } from "./application/env";

export {
  LocalFsStorageAdapter,
  __testing_pathFor,
  __testing_contentTypeFor,
} from "./infrastructure/local-fs.adapter";
export { S3StorageAdapter, createS3Client } from "./infrastructure/s3.adapter";
export { createStorageAdapter } from "./infrastructure/composition";
export type { CreateStorageAdapterInput } from "./infrastructure/composition";