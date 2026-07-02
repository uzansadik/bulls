import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// `next build` runs with a different cwd than the file location in
// some setups; pin the request-config path absolutely relative to
// this file so the plugin never resolves it against the wrong
// directory.
const withNextIntl = createNextIntlPlugin(
	path.join(process.cwd(), "i18n/request.ts"),
);

const config: NextConfig = {
	transpilePackages: [
		"@openbulls/ai",
		"@openbulls/auth",
		"@openbulls/config",
		"@openbulls/db",
		"@openbulls/i18n",
		"@openbulls/logger",
		"@openbulls/market-data",
		"@openbulls/portfolio",
		"@openbulls/shared",
		"@openbulls/ui",
	],
	// Disable typed routes — every new page would otherwise require
	// updating every existing `<Link href>`. We rely on runtime
	// resolution instead.
	typedRoutes: false,
	images: {
		remotePatterns: [{ protocol: "https", hostname: "**" }],
	},
};

export default withNextIntl(config);