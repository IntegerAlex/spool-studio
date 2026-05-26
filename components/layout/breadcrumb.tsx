'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-[12px] text-[#4b5563] mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-3.5 h-3.5 mx-2 text-[#2d2d3a]" />}
          {item.href ? (
            <Link href={item.href} className="text-[#4b5563] hover:text-[#e8e8f0] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#4b5563]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
