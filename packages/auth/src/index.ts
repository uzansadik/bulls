/**
 * @openbulls/auth
 *
 * Better Auth configuration shared across apps. Import the `auth`
 * instance from `@openbulls/auth/server` for handlers, and from
 * `@openbulls/auth/client` for browser / Next.js client components.
 */

export { auth, type Auth } from "./server.js";
export { authClient } from "./client.js";
export { ROLE_ADMIN, ROLE_USER, type Role, isAdmin } from "./permissions.js";
