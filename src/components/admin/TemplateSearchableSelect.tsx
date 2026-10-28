import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Eye, X, LayoutTemplate } from 'lucide-react';
import { Template } from '../../types';

export interface TemplateSearchableSelectProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onPreviewTemplate?: (template: Template) => void;
  disabled?: boolean;
}

export const TemplateSearchableSelect: React.FC<TemplateSearchableSelectProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onPreviewTemplate,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Filter templates by query (name or category)
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase().trim();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [templates, searchQuery]);

  // Group filtered templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    for (const t of filteredTemplates) {
      const cat = t.category || 'General';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(t);
    }
    return groups;
  }, [filteredTemplates]);

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-neutral-main">
          Certificate Template <span className="text-rose-500">*</span>
        </label>
        {selectedTemplate && onPreviewTemplate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewTemplate(selectedTemplate);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-violet hover:text-brand-midnight transition-colors"
            title="Inspect template layout"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick Preview</span>
          </button>
        )}
      </div>

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled || templates.length === 0}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 rounded-lg border text-left flex items-center justify-between transition-all duration-150 bg-white ${
          isOpen
            ? 'border-brand-violet ring-2 ring-brand-violet/20 shadow-xs'
            : 'border-neutral-subtle hover:border-neutral-secondary/40 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-surface/40' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded bg-brand-violet/10 text-brand-violet flex items-center justify-center shrink-0">
            <LayoutTemplate className="w-4 h-4" />
          </div>

          {selectedTemplate ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-neutral-main truncate">
                  {selectedTemplate.name}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-surface border border-neutral-subtle text-neutral-secondary">
                  {selectedTemplate.category || 'General'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-secondary font-mono truncate">
                {selectedTemplate.pageWidth} × {selectedTemplate.pageHeight} {selectedTemplate.pageUnit} •{' '}
                <span className="capitalize">{selectedTemplate.orientation}</span>
              </p>
            </div>
          ) : (
            <span className="text-xs text-neutral-secondary/80">
              {templates.length === 0 ? 'No published templates available' : 'Select a certificate template...'}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-neutral-secondary transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-brand-violet' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-xl border border-neutral-subtle shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-80">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-neutral-subtle bg-neutral-surface/50 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-secondary absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by name or category..."
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-md border border-neutral-subtle bg-white text-neutral-main placeholder:text-neutral-secondary/60 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 absolute right-2 text-neutral-secondary hover:text-neutral-main rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Templates List */}
          <div className="overflow-y-auto p-1.5 space-y-2 flex-1">
            {Object.keys(groupedTemplates).length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-secondary space-y-1">
                <p className="font-medium text-neutral-main">No templates match your search</p>
                <p className="text-[11px]">Try searching with a different name or category keyword.</p>
              </div>
            ) : (
              Object.entries(groupedTemplates).map(([category, items]) => (
                <div key={category} className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-secondary/80 flex items-center justify-between">
                    <span>{category}</span>
                    <span>{items.length}</span>
                  </div>

                  {items.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          onSelectTemplate(tpl.id);
                          setIsOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg text-left text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-brand-violet/10 text-brand-midnight font-medium border border-brand-violet/30'
                            : 'hover:bg-neutral-surface text-neutral-main border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold truncate">{tpl.name}</span>
                            <span className="text-[10px] text-neutral-secondary font-mono">
                              ({tpl.orientation})
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-secondary block font-mono">
                            {tpl.category || 'General'} • {tpl.pageWidth} × {tpl.pageHeight} {tpl.pageUnit}
                          </span>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-brand-violet shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

