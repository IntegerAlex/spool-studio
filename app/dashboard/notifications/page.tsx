'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { notificationsApi, authApi } from '@/lib/api-client';
import { Notification, User } from '@/types/index';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);

        if (user) {
          const notifs = await notificationsApi.getAll(user.id);
          setNotifications(
            notifs.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const updated = await notificationsApi.markAsRead(id);
    setNotifications(
      notifications.map((n) => (n.id === id ? updated : n))
    );
  };

  const handleDelete = async (id: string) => {
    await notificationsApi.delete(id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
      />

      <NotificationCenter
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
      />
    </div>
  );
}
