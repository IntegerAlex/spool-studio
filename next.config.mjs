import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import bundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const projectRoot = dirname(fileURLToPath(import.meta.url))

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Next.js bootstrap requires inline scripts; nonce-based strict CSP is a
  // future pass once this report-only policy has survived a manual smoke.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: *.r2.cloudflarestorage.com *.cloudflarestream.com",
  "connect-src 'self' *.r2.cloudflarestorage.com",
  "worker-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deploys via its own adapter, which (Next 16.3, Turbopack) skips
  // emitting next-server.js.nft.json while the standalone finalizer still
  // reads it — crashing the build with ENOENT. Standalone is unused on Vercel
  // anyway, so only enable it for non-Vercel (Docker/self-hosted) builds.
  // See https://github.com/vercel/next.js/issues/96646
  output: process.env.VERCEL ? undefined : "standalone",
  turbopack: {
    // Next infers the wrong workspace root from a stray lockfile at ~/.
    // Pin it to this project directory so module resolution (tailwindcss,
    // postcss, etc.) works correctly.
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    proxyClientMaxBodySize: 524288000,
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.cloudflarestream.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Ignored over plain HTTP, so safe to ship in dev.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            // Staged rollout: report violations only. After a clean manual
            // smoke of every dashboard route + login + portal, rename this
            // header to Content-Security-Policy to enforce.
            key: "Content-Security-Policy-Report-Only",
            value: CSP_REPORT_ONLY,
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
