/**
 * @openbulls/storage — typed errors.
 *
 * Every adapter translates SDK / fs exceptions into one of these
 * before propagating. Callers (notably `packages/reports`) match
 * on `code` to decide retry vs fail-permanently.
 */

export type StorageErrorCode =
  | "storage/key-not-found"
  | "storage/upload-failed"
  | "storage/download-failed"
  | "storage/backend-unavailable"
  | "storage/config-invalid"
  | "storage/size-exceeded";

abstract class StorageError extends Error {
  abstract readonly code: StorageErrorCode;
}

export class StorageKeyNotFoundError extends StorageError {
  readonly code = "storage/key-not-found" as const;
  constructor(
    message: string,
    readonly data: { readonly key: string },
  ) {
    super(message);
  }
}

export class StorageUploadError extends StorageError {
  readonly code = "storage/upload-failed" as const;
  constructor(
    message: string,
    readonly data: { readonly key: string; readonly cause?: string },
  ) {
    super(message);
  }
}

export class StorageDownloadError extends StorageError {
  readonly code = "storage/download-failed" as const;
  constructor(
    message: string,
    readonly data: { readonly key: string; readonly cause?: string },
  ) {
    super(message);
  }
}

export class StorageBackendUnavailableError extends StorageError {
  readonly code = "storage/backend-unavailable" as const;
  constructor(
    message: string,
    readonly data: { readonly backend: string; readonly cause?: string },
  ) {
    super(message);
  }
}

export class StorageConfigInvalidError extends StorageError {
  readonly code = "storage/config-invalid" as const;
  constructor(
    message: string,
    readonly data: { readonly missing: readonly string[] },
  ) {
    super(message);
  }
}

export class StorageSizeExceededError extends StorageError {
  readonly code = "storage/size-exceeded" as const;
  constructor(
    message: string,
    readonly data: { readonly size: number; readonly max: number },
  ) {
    super(message);
  }
}

export const isStorageError = (e: unknown): e is StorageError =>
  e instanceof Error && "code" in e && typeof (e as { code: unknown }).code === "string" && (e as { code: string }).code.startsWith("storage/");