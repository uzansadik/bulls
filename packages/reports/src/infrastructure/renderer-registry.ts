/**
 * @openbulls/reports — renderer registry.
 *
 * Maps (reportType, format) → a renderer that produces bytes.
 * Today only \`markdown\` is wired; PDF + Excel slots throw
 * \`TemplateMissingError\` so the orchestrator marks the row
 * failed with a clear reason. The composition root picks
 * \`defaultRendererResolver\` unless the caller passes their own
 * (Faz 8 admin UIs use this to register custom templates).
 */
import type { ReportType } from "../domain";
import { TemplateMissingError } from "../domain";
import type { RendererResolver } from "./composition";
import { renderMarkdown } from "./markdown/markdown-report.renderer";

const MARKDOWN_TEMPLATE_PORTFOLIO = `# {{title}}

**Type:** {{reportType}}
**Generated:** {{generatedAt}}
**Locale:** {{locale}}

## Overview

{{overview}}

## Performance

{{performance}}

## Risk flags

{{riskFlags}}
`;

const MARKDOWN_TEMPLATE_COMPANY = `# {{title}}

**Type:** {{reportType}}
**Symbol:** {{symbol}}
**Generated:** {{generatedAt}}

## Summary

{{summary}}

## Financials

{{financials}}

## Recommendation

{{recommendation}}
`;

const MARKDOWN_TEMPLATE_TECHNICAL = `# {{title}}

**Type:** {{reportType}}
**Symbol:** {{symbol}}
**Generated:** {{generatedAt}}

## Indicators

{{indicators}}

## Trend

{{trend}}
`;

const MARKDOWN_TEMPLATE_EARNINGS = `# {{title}}

**Type:** {{reportType}}
**Generated:** {{generatedAt}}

## Upcoming earnings

{{upcoming}}
`;

const MARKDOWN_TEMPLATES: Record<ReportType, string> = {
  portfolio_review: MARKDOWN_TEMPLATE_PORTFOLIO,
  company_analysis: MARKDOWN_TEMPLATE_COMPANY,
  technical_analysis: MARKDOWN_TEMPLATE_TECHNICAL,
  earnings_summary: MARKDOWN_TEMPLATE_EARNINGS,
  custom: MARKDOWN_TEMPLATE_PORTFOLIO, // fallback
};

export const TEMPLATE_BY_REPORT_TYPE: Readonly<Record<ReportType, string>> =
  MARKDOWN_TEMPLATES;

export interface RendererResolverDeps {
  readonly now?: () => Date;
}

/**
 * Default renderer resolver: returns the markdown renderer for any
 * (type, \`markdown\`) pair. PDF + Excel (Faz 7.3.1) extend this
 * with their own branches.
 */
export function createDefaultRendererResolver(
  _deps: RendererResolverDeps = {},
): RendererResolver {
  return async (reportType, format) => {
    if (format !== "markdown") {
      throw new TemplateMissingError(
        `renderer not yet implemented for format=${format}`,
        { reportType, format },
      );
    }
    const tplSource =
      TEMPLATE_BY_REPORT_TYPE[reportType as ReportType] ??
      TEMPLATE_BY_REPORT_TYPE.custom;
    return {
      contentType: "text/markdown",
      render: async () => {
        return renderMarkdown({
          reportType,
          title: "Openbulls report",
          parameters: {},
          templateSource: tplSource,
          data: {
            reportType,
            title: "Openbulls report",
            generatedAt: new Date().toISOString(),
          },
        });
      },
    };
  };
}