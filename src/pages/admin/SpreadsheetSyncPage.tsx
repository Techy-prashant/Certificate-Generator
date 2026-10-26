import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { portalService } from '../../services';
import { SpreadsheetConfig, SpreadsheetSyncLog, SpreadsheetSyncResult } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';

export const SpreadsheetSyncPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [config, setConfig] = useState<SpreadsheetConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<SpreadsheetSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; title?: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<SpreadsheetSyncResult | null>(null);

  // Friendly name state for normal card
  const [spreadsheetName, setSpreadsheetName] = useState('');

  // Restricted configuration modal state
  const [isEndpointsModalOpen, setIsEndpointsModalOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState('');
  const [tempSheetName, setTempSheetName] = useState('Sheet1');
  const [tempWebhookUrl, setTempWebhookUrl] = useState('');
  const [tempIsActive, setTempIsActive] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cfg, logs] = await Promise.all([
        portalService.getSpreadsheetConfig(),
        portalService.getSpreadsheetSyncLogs(),
      ]);
      if (cfg) {
        setConfig(cfg);
        setSpreadsheetName(cfg.spreadsheetName || '');
        setTempSpreadsheetId(cfg.spreadsheetId || '');
        setTempSheetName(cfg.sheetName || 'Sheet1');
        setTempWebhookUrl(cfg.webhookUrl || '');
        setTempIsActive(cfg.isActive);
      }
      setSyncLogs(logs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setIsSaving(true);
    try {
      const updated = await portalService.updateSpreadsheetConfig({
        ...config,
        spreadsheetName: spreadsheetName.trim() || 'Certificate Records & Verification Tracker',
      });
      setConfig(updated);
      toastSuccess('Spreadsheet label updated successfully.');
    } catch (err: any) {
      toastError(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEndpointsModal = () => {
    if (config) {
      setTempSpreadsheetId(config.spreadsheetId || '');
      setTempSheetName(config.sheetName || 'Sheet1');
      setTempWebhookUrl(config.webhookUrl || '');
      setTempIsActive(config.isActive);
    }
    setShowSecrets(false);
    setIsEndpointsModalOpen(true);
  };

  const handleSaveEndpoints = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      let cleanId = tempSpreadsheetId.trim();
      const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }

      const updated = await portalService.updateSpreadsheetConfig({
        ...config,
        spreadsheetId: cleanId,
        sheetName: tempSheetName.trim() || 'Sheet1',
        webhookUrl: tempWebhookUrl.trim(),
        isActive: tempIsActive,
        spreadsheetName: spreadsheetName.trim() || config.spreadsheetName || 'Certificate Records & Verification Tracker',
      });
      setConfig(updated);
      setIsEndpointsModalOpen(false);
      setShowSecrets(false);
      toastSuccess('Endpoints updated successfully.');
    } catch (err: any) {
      toastError(`Update failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await portalService.testSpreadsheetConnection();
      setTestResult(res);
      if (res.success) {
        toastSuccess(res.message || 'Connection established successfully!');
      } else {
        toastError(res.message || 'Connection test failed');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Connection test failed';
      setTestResult({
        success: false,
        message: errMsg,
      });
      toastError(errMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncAll = async () => {
    if (!config?.isActive) {
      toastError('Please enable the integration before synchronizing.');
      return;
    }
    setIsSyncingAll(true);
    setSyncResult(null);
    try {
      const res = await portalService.syncAllCertificatesToSpreadsheet();
      setSyncResult(res);
      await loadData();
      toastSuccess(`Sync complete: ${res.synced} records synchronized.`);
    } catch (err: any) {
      toastError(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleRetryLog = async (logId: string) => {
    try {
      const res = await portalService.retrySpreadsheetSync(logId);
      if (res.synced > 0) {
        toastSuccess('Record synchronized successfully.');
      } else {
        toastError('Retry failed.');
      }
      await loadData();
    } catch (err: any) {
      toastError(`Retry failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading Spreadsheet Mirror..." />;
  }

  const isConnected = !!config?.isActive && (!!config?.spreadsheetId || !!config?.webhookUrl);

  const getSyncHealth = () => {
    if (!isConnected) return { label: 'Disconnected', variant: 'neutral' as const };
    if (config?.lastSyncStatus === 'failed') return { label: 'Sync Warning', variant: 'gold' as const };
    if (syncLogs.some((l) => l.status === 'failed')) return { label: 'Needs Attention', variant: 'gold' as const };
    if (config?.lastSyncStatus === 'success') return { label: 'Healthy', variant: 'success' as const };
    return { label: 'Idle', variant: 'neutral' as const };
  };

  const pendingCount = syncLogs.filter((l) => l.status === 'pending').length;

  return (
    <div className="space-y-6 w-full min-w-0 pb-12">
      <Breadcrumbs items={[{ label: 'Spreadsheet Mirror' }]} />

      {/* Simplified Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-subtle">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">
            Spreadsheet Mirror
          </h1>
          <Badge
            variant={isConnected ? 'success' : 'neutral'}
            size="sm"
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />}
          onClick={handleSyncAll}
          disabled={isSyncingAll || !isConnected}
        >
          {isSyncingAll ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            syncResult.failed === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Synchronized {syncResult.synced} of {syncResult.total} certificate records.
              {syncResult.failed > 0 && ` (${syncResult.failed} failed)`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSyncResult(null)}
            className="text-neutral-secondary hover:text-neutral-main font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Grid: Connection Settings & Mirror Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Connection Settings */}
        <Card>
          <CardHeader title="Spreadsheet Connection" />
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-main block">
                  Spreadsheet Name
                </label>
                <Input
                  placeholder="e.g. Namdapha Certificate Registry"
                  value={spreadsheetName}
                  onChange={(e) => setSpreadsheetName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-neutral-subtle">
                <span className="text-xs text-neutral-secondary">Connection Status</span>
                <Badge variant={isConnected ? 'success' : 'neutral'} size="sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-subtle">
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTesting || (!config?.spreadsheetId && !config?.webhookUrl)}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenEndpointsModal}
                  className="text-neutral-secondary hover:text-neutral-main"
                  leftIcon={<Settings className="w-3.5 h-3.5" />}
                >
                  Configure Endpoints
                </Button>
              </div>
            </form>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-[#E2F4E9] text-[#17653C] border border-[#A3D9B8]'
                    : 'bg-[#FBE5E5] text-[#A52A2A] border border-[#F4AFAF]'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Mirror Status */}
        <Card>
          <CardHeader title="Mirror Status" />
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-neutral-subtle">
                <span className="text-neutral-secondary">Connection</span>
                <Badge variant={isConnected ? 'success' : 'neutral'} size="sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-subtle">
                <span className="text-neutral-secondary">Last Successful Sync</span>
                <span className="font-mono text-neutral-main">
                  {config?.lastSyncAt
                    ? new Date(config.lastSyncAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Never'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-neutral-subtle">
                <span className="text-neutral-secondary">Sync Health</span>
                <Badge variant={getSyncHealth().variant} size="sm">
                  {getSyncHealth().label}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-secondary">Pending Items</span>
                <span className="font-semibold text-neutral-main">
                  {pendingCount}
                </span>
              </div>
            </div>

            {config?.spreadsheetId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => {
                  window.open(
                    `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              >
                Open Spreadsheet
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full-Width Recent Sync Outbox Below */}
      <div className="w-full">
        <Card>
          <CardHeader
            title="Recent Sync Outbox"
            subtitle="Latest synchronization events"
          />
          <CardContent>
            {syncLogs.length === 0 ? (
              <EmptyState
                icon={RefreshCw}
                title="No sync activity"
                description="Synchronization logs will appear here when certificate records are created, updated, or reconciled."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-neutral-secondary uppercase tracking-wider text-[10px] font-semibold border-b border-neutral-subtle">
                    <tr>
                      <th className="py-2.5 px-3">Operation</th>
                      <th className="py-2.5 px-3">Record Reference</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-subtle">
                    {syncLogs.slice(0, 10).map((log) => {
                      const actionLabel =
                        log.action === 'insert'
                          ? 'Create'
                          : log.action === 'update'
                          ? 'Update'
                          : log.action === 'revoke'
                          ? 'Revoke'
                          : 'Reconcile';

                      const actionBadgeVariant =
                        log.action === 'insert'
                          ? 'info'
                          : log.action === 'revoke'
                          ? 'error'
                          : log.action === 'reconcile'
                          ? 'gold'
                          : 'neutral';

                      const statusBadgeVariant =
                        log.status === 'synced'
                          ? 'success'
                          : log.status === 'failed'
                          ? 'error'
                          : 'pending';

                      const recordRef = log.certificateId
                        ? `#${log.certificateId.slice(0, 8)}`
                        : 'Batch Reconcile';

                      const timeStr = new Date(
                        log.lastAttemptAt || log.createdAt
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={log.id} className="hover:bg-neutral-surface/40">
                          <td className="py-2.5 px-3">
                            <Badge variant={actionBadgeVariant} size="sm">
                              {actionLabel}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-neutral-main">
                            {recordRef}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5">
                              <Badge variant={statusBadgeVariant} size="sm">
                                {log.status}
                              </Badge>
                              {log.errorMessage && log.status === 'failed' && (
                                <span className="text-[10px] text-rose-600 max-w-xs truncate">
                                  {log.errorMessage}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-secondary">
                            {timeStr}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {log.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetryLog(log.id)}
                                className="text-xs h-7 px-2"
                              >
                                Retry
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Restricted Endpoints Configuration Modal */}
      <Modal
        isOpen={isEndpointsModalOpen}
        onClose={() => {
          setIsEndpointsModalOpen(false);
          setShowSecrets(false);
        }}
        title="Configure Spreadsheet Endpoints"
        description="Restricted settings for Google Sheet connection endpoints."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEndpointsModalOpen(false);
                setShowSecrets(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEndpoints}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Update Endpoints'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Modifying these endpoints affects certificate mirroring. Values are masked for security.
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-main">
                Spreadsheet ID
              </label>
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="text-[11px] text-neutral-secondary hover:text-neutral-main flex items-center gap-1"
              >
                {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showSecrets ? 'Mask' : 'Reveal'}</span>
              </button>
            </div>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={tempSpreadsheetId}
              onChange={(e) => setTempSpreadsheetId(e.target.value)}
              placeholder="Spreadsheet ID or URL"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-main">
              Target Tab Name
            </label>
            <Input
              value={tempSheetName}
              onChange={(e) => setTempSheetName(e.target.value)}
              placeholder="e.g. Sheet1"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-main">
              Apps Script Webhook URL
            </label>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={tempWebhookUrl}
              onChange={(e) => setTempWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="font-mono text-xs"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tempIsActive}
                onChange={(e) => setTempIsActive(e.target.checked)}
                className="rounded border-neutral-subtle text-brand-violet focus:ring-brand-violet"
              />
              <span className="text-xs font-medium text-neutral-main">
                Enable real-time synchronization
              </span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};
