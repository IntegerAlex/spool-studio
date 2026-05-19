'use client';

import { Revision } from '@/types/index';
import { Card } from '@/components/ui/card';
import { usersApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { User } from '@/types/index';
import { Download, AlertCircle } from 'lucide-react';

interface RevisionPanelProps {
  revisions: Revision[];
  assetTitle: string;
}

export function RevisionPanel({ revisions, assetTitle }: RevisionPanelProps) {
  const [users, setUsers] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    const loadUsers = async () => {
      const allUsers = await usersApi.getAll();
      const userMap = new Map(allUsers.map((u) => [u.id, u]));
      setUsers(userMap);
    };

    loadUsers();
  }, []);

  if (revisions.length === 0) {
    return (
      <Card className="p-6 border border-border">
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No revisions yet</p>
        </div>
      </Card>
    );
  }

  const getUser = (userId: string) => {
    return users.get(userId) || {
      id: userId,
      name: 'Unknown',
      email: 'unknown@example.com',
      role: 'designer' as const,
      createdAt: new Date(),
    };
  };

  return (
    <Card className="p-6 border border-border space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Revision History</h3>

      <div className="space-y-4">
        {revisions.map((revision, index) => {
          const author = getUser(revision.createdBy);
          return (
            <div
              key={revision.id}
              className="pb-4 border-b border-border last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Version {revision.version}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested by {author.name}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(revision.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-foreground mb-3">{revision.reason}</p>

              {revision.fileUrl && (
                <button className="inline-flex items-center space-x-2 text-sm text-primary hover:underline">
                  <Download className="w-4 h-4" />
                  <span>Download Revision</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
