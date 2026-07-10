/**
 * @openbulls/integrations — AES-256-GCM encryption helpers.
 *
 * Used by `packages/notifications` to encrypt `notificationChannels.config`
 * secrets (SMTP passwords, OAuth tokens, etc.) at rest in the DB. The
 * `encryptionKey` arg is a 32-byte hex string (64 chars); resolve it
 * from `INTEGRATIONS_ENCRYPTION_KEY` env in the composition root.
 *
 * Format on disk (string-ciphertext):
 *   `v1:<iv-hex>:<auth-tag-hex>:<ciphertext-hex>`
 *
 * Algorithm: AES-256-GCM, 12-byte IV, 16-byte auth tag. AES-GCM is
 * authenticated (tamper-evident) so we never need a separate HMAC.
 *
 * Failure mode:
 *   - Wrong key length → throws (call site fails fast at boot).
 *   - Wrong key on decrypt → throws `Error("Unsupported state")` from
 *     `decipheriv`. The caller (notification repository) converts
 *     this into a `ChannelSendError` so the user sees a clear log.
 *
 * The `v1:` prefix is forward-compatible — if we ever swap to AES-GCM-SIV
 * or argon2id-derived keys we bump to `v2:` without invalidating old
 * ciphertexts.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const VERSION_PREFIX = "v1";

/**
 * 32-byte key derived from a 64-char hex env value. Re-export the
 * Buffer type as `EncryptionKey` so callers see a named alias rather
 * than a bare `Buffer`.
 */
export type EncryptionKey = Buffer;

/**
 * Derive a 32-byte key from a hex string. Throws when the input is not
 * exactly 64 hex chars (32 bytes). Callers should resolve `encryptionKey`
 * from env once at boot and reuse the same key for every call.
 */
export function resolveEncryptionKey(hex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("encryption key must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt `plaintext` (UTF-8 string) with `key`. Returns a versioned
 * string suitable for storage.
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION_PREFIX,
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a versioned ciphertext back to UTF-8. Throws when the
 * version prefix is unknown, the input is malformed, or the auth tag
 * fails verification (wrong key / tampered ciphertext).
 */
export function decrypt(payload: string, key: Buffer): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new Error(`unsupported ciphertext version: ${parts[0] ?? "<missing>"}`);
  }
  const [, ivHex, authTagHex, ciphertextHex] = parts;
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("malformed ciphertext");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
