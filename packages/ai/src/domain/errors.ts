/**
 * @openbulls/ai — domain errors.
 *
 * Every AI-domain failure flows through one of these four classes
 * so callers can branch on `instanceof` without sniffing strings.
 *
 * The classes extend `Error` directly (not a shared `AppError` from
 * `@openbulls/shared`) because `AppError` is reserved for
 * application-layer failures (use-case-level rejections). These
 * errors describe the *runtime contract* of the AI package itself
 * — a missing model, an unknown tool, a thrown `execute`, or a
 * misconfigured prompt template.
 *
 * Each error carries a `code` (machine-readable string) and a
 * `cause` (the underlying error, if any). The shape mirrors the
 * conventions `packages/billing` uses for `BillingError` so error
 * envelopes stay consistent across packages.
 */
export type AiErrorCode =
  | "model_unavailable"
  | "tool_not_found"
  | "tool_execution_failed"
  | "prompt_render_failed";

export class ModelUnavailableError extends Error {
  readonly code: AiErrorCode = "model_unavailable";
  readonly modelKey: string;
  constructor(message: string, modelKey: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ModelUnavailableError";
    this.modelKey = modelKey;
  }
}

export class ToolNotFoundError extends Error {
  readonly code: AiErrorCode = "tool_not_found";
  readonly toolName: string;
  constructor(message: string, toolName: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ToolNotFoundError";
    this.toolName = toolName;
  }
}

export class ToolExecutionFailedError extends Error {
  readonly code: AiErrorCode = "tool_execution_failed";
  readonly toolName: string;
  readonly args: unknown;
  constructor(message: string, toolName: string, args: unknown, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ToolExecutionFailedError";
    this.toolName = toolName;
    this.args = args;
  }
}

export class PromptRenderError extends Error {
  readonly code: AiErrorCode = "prompt_render_failed";
  readonly templateName: string;
  constructor(message: string, templateName: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PromptRenderError";
    this.templateName = templateName;
  }
}
