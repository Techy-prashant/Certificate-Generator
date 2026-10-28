import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
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
              {isLast ? (
                <span className="font-medium text-neutral-main truncate max-w-[200px]" aria-current="page">
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-brand-violet transition-colors truncate max-w-[160px] text-left cursor-pointer"
                >
                  {item.label}
                </button>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="hover:text-brand-violet transition-colors truncate max-w-[160px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate max-w-[160px]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
