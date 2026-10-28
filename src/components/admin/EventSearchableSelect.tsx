import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Calendar } from 'lucide-react';
import { Event } from '../../types';

export interface EventSearchableSelectProps {
  events: Event[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  disabled?: boolean;
}

export const EventSearchableSelect: React.FC<EventSearchableSelectProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  // Close on outside click
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

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter events by query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase().trim();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.eventDate && e.eventDate.includes(q))
    );
  }, [events, searchQuery]);

  return (
    <div
      ref={containerRef}
      className="relative w-full space-y-1.5"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsOpen(false);
      }}
    >
      <label className="block text-xs font-semibold text-neutral-main">
        Event / Competition <span className="text-rose-500">*</span>
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || events.length === 0}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 rounded-lg border text-left flex items-center justify-between transition-all duration-150 bg-white ${
          isOpen
            ? 'border-brand-violet ring-2 ring-brand-violet/20 shadow-xs'
            : 'border-neutral-subtle hover:border-neutral-secondary/40 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-surface/40' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded bg-brand-violet/10 text-brand-violet flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>

          {selectedEvent ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-neutral-main truncate">
                  {selectedEvent.name}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-surface border border-neutral-subtle text-neutral-secondary">
                  {selectedEvent.category}
                </span>
              </div>
              <p className="text-[11px] text-neutral-secondary font-mono truncate">
                {selectedEvent.eventDate || 'Ongoing'}
              </p>
            </div>
          ) : (
            <span className="text-xs text-neutral-secondary/80">
              {events.length === 0 ? 'No active events available' : 'Select an event...'}
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
                placeholder="Search events by title or domain..."
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

          {/* Events List */}
          <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
            {filteredEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-secondary">
                No events match "{searchQuery}"
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const isSelected = evt.id === selectedEventId;
                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      onSelectEvent(evt.id);
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
                        <span className="font-semibold truncate">{evt.name}</span>
                        <span className="text-[10px] text-neutral-secondary font-mono">
                          ({evt.eventDate || 'Ongoing'})
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-secondary block font-mono">
                        {evt.category} • {evt.scope || 'House-level'}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-violet shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

