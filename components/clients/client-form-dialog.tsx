"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { clearApiClientCache, clientsApi } from "@/lib/api-client"
import type { Client } from "@/types/index"

const formSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    slug: z.string().min(2, "Slug is required"),
    instagramHandle: z.string().optional(),
    brandColor: z.string().optional(),
    monthlyReelsTarget: z.string().optional(),
    monthlyPostsTarget: z.string().optional(),
    contractStartDate: z.string().optional(),
    contractEndDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.contractStartDate && data.contractEndDate) {
        return (
          new Date(data.contractEndDate) >= new Date(data.contractStartDate)
        )
      }
      return true
    },
    {
      message: "End Date must be greater than or equal to Start Date",
      path: ["contractEndDate"],
    },
  )

type FormValues = z.infer<typeof formSchema>

interface ClientFormDialogProps {
  trigger: React.ReactNode
  client?: Client
  onSaved?: (client: Client) => void
}

function toNumber(value?: string): number | undefined {
  if (value === undefined || value === "") {
    return undefined
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function ClientFormDialog({
  trigger,
  client,
  onSaved,
}: ClientFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const { toast } = useToast()

  const isEditMode = !!client

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      instagramHandle: "",
      brandColor: "",
      monthlyReelsTarget: "",
      monthlyPostsTarget: "",
      contractStartDate: "",
      contractEndDate: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (client) {
        form.reset({
          name: client.name || "",
          slug: client.slug || "",
          instagramHandle: client.instagramHandle || "",
          brandColor: client.brandColor || "",
          monthlyReelsTarget:
            client.monthlyReelsTarget !== undefined
              ? client.monthlyReelsTarget.toString()
              : "",
          monthlyPostsTarget:
            client.monthlyPostsTarget !== undefined
              ? client.monthlyPostsTarget.toString()
              : "",
          contractStartDate: client.contractStartDate
            ? new Date(client.contractStartDate).toISOString().split("T")[0]
            : "",
          contractEndDate: client.contractEndDate
            ? new Date(client.contractEndDate).toISOString().split("T")[0]
            : "",
        })
      } else {
        form.reset({
          name: "",
          slug: "",
          instagramHandle: "",
          brandColor: "",
          monthlyReelsTarget: "",
          monthlyPostsTarget: "",
          contractStartDate: "",
          contractEndDate: "",
        })
      }
      setApiError(null)
    }
  }, [client, open, form])

  const handleSubmit = form.handleSubmit(
    async (values) => {
      console.info("[client-form] submit values", values)
      setApiError(null)
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        instagramHandle: values.instagramHandle?.trim() || undefined,
        brandColor: values.brandColor?.trim() || undefined,
        monthlyReelsTarget: toNumber(values.monthlyReelsTarget),
        monthlyPostsTarget: toNumber(values.monthlyPostsTarget),
        contractStartDate: values.contractStartDate || undefined,
        contractEndDate: values.contractEndDate || undefined,
      }
      console.info("[client-form] api request", payload)

      try {
        let saved: Client
        if (isEditMode && client) {
          saved = await clientsApi.update(client.id, payload)
          toast({
            title: "Client updated",
            description: `${saved.name} changes have been saved.`,
          })
        } else {
          saved = await clientsApi.create(payload)
          toast({
            title: "Client created",
            description: `${saved.name} is ready to go.`,
          })
        }
        clearApiClientCache()
        router.refresh()
        onSaved?.(saved)
        setOpen(false)
      } catch (error) {
        const actionLabel = isEditMode ? "update" : "create"
        const message =
          error instanceof Error
            ? error.message
            : `Failed to ${actionLabel} client`
        console.error("[client-form] api error", { error })
        setApiError(message)
        toast({
          title: `Unable to ${actionLabel} client`,
          description: message,
          variant: "destructive",
        })
      }
    },
    (errors) => {
      console.warn("[client-form] validation errors", errors)
      setApiError("Please fix the highlighted fields.")
    },
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modify client details and configuration."
              : "Enter the core client details to get started."}
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="client-name"
                      {...field}
                      disabled={isEditMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagramHandle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram Handle</FormLabel>
                  <FormControl>
                    <Input placeholder="@client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brandColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Color</FormLabel>
                  <FormControl>
                    <Input placeholder="#FF6B6B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="monthlyReelsTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Reels</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyPostsTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Posts (Posters)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contractStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
