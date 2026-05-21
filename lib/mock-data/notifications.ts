import type { Notification } from '@/types/index';

export const mockNotifications: Notification[] = [
  {
    id: 'notif_1',
    userId: 'user_1',
    type: 'approval',
    title: 'Asset Ready for Approval',
    message: 'Espresso Special Menu is ready for your review',
    relatedAssetId: 'asset_3',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'notif_2',
    userId: 'user_2',
    type: 'revision',
    title: 'Revision Requested',
    message: 'New Membership Promo needs revisions',
    relatedAssetId: 'asset_2',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'notif_3',
    userId: 'user_3',
    type: 'assigned',
    title: 'Asset Assigned to You',
    message: 'Product Launch Teaser has been assigned',
    relatedAssetId: 'asset_4',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];