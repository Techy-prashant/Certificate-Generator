import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Lock,
  Shield,
  Eye,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  Layers,
  Award
} from 'lucide-react';
import { portalService } from '../../services';
import { AuditLog } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [actorRoleFilter, setActorRoleFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // all, today, 7days, 30days

  // Metadata Inspector Modal
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await portalService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
  };

  // Unique actions, target types, and users for filter options
  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const uniqueTargetTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.targetType));
    return Array.from(set).sort();
  }, [logs]);

  const uniqueActors = useMemo(() => {
    const set = new Set(logs.map((l) => l.actorName));
    return Array.from(set).sort();
  }, [logs]);

  // Filter application
  const filteredLogs = useMemo(() => {
    const now = new Date();

    return logs.filter((log) => {
      // Search term
      const matchesSearch =
        !searchTerm ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.targetDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.targetId && log.targetId.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Target type filter
      if (targetTypeFilter !== 'all' && log.targetType !== targetTypeFilter) {
        return false;
      }

      // Actor role filter
      if (actorRoleFilter !== 'all' && log.actorRole !== actorRoleFilter) {
        return false;
      }

      // User / Actor filter
      if (actorFilter !== 'all' && log.actorName !== actorFilter) {
        return false;
      }

      // Result / status filter
      if (resultFilter === 'success' && log.action.includes('revoked')) {
        return false;
      }
      if (resultFilter === 'revoked' && !log.action.includes('revoked')) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const logDate = new Date(log.createdAt);
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateRangeFilter === 'today' && diffDays > 1) return false;
        if (dateRangeFilter === '7days' && diffDays > 7) return false;
        if (dateRangeFilter === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [logs, searchTerm, actionFilter, targetTypeFilter, actorRoleFilter, actorFilter, resultFilter, dateRangeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const issuances = logs.filter((l) => l.action.includes('issued') || l.action.includes('issue')).length;
    const revocations = logs.filter((l) => l.action.includes('revoked')).length;
    const batches = logs.filter((l) => l.action.includes('batch')).length;
    return { total, issuances, revocations, batches };
  }, [logs]);

  // Clean sensitive metadata before showing in inspector
  const sanitizeMetadata = (meta?: Record<string, any>) => {
    if (!meta) return {};
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth'];
    for (const [k, v] of Object.entries(meta)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        sanitized[k] = '[REDACTED_SECURE]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  };

  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'Action', 'Actor Name', 'Actor Role', 'Target Type', 'Target ID', 'Target Description', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.createdAt).toISOString()}"`,
      `"${l.action}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.actorRole}"`,
      `"${l.targetType}"`,
      `"${l.targetId || ''}"`,
      `"${l.targetDescription.replace(/"/g, '""')}"`,
      `"${l.ipAddress || 'Internal'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_trail_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionBadgeVariant = (action: string): 'neutral' | 'success' | 'pending' | 'error' | 'info' => {
    if (action.includes('revoked')) return 'error';
    if (action.includes('issued') || action.includes('approved') || action.includes('published')) return 'success';
    if (action.includes('batch') || action.includes('created')) return 'info';
    return 'neutral';
  };

  const formatLogDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 pb-12">
      <Breadcrumbs items={[{ label: 'Security & Audit Logs' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-violet" />
            Security Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Immutable, append-only security ledger recording all certificate issuances, revocations, and administrative events.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAuditCsv}
            disabled={filteredLogs.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-secondary bg-neutral-surface px-3 py-1.5 rounded-xl border border-neutral-subtle shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-brand-violet" />
            <span>Append-Only</span>
          </div>
        </div>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center border-l-4 border-l-brand-violet">
          <p className="text-[11px] text-neutral-secondary font-medium uppercase tracking-wider">Total Operations</p>
          <p className="text-xl font-bold text-neutral-main mt-1">{stats.total}</p>
        </Card>
        <Card className="p-3 text-center border-l-4 border-l-brand-teal">
          <p className="text-[11px] text-neutral-secondary font-medium uppercase tracking-wider flex items-center justify-center gap-1">
            <Award className="w-3 h-3 text-brand-teal" /> Issuances
          </p>
          <p className="text-xl font-bold text-neutral-main mt-1">{stats.issuances}</p>
        </Card>
        <Card className="p-3 text-center border-l-4 border-l-accent-ruby">
          <p className="text-[11px] text-neutral-secondary font-medium uppercase tracking-wider flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3 text-accent-ruby" /> Revocations
          </p>
          <p className="text-xl font-bold text-accent-ruby mt-1">{stats.revocations}</p>
        </Card>
        <Card className="p-3 text-center border-l-4 border-l-brand-navy">
          <p className="text-[11px] text-neutral-secondary font-medium uppercase tracking-wider flex items-center justify-center gap-1">
            <Layers className="w-3 h-3 text-brand-navy" /> Batch Runs
          </p>
          <p className="text-xl font-bold text-neutral-main mt-1">{stats.batches}</p>
        </Card>
      </div>

      {/* Compact Filters Toolbar */}
      <Card className="p-4 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-1">
            <Input
              placeholder="Search activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-neutral-secondary" />}
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Actions' },
                ...uniqueActions.map((a) => ({ value: a, label: a }))
              ]}
            />
          </div>

          {/* User Filter */}
          <div>
            <Select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Users' },
                ...uniqueActors.map((u) => ({ value: u, label: u }))
              ]}
            />
          </div>

          {/* Target Type Filter */}
          <div>
            <Select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Targets' },
                ...uniqueTargetTypes.map((t) => ({ value: t, label: t.replace('_', ' ') }))
              ]}
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <Select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Dates' },
                { value: 'today', label: 'Past 24 Hours' },
                { value: '7days', label: 'Past 7 Days' },
                { value: '30days', label: 'Past 30 Days' }
              ]}
            />
          </div>

          {/* Result / Outcome Filter */}
          <div>
            <Select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Results' },
                { value: 'success', label: 'Success' },
                { value: 'revoked', label: 'Revoked / Void' }
              ]}
            />
          </div>
        </div>

        {(searchTerm || actionFilter !== 'all' || targetTypeFilter !== 'all' || actorRoleFilter !== 'all' || actorFilter !== 'all' || resultFilter !== 'all' || dateRangeFilter !== 'all') && (
          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-neutral-subtle text-neutral-secondary">
            <span>
              Showing <strong className="text-neutral-main">{filteredLogs.length}</strong> of{' '}
              <strong className="text-neutral-main">{logs.length}</strong> entries
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setActionFilter('all');
                setTargetTypeFilter('all');
                setActorRoleFilter('all');
                setActorFilter('all');
                setResultFilter('all');
                setDateRangeFilter('all');
              }}
              className="text-brand-violet hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </Card>

      {/* Main Activity Table: 5 Clear Default Columns */}
      {isLoading ? (
        <LoadingState message="Loading security audit records..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No audit entries found"
          description={
            logs.length === 0
              ? 'No audit entries have been logged in the system yet.'
              : 'No audit records match the current filter criteria. Try adjusting or clearing your filters.'
          }
          icon={FileText}
        />
      ) : (
        <Card className="overflow-hidden border border-neutral-subtle/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[10px] font-semibold border-b border-neutral-subtle">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Target / Record</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-subtle">
                {filteredLogs.map((log) => {
                  const isRevoke = log.action.includes('revoked');
                  return (
                    <tr key={log.id} className="hover:bg-neutral-surface/40 transition-colors">
                      {/* 1. Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>

                      {/* 2. User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-main">{log.actorName}</span>
                          <span className="text-[10px] text-neutral-secondary capitalize">
                            • {log.actorRole.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 3. Target / Record */}
                      <td className="py-3 px-4 min-w-[200px] max-w-md">
                        <div className="truncate font-medium text-neutral-main" title={log.targetDescription}>
                          {log.targetDescription}
                        </div>
                        {log.targetId && (
                          <span className="font-mono text-[10px] text-neutral-secondary block truncate mt-0.5" title={log.targetId}>
                            ID: {log.targetId.slice(0, 16)}...
                          </span>
                        )}
                      </td>

                      {/* 4. Date and Time */}
                      <td className="py-3 px-4 text-neutral-secondary whitespace-nowrap">
                        {formatLogDate(log.createdAt)}
                      </td>

                      {/* 5. Result & View details */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Badge variant={isRevoke ? 'error' : 'success'} size="sm">
                            {isRevoke ? 'Revoked' : 'Success'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              setInspectedLog(log);
                              setShowRawJson(false);
                            }}
                            leftIcon={<Eye className="w-3.5 h-3.5 text-brand-violet" />}
                          >
                            View details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Structured Expandable Details Modal */}
      {inspectedLog && (
        <Modal
          isOpen={!!inspectedLog}
          onClose={() => setInspectedLog(null)}
          title="Audit Record Details"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Structured Primary Metadata Table */}
            <div className="p-4 bg-neutral-surface/50 rounded-xl border border-neutral-subtle space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[11px] text-neutral-secondary font-medium block">Action:</span>
                  <div className="mt-1">
                    <Badge variant={getActionBadgeVariant(inspectedLog.action)}>{inspectedLog.action}</Badge>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-secondary font-medium block">Result:</span>
                  <div className="mt-1">
                    <Badge variant={inspectedLog.action.includes('revoked') ? 'error' : 'success'}>
                      {inspectedLog.action.includes('revoked') ? 'Revoked / Action Logged' : 'Successfully Committed'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-secondary font-medium block">User:</span>
                  <p className="text-neutral-main font-semibold mt-0.5">
                    {inspectedLog.actorName}{' '}
                    <span className="text-[10px] text-neutral-secondary font-normal capitalize">
                      ({inspectedLog.actorRole.replace('_', ' ')})
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-secondary font-medium block">Date & Time:</span>
                  <p className="text-neutral-main font-mono text-[11px] mt-0.5">
                    {new Date(inspectedLog.createdAt).toUTCString()}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-secondary font-medium block">Target Type:</span>
                  <p className="text-neutral-main font-medium capitalize mt-0.5">
                    {inspectedLog.targetType.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-secondary font-medium block">Client IP:</span>
                  <p className="text-neutral-main font-mono text-[11px] mt-0.5">
                    {inspectedLog.ipAddress || 'Internal / Cloudflare'}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-neutral-subtle">
                <span className="text-[11px] text-neutral-secondary font-medium block">Record Identifier:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="font-mono text-[11px] text-neutral-main bg-white px-2 py-0.5 rounded border border-neutral-subtle select-all">
                    {inspectedLog.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inspectedLog.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="text-[11px] text-brand-violet hover:underline font-semibold"
                  >
                    {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-subtle">
                <span className="text-[11px] text-neutral-secondary font-medium block">Target / Record Description:</span>
                <p className="text-neutral-main mt-0.5 font-medium leading-relaxed">{inspectedLog.targetDescription}</p>
              </div>
            </div>

            {/* Context & Payload Key-Values */}
            {inspectedLog.metadata && Object.keys(inspectedLog.metadata).length > 0 && (
              <div className="p-4 bg-white rounded-xl border border-neutral-subtle space-y-2.5">
                <span className="text-xs font-bold text-neutral-main block">
                  Associated Event Details & Context
                </span>
                <div className="divide-y divide-neutral-subtle text-xs">
                  {Object.entries(sanitizeMetadata(inspectedLog.metadata)).map(([key, val]) => (
                    <div key={key} className="py-1.5 flex items-start justify-between gap-3">
                      <span className="text-neutral-secondary font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-neutral-main text-right break-all">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Raw Technical JSON Payload */}
            <div className="border border-neutral-subtle rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full px-4 py-2 bg-neutral-surface/60 hover:bg-neutral-surface text-left font-semibold text-neutral-secondary text-xs flex items-center justify-between"
              >
                <span>{showRawJson ? 'Hide Technical JSON Payload' : 'View Technical JSON Payload'}</span>
                <span className="text-[10px] font-mono text-neutral-secondary">
                  {showRawJson ? '▲' : '▼'}
                </span>
              </button>
              {showRawJson && (
                <pre className="p-3 bg-neutral-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border-t border-neutral-subtle">
                  {JSON.stringify(sanitizeMetadata(inspectedLog.metadata), null, 2)}
                </pre>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
