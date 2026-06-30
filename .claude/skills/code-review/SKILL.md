---
name: code-review
description: Review Openbulls code for bugs, architecture problems, package boundary issues, billing bypasses, and maintainability risks.
allowed-tools: Read, Grep, Glob, Bash
---

# Openbulls Code Review Skill

Review for:

- TypeScript errors
- hidden any usage
- package boundary violations
- business logic in apps
- billing bypasses
- missing credit checks
- weak validation
- data integrity problems
- incorrect LangGraph / AI SDK usage
- provider logic leaking into domain services

Output style:

- Critical issues first.
- Give exact file paths.
- Explain why it matters.
- Suggest minimal fixes.
- Do not rewrite code unless asked.
