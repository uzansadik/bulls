/**
 * @openbulls/jobs — branded primitive types for the queue layer.
 *
 * Brands guard against accidental mixing of BullMQ's `jobId` string with
 * LangGraph's `threadId` and `graphKey`. All three are bare strings at the
 * wire level; branding keeps them type-safe inside the package.
 *
 * Conventions mirror `@openbulls/shared`: identity-cast smart constructors,
 * type and value share the same identifier.
 */
import type { Brand } from "@openbulls/shared";

/** BullMQ's job identifier (also serves as the durable dedupe key). */
export type JobId = Brand<string, "JobId">;
export const JobId = (s: string): JobId => s as JobId;

/** LangGraph thread identifier (groups checkpoints across runs). */
export type ThreadId = Brand<string, "ThreadId">;
export const ThreadId = (s: string): ThreadId => s as ThreadId;

/** Graph registry key — e.g. `"company-analysis"`, `"portfolio-review"`. */
export type GraphKey = Brand<string, "GraphKey">;
export const GraphKey = (s: string): GraphKey => s as GraphKey;
