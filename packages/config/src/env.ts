/**
 * @openbulls/config — environment variable access.
 *
 * Two flavors:
 *   - `serverEnv()` — privileged, only callable from server code
 *   - `publicEnv()` — safe to expose to client (NEXT_PUBLIC_*)
 *
 * Throws on missing required variables so misconfiguration is caught at
 * boot, not at runtime.
 */

type NodeEnv = "development" | "test" | "production";

const NODE_ENV = (process.env.NODE_ENV ?? "development") as NodeEnv;

interface ServerEnv {
	NODE_ENV: NodeEnv;
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	LOG_LEVEL: string;
	REDIS_URL: string | undefined;
	STRIPE_SECRET_KEY: string | undefined;
	STRIPE_WEBHOOK_SECRET: string | undefined;
	IYZICO_API_KEY: string | undefined;
	IYZICO_SECRET_KEY: string | undefined;
	AI_GATEWAY_API_KEY: string | undefined;
	ANTHROPIC_API_KEY: string | undefined;
	OPENAI_API_KEY: string | undefined;
	GOOGLE_GENERATIVE_AI_API_KEY: string | undefined;
	TELEGRAM_BOT_TOKEN: string | undefined;
	TELEGRAM_WEBHOOK_SECRET: string | undefined;
	TWELVE_DATA_API_KEY: string | undefined;
	YAHOO_FINANCE_API_KEY: string | undefined;
	KAP_API_KEY: string | undefined;
	TCMB_API_KEY: string | undefined;
	SENTRY_DSN: string | undefined;
	OTEL_EXPORTER_OTLP_ENDPOINT: string | undefined;
}

interface PublicEnv {
	NEXT_PUBLIC_APP_URL: string;
}

let cachedServer: ServerEnv | null = null;
let cachedPublic: PublicEnv | null = null;

/**
 * Memoized server env reader. Throws if a required key is missing.
 * Use from server-only code (route handlers, server actions, workers).
 */
export function serverEnv(): ServerEnv {
	if (cachedServer) return cachedServer;
	const required = (key: string): string => {
		const value = process.env[key];
		if (!value || value.length === 0) {
			throw new Error(`Missing required env var: ${key}`);
		}
		return value;
	};
	const env: ServerEnv = {
		NODE_ENV,
		DATABASE_URL: required("DATABASE_URL"),
		BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
		BETTER_AUTH_URL: required("BETTER_AUTH_URL"),
		LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
		REDIS_URL: process.env.REDIS_URL,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		IYZICO_API_KEY: process.env.IYZICO_API_KEY,
		IYZICO_SECRET_KEY: process.env.IYZICO_SECRET_KEY,
		AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		GOOGLE_GENERATIVE_AI_API_KEY:
			process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
		TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
		TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
		YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY,
		KAP_API_KEY: process.env.KAP_API_KEY,
		TCMB_API_KEY: process.env.TCMB_API_KEY,
		SENTRY_DSN: process.env.SENTRY_DSN,
		OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
	};
	cachedServer = env;
	return env;
}

/**
 * Memoized public env reader. Safe for client bundles.
 */
export function publicEnv(): PublicEnv {
	if (cachedPublic) return cachedPublic;
	cachedPublic = {
		NEXT_PUBLIC_APP_URL:
			process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
	};
	return cachedPublic;
}

/**
 * Reset memoized env (for tests only).
 */
export function resetEnvCache(): void {
	cachedServer = null;
	cachedPublic = null;
}

export type { NodeEnv, PublicEnv, ServerEnv };