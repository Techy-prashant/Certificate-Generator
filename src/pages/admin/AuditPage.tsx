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
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // all, today, 7days, 30days

  // Metadata Inspector Modal
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);

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

  // Unique actions and target types for filter options
  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const uniqueTargetTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.targetType));
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
  }, [logs, searchTerm, actionFilter, targetTypeFilter, actorRoleFilter, dateRangeFilter]);

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

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Security & Audit Logs' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-violet" />
            Security Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Immutable, append-only security ledger recording all certificate issuances, revocations, batch operations, and system alterations
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
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-secondary bg-neutral-surface px-3 py-1.5 rounded border border-neutral-subtle">
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

      {/* Filters Toolbar */}
      <Card className="p-4 bg-neutral-surface/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by action, actor, target description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-neutral-secondary" />}
            />
          </div>

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

          <div>
            <Select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Target Types' },
                ...uniqueTargetTypes.map((t) => ({ value: t, label: t.replace('_', ' ') }))
              ]}
            />
          </div>

          <div>
            <Select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Past 24 Hours' },
                { value: '7days', label: 'Past 7 Days' },
                { value: '30days', label: 'Past 30 Days' }
              ]}
            />
          </div>
        </div>

        {(searchTerm || actionFilter !== 'all' || targetTypeFilter !== 'all' || actorRoleFilter !== 'all' || dateRangeFilter !== 'all') && (
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-neutral-subtle text-neutral-secondary">
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
                setDateRangeFilter('all');
              }}
              className="text-brand-violet hover:underline font-medium"
            >
              Reset all filters
            </button>
          </div>
        )}
      </Card>

      {/* Main Table */}
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-surface/80 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Audit Details</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-subtle font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-surface/40 transition-colors">
                    <td className="py-3 px-4 text-neutral-secondary whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-sans text-neutral-main whitespace-nowrap">
                      <span className="font-semibold block">{log.actorName}</span>
                      <span className="text-[10px] text-neutral-secondary font-mono capitalize">
                        {log.actorRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-neutral-secondary whitespace-nowrap capitalize">
                      {log.targetType.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-sans text-neutral-main text-xs max-w-sm truncate" title={log.targetDescription}>
                      {log.targetDescription}
                    </td>
                    <td className="py-3 px-4 text-neutral-secondary whitespace-nowrap">
                      {log.ipAddress || 'Internal / Direct'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectedLog(log)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-brand-violet" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Metadata Inspector Modal */}
      {inspectedLog && (
        <Modal
          isOpen={!!inspectedLog}
          onClose={() => setInspectedLog(null)}
          title="Audit Entry Inspector"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-neutral-secondary font-medium">Record ID:</span>
                  <p className="font-mono text-[11px] text-neutral-main select-all">{inspectedLog.id}</p>
                </div>
                <div>
                  <span className="text-neutral-secondary font-medium">Timestamp:</span>
                  <p className="font-mono text-[11px] text-neutral-main">{new Date(inspectedLog.createdAt).toUTCString()}</p>
                </div>
                <div>
                  <span className="text-neutral-secondary font-medium">Action:</span>
                  <div className="mt-0.5">
                    <Badge variant={getActionBadgeVariant(inspectedLog.action)}>{inspectedLog.action}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-neutral-secondary font-medium">Actor:</span>
                  <p className="text-neutral-main font-semibold">
                    {inspectedLog.actorName} ({inspectedLog.actorRole})
                  </p>
                </div>
                <div>
                  <span className="text-neutral-secondary font-medium">Target Type:</span>
                  <p className="text-neutral-main capitalize">{inspectedLog.targetType.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-neutral-secondary font-medium">Target ID:</span>
                  <p className="font-mono text-[11px] text-neutral-main select-all">{inspectedLog.targetId || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-subtle">
                <span className="text-neutral-secondary font-medium">Description:</span>
                <p className="text-neutral-main mt-0.5 text-xs">{inspectedLog.targetDescription}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-neutral-main flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-violet" />
                  Recorded Metadata Payload (JSON)
                </span>
                <span className="text-[10px] text-neutral-secondary">Sanitized / Secrets Masked</span>
              </div>
              <pre className="p-3 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-64 border border-neutral-800">
                {JSON.stringify(sanitizeMetadata(inspectedLog.metadata), null, 2)}
              </pre>
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
