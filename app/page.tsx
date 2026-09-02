import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Hero } from "@/components/landing/hero"
import { Bento } from "@/components/landing/bento"
import { Footer } from "@/components/landing/footer"

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#0a0a0a]">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-320px] h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(62,207,142,0.09),transparent)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.025),transparent)] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      {/* Sticky nav */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,10,0.7)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="font-mono text-[13px] font-semibold uppercase tracking-wider text-[#ededed]">
            Spool<span className="text-[#3ecf8e]">.</span>
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/IntegerAlex/CMS"
              className="text-[13px] text-[#a1a1a1] transition-colors hover:text-[#ededed]"
            >
              Source
            </a>
            <Link
              href="/login"
              className="rounded-md bg-[#ededed] px-3.5 py-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <Hero />

      {/* What Spool does — bento grid */}
      <Bento />

      {/* Closing CTA */}
      <section className="relative mx-auto max-w-6xl px-6 pb-28 text-center">
        <h2 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-[#ededed]">
          Run your next content cycle in Spool.
        </h2>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-[#ededed] px-5 py-2.5 text-[14px] font-medium text-[#0a0a0a] transition-colors hover:bg-white"
        >
          Sign in
        </Link>
      </section>

      <Footer />
    </main>
  )
}
