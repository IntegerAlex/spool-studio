'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import ErrorBoundary from '@/components/ui/error-boundary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceApi, usersApi } from '@/lib/api-client';
import { Workspace, User } from '@/types/index';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Bell, CalendarCheck, Lock, Palette, Save, Users, Sparkles, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Branding and identity',
    icon: Palette,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connected services',
    icon: CalendarCheck,
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

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
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
    <ErrorBoundary>
      <div className="space-y-6 settings-page-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .settings-page-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .settings-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .settings-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
        }
        .settings-nav-card {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 8px !important;
          box-shadow: none !important;
        }
        .settings-nav-item {
          display: flex;
          height: auto !important;
          width: 100%;
          align-items: center;
          gap: 12px;
          border-radius: var(--radius-sm) !important;
          padding: 10px 12px !important;
          text-align: left;
          transition: all 120ms ease !important;
          cursor: pointer;
        }
        .settings-nav-item.active {
          background-color: var(--color-bg-active) !important;
          color: var(--color-text-primary) !important;
        }
        .settings-nav-item:not(.active) {
          color: var(--color-text-secondary) !important;
        }
        .settings-nav-item:not(.active):hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .content-card {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .content-card-header {
          padding: 16px 20px !important;
          border-bottom: 1px solid var(--color-border) !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .content-card-title {
          font-size: 13.5px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
        }
        .content-card-description {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 2px !important;
        }
        .content-card-body {
          padding: 20px !important;
        }
        .field-label {
          font-size: 12.5px !important;
          font-weight: 500 !important;
          color: var(--color-text-secondary) !important;
          display: block;
          margin-bottom: 6px;
        }
        .field-input {
          background-color: var(--color-bg-overlay) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
          color: var(--color-text-primary) !important;
          width: 100% !important;
          max-width: 360px !important;
          height: auto !important;
          transition: all 120ms ease !important;
        }
        .field-input::placeholder {
          color: var(--color-text-faint) !important;
        }
        .field-input:focus {
          border-color: var(--color-border-strong) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.04) !important;
          outline: none !important;
        }
        .field-input:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        .submit-btn {
          background: #3ecf8e !important;
          color: #000000 !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 16px !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transition: all 120ms ease !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: auto !important;
        }
        .submit-btn:hover {
          opacity: 0.88 !important;
        }
        .submit-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          cursor: pointer;
        }
        .toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .toggle-track {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--color-bg-overlay);
          border: 1px solid var(--color-border);
          border-radius: 999px;
          transition: 150ms ease;
        }
        .toggle-thumb {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 2px;
          bottom: 2px;
          background-color: var(--color-text-muted);
          border-radius: 50%;
          transition: 150ms ease;
        }
        .toggle-input:checked + .toggle-track {
          background-color: rgba(62,207,142,0.25);
          border-color: rgba(62,207,142,0.4);
        }
        .toggle-input:checked + .toggle-track .toggle-thumb {
          background-color: #3ecf8e;
          transform: translateX(16px);
        }
        .danger-zone {
          border: 1px solid rgba(248,113,113,0.2) !important;
          border-radius: var(--radius-lg) !important;
          overflow: hidden;
          margin-top: 16px;
          background-color: transparent !important;
        }
        .danger-zone-header {
          background-color: rgba(248,113,113,0.04) !important;
          padding: 16px 20px !important;
          border-bottom: 1px solid rgba(248,113,113,0.15) !important;
        }
        .danger-btn {
          background-color: transparent !important;
          border: 1px solid rgba(248,113,113,0.3) !important;
          color: #f87171 !important;
          font-size: 12.5px !important;
          border-radius: var(--radius-sm) !important;
          padding: 7px 16px !important;
          transition: all 120ms ease !important;
          box-shadow: none !important;
          cursor: pointer;
          height: auto !important;
        }
        .danger-btn:hover {
          background-color: rgba(248,113,113,0.08) !important;
        }
      `}</style>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Navigation Sidebar */}
        <aside className="settings-nav-card">
          <div className="mb-2 flex items-center gap-2 rounded-[8px] px-3 py-2">
            <Sparkles className="size-4 text-[#3ecf8e]" />
            <div>
              <p className="text-[12.5px] font-semibold text-white">Settings</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Workspace controls</p>
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
                  className={cn("settings-nav-item", isActive && "active")}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? 'text-[#3ecf8e]' : 'text-[var(--color-text-muted)]')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-none">{section.label}</span>
                    <span className="block text-[10px] text-inherit/70 mt-1">{section.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Section */}
        <main className="min-w-0 space-y-6">
          <Card className="content-card">
            <div className="content-card-header">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{activeMeta.label}</p>
                <h3 className="content-card-title mt-1">
                  {activeSection === 'workspace' && 'Workspace identity'}
                  {activeSection === 'integrations' && 'Connected services'}
                  {activeSection === 'team' && 'Team access'}
                  {activeSection === 'notifications' && 'Notification routing'}
                  {activeSection === 'security' && 'Security controls'}
                </h3>
              </div>

              {activeSection === 'workspace' && (
                <Button className="submit-btn" onClick={handleSaveWorkspace}>
                  <Save className="mr-2 size-4" />
                  Save changes
                </Button>
              )}



              {activeSection === 'team' && (
                <Button className="submit-btn">
                  Invite member
                </Button>
              )}

              {activeSection === 'notifications' && (
                <Button className="submit-btn">
                  Save preferences
                </Button>
              )}

              {activeSection === 'security' && (
                <Button className="submit-btn">
                  Update password
                </Button>
              )}
            </div>
          </Card>

          {/* Section Body Contents */}
          {activeSection === 'workspace' && (
            <Card className="content-card">
              <div className="content-card-header">
                <div>
                  <h4 className="content-card-title">Workspace details</h4>
                  <p className="content-card-description">These values shape the workspace identity everywhere in the app.</p>
                </div>
              </div>

              <div className="content-card-body space-y-4">
                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">Workspace name</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">The primary organization name</p>
                  </div>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="field-input w-full max-w-full md:max-w-[260px]"
                    placeholder="Your workspace name"
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">Workspace ID</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Read-only organization token identifier</p>
                  </div>
                  <Input
                    value={workspace?.id || ''}
                    disabled
                    className="field-input w-full max-w-full md:max-w-[260px]"
                  />
                </div>
              </div>
            </Card>
          )}



          {activeSection === 'team' && (
            <Card className="content-card">
              <div className="content-card-header">
                <div>
                  <h4 className="content-card-title">Team members</h4>
                  <p className="content-card-description">Review access and keep workspace collaborators aligned.</p>
                </div>
              </div>

              <div className="content-card-body space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] px-4 py-3 md:min-h-11 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9 border border-[var(--color-border)]">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-[var(--color-bg-overlay)] text-white text-[12px]">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-white">{member.name}</p>
                        <p className="truncate text-[11.5px] text-[var(--color-text-muted)] mt-0.5">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-overlay)] px-2.5 py-0.5 text-[11px] capitalize text-[var(--color-text-secondary)]">
                        {member.role}
                      </span>
                      <Button variant="outline" size="sm" className="h-7 text-[12px] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="content-card">
              <div className="content-card-header">
                <div>
                  <h4 className="content-card-title">Notification preferences</h4>
                  <p className="content-card-description">Choose which lifecycle events surface in your inbox and workspace alerts.</p>
                </div>
              </div>

              <div className="content-card-body space-y-3">
                {[
                  { id: 'approvals', label: 'Asset approvals', description: 'Get notified when assets are ready for review' },
                  { id: 'revisions', label: 'Revision requests', description: 'Get notified when revisions are requested' },
                  { id: 'uploads', label: 'Upload confirmations', description: 'Get notified when assets are uploaded' },
                  { id: 'comments', label: 'New comments', description: 'Get notified about comments on your assets' },
                ].map((pref) => (
                  <div key={pref.id} className="flex min-h-11 items-center justify-between gap-4 rounded-[10px] border border-[var(--color-border)] px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-white">{pref.label}</p>
                      <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5">{pref.description}</p>
                    </div>
                    
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="toggle-input"
                      />
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card className="content-card">
              <div className="content-card-header">
                <div>
                  <h4 className="content-card-title">Password management</h4>
                  <p className="content-card-description">Update your credentials and keep the workspace locked down.</p>
                </div>
              </div>

              <div className="content-card-body space-y-4">
                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">Current password</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Required before changing password</p>
                  </div>
                  <div className="relative w-full max-w-full md:max-w-[260px]">
                    <Input type={showCurrentPassword ? "text" : "password"} placeholder="Enter current password" className="field-input w-full pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">New password</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Use a long, unique password</p>
                  </div>
                  <div className="relative w-full max-w-full md:max-w-[260px]">
                    <Input type={showNewPassword ? "text" : "password"} placeholder="Enter new password" className="field-input w-full pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] px-4 py-4 md:min-h-11 md:flex-row md:items-center md:justify-between md:py-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">Confirm password</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Re-enter new password exactly</p>
                  </div>
                  <div className="relative w-full max-w-full md:max-w-[260px]">
                    <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" className="field-input w-full pr-10" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="danger-zone">
                  <div className="danger-zone-header flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-semibold text-[#fca5a5]">Danger zone</p>
                      <p className="text-[11px] text-[#f87171]/80 mt-0.5">Deleting the account removes organization history.</p>
                    </div>
                    <Button className="danger-btn">
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
    </ErrorBoundary>
  );
}
