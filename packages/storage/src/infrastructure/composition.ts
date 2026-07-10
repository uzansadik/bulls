/**
 * @openbulls/storage — composition root.
 *
 * Single entrypoint the agent-worker calls at boot. Picks an
 * adapter based on `env.backend`, then constructs it with the
 * shared `StorageEnv`. S3 client construction is lazy (only when
 * `backend === "s3"`) so the `local-fs` boot path doesn't pull
 * in `@aws-sdk/client-s3` symbols.
 */
import type { ServerEnv } from "@openbulls/config";

import { readStorageEnv } from "../application/env";
import type { IStorageAdapter } from "../domain/ports";
import type { StorageEnv } from "../application/types";
import { LocalFsStorageAdapter } from "./local-fs.adapter";
import { S3StorageAdapter, createS3Client } from "./s3.adapter";

export interface CreateStorageAdapterInput {
  readonly env: ServerEnv;
  readonly logger?: import("@openbulls/logger").LoggerLike;
  readonly now?: () => Date;
  /** Override for tests; defaults to a real `S3Client`. */
  readonly s3ClientFactory?: (cfg: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  }) => unknown;
}

export function createStorageAdapter(
  input: CreateStorageAdapterInput,
): IStorageAdapter {
  const storageEnv: StorageEnv = readStorageEnv(input.env);
  const common = {
    env: storageEnv,
    ...(input.logger !== undefined ? { logger: input.logger } : {}),
    ...(input.now !== undefined ? { now: input.now } : {}),
  };

  if (storageEnv.backend === "local-fs") {
    return new LocalFsStorageAdapter({
      ...common,
      localDir: storageEnv.localDir,
    });
  }

  if (storageEnv.backend === "s3") {
    if (!storageEnv.s3) {
      // readStorageEnv already throws when s3 backend is selected
      // without keys; this is defense in depth.
      throw new Error("s3 backend selected but storageEnv.s3 is undefined");
    }
    const factory = input.s3ClientFactory ?? createS3Client;
    const client = factory({
      region: storageEnv.s3.region,
      accessKeyId: storageEnv.s3.accessKeyId,
      secretAccessKey: storageEnv.s3.secretAccessKey,
      ...(storageEnv.s3.endpoint ? { endpoint: storageEnv.s3.endpoint } : {}),
    }) as ConstructorParameters<typeof S3StorageAdapter>[0]["client"];
    return new S3StorageAdapter({
      ...common,
      client,
      bucket: storageEnv.s3.bucket,
      signedUrlTtlSec: storageEnv.signedUrlTtlSec,
    });
  }

  throw new Error(
    `unsupported storage backend: ${String((storageEnv as { backend: string }).backend)}`,
  );
}