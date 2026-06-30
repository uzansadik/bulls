---
name: check
description: Check the Openbulls codebase for TypeScript, build, lint, and architecture issues.
allowed-tools: Read, Grep, Glob, Bash
---

# Openbulls Check Skill

Run or suggest these checks when relevant:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Focus on:

- TypeScript errors
- package boundary violations
- missing exports
- incorrect imports
- Drizzle schema issues
- Next.js App Router mistakes
- AI SDK / LangChain / LangGraph type issues
- incorrect package dependencies

Do not make unrelated changes.
