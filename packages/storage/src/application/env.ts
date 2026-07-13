/**
 * @openbulls/storage — env validation helper.
 *
 * Pulls a subset of `ServerEnv` and returns a normalized
 * `StorageEnv`. Throws `StorageConfigInvalidError` with the list
 * of missing keys when the chosen backend is misconfigured.
 */
import type { ServerEnv } from "@openbulls/config";

import {
  StorageBackendUnavailableError,
  StorageConfigInvalidError,
} from "../domain/errors";
import type { StorageBackend, StorageEnv } from "./types";

/**
 * Read storage-related fields out of a `ServerEnv`. Accepts the
 * optional `REPORT_STORAGE_BACKEND` knob (defaults to `local-fs`
 * for development). Required S3 keys are only checked when
 * `backend === "s3"`.
 */
export function readStorageEnv(env: ServerEnv): StorageEnv {
  const backend: StorageBackend = env.REPORT_STORAGE_BACKEND ?? "local-fs";
  const localDir = env.REPORT_LOCAL_STORAGE_DIR ?? "./.storage";
  const signedUrlTtlSec = env.REPORT_SIGNED_URL_TTL_SEC ?? 900;
  const maxFileBytes = env.REPORT_MAX_FILE_BYTES ?? 50 * 1024 * 1024;

  if (backend === "s3") {
    const missing: string[] = [];
    if (!env.S3_BUCKET) missing.push("S3_BUCKET");
    if (!env.S3_REGION) missing.push("S3_REGION");
    if (!env.S3_ACCESS_KEY_ID) missing.push("S3_ACCESS_KEY_ID");
    if (!env.S3_SECRET_ACCESS_KEY) missing.push("S3_SECRET_ACCESS_KEY");
    if (missing.length > 0) {
      throw new StorageConfigInvalidError(
        `S3 backend selected but env is missing: ${missing.join(", ")}`,
        { missing },
      );
    }
    return {
      backend,
      localDir,
      signedUrlTtlSec,
      maxFileBytes,
      s3: {
        bucket: env.S3_BUCKET ?? "",
        region: env.S3_REGION ?? "",
        accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      },
    };
  }

  if (backend !== "local-fs") {
    throw new StorageBackendUnavailableError(
      `Unknown storage backend: ${String(backend)}`,
      { backend: String(backend) },
    );
  }

  return {
    backend,
    localDir,
    signedUrlTtlSec,
    maxFileBytes,
  };
}