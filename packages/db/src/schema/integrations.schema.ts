import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";
import { integrationProviderEnum } from "./enums";

/**
 * Encrypted external secrets per user (provider API keys, telegram tokens, …).
 * Encryption (AES-GCM) happens in packages/integrations; the DB stores only
 * the ciphertext, IV, and auth tag. `keyVersion` allows rotation.
 */
export const integrationSecrets = pgTable(
  "integration_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    metadata: jsonb("metadata").notNull().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("integration_secrets_user_provider_name_uniq").on(
      table.userId,
      table.provider,
      table.name,
    ),
    index("integration_secrets_user_provider_idx").on(table.userId, table.provider),
  ],
);

export type IntegrationSecret = typeof integrationSecrets.$inferSelect;
export type NewIntegrationSecret = typeof integrationSecrets.$inferInsert;
