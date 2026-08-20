import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import bundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

const projectRoot = dirname(fileURLToPath(import.meta.url))

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
}

export default withBundleAnalyzer(nextConfig)
