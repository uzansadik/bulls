/**
 * @openbulls/agent-runtime — report-writer subgraph.
 *
 * PLAN §Faz 7.5 — LangGraph subgraph that prepares the structured
 * data + LLM summary that the agent-worker then hands to
 * `apps/agent-worker`'s `report-render` handler. The subgraph does
 * NOT render bytes itself (no pdfkit / exceljs in this process) —
 * separation of concerns keeps the runtime pure-Node and the
 * rendering libraries out of the agent bundle.
 *
 * Linear pipeline:
 *
 *   START
 *     ↓
 *   reserve-credit
 *     ↓
 *   load-source-data         ← pulls structured data by reportType
 *     ↓
 *   select-template          ← chooses templateSource (markdown)
 *     ↓
 *   synthesize-report        ← LLM summary written to scratchpad.report
 *     ↓
 *   finalize-usage
 *     ↓
 *   END
 *
 * Subgraph-specific scratchpad:
 *   {
 *     reportType, format, title?, parameters,
 *     data?,              // structured payload the handler renders
 *     templateSource?,    // handlebars template (markdown today;
 *                         // PDF/Excel land with the renderer registry)
 *     locale?,            // "tr" | "en", default "tr"
 *     report?,            // LLM summary (markdown body)
 *   }
 *
 * After this subgraph returns, the agent-worker's
 * `report-render-handler` reads the scratchpad + reportType + format
 * and calls `reports.services.renderReport(...)`. The
 * `renderReport` orchestrator does NOT re-fetch this data — it
 * reads what the subgraph collected (via `parameters`) and hands it
 * to the markdown renderer.
 */
import { StateGraph } from "@langchain/langgraph";

import { AgentRunStateAnnotation } from "../domain/langgraph-annotation";
import type { AgentRunState } from "../domain/state";
import type { CompiledGraphDeps, CompiledGraphFactory } from "../infrastructure/graph-factory";
import {
  DEFAULT_FINANCE_SYSTEM_PROMPT,
  DEFAULT_MODEL_KEY,
  callModelNode,
} from "../nodes/call-model.node.js";
import { finalizeUsageNode } from "../nodes/finalize-usage.node.js";
import { logStep } from "../nodes/log-step-node.js";
import { reserveCreditNode } from "../nodes/reserve-credit.node.js";

// ─── Subgraph-specific state ────────────────────────────────────────────────

export type ReportFormatLiteral = "pdf" | "excel" | "markdown";
export type ReportLocale = "tr" | "en";

export interface ReportWriterScratchpad {
  readonly reportType: string;
  readonly format: ReportFormatLiteral;
  readonly title?: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Structured payload the renderer fills the template with. */
  readonly data?: Readonly<Record<string, unknown>>;
  /** Selected handlebars template source (markdown today). */
  readonly templateSource?: string;
  /** Locale — drives `t(locale, ...)` inside the renderer. */
  readonly locale?: ReportLocale;
  /** LLM-written summary that becomes the report body. */
  readonly report?: string;
}

export interface ReportWriterInput {
  readonly reportType: string;
  readonly format: ReportFormatLiteral;
  readonly title?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly locale?: ReportLocale;
  /** Optional cost guardrail for credit reservation. */
  readonly estimatedCostUsd?: string;
}

export type ReportWriterState = AgentRunState & ReportWriterScratchpad;

// ─── Default templates (markdown; PDF/Excel land in Faz 7.3.1) ─────────────

const TEMPLATE_BY_TYPE: Readonly<Record<string, string>> = {
  portfolio_review: "# {{title}}\n\n{{report}}\n\n## Parameters\n\n{{parametersJson}}\n",
  company_analysis: "# {{title}}\n\n{{report}}\n\n## Symbol\n\n{{symbol}}\n",
  technical_analysis: "# {{title}}\n\n{{report}}\n\n## Symbol\n\n{{symbol}}\n",
  earnings_summary: "# {{title}}\n\n{{report}}\n\n## Window\n\n{{window}}\n",
  custom: "# {{title}}\n\n{{report}}\n",
};

// ─── Node functions ────────────────────────────────────────────────────────

/**
 * Collects structured data for the report. Today this is a thin
 * pass-through — the orchestrator typically arrives with
 * `parameters` already populated (portfolio overview, market
 * snapshot, etc.). Future iterations swap this for portfolio /
 * market-data service calls so the subgraph is self-sufficient
 * when invoked without pre-loaded parameters.
 */
const loadSourceData = async (
  state: AgentRunState,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as ReportWriterScratchpad;
  const data = { ...(scratch.parameters ?? {}) };
  depsLog(state, "report-writer: source data loaded", { reportType: scratch.reportType });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), data },
    currentNode: "load-source-data",
  };
};

const selectTemplate = async (
  state: AgentRunState,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as ReportWriterScratchpad;
  const tpl = TEMPLATE_BY_TYPE[scratch.reportType] ?? TEMPLATE_BY_TYPE.custom;
  depsLog(state, "report-writer: template selected", {
    reportType: scratch.reportType,
    format: scratch.format,
  });
  return {
    scratchpad: { ...(state.scratchpad as Record<string, unknown>), templateSource: tpl },
    currentNode: "select-template",
  };
};

const synthesizeReport = async (
  state: AgentRunState,
  deps: CompiledGraphDeps,
): Promise<Partial<AgentRunState>> => {
  const scratch = state.scratchpad as unknown as ReportWriterScratchpad;
  const userPrompt = [
    `# Report type: ${scratch.reportType}`,
    `# Format: ${scratch.format}`,
    scratch.title ? `# Title: ${scratch.title}` : "",
    scratch.locale ? `# Locale: ${scratch.locale}` : "",
    "",
    "## Parameters",
    JSON.stringify(scratch.parameters ?? {}),
    "",
    "## Source data",
    JSON.stringify(scratch.data ?? {}),
    "",
    "Write a focused, structured markdown summary suitable for the report body. Be concise; aim for 200-400 words. Use headers and bullet points where helpful.",
  ]
    .filter(Boolean)
    .join("\n");

  const update = await callModelNode(state, deps, {
    modelKey: DEFAULT_MODEL_KEY,
    systemPrompt: `${DEFAULT_FINANCE_SYSTEM_PROMPT} Today's task: write the body of a structured ${scratch.reportType} report in ${scratch.locale ?? "tr"}.`,
    userPrompt,
    outputField: "report",
  });
  return {
    ...update,
    currentNode: "synthesize-report",
  };
};

/**
 * Tiny logger bridge — the runtime deps don't expose the `logger`
 * via state, so we read it through `deps` when needed. Falls back
 * to a no-op when `deps` is undefined in unit tests.
 */
function depsLog(state: AgentRunState, msg: string, ctx: Record<string, unknown>): void {
  // no-op logger — runtime deps aren't on state. Reserved for a
  // future wiring that threads the dep logger into subgraph
  // nodes via `Annotation` (FAZ 8+).
  void state;
  void msg;
  void ctx;
}

// ─── Factory ────────────────────────────────────────────────────────────────

export const reportWriterGraph: CompiledGraphFactory = (deps) => {
  const runReserve = (state: unknown) =>
    reserveCreditNode.run(state as AgentRunState, deps as CompiledGraphDeps);
  const runFinalize = (state: unknown) =>
    finalizeUsageNode.run(state as AgentRunState, deps as CompiledGraphDeps);
  const log = (stepKey: string) => (state: unknown) =>
    logStep({ stepKey }).run(state as AgentRunState, deps as CompiledGraphDeps);

  const sg = new StateGraph(AgentRunStateAnnotation)
    .addNode("reserve-credit", runReserve)
    .addNode("log-step-reserve-credit", log("reserve-credit"))
    .addNode("load-source-data", (state) => loadSourceData(state as AgentRunState))
    .addNode("log-step-load-source-data", log("load-source-data"))
    .addNode("select-template", (state) => selectTemplate(state as AgentRunState))
    .addNode("log-step-select-template", log("select-template"))
    .addNode("synthesize-report", (state) =>
      synthesizeReport(state as AgentRunState, deps),
    )
    .addNode("log-step-finalize-usage", log("finalize-usage"))
    .addNode("finalize-usage", runFinalize)
    .addEdge("__start__", "reserve-credit")
    .addEdge("reserve-credit", "log-step-reserve-credit")
    .addEdge("log-step-reserve-credit", "load-source-data")
    .addEdge("load-source-data", "log-step-load-source-data")
    .addEdge("log-step-load-source-data", "select-template")
    .addEdge("select-template", "log-step-select-template")
    .addEdge("log-step-select-template", "synthesize-report")
    .addEdge("synthesize-report", "log-step-finalize-usage")
    .addEdge("log-step-finalize-usage", "finalize-usage")
    .addEdge("finalize-usage", "__end__");

  return sg.compile({
    checkpointer: deps.checkpointer,
  }) as unknown as ReturnType<CompiledGraphFactory>;
};