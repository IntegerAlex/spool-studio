import { webcrypto } from "node:crypto"

// oxlint-disable-next-line anti-slop/no-runtime-typeof  // test environment feature guard
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  })
}

// Minimal localStorage shim: node test env has no storage; zustand/persist
// (kanban-store) logs a warning on every write without it.
const localStorageShim = (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
})()

if (globalThis.localStorage === undefined) {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageShim,
    configurable: true,
  })
}
