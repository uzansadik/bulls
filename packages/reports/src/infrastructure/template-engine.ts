/**
 * @openbulls/reports — handlebars template engine.
 *
 * Single \`compile\` entrypoint compiles a template string + vars →
 * rendered string. Markdown renderer uses this directly; PDF/Excel
 * (Faz 7.3.1) will use it to render the *body* of their reports
 * before formatting.
 *
 * Why handlebars? PLAN §Faz 7 explicitly called it out as the
 * candidate engine. Custom {{var}} substitution in
 * @openbulls/notifications/templates is too primitive for the
 * sections / loops / partials reports need.
 */
import { compile, type TemplateDelegate } from "handlebars";

export interface CompileOptions {
  readonly strict?: boolean;
  readonly noEscape?: boolean;
}

/**
 * Compile + render in one call. Compiles every time — callers
 * rendering the same template in a hot loop should cache the
 * returned delegate via \`compileTemplate()\` instead.
 */
export function renderTemplate(
  template: string,
  vars: Readonly<Record<string, unknown>>,
  options: CompileOptions = {},
): string {
  return compileTemplate(template, options)(vars);
}

/**
 * Compile a template once, get back a reusable delegate. Renderer
 * tests use this to assert on the compiled shape without the
 * one-shot \`renderTemplate\` indirection.
 */
export function compileTemplate(
  template: string,
  options: CompileOptions = {},
): TemplateDelegate {
  return compile(template, {
    strict: options.strict ?? false,
    noEscape: options.noEscape ?? false,
  });
}