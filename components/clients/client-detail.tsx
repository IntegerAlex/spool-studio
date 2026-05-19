'use client';

import { Client, Asset } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { User } from '@/types/index';
import { Edit2, ExternalLink } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ClientDetailProps {
  client: Client;
  assets: Asset[];
}

export function ClientDetail({ client, assets }: ClientDetailProps) {
  const [team, setTeam] = useState<User[]>([]);

  useEffect(() => {
    const loadTeam = async () => {
      const allUsers = await usersApi.getAll();
      const teamUsers = allUsers.filter((u) => client.assignedTeamMembers.includes(u.id));
      setTeam(teamUsers);
    };

    loadTeam();
  }, [client.assignedTeamMembers]);

  const progress = client.monthlyDeliverables > 0
    ? Math.round((client.completedDeliverables / client.monthlyDeliverables) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">{client.name}</h1>
          <a
            href={`https://instagram.com/${client.instagramHandle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center space-x-1"
          >
            <span>{client.instagramHandle}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Client
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-6">Monthly Deliverables</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Progress</p>
                    <p className="text-4xl font-bold text-foreground">
                      {client.completedDeliverables}
                      <span className="text-lg text-muted-foreground">/
                        {client.monthlyDeliverables}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{progress}%</p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary rounded-full h-3 transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-foreground">
                    {client.monthlyDeliverables - client.completedDeliverables}
                  </p>
                </Card>
                <Card className="p-4 bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Time Left</p>
                  <p className="text-2xl font-bold text-foreground">~10 days</p>
                </Card>
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Assets</h2>
            <div className="space-y-3">
              {assets.slice(0, 5).map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{asset.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(asset.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    asset.status === 'approved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : asset.status === 'revision_requested'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {asset.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Assigned Team</h2>
            <div className="space-y-3">
              {team.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {client.brandColor && (
            <Card className="p-6 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">Brand Identity</h2>
              <div>
                <p className="text-sm text-muted-foreground mb-3">Brand Color</p>
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-lg border border-border"
                    style={{ backgroundColor: client.brandColor }}
                  ></div>
                  <div>
                    <p className="text-sm font-mono text-foreground">{client.brandColor}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
