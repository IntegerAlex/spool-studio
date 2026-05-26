'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Client } from '@/types/index';
import { clientsApi, clearApiClientCache } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2, 'Slug is required'),
  instagramHandle: z.string().optional(),
  brandColor: z.string().optional(),
  monthlyReelsTarget: z.string().optional(),
  monthlyPostsTarget: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientFormDialogProps {
  trigger: React.ReactNode;
  onSaved?: (client: Client) => void;
}

function toNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function ClientFormDialog({ trigger, onSaved }: ClientFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      instagramHandle: '',
      brandColor: '',
      monthlyReelsTarget: '',
      monthlyPostsTarget: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setApiError(null);
    }
  }, [form, open]);

  const handleSubmit = form.handleSubmit(
    async (values) => {
      console.info('[client-form] submit values', values);
      setApiError(null);
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        instagramHandle: values.instagramHandle?.trim() || undefined,
        brandColor: values.brandColor?.trim() || undefined,
        monthlyReelsTarget: toNumber(values.monthlyReelsTarget),
        monthlyPostsTarget: toNumber(values.monthlyPostsTarget),
      };
      console.info('[client-form] api request', payload);

      try {
        const created = await clientsApi.create(payload);
        console.info('[client-form] api response', created);
        toast({
          title: 'Client created',
          description: `${created.name} is ready to go.`,
        });
        clearApiClientCache();
        router.refresh();
        onSaved?.(created);
        setOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create client';
        console.error('[client-form] api error', { error });
        setApiError(message);
        toast({
          title: 'Unable to create client',
          description: message,
          variant: 'destructive',
        });
      }
    },
    (errors) => {
      console.warn('[client-form] validation errors', errors);
      setApiError('Please fix the highlighted fields.');
    }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Create client</DialogTitle>
          <DialogDescription>Enter the core client details to get started.</DialogDescription>
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
                    <Input placeholder="client-name" {...field} />
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
                    <FormLabel>Monthly Posts</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Add Client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
