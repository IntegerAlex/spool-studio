'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { workspaceApi, usersApi } from '@/lib/api-client';
import { Workspace, User } from '@/types/index';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Lock, Users, Palette, Save } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');

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
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted border border-border p-1 rounded-lg">
          <TabsTrigger value="workspace" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Workspace</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-6">
          <Card className="p-6 border border-border space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Workspace Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Workspace Name
                </label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="bg-background text-foreground border-border"
                  placeholder="Your workspace name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Workspace ID
                </label>
                <Input
                  value={workspace?.id || ''}
                  disabled
                  className="bg-muted text-muted-foreground border-border"
                />
              </div>

              <Button
                onClick={handleSaveWorkspace}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card className="p-6 border border-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Invite Member
              </Button>
            </div>

            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full capitalize">
                      {member.role}
                    </span>
                    <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6 border border-border space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>

            <div className="space-y-4">
              {[
                { id: 'approvals', label: 'Asset Approvals', description: 'Get notified when assets are ready for review' },
                { id: 'revisions', label: 'Revision Requests', description: 'Get notified when revisions are requested' },
                { id: 'uploads', label: 'Upload Confirmations', description: 'Get notified when assets are uploaded' },
                { id: 'comments', label: 'New Comments', description: 'Get notified about comments on your assets' },
              ].map((pref) => (
                <div key={pref.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{pref.label}</p>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-border cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="p-6 border border-border space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  className="bg-background text-foreground border-border"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  className="bg-background text-foreground border-border"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  className="bg-background text-foreground border-border"
                  placeholder="Confirm new password"
                />
              </div>

              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Update Password
              </Button>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <h4 className="font-semibold text-foreground">Danger Zone</h4>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                Delete Account
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
