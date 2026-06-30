---
name: langgraph
description: Design or implement Openbulls LangGraph workflows, graph nodes, state, checkpointing, parallel agents, and resumable execution.
allowed-tools: Read, Grep, Glob, Edit, Bash
---

# Openbulls LangGraph Skill

LangGraph is the central agent workflow runtime.

Use this skill for:

- graph definitions
- graph state
- graph nodes
- checkpointing
- resumable runs
- parallel subagents
- human-in-the-loop flows
- agent-worker graph execution

Preferred package:

```txt
packages/agent-runtime/
  src/
    langgraph/
    graphs/
    nodes/
    state/
    persistence/
    subagents/
    events/
```

Separation:

```txt
packages/ai = models, tools, prompts, memory, telemetry
packages/agent-runtime = LangGraph runtime, graphs, nodes, state, persistence
apps/agent-worker = queued graph execution
packages/jobs = queue abstraction
```

Rules:

- Do not build a custom state machine unless LangGraph cannot support the use case.
- Persist graph state after meaningful nodes.
- Parallel analysis should be represented as graph branches or subgraphs.
- Credit-insufficient must pause the run safely.
- Resuming should continue from the latest persisted checkpoint.
