import { webcrypto } from "node:crypto"

// oxlint-disable-next-line anti-slop/no-runtime-typeof  // test environment feature guard
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  })
}
