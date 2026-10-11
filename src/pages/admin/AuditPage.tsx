import React, { useEffect, useState } from 'react';
import {
  Search,
  Lock
} from 'lucide-react';
import { portalService } from '../../services';
import { AuditLog } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await portalService.getAuditLogs();
        if (isMounted) setLogs(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLogs = logs.filter((log) =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Security & Audit Logs' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Security Audit Trail</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Immutable system activity log recording all certificate issuances, revocations, and administrative events
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-secondary bg-neutral-surface px-3 py-1.5 rounded border border-neutral-subtle">
          <Lock className="w-3.5 h-3.5 text-brand-violet" />
          <span>Append-Only Ledger</span>
        </div>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Filter audit logs by action, actor, or target..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading audit log records..." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-surface/60 text-neutral-secondary uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-subtle">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Audit Details</th>
                  <th className="py-3 px-4 text-right">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-subtle font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-surface/30 transition-colors">
                    <td className="py-3 px-4 text-neutral-secondary whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-brand-violet">
                      <span className="bg-brand-violet-light/60 px-1.5 py-0.5 rounded border border-brand-violet/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-neutral-main">
                      {log.actorName}
                      <span className="block text-[10px] text-neutral-secondary font-mono capitalize">
                        ({log.actorRole.replace('_', ' ')})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-neutral-main text-xs max-w-md">
                      {log.targetDescription}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-secondary">
                      {log.ipAddress || 'Internal/RPC'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
