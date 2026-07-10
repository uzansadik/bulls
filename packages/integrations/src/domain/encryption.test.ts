/**
 * @openbulls/integrations — `encryption` round-trip + tamper tests.
 */
import { describe, expect, it } from "vitest";

import { decrypt, encrypt, resolveEncryptionKey } from "./encryption";

const KEY_HEX = "a".repeat(64); // 32 zero-ish bytes (valid hex length)

describe("resolveEncryptionKey", () => {
  it("accepts a 64-char hex string", () => {
    const key = resolveEncryptionKey(KEY_HEX);
    expect(key).toHaveLength(32);
  });

  it("rejects a wrong-length string", () => {
    expect(() => resolveEncryptionKey("abc")).toThrow(/64-character hex/);
  });

  it("rejects non-hex characters", () => {
    expect(() => resolveEncryptionKey("z".repeat(64))).toThrow(/64-character hex/);
  });
});

describe("encrypt + decrypt round-trip", () => {
  it("decrypts back to the original plaintext", () => {
    const key = resolveEncryptionKey(KEY_HEX);
    const plaintext = "smtp-password-p4$$w0rd";
    const ciphertext = encrypt(plaintext, key);
    expect(ciphertext.startsWith("v1:")).toBe(true);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const key = resolveEncryptionKey(KEY_HEX);
    const a = encrypt("same plaintext", key);
    const b = encrypt("same plaintext", key);
    expect(a).not.toBe(b);
    expect(decrypt(a, key)).toBe("same plaintext");
    expect(decrypt(b, key)).toBe("same plaintext");
  });

  it("rejects wrong key on decrypt (auth tag failure)", () => {
    const keyA = resolveEncryptionKey(KEY_HEX);
    const keyB = resolveEncryptionKey("b".repeat(64));
    const ciphertext = encrypt("secret", keyA);
    expect(() => decrypt(ciphertext, keyB)).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const key = resolveEncryptionKey(KEY_HEX);
    const ciphertext = encrypt("secret", key);
    // Tamper with the last char of the hex payload.
    const tampered = `${ciphertext.slice(0, -1)}${ciphertext.endsWith("a") ? "b" : "a"}`;
    expect(() => decrypt(tampered, key)).toThrow();
  });
});
