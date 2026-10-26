import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Calendar,
  FileCode2,
  PenTool,
  Award,
  UploadCloud,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'Navigation' | 'Quick Actions' | 'External';
  icon: React.ElementType;
  shortcut?: string;
  perform: (navigate: (to: string) => void) => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIssueModal?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenIssueModal
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandItems: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-overview',
      title: 'Overview Dashboard',
      description: 'House metrics, council summary & recent activity',
      category: 'Navigation',
      icon: LayoutDashboard,
      shortcut: 'G O',
      perform: (nav) => nav('/admin'),
    },
    {
      id: 'nav-certificates',
      title: 'Certificate Registry',
      description: 'Search, filter, preview, edit & revoke certificates',
      category: 'Navigation',
      icon: Award,
      shortcut: 'G C',
      perform: (nav) => nav('/admin/certificates'),
    },
    {
      id: 'nav-bulk-issue',
      title: 'Bulk Certificate Issuance',
      description: 'Guided 5-step issuance for manual tables or CSVs',
      category: 'Navigation',
      icon: UploadCloud,
      shortcut: 'G B',
      perform: (nav) => nav('/admin/bulk-issue'),
    },
    {
      id: 'nav-events',
      title: 'Events Management',
      description: 'House competitions, sports, and cultural meets',
      category: 'Navigation',
      icon: Calendar,
      shortcut: 'G E',
      perform: (nav) => nav('/admin/events'),
    },
    {
      id: 'nav-templates',
      title: 'Certificate Templates',
      description: 'Visual template library & Canva designs',
      category: 'Navigation',
      icon: FileCode2,
      shortcut: 'G T',
      perform: (nav) => nav('/admin/templates'),
    },
    {
      id: 'nav-signatures',
      title: 'Official Signatures',
      description: 'Warden, house advisor & coordinator credentials',
      category: 'Navigation',
      icon: PenTool,
      shortcut: 'G S',
      perform: (nav) => nav('/admin/signatories'),
    },
    {
      id: 'nav-spreadsheet',
      title: 'Google Sheets Integration',
      description: 'Real-time spreadsheet mirror & reconciliation',
      category: 'Navigation',
      icon: FileSpreadsheet,
      shortcut: 'G M',
      perform: (nav) => nav('/admin/spreadsheet'),
    },
    {
      id: 'nav-team',
      title: 'Team & Permissions',
      description: 'Council member roles and access privileges',
      category: 'Navigation',
      icon: Users,
      shortcut: 'G P',
      perform: (nav) => nav('/admin/team'),
    },
    {
      id: 'nav-audit',
      title: 'Audit Logs',
      description: 'Immutable ledger of issuance, edits, and revocations',
      category: 'Navigation',
      icon: ShieldCheck,
      shortcut: 'G A',
      perform: (nav) => nav('/admin/audit'),
    },
    // Quick Actions
    {
      id: 'act-issue-single',
      title: 'Issue Single Certificate',
      description: 'Open the single certificate creation modal',
      category: 'Quick Actions',
      icon: PlusCircle,
      shortcut: 'N C',
      perform: (nav) => {
        if (onOpenIssueModal) {
          onOpenIssueModal();
        } else {
          nav('/admin/certificates');
        }
      },
    },
    {
      id: 'act-start-bulk',
      title: 'Start Bulk Issuance Batch',
      description: 'Launch the recipient entry wizard',
      category: 'Quick Actions',
      icon: UploadCloud,
      shortcut: 'N B',
      perform: (nav) => nav('/admin/bulk-issue'),
    },
    {
      id: 'act-sync-sheets',
      title: 'Reconcile Google Sheets Mirror',
      description: 'Trigger full synchronization with connected Google Sheet',
      category: 'Quick Actions',
      icon: RefreshCw,
      perform: (nav) => nav('/admin/spreadsheet'),
    },
    // External
    {
      id: 'ext-verify-portal',
      title: 'Open Public Verification Portal',
      description: 'Public page for QR code verification and audits',
      category: 'External',
      icon: ExternalLink,
      perform: () => window.open('/', '_blank'),
    },
  ], [onOpenIssueModal]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commandItems;
    const lower = query.toLowerCase().trim();
    return commandItems.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        (item.description && item.description.toLowerCase().includes(lower)) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [commandItems, query]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].perform(navigate);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-midnight/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Raycast Window */}
      <div
        className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-2xl shadow-mac-floating border border-neutral-subtle/80 overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Command Header Strip */}
        <div className="px-4 py-2.5 bg-neutral-surface/60 border-b border-neutral-subtle/70 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-neutral-secondary tracking-tight">
              Namdapha Command
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-secondary font-mono">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-subtle text-neutral-main shadow-2xs">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-neutral-subtle">
          <Search className="w-4 h-4 text-neutral-secondary shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, page, or search query..."
            className="w-full bg-transparent border-none text-sm text-neutral-main placeholder:text-neutral-secondary/60 focus:outline-none focus:ring-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-neutral-secondary hover:text-neutral-main px-1.5 py-0.5 rounded hover:bg-neutral-surface"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-secondary">
              No matching commands or pages found for "{query}"
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.perform(navigate);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-colors duration-100 ${
                    isSelected
                      ? 'bg-brand-violet-light/90 text-brand-midnight font-medium shadow-2xs'
                      : 'text-neutral-main hover:bg-neutral-surface/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-brand-violet text-white shadow-2xs'
                          : 'bg-neutral-surface text-neutral-secondary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-semibold block truncate">{item.title}</span>
                      {item.description && (
                        <span className="text-[10px] text-neutral-secondary block truncate mt-0.5">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
                        isSelected ? 'bg-brand-violet/20 text-brand-violet' : 'bg-neutral-subtle/70 text-neutral-secondary'
                      }`}
                    >
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-neutral-subtle text-neutral-secondary shadow-2xs">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-brand-violet animate-in fade-in" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-neutral-surface/40 border-t border-neutral-subtle/80 flex items-center justify-between text-[11px] text-neutral-secondary select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <kbd className="px-1 rounded bg-white border border-neutral-subtle text-neutral-main">↑</kbd>
              <kbd className="px-1 rounded bg-white border border-neutral-subtle text-neutral-main">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <kbd className="px-1.5 rounded bg-white border border-neutral-subtle text-neutral-main">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span className="font-medium text-[10px] text-neutral-secondary/80">
            {filteredCommands.length} commands available
          </span>
        </div>
      </div>
    </div>
  );
};
