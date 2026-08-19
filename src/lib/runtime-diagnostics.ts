type RuntimeLogContext = Record<string, unknown>

const envCheckState = globalThis as typeof globalThis & {
  __cmsEnvChecks?: { mailgun: boolean }
}
const envChecks = envCheckState.__cmsEnvChecks ?? {
  mailgun: false,
}
envCheckState.__cmsEnvChecks = envChecks

export function logProductionRuntimeError(
  source: string,
  error: unknown,
  extra: RuntimeLogContext = {},
): void {
  console.error("[production-runtime]", {
    source,
    message: error instanceof Error ? error.message : "unknown",
    ...extra,
  })
}

export function logMailgunEnvCheck(): void {
  if (envChecks.mailgun) {
    return
  }

  envChecks.mailgun = true
  console.info("[env-check]", {
    mailgunApiKey: !!process.env.MAILGUN_API_KEY,
    mailgunDomain: !!process.env.MAILGUN_DOMAIN,
    mailgunFrom: !!process.env.MAILGUN_FROM,
    mailgunTo: !!process.env.MAIL_NOTIFICATION_TO,
  })
}
