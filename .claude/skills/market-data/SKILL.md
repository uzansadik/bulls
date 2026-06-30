---
name: market-data
description: Work on Openbulls market data, prices, candles, financial statements, ratios, indicators, and providers.
allowed-tools: Read, Grep, Glob, Edit, Bash
---

# Openbulls Market Data Skill

Market data belongs in:

```txt
packages/market-data/
```

It owns:

- prices
- candles
- FX rates
- financial statements
- financial ratios
- technical indicators
- market news
- KAP / SEC / Yahoo / Twelve Data / TCMB providers

Rules:

- Provider adapters live in infrastructure.
- Calculation logic lives in domain/services.
- Commands and queries live in application.
- Ports define provider/repository boundaries.
- Do not move market-data providers to packages/integrations.
