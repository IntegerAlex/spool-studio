'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceApi, usersApi } from '@/lib/api-client';
import { Workspace, User } from '@/types/index';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Lock, Palette, Save, Users, Sparkles } from 'lucide-react';

const sections = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Branding and identity',
    icon: Palette,
  },
  {
    id: 'team',
    label: 'Team',
    description: 'People and access',
    icon: Users,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Delivery preferences',
    icon: Bell,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Passwords and account risk',
    icon: Lock,
  },
] as const;

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('workspace');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [workspaceData, usersData] = await Promise.all([
          workspaceApi.get(),
          usersApi.getAll(),
        ]);
        setWorkspace(workspaceData);
        setWorkspaceName(workspaceData.name);
        setTeamMembers(usersData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSaveWorkspace = async () => {
    if (workspace) {
      const updated = await workspaceApi.update({ name: workspaceName });
      setWorkspace(updated);
      setWorkspaceName(updated.name);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />
        <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <Card className="space-y-2 p-2">
            {sections.map((section) => (
              <div key={section.id} className="flex h-11 items-center gap-3 rounded-[8px] px-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-[12px]" />
            <Skeleton className="h-52 rounded-[12px]" />
            <Skeleton className="h-40 rounded-[12px]" />
          </div>
        </div>
      </div>
    );
  }

  const activeMeta = sections.find((section) => section.id === activeSection) ?? sections[0];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-[12px] border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] p-2">
          <div className="mb-2 flex items-center gap-2 rounded-[8px] px-3 py-2">
            <Sparkles className="size-4 text-[#818cf8]" />
            <div>
              <p className="text-[12px] font-medium text-white">Settings</p>
              <p className="text-[10px] text-[#71717a]">Workspace controls</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left transition-colors ${
                    isActive
                      ? 'bg-[rgba(99,102,241,0.12)] text-white'
                      : 'text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.04)] hover:text-white'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-[#c7d2fe]' : 'text-[#71717a]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{section.label}</span>
                    <span className="block text-[10px] text-inherit/70">{section.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-6">
          <Card className="border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">{activeMeta.label}</p>
                <h3 className="text-[18px] font-medium text-white">
                  {activeSection === 'workspace' && 'Workspace identity'}
                  {activeSection === 'team' && 'Team access'}
                  {activeSection === 'notifications' && 'Notification routing'}
                  {activeSection === 'security' && 'Security controls'}
                </h3>
              </div>

              {activeSection === 'workspace' && (
                <Button onClick={handleSaveWorkspace}>
                  <Save className="mr-2 size-4" />
                  Save changes
                </Button>
              )}

              {activeSection === 'team' && (
                <Button>
                  Invite member
                </Button>
              )}

              {activeSection === 'notifications' && (
                <Button>
                  Save preferences
                </Button>
              )}

              {activeSection === 'security' && (
                <Button>
                  Update password
                </Button>
              )}
            </div>
          </Card>

          {activeSection === 'workspace' && (
            <Card className="border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] p-6">
              <div className="space-y-1">
                <h4 className="text-[15px] font-medium text-white">Workspace details</h4>
                <p className="text-[13px] text-[#71717a]">These values shape the workspace identity everywhere in the app.</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex flex-col gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">Workspace name</p>
                    <p className="text-[11px] text-[#71717a]">The primary display name for the organization</p>
                  </div>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full max-w-full md:max-w-[260px]"
                    placeholder="Your workspace name"
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">Workspace ID</p>
                    <p className="text-[11px] text-[#71717a]">Read-only identifier used by integrations</p>
                  </div>
                  <Input
                    value={workspace?.id || ''}
                    disabled
                    className="w-full max-w-full md:max-w-[260px]"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'team' && (
            <Card className="border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] p-6">
              <div className="space-y-1">
                <h4 className="text-[15px] font-medium text-white">Team members</h4>
                <p className="text-[13px] text-[#71717a]">Review access and keep workspace collaborators aligned.</p>
              </div>

              <div className="mt-6 space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-white">{member.name}</p>
                        <p className="truncate text-[11px] text-[#71717a]">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] capitalize text-[#cbd5e1]">
                        {member.role}
                      </span>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] p-6">
              <div className="space-y-1">
                <h4 className="text-[15px] font-medium text-white">Notification preferences</h4>
                <p className="text-[13px] text-[#71717a]">Choose which lifecycle events surface in your inbox and workspace alerts.</p>
              </div>

              <div className="mt-6 space-y-2">
                {[
                  { id: 'approvals', label: 'Asset approvals', description: 'Get notified when assets are ready for review' },
                  { id: 'revisions', label: 'Revision requests', description: 'Get notified when revisions are requested' },
                  { id: 'uploads', label: 'Upload confirmations', description: 'Get notified when assets are uploaded' },
                  { id: 'comments', label: 'New comments', description: 'Get notified about comments on your assets' },
                ].map((pref) => (
                  <div key={pref.id} className="flex min-h-11 items-center justify-between gap-4 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4">
                    <div>
                      <p className="text-[13px] font-medium text-white">{pref.label}</p>
                      <p className="text-[11px] text-[#71717a]">{pref.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="size-4 rounded border-[rgba(255,255,255,0.14)] bg-[#161616] accent-[#818cf8]"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card className="border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] p-6">
              <div className="space-y-1">
                <h4 className="text-[15px] font-medium text-white">Password management</h4>
                <p className="text-[13px] text-[#71717a]">Update your credentials and keep the workspace locked down.</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex flex-col gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">Current password</p>
                    <p className="text-[11px] text-[#71717a]">Required before changing your password</p>
                  </div>
                  <Input type="password" placeholder="Enter your current password" className="w-full max-w-full md:max-w-[260px]" />
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">New password</p>
                    <p className="text-[11px] text-[#71717a]">Use a long, unique password</p>
                  </div>
                  <Input type="password" placeholder="Enter new password" className="w-full max-w-full md:max-w-[260px]" />
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">Confirm password</p>
                    <p className="text-[11px] text-[#71717a]">Re-enter the new password exactly</p>
                  </div>
                  <Input type="password" placeholder="Confirm new password" className="w-full max-w-full md:max-w-[260px]" />
                </div>

                <div className="rounded-[10px] border border-[rgba(239,68,68,0.16)] bg-[rgba(239,68,68,0.06)] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-medium text-[#fca5a5]">Danger zone</p>
                      <p className="text-[11px] text-[#f87171]/80">Deleting the account removes the workspace history.</p>
                    </div>
                    <Button variant="outline" className="border-[#ef4444]/30 text-[#fca5a5] hover:bg-[rgba(239,68,68,0.08)] hover:text-white">
                      Delete account
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
