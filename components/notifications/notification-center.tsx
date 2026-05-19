'use client';

import { Notification } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, AlertCircle, MessageSquare, User, Calendar, Trash2 } from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationCenter({ notifications, onMarkAsRead, onDelete }: NotificationCenterProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'revision':
        return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'assigned':
        return <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Calendar className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  if (notifications.length === 0) {
    return (
      <Card className="p-12 border border-border text-center">
        <p className="text-muted-foreground">No notifications</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {unreadNotifications.length > 0 && (
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">
            {unreadNotifications.length} unread
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10"
            onClick={() => {
              unreadNotifications.forEach((n) => onMarkAsRead?.(n.id));
            }}
          >
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-4 border ${
              notification.read ? 'border-border bg-card' : 'border-primary/50 bg-primary/5'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">{notification.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead?.(notification.id)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <CheckCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}

                {notification.relatedAssetId && (
                  <Link href={`/dashboard/assets/${notification.relatedAssetId}`}>
                    <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                      View
                    </Button>
                  </Link>
                )}

                <button
                  onClick={() => onDelete?.(notification.id)}
                  className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
