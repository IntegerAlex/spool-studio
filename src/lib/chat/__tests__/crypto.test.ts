import { describe, expect, it } from "vitest"
import {
  decryptApiKey,
  encryptApiKey,
  getEncryptionKey,
  maskApiKey,
} from "../crypto"

const SECRET = "test-secret-0123456789abcdef-0123456789abcdef" // 48 chars
const KEY = "sk-proj-AbCdEf1234567890XyZ"

describe("crypto", () => {
  it("round-trips an API key through encrypt/decrypt", () => {
    const blob = encryptApiKey(KEY, SECRET)
    expect(decryptApiKey(blob, SECRET)).toBe(KEY)
  })

  it("produces a fresh IV (and ciphertext) on every encryption", () => {
    const a = encryptApiKey(KEY, SECRET)
    const b = encryptApiKey(KEY, SECRET)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it("fails to decrypt with the wrong secret", () => {
    const blob = encryptApiKey(KEY, SECRET)
    expect(() => decryptApiKey(blob, "another-secret-value-that-is-long-enough")).toThrow()
  })

  it("detects tampering of the ciphertext", () => {
    const blob = encryptApiKey(KEY, SECRET)
    const tampered = Buffer.from(blob.ciphertext, "base64")
    tampered[0] = tampered[0] ^ 0xff
    expect(() =>
      decryptApiKey({ ...blob, ciphertext: tampered.toString("base64") }, SECRET),
    ).toThrow()
  })

  it("detects tampering of the auth tag", () => {
    const blob = encryptApiKey(KEY, SECRET)
    const tag = Buffer.from(blob.tag, "base64")
    tag[0] = tag[0] ^ 0xff
    expect(() => decryptApiKey({ ...blob, tag: tag.toString("base64") }, SECRET)).toThrow()
  })

  it("rejects a secret shorter than 32 characters", () => {
    expect(() => getEncryptionKey("too-short")).toThrow()
    expect(() => encryptApiKey(KEY, "short-secret")).toThrow()
  })

  it("masks keys so the full secret is never revealed", () => {
    const mask = maskApiKey(KEY)
    expect(mask).not.toContain(KEY)
    expect(mask.startsWith("sk-proj-")).toBe(true)
    expect(mask.endsWith("XyZ")).toBe(true)
  })
})
