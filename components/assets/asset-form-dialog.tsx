'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { Asset, AssetStatus, Client, User } from '@/types/index';
import { assetsApi, clientsApi, usersApi } from '@/lib/api-client';
import {
  canUploadFromStatus,
  getUploadEligibilityReason,
  assetStatusValues,
  assetEditorStatusLabels,
  assetStatusLabels,
  getUserSelectableStatuses,
  isUserSelectableStatus,
} from '@/lib/asset-workflow';
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
import { Progress } from '@/components/ui/progress';
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
const assetStatuses = assetStatusValues;
const selectableStatuses = getUserSelectableStatuses();
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'uploaded' | 'failed'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const statusOptions = useMemo(() => {
    return selectableStatuses.filter((status) => isUserSelectableStatus(status));
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: asset?.title ?? '',
      clientId: asset?.clientId ?? '',
      type: resolveAssetType(asset?.type),
      status: mode === 'create' ? 'draft' : resolveAssetStatus(asset?.status),
      assignedTo: asset?.assignedTo?.[0] ?? '',
      scheduledAt: toDatetimeLocal(asset?.scheduledAt ?? null),
    },
  });

  const watchedStatus = useWatch({ control: form.control, name: 'status' });
  const currentUploadStatus = (watchedStatus ?? resolveAssetStatus(asset?.status)) as AssetStatus;
  const uploadAllowed = canUploadFromStatus(currentUploadStatus);
  const uploadBlockedReason = getUploadEligibilityReason(currentUploadStatus);

  useEffect(() => {
    console.info('[asset][upload-eligibility]', {
      assetId: asset?.id ?? 'new',
      currentWorkflowStatus: currentUploadStatus,
      uploadAllowed,
      reason: uploadAllowed ? 'Upload allowed from current workflow state.' : uploadBlockedReason,
    });
  }, [asset?.id, currentUploadStatus, uploadAllowed, uploadBlockedReason]);

  useEffect(() => {
    if (!uploadAllowed && selectedFile) {
      setSelectedFile(null);
      setUploadState('idle');
      setUploadError(null);
      setUploadProgress(0);
    }
  }, [selectedFile, uploadAllowed]);

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
      status: mode === 'create' ? 'draft' : resolveAssetStatus(asset?.status),
      assignedTo: asset?.assignedTo?.[0] ?? '',
      scheduledAt: toDatetimeLocal(asset?.scheduledAt ?? null),
    });
  }, [asset, form, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedFile(null);
      setUploadState('idle');
      setUploadError(null);
      setUploadProgress(0);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        clientId: values.clientId,
        title: values.title,
        type: values.type,
        status: mode === 'create' ? 'draft' : values.status,
        assignedTo: values.assignedTo ? values.assignedTo : null,
        scheduledAt: toIsoString(values.scheduledAt),
      } as const;

      const saved =
        mode === 'create'
          ? await assetsApi.create(payload)
          : await assetsApi.update(asset?.id ?? '', payload);

      if (selectedFile && uploadAllowed) {
        setUploadState('uploading');
        setUploadError(null);
        setUploadProgress(0);

        try {
          const uploaded = await assetsApi.uploadFile(saved.id, selectedFile, {
            onProgress: ({ percentage }) => {
              setUploadState('uploading');
              setUploadProgress(percentage);
            },
          });
          setUploadState('uploaded');
          setUploadProgress(100);
          toast({
            title: 'Asset uploaded',
            description: `${uploaded.title} was uploaded successfully.`,
          });
          onSaved?.(uploaded);
          setOpen(false);
          return;
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload file';
          setUploadState('failed');
          setUploadError(message);
          setUploadProgress(0);
          toast({
            title: 'Upload failed',
            description: message,
            variant: 'destructive',
          });
          onSaved?.(saved);
          return;
        }
      }

      if (selectedFile && !uploadAllowed) {
        setUploadError(uploadBlockedReason);
        toast({
          title: 'Upload blocked',
          description: uploadBlockedReason,
          variant: 'destructive',
        });
      }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                    value={field.value ?? ''}
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

              {mode === 'create' ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground sm:col-span-1">
                  <p className="font-medium text-foreground">Status: Draft</p>
                  <p className="mt-1">Assets automatically enter the workflow pipeline after creation.</p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value && isUserSelectableStatus(field.value as AssetStatus) ? field.value : ''}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {assetEditorStatusLabels[status] ?? assetStatusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Drive folders are assigned automatically from the selected client and asset type.
            </div>

            <FormItem>
              <FormLabel>Upload File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  disabled={!uploadAllowed || isLoadingOptions || form.formState.isSubmitting || uploadState === 'uploading'}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setUploadState('idle');
                    setUploadError(null);
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Optional: choose a file to upload after saving.'}
              </p>
              {uploadState === 'uploading' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Uploading to Drive</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              {!uploadAllowed && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {uploadBlockedReason}
                </p>
              )}
            </FormItem>

            {(uploadState !== 'idle' || uploadError) && (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  uploadState === 'uploaded'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : uploadState === 'failed'
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : 'border-border bg-muted/30 text-muted-foreground'
                }`}
              >
                {uploadState === 'uploading' && 'Uploading file...'}
                {uploadState === 'uploaded' && 'File uploaded successfully.'}
                {uploadState === 'failed' && (uploadError ?? 'Upload failed.')}
              </div>
            )}

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
              <Button type="submit" disabled={form.formState.isSubmitting || uploadState === 'uploading'}>
                {form.formState.isSubmitting || uploadState === 'uploading'
                  ? 'Saving...'
                  : selectedFile
                    ? 'Save & Upload'
                    : 'Save Asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
