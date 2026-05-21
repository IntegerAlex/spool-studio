'use client';

import { Card } from '@/components/ui/card';
import { ArrowUp } from 'lucide-react';

interface OverviewCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

interface OverviewCardsProps {
  cards: OverviewCard[];
}

export function OverviewCards({ cards }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="p-6 bg-card border border-border hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {card.value}
              </p>
              {card.change && (
                <p className={`text-xs mt-2 flex items-center space-x-1 ${
                  card.trend === 'up' ? 'text-green-600' : 'text-muted-foreground'
                }`}>
                  {card.trend === 'up' && <ArrowUp className="w-3 h-3" />}
                  <span>{card.change}</span>
                </p>
              )}
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              {card.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
