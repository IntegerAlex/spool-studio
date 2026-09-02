"use client"

import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Request failed")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left banner — matches login */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block" style={{ background: "linear-gradient(155deg, #06281d 0%, #0a4030 45%, #041f16 100%)" }}>
        <Image
          src="/login.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,10,8,0.75) 0%, rgba(4,10,8,0.15) 45%, rgba(4,10,8,0) 70%)" }} />
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-center px-16">
          <p className="mb-4 font-mono text-sm font-medium tracking-wider text-[#3ecf8e] uppercase">
            Spool Studio
          </p>
          <h1 className="text-[2.75rem] font-bold leading-[1.15] tracking-tight text-white">
            Content and asset operations platform for creative teams.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-zinc-300">
            Organize, review, and deliver your creative work — all in one place.
          </p>
        </div>
      </div>

      {/* Right — forgot password */}
      <div className="flex w-full items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-md py-10">
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
            {!submitted ? (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Reset your password
                </h2>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Enter your email and we&apos;ll send you reset instructions.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium text-zinc-200">
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

                  {error && (
                    <div
                      role="alert"
                      className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5"
                    >
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#3ecf8e] text-[15px] font-semibold text-black transition-all hover:bg-[#5fdfa3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isLoading ? "Sending…" : "Send reset link"}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-[#3ecf8e]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Check your email
                  </h2>
                  <p className="text-sm text-zinc-400">
                    We&apos;ve sent password reset instructions to{" "}
                    <span className="font-medium text-zinc-200">{email}</span>
                  </p>
                </div>
                <Link
                  href="/login"
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-[#3ecf8e] text-[15px] font-semibold text-black transition-all hover:bg-[#5fdfa3]"
                >
                  Back to login
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
