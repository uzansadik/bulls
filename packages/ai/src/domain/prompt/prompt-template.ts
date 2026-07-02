/**
 * @openbulls/ai — domain: prompt template.
 *
 * Lightweight `${var}` substitution renderer. We do not bring in a
 * full template engine (Handlebars / Liquid / Mustache) because:
 *
 *   1. System prompts are short and have stable shape.
 *   2. We want zero runtime dependencies outside the workspace.
 *   3. The full language features (loops, conditionals) are not
 *      needed for finance-domain instructions.
 *
 * Variables are looked up by name. Unknown names throw at render
 * time — surfacing the missing variable is much more useful than
 * silently leaving a `${whatever}` placeholder in the final prompt
 * and watching the model hallucinate around it.
 *
 * Names must match `[A-Za-z_][A-Za-z0-9_]*`. The same regex is
 * applied when extracting variables from the template body so the
 * declared `variables` set and the actual references stay in sync.
 */
const VARIABLE_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const VALID_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface PromptTemplate {
  readonly name: string;
  readonly template: string;
  readonly variables: ReadonlyArray<string>;
}

export interface RenderOptions {
  /** Strict mode (default `true`): throw on missing variable. */
  readonly strict?: boolean;
}

export const PromptTemplate = {
  /**
   * Declare a template. Extracts the variable names automatically
   * — the declared `variables` list is computed from the template
   * body so the two cannot drift.
   */
  of(name: string, template: string): PromptTemplate {
    const variables = PromptTemplate.extractVariables(template);
    return { name, template, variables };
  },
  /**
   * Render a template with the given context. Throws on missing
   * variables when `strict` is true (the default).
   */
  render(
    template: PromptTemplate,
    context: Record<string, unknown>,
    options: RenderOptions = {},
  ): string {
    const strict = options.strict ?? true;
    return template.template.replace(VARIABLE_PATTERN, (match, varName: string) => {
      if (!VALID_NAME_PATTERN.test(varName)) {
        throw new PromptRenderError(
          `template "${template.name}" contains invalid variable name: ${varName}`,
          template.name,
        );
      }
      if (!(varName in context)) {
        const message = `template "${template.name}" missing variable: ${varName}`;
        if (strict) {
          throw new PromptRenderError(message, template.name);
        }
        return match;
      }
      const value = context[varName];
      if (value === undefined || value === null) {
        const message = `template "${template.name}" variable ${varName} is ${value}`;
        if (strict) {
          throw new PromptRenderError(message, template.name);
        }
        return match;
      }
      return String(value);
    });
  },
  extractVariables(template: string): ReadonlyArray<string> {
    const seen = new Set<string>();
    for (const match of template.matchAll(VARIABLE_PATTERN)) {
      const name = match[1];
      if (name && VALID_NAME_PATTERN.test(name)) {
        seen.add(name);
      }
    }
    return [...seen].sort();
  },
} as const;

// Imported here to avoid a circular barrel — errors.ts re-exports this
// type for consumers that want a single import surface.
import { PromptRenderError } from "../errors";
