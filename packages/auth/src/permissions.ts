export const ROLE_ADMIN = "admin" as const;

export const ROLE_USER = "user" as const;

export type Role = typeof ROLE_ADMIN | typeof ROLE_USER;

export function isAdmin(role: unknown): role is typeof ROLE_ADMIN {
  return role === ROLE_ADMIN;
}

export function isUser(role: unknown): role is typeof ROLE_USER {
  return role === ROLE_USER;
}
