import { redirect } from "next/navigation"
import Image from "next/image"
import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "./login-form"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left banner — Cloudflare-style pixel globe */}
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

      {/* Right — login section */}
      <div className="flex w-full items-center justify-center bg-background lg:w-1/2">
        <div className="w-full max-w-md px-4">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
