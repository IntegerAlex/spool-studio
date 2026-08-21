/**
 * Rate-limit knobs, env-configurable so local/e2e runs can loosen them
 * without code changes (e.g. RATE_LIMIT_LOGIN_MAX=100 for Playwright suites
 * that log in repeatedly). Defaults are the production values; unset env in
 * production keeps behavior identical.
 */
function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function limit(envPrefix: string, fallbackLimit: number, fallbackWindowMs: number) {
  return {
    limit: intFromEnv(process.env[`${envPrefix}_MAX`], fallbackLimit),
    windowMs: intFromEnv(
      process.env[`${envPrefix}_WINDOW_MS`],
      fallbackWindowMs,
    ),
  }
}

export const rateLimits = {
  login: () => limit("RATE_LIMIT_LOGIN", 5, 60_000),
  forgotPassword: () =>
    limit("RATE_LIMIT_FORGOT_PASSWORD", 3, 10 * 60_000),
  resetPassword: () => limit("RATE_LIMIT_RESET_PASSWORD", 10, 60 * 60_000),
  portalTokenPost: () => limit("RATE_LIMIT_PORTAL_TOKEN_POST", 10, 60 * 60_000),
  portalView: () => limit("RATE_LIMIT_PORTAL_VIEW", 30, 60_000),
  portalAct: () => limit("RATE_LIMIT_PORTAL_ACT", 30, 60_000),
} as const
