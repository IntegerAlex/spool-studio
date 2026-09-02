import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto"

/**
 * Encryption helpers for API keys at rest.
 *
 * Keys are encrypted with AES-256-GCM (authenticated encryption: integrity +
 * confidentiality). The encryption key is deterministically derived from the
 * existing JWT_SECRET via HKDF, so operators do not need to manage a second
 * secret. Each encryption uses a fresh random 96-bit IV; the IV and GCM auth
 * tag are stored alongside the ciphertext (they are not secret).
 */

const KEY_LEN = 32 // 256-bit
const IV_LEN = 12 // 96-bit, recommended for GCM
const SALT = "spool:user-ai-settings:v1"
const INFO = "spool:aes-256-gcm:api-key"

export interface EncryptedBlob {
  /** base64 ciphertext */
  ciphertext: string
  /** base64 96-bit IV */
  iv: string
  /** base64 128-bit GCM auth tag */
  tag: string
}

// HKDF (RFC 5869) using HMAC-SHA256.
function deriveKey(secret: string): Buffer {
  const prk = createHmac("sha256", SALT).update(secret).digest()
  // Single info block is enough for a 32-byte output (T = T(1)).
  const okm = createHmac("sha256", prk).update(INFO).digest()
  return okm.subarray(0, KEY_LEN)
}

export function getEncryptionKey(secret: string): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters to derive the AI key encryption key",
    )
  }
  return deriveKey(secret)
}

export function encryptApiKey(
  plaintext: string,
  secret: string,
): EncryptedBlob {
  const key = getEncryptionKey(secret)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  }
}

/**
 * Decrypt an API key blob. Throws if the ciphertext was tampered with (the
 * GCM auth tag no longer validates) or the key/IV/tag are malformed.
 */
export function decryptApiKey(
  blob: EncryptedBlob,
  secret: string,
): string {
  const key = getEncryptionKey(secret)
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(blob.iv, "base64"),
  )
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

/**
 * Mask an API key for display so the full secret is never shipped to the
 * client. Preserves a short prefix and suffix to help users identify which
 * key is configured.
 *
 * Examples: "sk-..."  -> "sk-...xyz"      (unchanged, too short)
 *           "sk-proj-abcdef123" -> "sk-proj-...123"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••"
  const tail = key.slice(-4)
  const head = key.slice(0, 8)
  return `${head}...${tail}`
}
