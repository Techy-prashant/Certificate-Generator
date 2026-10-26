import React, { useEffect, useState, useRef } from 'react';
import {
  PenTool,
  Plus,
  Search,
  Lock,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileImage,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { portalService } from '../../services';
import { Signatory } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../contexts/ToastContext';

export const SignatoriesPage: React.FC = () => {
  const { success } = useToast();
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSignatory, setEditingSignatory] = useState<Signatory | null>(null);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [permissions, setPermissions] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status Toggle Confirmation
  const [signatoryToToggle, setSignatoryToToggle] = useState<Signatory | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchSignatories = async () => {
    setIsLoading(true);
    try {
      const data = await portalService.getSignatories();
      setSignatories(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatories();
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const openCreateModal = () => {
    setEditingSignatory(null);
    setName('');
    setDesignation('');
    setPermissions('');
    setStatus('active');
    setSelectedFile(null);
    setFilePreview(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sig: Signatory) => {
    setEditingSignatory(sig);
    setName(sig.name);
    setDesignation(sig.designation);
    setPermissions(sig.usagePermissions || '');
    setStatus(sig.status);
    setSelectedFile(null);
    setFilePreview(sig.signatureAssetUrl);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setFormError('Please select a PNG or JPG signature image (transparent PNG recommended).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size exceeds 5MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
  };

  const handleSaveSignatory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !designation.trim()) {
      setFormError('Name and designation are required.');
      return;
    }

    if (!editingSignatory && !selectedFile) {
      setFormError('A signature image file is required for new signatories.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingSignatory) {
        await portalService.updateSignatory(
          editingSignatory.id,
          {
            name: name.trim(),
            designation: designation.trim(),
            usagePermissions: permissions.trim() || undefined,
            status,
          },
          selectedFile || undefined
        );
      } else {
        await portalService.createSignatory(
          {
            name: name.trim(),
            designation: designation.trim(),
            usagePermissions: permissions.trim() || undefined,
          },
          selectedFile!
        );
      }

      setIsModalOpen(false);
      await fetchSignatories();
      success(editingSignatory ? 'Signatory updated successfully.' : 'New official signatory enrolled.');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save signatory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggleConfirm = async () => {
    if (!signatoryToToggle) return;
    setIsToggling(true);
    try {
      const nextStatus = signatoryToToggle.status === 'active' ? 'inactive' : 'active';
      await portalService.updateSignatory(signatoryToToggle.id, {
        status: nextStatus,
      });
      setSignatoryToToggle(null);
      await fetchSignatories();
      success(`Signatory status changed to ${nextStatus}.`);
    } finally {
      setIsToggling(false);
    }
  };

  const filteredSignatories = signatories.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Signatures Management' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Authorized Signatories</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Manage official signature assets, designation snapshots, and issuance usage authorizations
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Add Signatory
        </Button>
      </div>

      {/* Security Banner regarding signature assets */}
      <div className="p-4 bg-brand-midnight text-white rounded-lg flex items-start gap-3 text-xs shadow-xs border border-brand-gold/30">
        <Lock className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-brand-gold">Protected Storage Asset Boundary</span>
          <p className="text-neutral-subtle/80 leading-relaxed">
            Per the mandatory security specification, signature assets are restricted to authorized administrators and stored in the private <code>signatory-assets</code> Supabase bucket. They are served via short-lived signed URLs in the admin dashboard and never exposed to anonymous public visitors.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search signatories by name or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading signatories..." />
      ) : filteredSignatories.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="No signatories found"
          description={
            searchTerm
              ? `No signatories match "${searchTerm}".`
              : "Add an authorized official (e.g. Faculty Advisor, House Captain) to begin assigning signatories to certificates."
          }
          actionLabel="Add Signatory"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSignatories.map((sig) => {
            const isActive = sig.status === 'active';
            return (
              <Card
                key={sig.id}
                className={`flex flex-col transition-all rounded-2xl mac-card border ${
                  !isActive
                    ? 'opacity-75 bg-neutral-surface/30 border-neutral-subtle'
                    : 'bg-white/90 backdrop-blur-xs border-neutral-subtle/80 hover:border-brand-violet/40 hover:shadow-mac-panel'
                }`}
              >
                <CardContent className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-neutral-main line-clamp-1">{sig.name}</h3>
                      <p className="text-xs font-medium text-brand-violet mt-0.5 line-clamp-1">
                        {sig.designation}
                      </p>
                    </div>
                    <Badge variant={isActive ? 'success' : 'neutral'} size="sm">
                      {sig.status}
                    </Badge>
                  </div>

                  {/* Signature Preview Canvas */}
                  <div className="p-3 bg-neutral-surface/60 rounded-md border border-neutral-subtle flex items-center justify-center min-h-[96px] relative group">
                    {sig.signatureAssetUrl ? (
                      <img
                        src={sig.signatureAssetUrl}
                        alt={`Signature of ${sig.name}`}
                        className="max-h-16 max-w-full object-contain filter contrast-125"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-neutral-secondary italic">No asset uploaded</span>
                    )}
                    <span className="absolute bottom-1 right-2 text-[9px] font-mono text-neutral-secondary/70 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                      Signed URL
                    </span>
                  </div>

                  {sig.usagePermissions && (
                    <div className="text-xs text-neutral-secondary space-y-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-secondary/80">
                        Usage Scope
                      </span>
                      <p className="leading-relaxed bg-neutral-surface/30 p-2 rounded border border-neutral-subtle text-[11px] line-clamp-2">
                        {sig.usagePermissions}
                      </p>
                    </div>
                  )}
                </CardContent>

                <div className="px-5 py-3 bg-neutral-surface/40 border-t border-neutral-subtle flex items-center justify-between text-xs text-neutral-secondary">
                  <span className="font-mono text-[11px] text-neutral-secondary">
                    {sig.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs py-1 px-2 h-auto text-neutral-secondary hover:text-brand-violet"
                      title="Edit Signatory"
                      onClick={() => openEditModal(sig)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-xs py-1 px-2 h-auto ${
                        isActive
                          ? 'text-neutral-secondary hover:text-[#8C5800]'
                          : 'text-neutral-secondary hover:text-emerald-700'
                      }`}
                      title={isActive ? 'Deactivate Signatory' : 'Activate Signatory'}
                      onClick={() => setSignatoryToToggle(sig)}
                    >
                      {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Signatory Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsModalOpen(false);
        }}
        title={editingSignatory ? 'Edit Authorized Signatory' : 'Add Authorized Signatory'}
        description={
          editingSignatory
            ? 'Update designation, permissions, or replace the signature asset.'
            : 'Configure an official authorized to sign Namdapha House certificates.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSaveSignatory} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Dr. K. Ramaswamy"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Official Designation"
            placeholder="e.g. Faculty Advisor, Namdapha House"
            required
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />

          {editingSignatory && (
            <Select
              label="Account Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active (Available for Events)' },
                { value: 'inactive', label: 'Inactive (Revoked / Past Signatory)' },
              ]}
            />
          )}

          <Input
            label="Usage Scope / Permissions (Optional)"
            placeholder="e.g. Authorized for Pan-Namdapha competitions and Merit awards"
            value={permissions}
            onChange={(e) => setPermissions(e.target.value)}
          />

          {/* Signature Asset File Upload */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Signature Asset Image {!editingSignatory && <span className="text-[#A52A2A]">*</span>}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-subtle hover:border-brand-violet/50 rounded-lg p-4 bg-white text-center cursor-pointer transition-colors space-y-2"
            >
              {filePreview ? (
                <div className="space-y-2">
                  <div className="p-2 bg-neutral-surface/60 rounded border border-neutral-subtle inline-block max-w-full">
                    <img
                      src={filePreview}
                      alt="Signature preview"
                      className="max-h-20 max-w-xs mx-auto object-contain filter contrast-125"
                    />
                  </div>
                  <div className="text-[11px] text-neutral-secondary">
                    {selectedFile ? `${selectedFile.name} (Ready to upload)` : 'Current signature asset on file'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    leftIcon={<RefreshCw className="w-3 h-3" />}
                  >
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  <FileImage className="w-8 h-8 text-brand-violet mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-neutral-main">Select Transparent PNG</p>
                  <p className="text-[11px] text-neutral-secondary">
                    High contrast on transparent background (Recommended: ~600 × 200px)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              {editingSignatory ? 'Update Signatory' : 'Save Signatory Asset'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!signatoryToToggle}
        onClose={() => setSignatoryToToggle(null)}
        onConfirm={handleStatusToggleConfirm}
        title={
          signatoryToToggle?.status === 'active'
            ? 'Deactivate Signatory?'
            : 'Activate Signatory?'
        }
        message={
          signatoryToToggle?.status === 'active'
            ? `Deactivating "${signatoryToToggle?.name}" will prevent assigning this signature to new events or categories. Previously issued certificates will preserve this signature.`
            : `Activating "${signatoryToToggle?.name}" will make them available for assignment across events and award categories.`
        }
        confirmLabel={signatoryToToggle?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={signatoryToToggle?.status === 'active' ? 'warning' : 'info'}
        isLoading={isToggling}
      />
    </div>
  );
};

