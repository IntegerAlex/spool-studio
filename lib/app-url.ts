/**
 * Resolves the public base URL used in emails and outbound links.
 *
 * Never silently falls back to localhost: a prod deployment missing this
 * env would email users password-reset/invite links pointing at
 * http://localhost:3000, which is unrecoverable from the user's side.
 * Dev keeps the localhost default; production fails fast instead.
 */
export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must be set in production - refusing to generate links against a localhost fallback",
      )
    }
    return "http://localhost:3000"
  }
  return url
}
