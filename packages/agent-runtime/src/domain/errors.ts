/**
 * @openbulls/agent-runtime — domain error taxonomy.
 *
 * Each error class extends `AppError` from `@openbulls/shared` so the
 * runtime can carry failures through `Result<T, AgentRuntimeError>`
 * without throwing across node boundaries. Codes follow the
 * `agent-runtime/<slug>` convention used by every other package.
 */
import { AppError } from "@openbulls/shared";

/** A graph key was passed to the registry that has not been registered. */
export class UnknownGraphError extends AppError {
  readonly code = "agent-runtime/unknown-graph";
  constructor(readonly graphKey: string) {
    super(`unknown graph: ${graphKey}`);
  }
}

/** A graph key was registered twice in the same registry instance. */
export class DuplicateGraphError extends AppError {
  readonly code = "agent-runtime/duplicate-graph";
  constructor(readonly graphKey: string) {
    super(`graph already registered: ${graphKey}`);
  }
}

/** `loadLatestSnapshot` returned no row for the requested run + thread. */
export class CheckpointNotFoundError extends AppError {
  readonly code = "agent-runtime/checkpoint-not-found";
  constructor(
    readonly runId: string,
    readonly threadId: string,
  ) {
    super(`no checkpoint for run=${runId} thread=${threadId}`);
  }
}

/** Snapshot JSON could not be parsed or did not match the schema. */
export class CheckpointCorruptError extends AppError {
  readonly code = "agent-runtime/checkpoint-corrupt";
  constructor(
    readonly runId: string,
    readonly reason: string,
  ) {
    super(`checkpoint corrupt for run=${runId}: ${reason}`);
  }
}

/** Wallet has fewer credits than the run tried to reserve. */
export class InsufficientCreditsError extends AppError {
  readonly code = "agent-runtime/insufficient-credits";
  readonly data: { required: string; available: string };
  constructor(data: { required: string; available: string }) {
    super(`insufficient credits: need ${data.required}, have ${data.available}`);
    this.data = data;
  }
}

/** A graph node threw an uncaught exception. */
export class NodeExecutionFailedError extends AppError {
  readonly code = "agent-runtime/node-execution-failed";
  constructor(
    readonly nodeName: string,
    override readonly cause: string,
  ) {
    super(`node ${nodeName} failed: ${cause}`);
  }
}

/** A tool invocation returned an error from the underlying service. */
export class ToolCallFailedError extends AppError {
  readonly code = "agent-runtime/tool-call-failed";
  constructor(
    readonly toolName: string,
    override readonly cause: string,
  ) {
    super(`tool ${toolName} failed: ${cause}`);
  }
}

/** Aggregated budget exceeded mid-run; the run must pause. */
export class BudgetExceededError extends AppError {
  readonly code = "agent-runtime/budget-exceeded";
  readonly data: { budget: string; spent: string };
  constructor(data: { budget: string; spent: string }) {
    super(`budget exceeded: spent ${data.spent} of ${data.budget}`);
    this.data = data;
  }
}

/** Resume was attempted against a run that was not in `paused` status. */
export class RunNotResumableError extends AppError {
  readonly code = "agent-runtime/run-not-resumable";
  constructor(
    readonly runId: string,
    readonly status: string,
  ) {
    super(`run ${runId} is not resumable (status=${status})`);
  }
}

/** Agent run input payload failed schema validation. */
export class InvalidRunInputError extends AppError {
  readonly code = "agent-runtime/invalid-input";
  readonly data: { graphKey: string; issues: readonly string[] };
  constructor(data: { graphKey: string; issues: readonly string[] }) {
    super(`invalid input for graph ${data.graphKey}: ${data.issues.join(", ")}`);
    this.data = data;
  }
}
