'use client';

import { useEffect, useMemo, useState } from 'react';
import { Client, Asset, ClientReference, ClientReferenceType, User } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usersApi, clientReferencesApi, authApi, clientsApi, clearApiClientCache } from '@/lib/api-client';
import { Copy, Edit2, ExternalLink, FolderOpen, LayoutGrid, CheckCircle2, Clock3, Users, Plus, Trash2, Link2, Instagram, Globe, Youtube, Pin, FolderOpen as DriveFolderIcon, Brush, Clapperboard, Megaphone, Shield } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AssetCard } from '@/components/assets/asset-card';
import { cn } from '@/lib/utils';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { ClientReport } from './client-report';

interface ClientDetailProps {
  client: Client;
  assets: Asset[];
}

type ReferenceFormState = {
  title: string;
  url: string;
  description: string;
  type: ClientReferenceType;
};

const referenceTypes: Array<{
  value: ClientReferenceType;
  label: string;
  icon: typeof Link2;
  toneClassName: string;
}> = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, toneClassName: 'text-pink-300' },
  { value: 'website', label: 'Website', icon: Globe, toneClassName: 'text-sky-300' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, toneClassName: 'text-red-300' },
  { value: 'pinterest', label: 'Pinterest', icon: Pin, toneClassName: 'text-rose-300' },
  { value: 'drive_folder', label: 'Drive Folder', icon: DriveFolderIcon, toneClassName: 'text-amber-300' },
  { value: 'competitor', label: 'Competitor', icon: Shield, toneClassName: 'text-orange-300' },
  { value: 'branding', label: 'Branding', icon: Brush, toneClassName: 'text-emerald-300' },
  { value: 'reel_reference', label: 'Reel Reference', icon: Clapperboard, toneClassName: 'text-violet-300' },
  { value: 'ad_reference', label: 'Ad Reference', icon: Megaphone, toneClassName: 'text-emerald-300' },
  { value: 'other', label: 'Other', icon: Link2, toneClassName: 'text-slate-300' },
];

function getReferenceTypeMeta(type: ClientReferenceType) {
  return referenceTypes.find((item) => item.value === type) ?? referenceTypes[referenceTypes.length - 1];
}

function isValidReferenceUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatReferenceUrl(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

function getReferenceHost(reference: ClientReference): string {
  try {
    return new URL(reference.url).hostname.replace(/^www\./, '');
  } catch {
    return reference.url;
  }
}

function ReferenceEditorDialog({
  clientId,
  reference,
  open,
  onOpenChange,
  onSaved,
}: {
  clientId: string;
  reference: ClientReference | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (reference: ClientReference) => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ReferenceFormState>({
    title: '',
    url: '',
    description: '',
    type: 'other',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reference) {
      setForm({
        title: reference.title,
        url: reference.url,
        description: reference.description ?? '',
        type: reference.type,
      });
      return;
    }

    setForm({ title: '', url: '', description: '', type: 'other' });
  }, [reference, open]);

  const title = reference ? 'Edit Reference' : 'Add Reference';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    if (!isValidReferenceUrl(form.url)) {
      toast({ title: 'Enter a valid http or https URL', variant: 'destructive' });
      return;
    }

    const values = {
      title: form.title,
      url: form.url,
      description: form.description,
      type: form.type,
    };

    setIsSaving(true);
    try {
      if (reference) {
        console.info('[references][update]', { clientId, referenceId: reference.id });
        const savedReference = await clientReferencesApi.update(clientId, reference.id, values);
        toast({ title: 'Reference updated' });
        await onSaved(savedReference);
      } else {
        console.info('[references][create]', { clientId });
        const savedReference = await clientReferencesApi.create(clientId, values);
        toast({ title: 'Reference added' });
        await onSaved(savedReference);
      }

      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save reference';
      console.error(reference ? '[references][update]' : '[references][create]', {
        clientId,
        message,
        stack: error instanceof Error ? error.stack : null,
      });
      toast({ title: 'Unable to save reference', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Save inspiration, brand, social, and reference links for this client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-white">Title</label>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Homepage redesign inspiration"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-white">URL</label>
              <Input
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-white">Notes</label>
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="What should the team look for here?"
                  className="min-h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-white">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as ClientReferenceType }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[var(--primary)] hover:bg-[#4f46e5]">
              {isSaving ? 'Saving...' : 'Save Reference'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ClientDetailProps {
  client: Client;
  assets: Asset[];
}

export function ClientDetail({ client: initialClient, assets }: ClientDetailProps) {
  const [client, setClient] = useState<Client>(initialClient);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'reports'>('overview');

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);
  const [team, setTeam] = useState<User[]>([]);
  const [references, setReferences] = useState<ClientReference[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [isReferenceDialogOpen, setIsReferenceDialogOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<ClientReference | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to get current user', err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadTeam = async () => {
      try {
        const allUsers = await usersApi.getAll();
        const teamUsers = allUsers.filter((u) => client.assignedTeamMembers.includes(u.id));
        if (isActive) {
          setTeam(teamUsers);
        }
      } catch {
        if (isActive) {
          setTeam([]);
        }
      }
    };

    void loadTeam();

    return () => {
      isActive = false;
    };
  }, [client.assignedTeamMembers]);

  useEffect(() => {
    let isActive = true;

    const loadReferences = async () => {
      setReferencesLoading(true);
      console.info('[references][fetch]', { clientId: client.id });
      try {
        const clientReferences = await clientReferencesApi.getByClientId(client.id);
        console.info('[references][fetch]', { clientId: client.id, count: clientReferences.length });
        if (isActive) {
          setReferences(clientReferences);
        }
      } catch (error) {
        console.error('[references][fetch]', { clientId: client.id, error });
        if (isActive) {
          setReferences([]);
        }
      } finally {
        if (isActive) {
          setReferencesLoading(false);
        }
      }
    };

    void loadReferences();

    return () => {
      isActive = false;
    };
  }, [client.id]);

  // Monthly targets & completions
  const monthlyPostsTarget = client.monthlyPostsTarget ?? 0;
  const completedPosters = client.completedPosters ?? 0;
  const monthlyReelsTarget = client.monthlyReelsTarget ?? 0;
  const completedReels = client.completedReels ?? 0;

  const monthlyTarget = monthlyPostsTarget + monthlyReelsTarget;
  const monthlyCompleted = completedPosters + completedReels;
  const monthlyRemaining = Math.max(0, monthlyTarget - monthlyCompleted);
  const monthlyProgressPct = monthlyTarget > 0 ? Math.round((monthlyCompleted / monthlyTarget) * 100) : 0;

  const monthlyPosterProgress = monthlyPostsTarget > 0 ? (completedPosters / monthlyPostsTarget) * 100 : 0;
  const monthlyReelProgress = monthlyReelsTarget > 0 ? (completedReels / monthlyReelsTarget) * 100 : 0;

  // Weekly targets & completions
  const weeklyPosterGoal = client.weeklyPosterGoal ?? 0;
  const weeklyCompletedPosters = client.weeklyCompletedPosters ?? 0;
  const weeklyReelGoal = client.weeklyReelGoal ?? 0;
  const weeklyCompletedReels = client.weeklyCompletedReels ?? 0;

  const weeklyGoal = client.weeklyGoal ?? (weeklyPosterGoal + weeklyReelGoal);
  const weeklyCompleted = client.weeklyCompleted ?? (weeklyCompletedPosters + weeklyCompletedReels);
  const weeklyRemaining = Math.max(0, weeklyGoal - weeklyCompleted);

  const weeklyPosterProgress = weeklyPosterGoal > 0 ? (weeklyCompletedPosters / weeklyPosterGoal) * 100 : 0;
  const weeklyReelProgress = weeklyReelGoal > 0 ? (weeklyCompletedReels / weeklyReelGoal) * 100 : 0;

  const progress = monthlyProgressPct;
  const pendingDeliverables = monthlyRemaining;

  // Status Indicator
  let statusLabel = 'On Track';
  let statusColorClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (monthlyProgressPct < 70) {
    statusLabel = 'Behind';
    statusColorClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
  } else if (monthlyProgressPct < 90) {
    statusLabel = 'Attention';
    statusColorClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }

  const sortedReferences = useMemo(
    () => [...references].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [references]
  );

  const handleCopyReferenceLink = async (reference: ClientReference) => {
    try {
      await navigator.clipboard.writeText(reference.url);
      toast({ title: 'Link copied' });
    } catch {
      toast({ title: 'Unable to copy link', variant: 'destructive' });
    }
  };

  const handleDeleteReference = async (reference: ClientReference) => {
    try {
      console.info('[references][delete]', { clientId: client.id, referenceId: reference.id });
      await clientReferencesApi.delete(client.id, reference.id);
      toast({ title: 'Reference deleted' });
      setReferences((prev) => prev.filter((item) => item.id !== reference.id));
      clearApiClientCache();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete reference';
      toast({ title: 'Unable to delete reference', description: message, variant: 'destructive' });
    }
  };

  const statCards = [
    {
      title: 'Total Assets',
      value: assets.length,
      icon: <LayoutGrid className="h-5 w-5 text-emerald-400" />,
      iconBg: 'bg-[rgba(99,102,241,0.12)]',
    },
    {
      title: 'Completed',
      value: client.completedDeliverables,
      icon: <CheckCircle2 className="h-5 w-5 text-[#10b981]" />,
      iconBg: 'bg-[rgba(16,185,129,0.12)]',
    },
    {
      title: 'Remaining Target',
      value: pendingDeliverables,
      icon: <Clock3 className="h-5 w-5 text-[#f59e0b]" />,
      iconBg: 'bg-[rgba(245,158,11,0.12)]',
    },
    {
      title: 'Team Size',
      value: team.length,
      icon: <Users className="h-5 w-5 text-[#3b82f6]" />,
      iconBg: 'bg-[rgba(59,130,246,0.12)]',
    },
  ] as const;

  const clientInitials = client.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CL';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[rgba(99,102,241,0.12)] text-[13px] font-semibold text-white">
              {clientInitials}
            </div>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight text-white">{client.name}</h1>
              <p className="text-[13px] text-[#71717a]">{client.instagramHandle}</p>
            </div>
          </div>
          <a
            href={`https://instagram.com/${client.instagramHandle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-emerald-300"
          >
            <span>Open Instagram profile</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ClientFormDialog
            client={client}
            onSaved={(updatedClient) => setClient(updatedClient)}
            trigger={
              <Button className="h-9 rounded-md bg-[var(--primary)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5]">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Client
              </Button>
            }
          />

          {(currentUser?.role === 'admin' || true) && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="h-9 rounded-md border border-red-500/30 bg-transparent px-3 text-[13px] font-medium text-red-400 shadow-none hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Client
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] px-5 py-4 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717a]">{card.title}</p>
                <p className="mt-2 text-[24px] font-medium leading-none text-white sm:text-[28px]">{card.value}</p>
              </div>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', card.iconBg)}>
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-[rgba(255,255,255,0.08)] gap-1 mb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all cursor-pointer",
            activeTab === 'overview'
              ? "border-[var(--primary)] text-white font-semibold"
              : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={cn(
            "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all cursor-pointer",
            activeTab === 'assets'
              ? "border-[var(--primary)] text-white font-semibold"
              : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
          )}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all cursor-pointer",
            activeTab === 'reports'
              ? "border-[var(--primary)] text-white font-semibold"
              : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
          )}
        >
          Reports
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none xl:col-span-2">
              <div className="flex items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
                <div>
                  <h2 className="text-[13px] font-medium text-white">Delivery Progress</h2>
                  <p className="mt-1 text-[12px] text-[#71717a]">Weekly & Monthly targets at a glance.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider', statusColorClass)}>
                    {statusLabel}
                  </span>
                  <div className="text-right">
                    <span className="text-[18px] font-medium text-white">{monthlyProgressPct}%</span>
                    <span className="text-[11px] text-[#71717a] ml-1">Complete</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Targets Section */}
                <div className="rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-[#1a1a1a] p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-white mb-3">Monthly Targets</h3>
                    
                    {monthlyTarget === 0 ? (
                      <div className="py-6 text-center text-[12px] text-[#71717a] border border-dashed border-[rgba(255,255,255,0.08)] rounded-md">
                        ⚠️ Goals Not Configured
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Posters Split */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-[#a1a1aa]">Posters</span>
                            <span className="text-white font-mono">{completedPosters} / {monthlyPostsTarget}</span>
                          </div>
                          <div className="h-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full bg-[#3b82f6] rounded-full transition-all duration-150" style={{ width: `${Math.min(100, monthlyPosterProgress)}%` }} />
                          </div>
                        </div>

                        {/* Reels Split */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-[#a1a1aa]">Reels</span>
                            <span className="text-white font-mono">{completedReels} / {monthlyReelsTarget}</span>
                          </div>
                          <div className="h-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full bg-[#ec4899] rounded-full transition-all duration-150" style={{ width: `${Math.min(100, monthlyReelProgress)}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Monthly KPI Summary */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)] text-center">
                    <div>
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">Target</p>
                      <p className="text-xs font-semibold text-white mt-0.5">{monthlyTarget}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">Completed</p>
                      <p className="text-xs font-semibold text-[#10b981] mt-0.5">{monthlyCompleted}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">Remaining</p>
                      <p className="text-xs font-semibold text-white mt-0.5">{monthlyRemaining}</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Targets Section */}
                <div className="rounded-[10px] border border-[rgba(255,255,255,0.05)] bg-[#1a1a1a] p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-white mb-3">Weekly Targets</h3>
                    
                    {weeklyGoal === 0 ? (
                      <div className="py-6 text-center text-[12px] text-[#71717a] border border-dashed border-[rgba(255,255,255,0.08)] rounded-md">
                        ⚠️ Goals Not Configured
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Posters Split */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-[#a1a1aa]">Posters</span>
                            <span className="text-white font-mono">{weeklyCompletedPosters} / {weeklyPosterGoal}</span>
                          </div>
                          <div className="h-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full bg-[#3b82f6] rounded-full transition-all duration-150" style={{ width: `${Math.min(100, weeklyPosterProgress)}%` }} />
                          </div>
                        </div>

                        {/* Reels Split */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-[#a1a1aa]">Reels</span>
                            <span className="text-white font-mono">{weeklyCompletedReels} / {weeklyReelGoal}</span>
                          </div>
                          <div className="h-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full bg-[#ec4899] rounded-full transition-all duration-150" style={{ width: `${Math.min(100, weeklyReelProgress)}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weekly KPI Summary */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)] text-center">
                    <div>
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">Goal</p>
                      <p className="text-xs font-semibold text-white mt-0.5">{weeklyGoal}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">Completed</p>
                      <p className="text-xs font-semibold text-[#10b981] mt-0.5">{weeklyCompleted}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#71717a] uppercase tracking-wider">Remaining</p>
                      <p className="text-xs font-semibold text-white mt-0.5">{weeklyRemaining}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
                <h2 className="text-[13px] font-medium text-white">Assigned Team</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {team.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-2 py-1.5">
                      <Avatar className="size-7 border border-[rgba(255,255,255,0.08)]">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-[#1c1c1c] text-[11px] font-semibold text-white">
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="pr-1">
                        <p className="text-[12px] font-medium text-white">{member.name}</p>
                        <p className="text-[11px] text-[#71717a] capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
                <h2 className="text-[13px] font-medium text-white">Contract Information</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[11px] text-[#71717a] uppercase tracking-wider">Contract Start</p>
                    <p className="text-[13px] font-medium text-white mt-1">
                      {client.contractStartDate ? new Date(client.contractStartDate).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#71717a] uppercase tracking-wider">Contract End</p>
                    <p className="text-[13px] font-medium text-white mt-1">
                      {client.contractEndDate ? new Date(client.contractEndDate).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'Not specified'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-5 shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-medium text-white">References</h2>
                <p className="mt-1 text-[12px] text-[#71717a]">Brand links, inspiration, social pages, and creative examples.</p>
              </div>

              <Button
                onClick={() => {
                  setEditingReference(null);
                  setIsReferenceDialogOpen(true);
                }}
                className="h-9 rounded-md bg-[var(--primary)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Reference
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {referencesLoading ? (
                <div className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] px-4 py-5 text-[13px] text-[#71717a]">
                  Loading references...
                </div>
              ) : sortedReferences.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-6 text-center text-[13px] text-[#71717a]">
                  <p>No references yet. Add links to brand pages, moodboards, competitors, or inspiration.</p>
                  <Button
                    onClick={() => {
                      setEditingReference(null);
                      setIsReferenceDialogOpen(true);
                    }}
                    className="mt-4 h-9 rounded-md bg-[var(--primary)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Reference
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
                  {sortedReferences.map((reference) => {
                    const meta = getReferenceTypeMeta(reference.type);
                    const TypeIcon = meta.icon;

                    return (
                      <Card
                        key={reference.id}
                        className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] p-4 shadow-none transition-colors hover:border-[rgba(255,255,255,0.12)]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
                            <TypeIcon className={cn('h-4 w-4', meta.toneClassName)} />
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-[14px] font-medium text-white">{reference.title}</h3>
                                <p className="mt-1 text-[11px] text-[#71717a]">{getReferenceHost(reference)}</p>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {meta.label}
                              </Badge>
                            </div>

                            {reference.description && (
                              <p className="text-[13px] leading-5 text-[#a1a1aa]">{reference.description}</p>
                            )}

                            <a
                              href={reference.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block break-all text-[13px] text-[var(--primary)] hover:text-emerald-300"
                            >
                              {formatReferenceUrl(reference.url)}
                            </a>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 border-[rgba(255,255,255,0.08)] bg-transparent px-3 text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                                asChild
                              >
                                <a href={reference.url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                  Open
                                </a>
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyReferenceLink(reference)}
                                className="h-8 border-[rgba(255,255,255,0.08)] bg-transparent px-3 text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                              >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copy
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingReference(reference);
                                  setIsReferenceDialogOpen(true);
                                }}
                                className="h-8 border-[rgba(255,255,255,0.08)] bg-transparent px-3 text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                              >
                                <Edit2 className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteReference(reference)}
                                className="h-8 border-[rgba(239,68,68,0.16)] bg-transparent px-3 text-[12px] text-[#fca5a5] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#fecaca]"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {client.brandColor && (
            <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
              <h2 className="text-[13px] font-medium text-white">Brand Identity</h2>
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="size-10 rounded-[10px] border border-[rgba(255,255,255,0.07)]"
                  style={{ backgroundColor: client.brandColor }}
                />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Brand Color</p>
                  <p className="mt-1 text-[13px] font-mono text-white">{client.brandColor}</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'assets' && (
        <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-white">Assets</h2>
            <Link href="/dashboard/assets" className="text-[13px] font-medium text-[var(--primary)] hover:text-emerald-300">
              View all
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'reports' && (
        <ClientReport
          clientId={client.id}
          contractStartDate={client.contractStartDate}
          contractEndDate={client.contractEndDate}
        />
      )}

      <ReferenceEditorDialog
        clientId={client.id}
        reference={editingReference}
        open={isReferenceDialogOpen}
        onOpenChange={(open) => {
          setIsReferenceDialogOpen(open);
          if (!open) {
            setEditingReference(null);
          }
        }}
        onSaved={async (savedReference) => {
          setReferences((prev) => {
            const next = prev.filter((item) => item.id !== savedReference.id);
            return [savedReference, ...next].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          });
        }}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-w-md bg-[#161616] text-white border-[rgba(255,255,255,0.08)]">
          <DialogHeader>
            <DialogTitle className="text-white text-[16px] font-medium">
              {assets.length > 0 ? 'Cannot Delete Client' : 'Delete Client?'}
            </DialogTitle>
            <DialogDescription className="text-[#a1a1aa] mt-2 text-[13px] leading-relaxed">
              {assets.length > 0
                ? `This client has ${assets.length} linked asset(s). You must delete or reassign all assets for this client before deleting the client itself.`
                : `Are you sure you want to delete ${client.name}? This permanently removes the client and all their reference links. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-[rgba(255,255,255,0.1)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              {assets.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {assets.length === 0 && (
              <Button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await clientsApi.delete(client.id);
                    toast({ title: 'Client deleted successfully' });
                    setShowDeleteDialog(false);
                    clearApiClientCache();
                    router.refresh();
                    router.push('/dashboard/clients');
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to delete client';
                    toast({
                      title: 'Delete failed',
                      description: message,
                      variant: 'destructive',
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
