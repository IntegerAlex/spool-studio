export function nowMs(): number {
  return Date.now()
}

function shouldLog(): boolean {
  return process.env.NEXT_PUBLIC_PERF_DIAG === "1"
}

export function logPerf(tag: string, payload: Record<string, unknown>) {
  if (!shouldLog()) return
  try {
    // Keep logs structured for easy grepping in production logs
    console.info(`[perf]${tag}`, payload)
  } catch (_e) {
    // noop
  }
}

function wrapObject(obj: any, prefix = ""): any {
  if (!obj || typeof obj !== "object") return obj

  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === "function") {
        return (...args: any[]) => {
          const start = Date.now()
          try {
            const result = value.apply(target, args)
            if (result && typeof result.then === "function") {
              return result.finally(() => {
                const duration = Date.now() - start
                logPerf("[query]", {
                  method: `${prefix}/${String(prop)}`,
                  duration,
                })
              })
            }
            // If function returns an object (builder), wrap it too
            if (result && typeof result === "object") {
              return wrapObject(result, `${prefix}/${String(prop)}`)
            }
            return result
          } catch (err) {
            const duration = Date.now() - start
            logPerf("[query]", {
              method: `${prefix}/${String(prop)}`,
              duration,
              error: true,
            })
            throw err
          }
        }
      }
      // If property is an object, wrap it so chained calls are measured
      if (value && typeof value === "object") {
        return wrapObject(value, `${prefix}/${String(prop)}`)
      }
      return value
    },
  })
}

export function wrapWithTiming<T extends object>(obj: T, label = "object"): T {
  if (
    process.env.PERF_DIAG === "1" ||
    process.env.NEXT_PUBLIC_PERF_DIAG === "1"
  ) {
    try {
      return wrapObject(obj, label) as T
    } catch (_e) {
      return obj
    }
  }
  return obj
}
