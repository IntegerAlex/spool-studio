"use client"

import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
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

      <div
        className="flex items-center gap-2.5 rounded-[25px] px-3 py-2.5"
        style={{ boxShadow: "inset 2px 5px 10px rgb(5, 5, 5)", backgroundColor: "#171717" }}
      >
        <Lock className="h-5 w-5 shrink-0 text-[#a1a1aa]" />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="w-full bg-transparent border-none outline-none text-[#d3d3d3] placeholder:text-[#71717a]"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="shrink-0 text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      {isLoading && (
        <div className="flex justify-center py-1">
          <Loader2 className="h-5 w-5 animate-spin text-[#818cf8]" />
        </div>
      )}

      <div className="flex justify-center gap-2 mt-6">
        <Link
          href="/forgot-password"
          type="button"
          className="px-4 py-2 rounded-md text-sm text-[#a1a1aa] transition-colors hover:bg-[#252525] hover:text-white"
        >
          Forgot Password
        </Link>
        <button
          type="submit"
          disabled={isLoading}
          className="px-9 py-2 rounded-md text-sm text-white transition-colors hover:bg-[#252525] disabled:opacity-50"
          style={{ backgroundColor: "#252525" }}
        >
          Sign In
        </button>
      </div>
    </form>
  )
}
