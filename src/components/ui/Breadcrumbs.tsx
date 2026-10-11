import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav className="flex items-center text-xs text-neutral-secondary py-1" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li>
          <Link
            to="/admin"
            className="hover:text-brand-violet flex items-center transition-colors"
            title="Dashboard Overview"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-neutral-secondary/50 shrink-0" />
              {isLast || !item.href ? (
                <span className="font-medium text-neutral-main truncate max-w-[200px]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-brand-violet transition-colors truncate max-w-[160px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
