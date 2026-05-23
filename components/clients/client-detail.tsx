'use client';

import { Client, Asset } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { User } from '@/types/index';
import { Copy, Edit2, ExternalLink, FolderOpen, LayoutGrid, CheckCircle2, Clock3, Users } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AssetCard } from '@/components/assets/asset-card';
import { cn } from '@/lib/utils';

interface ClientDetailProps {
  client: Client;
  assets: Asset[];
}

export function ClientDetail({ client, assets }: ClientDetailProps) {
  const [team, setTeam] = useState<User[]>([]);
  const { toast } = useToast();

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

  const progress = client.monthlyDeliverables > 0
    ? Math.round((client.completedDeliverables / client.monthlyDeliverables) * 100)
    : 0;

  const pendingDeliverables = Math.max(client.monthlyDeliverables - client.completedDeliverables, 0);

  const statCards = [
    {
      title: 'Total Assets',
      value: assets.length,
      icon: <LayoutGrid className="h-5 w-5 text-[#6366f1]" />,
      iconBg: 'bg-[rgba(99,102,241,0.12)]',
    },
    {
      title: 'Completed',
      value: client.completedDeliverables,
      icon: <CheckCircle2 className="h-5 w-5 text-[#10b981]" />,
      iconBg: 'bg-[rgba(16,185,129,0.12)]',
    },
    {
      title: 'Pending',
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

  const handleCopyFolderLink = async () => {
    if (!client.driveFolderUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(client.driveFolderUrl);
      toast({ title: 'Folder link copied' });
    } catch {
      toast({ title: 'Unable to copy folder link', variant: 'destructive' });
    }
  };

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
            className="inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[#818cf8]"
          >
            <span>Open Instagram profile</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {client.driveFolderUrl && (
            <>
              <Button asChild variant="outline" className="h-9 rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)]">
                <a href={client.driveFolderUrl} target="_blank" rel="noreferrer">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open Drive Folder
                </a>
              </Button>
              <Button variant="outline" className="h-9 rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)]" onClick={handleCopyFolderLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Folder Link
              </Button>
            </>
          )}

          <Button className="h-9 rounded-md bg-[var(--primary)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5]">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] px-5 py-4 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717a]">{card.title}</p>
                <p className="mt-2 text-[28px] font-medium leading-none text-white">{card.value}</p>
              </div>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', card.iconBg)}>
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none xl:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[13px] font-medium text-white">Delivery Progress</h2>
              <p className="mt-1 text-[12px] text-[#71717a]">Monthly deliverables at a glance.</p>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-medium text-[#6366f1]">{progress}%</p>
              <p className="text-[12px] text-[#71717a]">Complete</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Progress</p>
                  <p className="mt-1 text-[20px] font-medium text-white">
                    {client.completedDeliverables}
                    <span className="text-[13px] text-[#71717a]">/{client.monthlyDeliverables}</span>
                  </p>
                </div>
              </div>
              <div className="h-[3px] rounded-full bg-[rgba(255,255,255,0.08)]">
                <div className="h-full rounded-full bg-[#6366f1]" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] p-4 shadow-none">
                <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Remaining</p>
                <p className="mt-2 text-[24px] font-medium text-white">{pendingDeliverables}</p>
              </Card>
              <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#1a1a1a] p-4 shadow-none">
                <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Time Left</p>
                <p className="mt-2 text-[24px] font-medium text-white">~10 days</p>
              </Card>
            </div>
          </div>
        </Card>

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
      </div>

      <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-white">Assets</h2>
          <Link href="/dashboard/assets" className="text-[13px] font-medium text-[var(--primary)] hover:text-[#818cf8]">
            View all
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
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
    </div>
  );
}
