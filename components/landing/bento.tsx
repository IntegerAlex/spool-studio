"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

const EASE = [0.16, 1, 0.3, 1] as const

function Card({
  span,
  title,
  children,
  delay,
}: {
  span: string
  title: string
  children: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#111111] p-8 transition-colors duration-300 hover:border-[rgba(255,255,255,0.14)] ${span}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.12)] to-transparent" />
      <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full bg-[rgba(62,207,142,0.05)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <p className="text-[14px] font-medium text-[#ededed]">{title}</p>
      <div className="mt-4 flex-1">{children}</div>
    </motion.div>
  )
}

function TaskTile({ id, name, initials }: { id: string; name: string; initials: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] px-3 py-2.5">
      <Badge variant="secondary">{id}</Badge>
      <span className="truncate text-[12px] text-[#ededed]">{name}</span>
      <Avatar className="ml-auto h-5 w-5">
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>
    </div>
  )
}

function KanbanVisual() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { col: "Draft", tiles: [{ id: "HAL-R03", name: "Launch teaser", initials: "AK" }] },
        {
          col: "Review",
          tiles: [
            { id: "HAL-P05", name: "Brand poster", initials: "JM" },
            { id: "NOV-R01", name: "Week 1 reel", initials: "TS" },
          ],
        },
        { col: "Approval", tiles: [{ id: "NOV-P02", name: "Product still", initials: "RD" }] },
        { col: "Published", tiles: [] },
      ].map((column) => (
        <div key={column.col} className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#525252]">
            {column.col}
          </p>
          {column.tiles.map((t) => (
            <TaskTile key={t.id} {...t} />
          ))}
          {column.tiles.length === 0 && (
            <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.07)] py-4 text-center text-[10px] text-[#333]">
              —
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PortalVisual() {
  return (
    <div className="space-y-3">
      <Input
        readOnly
        value="spool.studio/portal/a9f3…c21e"
        className="font-mono text-[12px] text-[#3ecf8e]"
      />
      <div className="flex items-center gap-2">
        <Button size="sm">Open portal</Button>
        <Badge variant="secondary">No account needed</Badge>
      </div>
    </div>
  )
}

function ApprovalVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">HAL-R03</Badge>
        <span className="text-[12px] text-[#a1a1a1]">Launch teaser</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5">
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button size="sm" variant="outline">
          Request changes
        </Button>
      </div>
    </div>
  )
}

function LibraryVisual() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["Reel", "Poster", "Reel", "Poster", "Reel", "Poster"].map((kind, i) => (
        <div
          key={i}
          className="relative h-16 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a]"
        >
          <Badge
            variant="secondary"
            className="absolute bottom-1.5 left-1.5 px-1.5 py-0 text-[9px]"
          >
            {kind}
          </Badge>
        </div>
      ))}
    </div>
  )
}

function QueueVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-[#a1a1a1]">
          reel_04_final.mp4
        </span>
        <Badge variant="secondary">Uploading</Badge>
      </div>
      <Progress value={67} />
    </div>
  )
}

export function Bento() {
  return (
    <section id="product" className="mx-auto max-w-6xl px-6 pb-36">
      <p className="mb-16 text-center font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-[#3ecf8e]">
        What Spool does
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
        <Card span="md:col-span-4" title="Move work through a pipeline" delay={0}>
          <KanbanVisual />
        </Card>
        <Card span="md:col-span-2" title="See the whole month" delay={0.08}>
          <Calendar className="mx-auto w-fit bg-transparent p-0" />
        </Card>
        <Card
          span="md:col-span-2"
          title="Clients review without an account"
          delay={0}
        >
          <PortalVisual />
        </Card>
        <Card span="md:col-span-2" title="Approvals with history" delay={0.08}>
          <ApprovalVisual />
        </Card>
        <Card span="md:col-span-2" title="Every asset, one library" delay={0.16}>
          <LibraryVisual />
        </Card>
        <Card
          span="md:col-span-4"
          title="Ask your workspace to do things"
          delay={0}
        >
          <Command className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a]">
            <CommandInput placeholder="Move this asset to review…" />
            <CommandList>
              <CommandGroup heading="Suggestions">
                <CommandItem>Show approvals for Halcyon</CommandItem>
                <CommandItem>Move NOV-P02 to approval</CommandItem>
                <CommandItem>What's publishing this week?</CommandItem>
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandGroup>
            </CommandList>
          </Command>
        </Card>
        <Card
          span="md:col-span-2"
          title="Uploads that don't fail silently"
          delay={0.08}
        >
          <QueueVisual />
        </Card>
      </div>
    </section>
  )
}
