import en from "../messages/en.json" with { type: "json" };
import tr from "../messages/tr.json" with { type: "json" };

import type { Locale } from "./config.js";

export const messages: Record<Locale, typeof tr> = {
  tr,
  en,
};

export type MessageCatalog = typeof tr;
