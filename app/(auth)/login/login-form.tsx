"use client"

import { CircleAlert, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const redirectTo = searchParams.get("redirectedFrom") ?? "/dashboard"
      router.replace(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-10 flex justify-center lg:justify-start">
        <Image
          src="/Spool_Bg.png"
          alt="Spool Studio"
          width={220}
          height={68}
          priority
          className="h-11 w-auto"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#141414] p-8 shadow-2xl shadow-black/40">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Sign in
        </h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Enter your credentials to access your workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-200"
            >
              Email
            </label>
            <div
              className={`flex items-center gap-3 rounded-lg border bg-[#0f0f0f] px-3.5 transition-colors focus-within:border-[#3ecf8e] focus-within:ring-2 focus-within:ring-[#3ecf8e]/25 ${
                error ? "border-red-500/60" : "border-white/15 hover:border-white/25"
              }`}
            >
              <Mail className="h-4.5 w-4.5 shrink-0 text-zinc-500" />
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 w-full bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-600 disabled:opacity-60"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-200"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#3ecf8e] transition-colors hover:text-[#5fdfa3]"
              >
                Forgot password?
              </Link>
            </div>
            <div
              className={`flex items-center gap-3 rounded-lg border bg-[#0f0f0f] px-3.5 transition-colors focus-within:border-[#3ecf8e] focus-within:ring-2 focus-within:ring-[#3ecf8e]/25 ${
                error ? "border-red-500/60" : "border-white/15 hover:border-white/25"
              }`}
            >
              <Lock className="h-4.5 w-4.5 shrink-0 text-zinc-500" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 w-full bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-600 disabled:opacity-60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5"
            >
              <CircleAlert className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#3ecf8e] text-[15px] font-semibold text-black transition-all hover:bg-[#5fdfa3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <span className="text-zinc-400">Contact your team administrator.</span>
      </p>
    </div>
  )
}
