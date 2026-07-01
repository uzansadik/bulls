import { auth } from "@openbulls/auth/server";
import { toNextJsHandler } from "@openbulls/auth/server";

export const { GET, POST } = toNextJsHandler(auth);
