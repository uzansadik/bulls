---
name: db
description: Work on Openbulls Drizzle schemas, repositories, migrations, indexes, and data integrity.
allowed-tools: Read, Grep, Glob, Edit, Bash
---

# Openbulls DB Skill

Use Drizzle ORM.

Schema files:

```txt
packages/db/src/schema/
```

Repository files:

```txt
packages/db/src/repositories/
```

Rules:

- Use UUID primary keys.
- Add indexes for userId, sessionId, portfolioId, symbol, createdAt, nextRunAt.
- Use numeric columns for money, prices, quantities, FX rates, and token costs.
- Use timestamp with timezone for event times.
- Do not put business logic in schema files.
- Repository methods should be small and typed.
- After schema changes, mention whether migration generation is needed.
