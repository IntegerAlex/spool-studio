import type { User } from '@/types/index';

export const mockUsers: User[] = [
  {
    id: 'user_1',
    email: 'sarah@agency.com',
    name: 'Sarah Chen',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user_2',
    email: 'james@agency.com',
    name: 'James Rodriguez',
    role: 'approver',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'user_3',
    email: 'emma@agency.com',
    name: 'Emma Thompson',
    role: 'designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'user_4',
    email: 'alex@agency.com',
    name: 'Alex Kim',
    role: 'designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    createdAt: new Date('2024-02-10'),
  },
];