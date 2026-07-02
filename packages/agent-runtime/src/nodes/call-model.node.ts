import { ToolCallFailedError } from "../domain/errors";
/**
 * @openbulls/agent-runtime — generic model call node.
 *
 * A subgraph synthesis step takes a list of branch outputs and
 * hands them to a model with a system prompt that asks for a
 * markdown report. The `callModelNode` helper centralises the
 * conversation shape so each subgraph only writes the *content*
 * of its system + user prompt, not the protocol.
 *
 * Why a helper instead of inlining `deps.model.invoke(...)` in every
 * subgraph:
 *   - The billing guard (`finalize-usage`) reads `state.usage` to
 *     record tokens. Centralising the model call means every
 *     subgraph produces the same `usage` write-back shape and the
 *     finalize-usage node never has to special-case each graph.
 *   - Scratchpad writes (`state.scratchpad.report`,
 *     `state.scratchpad.summary`) follow the same pattern, so the
 *     post-graph queries that fetch them stay generic too.
 *   - Tool calls, if the model emits any, are returned in the
 *     same envelope so the runtime can persist them uniformly.
 *
 * Conventions for the prompt inputs:
 *   - `systemPrompt` should already include the locale, the JSON
 *     schema for the output (if any), and the role persona. The
 *     runtime does not append anything.
 *   - `userPrompt` is the *single* user message the model sees; we
 *     keep the synthesis turn to one user message so the model has
 *     no temptation to mix research context with chat history.
 *   - `tools` are optional. Most synthesis turns do not need tools
 *     because the branch outputs are already in the prompt.
 */
import type { ModelInvocationResult } from "../domain/ports/model-gateway.port";
import type { AgentRunState } from "../domain/state";
import type { CompiledGraphDeps } from "../infrastructure/graph-factory";

/**
 * Inputs to the synthesis step.
 *
 * Subgraphs decide where the `systemPrompt` / `userPrompt` strings
 * come from; everything else is fixed.
 */
export interface CallModelInput {
  /** Model key — will be passed to `deps.model.invoke()` verbatim. */
  readonly modelKey: string;
  /** System prompt, locale + persona already baked in. */
  readonly systemPrompt: string;
  /**
   * Single user message the model sees. Branch outputs go into
   * the body; the runtime does not append any extra context.
   */
  readonly userPrompt: string;
  /**
   * Field on `state.scratchpad` where the final assistant text
   * should be written (e.g. `"report"`, `"summary"`). Defaults to
   * `"report"` for the common case.
   */
  readonly outputField?: string;
  /** Tool definitions forwarded to the gateway. */
  readonly tools?: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  }>;
  /** Sampling temperature (defaults to gateway policy). */
  readonly temperature?: number;
  /** Hard cap on completion tokens. */
  readonly maxTokens?: number;
}

/**
 * Default output field name for synthesis nodes — keeps call sites
 * terse when they only need "drop the answer into `scratchpad.report`".
 */
export const DEFAULT_OUTPUT_FIELD = "report";

/**
 * Run a synthesis step through the configured model gateway.
 *
 * The function returns a `Partial<AgentRunState>` shaped the way the
 * existing subgraph factories expect: it merges new keys into the
 * existing `scratchpad` (the annotation's reducer handles the merge)
 * and writes token accounting to `state.usage` so the
 * `finalize-usage` node can pick them up.
 */
export async function callModelNode(
  state: AgentRunState,
  deps: CompiledGraphDeps,
  input: CallModelInput,
): Promise<Partial<AgentRunState>> {
  if (!deps.model) {
    throw new ToolCallFailedError("model", "model gateway missing from deps");
  }

  const result: ModelInvocationResult = await deps.model.invoke({
    modelKey: input.modelKey,
    systemPrompt: input.systemPrompt,
    messages: [{ role: "user", content: input.userPrompt }],
    ...(input.tools !== undefined ? { tools: input.tools } : {}),
    ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
  });

  const outputField = input.outputField ?? DEFAULT_OUTPUT_FIELD;
  const scratchpad = {
    ...(state.scratchpad as Record<string, unknown>),
    [outputField]: result.content,
  };

  deps.logger.info("call-model: synthesis complete", {
    runId: state.runId,
    field: outputField,
    modelKey: input.modelKey,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    toolCallCount: result.toolCalls.length,
  });

  return {
    scratchpad,
    usage: {
      ...(typeof state.usage === "object" && state.usage !== null
        ? (state.usage as Record<string, unknown>)
        : {}),
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      // Cost calculation belongs to `finalize-usage` (CLAUDE.md §11).
      // We propagate the previous value if any, default to 0 string
      // so the billing finalize node can overwrite deterministically.
      costUsd:
        typeof state.usage === "object" &&
        state.usage !== null &&
        typeof (state.usage as { costUsd?: unknown }).costUsd === "string"
          ? (state.usage as { costUsd: string }).costUsd
          : "0",
    },
    currentNode: "call-model",
  };
}

/**
 * Default model key for synthesis nodes. Subgraphs can override
 * via the `modelKey` field on `CallModelInput`; this is the
 * fallback so tests + new subgraphs work out of the box.
 */
export const DEFAULT_MODEL_KEY = "claude-sonnet-4-6";

/**
 * Default system prompt for synthesis nodes — finance-aware and
 * lean. Subgraphs typically override this; the fallback is here so
 * a forgotten override still produces something useful.
 */
export const DEFAULT_FINANCE_SYSTEM_PROMPT = [
  "You are a finance research analyst working in a notebook-style",
  "markdown format. You will receive structured research output",
  "from earlier branches; produce a clear, well-organised report",
  "that a retail investor can read in under five minutes.",
  "",
  "Cite figures from the input where possible and flag anything",
  "missing rather than guessing.",
].join(" ");
