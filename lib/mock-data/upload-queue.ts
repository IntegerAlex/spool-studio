import type { UploadQueue } from '@/types/index';

export const mockUploadQueue: UploadQueue[] = [
  {
    id: 'queue_1',
    assetId: 'asset_1',
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    platform: 'instagram',
    status: 'scheduled',
    caption: 'Join our summer fitness challenge! 💪 Tag a friend who needs this.',
    hashtags: ['#fitnesschallenge', '#summer2024', '#workoutmotivation'],
  },
  {
    id: 'queue_2',
    assetId: 'asset_5',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    platform: 'instagram',
    status: 'scheduled',
    caption: 'Discover our new summer collection ✨',
    hashtags: ['#summercollection', '#newlookbook', '#luxegoods'],
  },
];