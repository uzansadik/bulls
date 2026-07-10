/**
 * @openbulls/reports — Markdown renderer.
 *
 * The simplest of the three formats (Faz 7.3 ships markdown; PDF +
 * Excel land in Faz 7.3.1). Reads a Handlebars template from the
 * default template registry, runs \`t()\` over the i18n catalog,
 * emits a UTF-8 string → Buffer.
 *
 * Why Markdown first? It exercises the orchestration pipeline
 * (insert → resolveRenderer → render → upload → markReady) end
 * to end without pulling in a 30MB pdfkit dependency. The
 * notification dispatcher already uses Markdown for Telegram;
 * a Markdown report is the natural continuation.
 */
import { renderTemplate } from "../template-engine";
import { asLocale, t } from "../i18n/translate";

export interface MarkdownRendererInput {
  readonly reportType: string;
  readonly title: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly locale?: string;
  readonly templateSource: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export function renderMarkdown(input: MarkdownRendererInput): Buffer {
  const locale = asLocale(input.locale);
  const headers = {
    title: input.title,
    generatedAt: new Date().toISOString(),
    locale,
    prefix: t(locale, "reports.common.prefix", { title: input.title }),
  };

  const body = renderTemplate(input.templateSource, {
    ...headers,
    ...input.data,
    parameters: input.parameters,
  });

  const footer = t(locale, "reports.common.footer");
  const text = `${headers.prefix}\n\n${body}\n\n---\n${footer}\n`;
  return Buffer.from(text, "utf8");
}