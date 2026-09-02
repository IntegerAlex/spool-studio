"use client"

import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Save, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { aiSettingsApi } from "@/lib/ai-settings-api"
import { PROVIDER_GROUPS } from "@/lib/ai-models"

type ProviderKey = string

export default function AiSettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: aiSettingsApi.get,
    staleTime: 60_000,
  })

  const [providerKey, setProviderKey] = useState<ProviderKey>(PROVIDER_GROUPS[0].label.toLowerCase().replace(/\s+/g, "-"))
  const [model, setModel] = useState<string>(PROVIDER_GROUPS[0].models[0].id)
  const [apiKey, setApiKey] = useState("")
  const [fieldTouched, setFieldTouched] = useState(false)

  useEffect(() => {
    if (!settings?.configured) return
    // SAFETY: settings.provider is a gateway provider slug from our own API;
    // re-narrowing to a known key is safe — any unknown key falls back to default.
    if (settings.provider) {
      const slug = settings.provider.toLowerCase().replace(/\s+/g, "-")
      const group = PROVIDER_GROUPS.find(
        (g) => g.label.toLowerCase().replace(/\s+/g, "-") === slug,
      )
      if (group) {
        setProviderKey(slug)
        if (settings.model) setModel(settings.model)
      }
    }
  }, [settings])

  const activeGroup = PROVIDER_GROUPS.find(
    (g) => g.label.toLowerCase().replace(/\s+/g, "-") === providerKey,
  ) ?? PROVIDER_GROUPS[0]

  const modelsForProvider = activeGroup.models

  const onProviderChange = (next: ProviderKey) => {
    setProviderKey(next)
    const group = PROVIDER_GROUPS.find(
      (g) => g.label.toLowerCase().replace(/\s+/g, "-") === next,
    )
    if (group) setModel(group.models[0].id)
  }

  const saveMutation = useMutation({
    mutationFn: () => aiSettingsApi.save({ provider: activeGroup.label, model, apiKey: apiKey.trim() }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["ai-settings"], saved)
      setApiKey("")
      setFieldTouched(false)
      toast({ title: "AI provider saved", description: "Your provider config is updated and encrypted." })
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" })
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => aiSettingsApi.remove(),
    onSuccess: () => {
      queryClient.setQueryData(["ai-settings"], {
        configured: false,
        provider: null,
        model: null,
        maskedApiKey: null,
      })
      setApiKey("")
      setFieldTouched(false)
      toast({ title: "Removed", description: "Your AI provider config was deleted." })
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" })
    },
  })

  const changed =
    fieldTouched && apiKey.trim().length > 0

  return (
    <div
      className="space-y-6"
      style={{
        backgroundColor: "var(--color-bg-app)",
        minHeight: "100vh",
        margin: "-24px",
        padding: "32px",
      }}
    >
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Ask Spool AI" }]} />

      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--primary)]" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Ask Spool AI</h1>
          <Badge variant="outline" className="border-[rgba(255,255,255,0.1)] text-[11px] text-[#71717a]">
            Beta
          </Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Connect your own AI provider so Spool can help you drive workflows conversationally.
          Powered by the Vercel AI Gateway — access OpenAI, Anthropic, Google, Meta, Mistral,
          DeepSeek, and more with a single key.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-[#71717a]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[var(--surface-card)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                <KeyRound className="h-4 w-4 text-[var(--primary)]" /> Provider & key
              </div>
              {settings?.configured ? (
                <Badge className="bg-[rgba(16,185,129,0.15)] text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge className="bg-[rgba(255,255,255,0.06)] text-[#a1a1aa]">Not set</Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Provider
              </label>
              <Select value={providerKey} onValueChange={onProviderChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_GROUPS.map((g) => (
                    <SelectItem
                      key={g.label}
                      value={g.label.toLowerCase().replace(/\s+/g, "-")}
                    >
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsForProvider.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[var(--color-text-faint)]">
                {modelsForProvider.find((m) => m.id === model)?.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                API key
              </label>
              {settings?.configured && settings.maskedApiKey && (
                <p className="text-[11px] text-[var(--color-text-faint)]">
                  Current key: <code>{settings.maskedApiKey}</code> — enter a new key to rotate it.
                </p>
              )}
              <Input
                type="password"
                autoComplete="off"
                placeholder="Your provider API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setFieldTouched(true)
                }}
              />
              <p className="text-[11px] text-[var(--color-text-faint)]">
                Your key is encrypted at rest and never shared. It is used only for your chat sessions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="accent"
                disabled={!changed || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {settings?.configured ? "Update & re-encrypt" : "Save provider"}
              </Button>
              {settings?.configured && (
                <Button
                  variant="ghost"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Remove your AI provider config? This deletes the stored key.")) {
                      removeMutation.mutate()
                    }
                  }}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[var(--surface-card)] p-5">
              <h2 className="text-sm font-medium text-[var(--color-text-primary)]">How it stays safe</h2>
              <ul className="mt-3 space-y-2 text-[13px] text-[var(--color-text-muted)]">
                <li>• Your key is encrypted at rest (AES-256-GCM) before storage.</li>
                <li>• The full key is never returned to the browser — only a masked preview.</li>
                <li>• You can rotate or delete the key any time; changes apply to the next chat.</li>
                <li>• Spool talks to your provider using your key, scoped to your own account.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(16,185,129,0.05)] p-4 text-[13px] text-[#a1a1aa]">
              <AlertTriangle className="mb-2 h-4 w-4 text-amber-400" />
              AI features are in beta. Avoid sharing sensitive client data in prompts.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
