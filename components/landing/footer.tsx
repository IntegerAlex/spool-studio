import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  BookOpen,
  Github,
  LayoutGrid,
  Sparkles,
  UserCheck,
} from "lucide-react"

const columns: {
  heading: string
  icon: React.ReactNode
  links: { label: string; href: string; external?: boolean }[]
}[] = [
  {
    heading: "Product",
    icon: <LayoutGrid className="h-3.5 w-3.5" />,
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Pipeline", href: "/#product" },
      { label: "Calendar", href: "/#product" },
      { label: "Client portal", href: "/#product" },
      { label: "Ask Spool AI", href: "/#product" },
    ],
  },
  {
    heading: "Resources",
    icon: <BookOpen className="h-3.5 w-3.5" />,
    links: [
      {
        label: "Documentation",
        href: "https://github.com/IntegerAlex/CMS#readme",
        external: true,
      },
      {
        label: "Self-hosting guide",
        href: "https://github.com/IntegerAlex/CMS#readme",
        external: true,
      },
      {
        label: "Changelog",
        href: "https://github.com/IntegerAlex/CMS/releases",
        external: true,
      },
    ],
  },
  {
    heading: "Company",
    icon: <Boxes className="h-3.5 w-3.5" />,
    links: [
      {
        label: "Source code",
        href: "https://github.com/IntegerAlex/CMS",
        external: true,
      },
      {
        label: "Issues",
        href: "https://github.com/IntegerAlex/CMS/issues",
        external: true,
      },
      {
        label: "License",
        href: "https://github.com/IntegerAlex/CMS/blob/main/LICENSE",
        external: true,
      },
    ],
  },
]

function ExternalLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link inline-flex items-center gap-1 text-[13px] text-[#a1a1a1] transition-colors hover:text-[#ededed]"
    >
      {label}
      <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-100" />
    </a>
  )
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[rgba(255,255,255,0.06)]">
      {/* Footer glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-380px] left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(62,207,142,0.07),transparent)] blur-2xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-20">
        {/* Brand + columns */}
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="font-mono text-[14px] font-semibold uppercase tracking-wider text-[#ededed]"
            >
              Spool<span className="text-[#3ecf8e]">.</span>
            </Link>
            <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-[#71717a]">
              Content and asset operations for creative teams. Plan, produce,
              review, approve, and publish — from one workspace.
            </p>
            <a
              href="https://github.com/IntegerAlex/CMS"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.1)] px-3.5 py-2 text-[13px] text-[#a1a1a1] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-[#ededed]"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-[#71717a]">
                {col.icon}
                {col.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <ExternalLink label={link.label} href={link.href} />
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[13px] text-[#a1a1a1] transition-colors hover:text-[#ededed]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-8 text-[12px] text-[#525252] sm:flex-row">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#3ecf8e]" />
              AGPL-3.0 · Open source
            </span>
            <span>© {new Date().getFullYear()} Spool Studio</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Sparkles className="h-3.5 w-3.5 text-[#3ecf8e]" />
              v1.0
            </span>
            <a
              href="https://github.com/IntegerAlex/CMS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#ededed]"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
