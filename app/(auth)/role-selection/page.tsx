'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserRole } from '@/types/index';
import { Zap, Users, Palette, Settings } from 'lucide-react';

const roles = [
  {
    id: 'designer' as UserRole,
    label: 'Designer',
    description: 'Create and manage creative assets',
    icon: Palette,
  },
  {
    id: 'manager' as UserRole,
    label: 'Manager',
    description: 'Oversee projects and team',
    icon: Users,
  },
  {
    id: 'admin' as UserRole,
    label: 'Admin',
    description: 'Full system access and settings',
    icon: Settings,
  },
  {
    id: 'client' as UserRole,
    label: 'Client',
    description: 'View and approve assets',
    icon: Zap,
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      localStorage.setItem('userRole', selectedRole);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Select Your Role</h1>
          <p className="text-muted-foreground">Choose your role to customize your experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className={`p-6 cursor-pointer border-2 transition-all ${
                  selectedRole === role.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      selectedRole === role.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-foreground">{role.label}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button
            disabled={!selectedRole}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
