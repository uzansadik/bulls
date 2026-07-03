/**
 * apps/agent-worker — `notification-dispatch` job handler.
 *
 * Bridges BullMQ-dequeued `notification-dispatch` jobs to
 * `@openbulls/notifications`'s `sendNotification` command. Each job:
 *
 *   1. Calls `notificationServices.sendNotification({ userId, kind, payload })`.
 *   2. Logs the dispatch summary.
 *   3. Throws on transient errors so BullMQ retries; permanent
 *      failures are caught by `sendNotification` itself (rows marked
 *      `failed`) and never throw out.
 *
 * The handler never resolves the user's channels itself — that's the
 * dispatcher's job. The dispatcher also persists the per-channel
 * audit-trail rows. The handler exists only to wire BullMQ into the
 * service.
 */
import type { LoggerLike } from "@openbulls/agent-runtime";
import type { NotificationServices } from "@openbulls/notifications";
import type { NotificationDispatchJob } from "@openbulls/jobs";

export interface NotificationDispatchHandlerDeps {
  readonly notificationServices: NotificationServices;
  readonly logger: LoggerLike;
}

/**
 * Returns a handler suitable for `consumer.process("notification-dispatch", …)`.
 */
export function makeNotificationDispatchHandler(
  deps: NotificationDispatchHandlerDeps,
): (job: NotificationDispatchJob) => Promise<void> {
  return async (job: NotificationDispatchJob): Promise<void> => {
    deps.logger.info("notification-dispatch: dequeued", {
      jobId: job.jobId,
      userId: job.userId,
      kind: job.notificationKind,
    });

    const summary = await deps.notificationServices.sendNotification({
      userId: job.userId,
      kind: job.notificationKind as never,
      payload: job.payload as Readonly<Record<string, unknown>>,
    });

    const { userId: _summaryUserId, ...summaryMeta } = summary;
    deps.logger.info("notification-dispatch: handled", {
      jobId: job.jobId,
      userId: job.userId,
      kind: job.notificationKind,
      ...summaryMeta,
    });

    if (summary.unsupportedKinds.length > 0) {
      deps.logger.warn(
        "notification-dispatch: unsupported channel kinds — register a sender in the registry",
        {
          jobId: job.jobId,
          userId: job.userId,
          unsupportedKinds: summary.unsupportedKinds,
        },
      );
    }
  };
}