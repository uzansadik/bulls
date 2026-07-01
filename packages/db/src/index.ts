/**
 * @openbulls/db — barrel export.
 *
 * Consumers should import from sub-paths to keep tree-shaking tight:
 *   import { db, withTransaction } from "@openbulls/db/client";
 *   import * as schema from "@openbulls/db/schema";
 *   import { plans, subscriptions } from "@openbulls/db/schema/billing.schema";
 */

export * from "./client";
export * as schema from "./schema";
export * from "./schema";
