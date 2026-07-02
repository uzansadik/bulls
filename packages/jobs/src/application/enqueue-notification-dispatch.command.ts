/**
 * @openbulls/jobs — application: `enqueueNotificationDispatch`.
 *
 * Skeleton for Faz 6 (`packages/notifications`). The payload contract is
 * deliberately minimal — consumers (Telegram bot / email / web push)
 * negotiate richer shapes with `packages/notifications` when that
 * package lands.
 */
import { type Result, err, ok } from "@openbulls/shared";

import { type JobError, PayloadInvalidError } from "../domain/errors";
import type { NotificationDispatchJob } from "../domain/job-type";
import type { IJobProducer } from "../domain/ports/queue.port";
import type { LoggerLike } from "../infrastructure/log";
import { noopLogger } from "../infrastructure/log";

export interface EnqueueNotificationDispatchDeps {
  readonly producer: IJobProducer;
  readonly logger?: LoggerLike;
}

export interface EnqueueNotificationDispatchInput {
  readonly userId: string;
  readonly notificationKind: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export async function enqueueNotificationDispatch(
  deps: EnqueueNotificationDispatchDeps,
  input: EnqueueNotificationDispatchInput,
): Promise<Result<{ readonly jobId: string }, JobError>> {
  const logger = deps.logger ?? noopLogger;

  if (!input.userId) {
    return err(
      new PayloadInvalidError("userId is required", {
        jobKind: "notification-dispatch",
        field: "userId",
        issue: "empty",
      }),
    );
  }
  if (!input.notificationKind) {
    return err(
      new PayloadInvalidError("notificationKind is required", {
        jobKind: "notification-dispatch",
        field: "notificationKind",
        issue: "empty",
      }),
    );
  }

  const envelope: Omit<NotificationDispatchJob, "jobId" | "enqueuedAt"> = {
    kind: "notification-dispatch",
    userId: input.userId,
    notificationKind: input.notificationKind,
    payload: input.payload,
  };

  logger.debug("enqueueNotificationDispatch", {
    userId: input.userId,
    notificationKind: input.notificationKind,
  });

  const result = await deps.producer.enqueue(envelope);
  if (!result.ok) return result;
  return ok({ jobId: result.value.jobId });
}
