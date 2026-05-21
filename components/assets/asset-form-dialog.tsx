'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Asset, AssetStatus, Client, User } from '@/types/index';
import { assetsApi, clientsApi, usersApi } from '@/lib/api-client';
import { assetStatusLabels, getAllowedTransitions } from '@/lib/asset-workflow';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const assetTypes = ['reel', 'poster'] as const;
const assetStatuses = [
  'draft',
  'in_design',
  'ready_for_review',
  'revision_requested',
  'approved',
  'scheduled',
  'uploaded',
  'archived',
] as const;
const UNASSIGNED_VALUE = '__unassigned__';

const formSchema = z
  .object({
    title: z.string().min(2, 'Title is required'),
    clientId: z.string().min(1, 'Client is required'),
    type: z.enum(['reel', 'poster']),
    status: z.enum(assetStatuses).optional(),
    assignedTo: z.string().optional(),
    scheduledAt: z.string().optional(),
  })
  .refine((values) => {
    if (values.status !== 'scheduled') {
      return true;
    }
    return Boolean(values.scheduledAt);
  }, {
    message: 'Scheduled date is required when status is scheduled',
    path: ['scheduledAt'],
  });

type FormValues = z.infer<typeof formSchema>;

function resolveAssetType(value?: string) {
  return assetTypes.includes(value as (typeof assetTypes)[number])
    ? (value as (typeof assetTypes)[number])
    : assetTypes[0];
}

function resolveAssetStatus(value?: string) {
  return assetStatuses.includes(value as (typeof assetStatuses)[number])
    ? (value as (typeof assetStatuses)[number])
    : assetStatuses[0];
}

function toDatetimeLocal(date?: Date | null): string {
  if (!date) {
    return '';
  }
  const offset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value?: string): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

interface AssetFormDialogProps {
  mode: 'create' | 'edit';
  asset?: Asset;
  trigger: React.ReactNode;
  onSaved?: (asset: Asset) => void;
}

export function AssetFormDialog({ mode, asset, trigger, onSaved }: AssetFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const statusOptions = useMemo(() => {
    const currentStatus = resolveAssetStatus(asset?.status);
    const allowed = getAllowedTransitions(currentStatus);
    const all = new Set<AssetStatus>([currentStatus, ...allowed]);
    return assetStatuses.filter((status) => all.has(status));
  }, [asset]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: asset?.title ?? '',
      clientId: asset?.clientId ?? '',
      type: resolveAssetType(asset?.type),
      status: resolveAssetStatus(asset?.status),
      assignedTo: asset?.assignedTo?.[0] ?? '',
      scheduledAt: toDatetimeLocal(asset?.scheduledAt ?? null),
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;

    const loadOptions = async () => {
      setIsLoadingOptions(true);
      setLoadError(null);
      try {
        const [clientsData, usersData] = await Promise.all([
          clientsApi.getAll(),
          usersApi.getAll(),
        ]);
        if (isActive) {
          setClients(clientsData);
          setUsers(usersData);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load form options';
        setLoadError(message);
      } finally {
        if (isActive) {
          setIsLoadingOptions(false);
        }
      }
    };

    void loadOptions();

    return () => {
      isActive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      title: asset?.title ?? '',
      clientId: asset?.clientId ?? '',
      type: resolveAssetType(asset?.type),
      status: resolveAssetStatus(asset?.status),
      assignedTo: asset?.assignedTo?.[0] ?? '',
      scheduledAt: toDatetimeLocal(asset?.scheduledAt ?? null),
    });
  }, [asset, form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        clientId: values.clientId,
        title: values.title,
        type: values.type,
        status: values.status,
        assignedTo: values.assignedTo ? values.assignedTo : null,
        scheduledAt: toIsoString(values.scheduledAt),
      } as const;

      const saved =
        mode === 'create'
          ? await assetsApi.create(payload)
          : await assetsApi.update(asset?.id ?? '', payload);

      toast({
        title: mode === 'create' ? 'Asset created' : 'Asset updated',
        description: `${saved.title} is ready to go.`,
      });

      onSaved?.(saved);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save asset';
      toast({
        title: 'Something went wrong',
        description: message,
        variant: 'destructive',
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create asset' : 'Edit asset'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Capture the basics and assign ownership.'
              : 'Update the asset details and workflow status.'}
          </DialogDescription>
        </DialogHeader>

        {loadError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Asset title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isLoadingOptions}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.filter((client) => Boolean(client?.id)).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || assetTypes[0]}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || statusOptions[0]}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {assetStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Drive folders are assigned automatically from the selected client and asset type.
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === UNASSIGNED_VALUE ? '' : value)
                      }
                      value={field.value ? field.value : UNASSIGNED_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                        {users.filter((user) => Boolean(user?.id)).map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled For</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
