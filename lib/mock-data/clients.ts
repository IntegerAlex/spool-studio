import type { Client } from '@/types/index';

export const mockClients: Client[] = [
  {
    id: 'client_1',
    name: 'Stellar Fitness',
    instagramHandle: '@stellarfitness',
    monthlyDeliverables: 12,
    completedDeliverables: 8,
    assignedTeamMembers: ['user_2', 'user_3'],
    brandColor: '#FF6B6B',
  },
  {
    id: 'client_2',
    name: 'Urban Cafe',
    instagramHandle: '@urbancafelife',
    monthlyDeliverables: 8,
    completedDeliverables: 6,
    assignedTeamMembers: ['user_3', 'user_4'],
    brandColor: '#4ECDC4',
  },
  {
    id: 'client_3',
    name: 'TechStart Hub',
    instagramHandle: '@techstart_hub',
    monthlyDeliverables: 16,
    completedDeliverables: 10,
    assignedTeamMembers: ['user_2', 'user_4'],
    brandColor: '#6C5CE7',
  },
  {
    id: 'client_4',
    name: 'Luxe Goods Co',
    instagramHandle: '@luxegoods',
    monthlyDeliverables: 10,
    completedDeliverables: 7,
    assignedTeamMembers: ['user_3'],
    brandColor: '#FFD93D',
  },
];