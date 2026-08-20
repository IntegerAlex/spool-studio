"use client"

import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      <HexagonBackground className="absolute inset-0" hexagonSize={75} hexagonMargin={3} />
      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-[#a1a1aa] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Link>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2.5 px-8 pb-1 rounded-[25px] transition-all duration-300 hover:scale-[1.02]"
          style={{ backgroundColor: "#171717" }}
        >
          <div className="flex justify-center my-6">
            <Image
              src="/asset_flow.png"
              alt="Asset Flow"
              width={200}
              height={60}
              priority
              className="h-12 w-auto"
            />
          </div>

          {!submitted ? (
            <>
              <div
                className="flex items-center gap-2.5 rounded-[25px] px-3 py-2.5"
                style={{ boxShadow: "inset 2px 5px 10px rgb(5, 5, 5)", backgroundColor: "#171717" }}
              >
                <Mail className="h-5 w-5 shrink-0 text-[#a1a1aa]" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-transparent border-none outline-none text-[#d3d3d3] placeholder:text-[#71717a]"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              {isLoading && (
                <div className="flex justify-center py-1">
                  <Loader2 className="h-5 w-5 animate-spin text-[#818cf8]" />
                </div>
              )}

              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-9 py-2 rounded-md text-sm text-white transition-colors hover:bg-[#252525] disabled:opacity-50"
                  style={{ backgroundColor: "#252525" }}
                >
                  Send Reset Link
                </button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-[#818cf8]" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-white">Check your email</h2>
                <p className="text-sm text-[#a1a1aa]">
                  We&apos;ve sent password reset instructions to {email}
                </p>
              </div>
              <div className="flex justify-center mt-4">
                <Link
                  href="/login"
                  className="px-9 py-2 rounded-md text-sm text-white transition-colors hover:bg-[#252525]"
                  style={{ backgroundColor: "#252525" }}
                >
                  Back to login
                </Link>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
