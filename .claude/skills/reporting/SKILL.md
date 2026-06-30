---
name: reporting
description: Work on Openbulls PDF, Excel, Markdown report generation and export flows.
allowed-tools: Read, Grep, Glob, Edit, Bash
---

# Openbulls Reporting Skill

Reports package:

```txt
packages/reports/
  package.json
  tsconfig.json
  tsup.config.ts
  src/
    index.ts
    domain/
    application/
    infrastructure/
```

Rules:

- Report generation belongs in packages/reports.
- AI content generation belongs in packages/agent-runtime or packages/ai.
- Export format logic belongs in reports/infrastructure.
- Keep PDF, Excel, and Markdown generators separated.
- Reports should be generated from structured data when possible.
