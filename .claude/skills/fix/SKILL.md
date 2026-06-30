---
name: fix
description: Fix a specific Openbulls issue with the smallest safe code change.
allowed-tools: Read, Grep, Glob, Edit, Bash
---

# Openbulls Fix Skill

Use this skill when fixing a concrete bug or TypeScript/build issue.

Rules:

- First identify the root cause.
- Make the smallest safe change.
- Do not rewrite unrelated files.
- Preserve package boundaries.
- Prefer package-level fixes over app-level hacks.
- After fixing, explain which files changed and why.
- If schema changes are made, mention migration generation.
