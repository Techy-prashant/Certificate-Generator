import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCode2,
  Search,
  Upload,
  Eye,
  SlidersHorizontal,
  CheckCircle,
  Archive,
  ArchiveRestore,
  AlertCircle,
  FileImage,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Edit2
} from 'lucide-react';
import { portalService } from '../../services';
import { Template } from '../../types';
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

export const TemplatesPage: React.FC = () => {
  const { success } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadOrientation, setUploadOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [uploadWidth, setUploadWidth] = useState<number>(297);
  const [uploadHeight, setUploadHeight] = useState<number>(210);
  const [uploadUnit, setUploadUnit] = useState<'mm' | 'px' | 'in'>('mm');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status & Delete Action Confirmation State
  const [templateToPublish, setTemplateToPublish] = useState<Template | null>(null);
  const [templateToArchive, setTemplateToArchive] = useState<Template | null>(null);
  const [templateToUnarchive, setTemplateToUnarchive] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await portalService.getTemplates();
      setTemplates(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setUploadError('Please select a PNG or JPG background image.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto-detect dimensions and suggest orientation
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      if (img.naturalWidth >= img.naturalHeight) {
        setUploadOrientation('landscape');
        setUploadWidth(297);
        setUploadHeight(210);
        setUploadUnit('mm');
      } else {
        setUploadOrientation('portrait');
        setUploadWidth(210);
        setUploadHeight(297);
        setUploadUnit('mm');
      }
    };
    img.src = url;

    if (!uploadName) {
      // Clean up filename as default title
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a certificate background image.');
      return;
    }
    if (!uploadName.trim()) {
      setUploadError('Please enter a template title.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      await portalService.createTemplate(
        {
          name: uploadName.trim(),
          category: uploadCategory,
          description: uploadDescription.trim() || undefined,
          orientation: uploadOrientation,
          pageWidth: uploadWidth,
          pageHeight: uploadHeight,
          pageUnit: uploadUnit,
        },
        selectedFile!
      );

      // Reset and close
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setImageDimensions(null);
      setUploadName('');
      setUploadDescription('');
      await fetchTemplates();
      success('Template uploaded and added to studio!');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload and create template record.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublishConfirm = async () => {
    if (!templateToPublish) return;
    setIsStatusUpdating(true);
    try {
      await portalService.updateTemplateStatus(templateToPublish.id, 'published');
      setTemplateToPublish(null);
      await fetchTemplates();
      success('Template published for official issuance.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!templateToArchive) return;
    setIsStatusUpdating(true);
    try {
      await portalService.updateTemplateStatus(templateToArchive.id, 'archived');
      setTemplateToArchive(null);
      await fetchTemplates();
      success('Template moved to Archived Templates.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleUnarchiveConfirm = async () => {
    if (!templateToUnarchive) return;
    setIsStatusUpdating(true);
    try {
      await portalService.updateTemplateStatus(templateToUnarchive.id, 'published');
      setTemplateToUnarchive(null);
      await fetchTemplates();
      success('Template un-archived and restored to active library!');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await portalService.deleteTemplate(templateToDelete.id);
      setTemplateToDelete(null);
      await fetchTemplates();
      success('Template permanently removed.');
    } catch (err: any) {
      alert(`Failed to delete template: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditModal = (tpl: Template, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTemplateToEdit(tpl);
    setEditName(tpl.name);
    setEditDescription(tpl.description || '');
    setEditCategory(tpl.category || 'General');
    setEditError(null);
  };

  const handleSaveEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateToEdit) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Template name cannot be empty.');
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await portalService.updateTemplate(templateToEdit.id, {
        name: trimmed,
        description: editDescription.trim(),
        category: editCategory.trim() || 'General',
      });
      setTemplateToEdit(null);
      await fetchTemplates();
      success('Template details updated successfully!');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update template.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatTemplateDate = (tpl: Template) => {
    const dateStr = tpl.updatedAt || tpl.publishedAt || tpl.createdAt;
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const archivedTemplates = templates.filter((t) => t.status === 'archived');
  const activeTemplates = templates.filter((t) => t.status !== 'archived');

  const currentPool = viewMode === 'archived' ? archivedTemplates : activeTemplates;

  const filteredTemplates = currentPool.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      viewMode === 'archived'
        ? true
        : statusFilter === 'all'
        ? true
        : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={
          viewMode === 'archived'
            ? [
                { label: 'Templates Library', onClick: () => setViewMode('active') },
                { label: 'Archived Templates' },
              ]
            : [{ label: 'Templates Library' }]
        }
      />

      {/* Main Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-main">
              {viewMode === 'archived' ? 'Archived Templates Vault' : 'Canva Templates & Layouts'}
            </h1>
            {viewMode === 'archived' && (
              <Badge variant="neutral" size="sm" className="bg-amber-100 text-amber-900 border-amber-300">
                {archivedTemplates.length} Archived
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            {viewMode === 'archived'
              ? 'Archived layouts withdrawn from active issuance. You can un-archive and restore them to active rotation, or delete permanently.'
              : 'Manage exported Canva artwork backgrounds, dimensions, orientations, and live dynamic fields'}
          </p>
        </div>

        {/* Buttons right next to each other */}
        <div className="flex items-center gap-2.5">
          {viewMode === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              className="group border-amber-500/40 hover:border-amber-600 bg-amber-500/5 hover:bg-amber-500/10 text-amber-900 font-semibold shadow-2xs transition-all"
              leftIcon={<Archive className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />}
              onClick={() => setViewMode('archived')}
            >
              <span>Archived Templates</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                {archivedTemplates.length}
              </span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-neutral-subtle hover:bg-neutral-surface font-semibold text-neutral-main shadow-2xs"
              leftIcon={<ArrowLeft className="w-4 h-4 text-brand-violet" />}
              onClick={() => setViewMode('active')}
            >
              Back to Active Templates
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => {
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
          >
            Upload Canva Design
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder={
              viewMode === 'archived'
                ? 'Search archived templates by name or category...'
                : 'Search templates by name or category...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        {viewMode === 'active' && (
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Lifecycle Statuses' },
                { value: 'published', label: 'Published (Active)' },
                { value: 'draft', label: 'Draft' },
              ]}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Loading templates library..." />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={viewMode === 'archived' ? Archive : FileCode2}
          title={viewMode === 'archived' ? 'No archived templates' : 'No templates found'}
          description={
            viewMode === 'archived'
              ? 'No templates have been archived yet. Active templates can be moved here anytime from the library.'
              : 'Upload a high-resolution PNG or JPG background exported from Canva to register your first certificate layout.'
          }
          actionLabel={viewMode === 'archived' ? 'View Active Templates' : 'Upload Canva Template'}
          onAction={() => {
            if (viewMode === 'archived') {
              setViewMode('active');
            } else {
              setIsUploadModalOpen(true);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl) => {
            const isArchived = tpl.status === 'archived';
            const isPublished = tpl.status === 'published';
            const isDraft = tpl.status === 'draft';

            return (
              <Card
                key={tpl.id}
                data-version={tpl.versionNumber}
                className={`overflow-hidden transition-all rounded-2xl mac-card flex flex-col border ${
                  isArchived
                    ? 'opacity-85 bg-amber-50/20 border-amber-200/80 hover:border-amber-400 hover:shadow-mac-panel'
                    : 'bg-white/90 backdrop-blur-xs border-neutral-subtle/80 hover:border-brand-violet/40 hover:shadow-mac-panel'
                }`}
              >
                {/* Visual Preview Container */}
                <div className="relative aspect-[1.414/1] bg-neutral-surface border-b border-neutral-subtle overflow-hidden flex items-center justify-center group">
                  <img
                    src={tpl.backgroundUrl}
                    alt={tpl.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge
                      variant={
                        isPublished ? 'success' : isDraft ? 'pending' : 'neutral'
                      }
                      size="sm"
                      className="capitalize"
                    >
                      {tpl.status}
                    </Badge>
                    <span className="text-[10px] bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md font-mono text-neutral-secondary border border-neutral-subtle/70 shadow-2xs">
                      Updated {formatTemplateDate(tpl)}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-brand-midnight/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs font-semibold shadow"
                      leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/admin/templates/${tpl.id}/studio`)}
                    >
                      Studio Editor
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/95 text-neutral-main hover:bg-white text-xs font-semibold shadow"
                      leftIcon={<Eye className="w-3.5 h-3.5 text-brand-violet" />}
                      onClick={() => setSelectedTemplate(tpl)}
                    >
                      Inspect
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-neutral-secondary">
                      <span className="font-semibold text-brand-violet">{tpl.category || 'General'}</span>
                      <span className="font-mono uppercase text-[11px]">
                        {tpl.pageWidth} × {tpl.pageHeight} {tpl.pageUnit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-neutral-main leading-snug line-clamp-1 flex-1" title={tpl.name}>
                        {tpl.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(tpl, e)}
                        className="p-1 rounded text-neutral-secondary hover:text-brand-violet hover:bg-brand-violet/10 transition-colors shrink-0"
                        title="Edit template name & details"
                        aria-label={`Edit ${tpl.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-neutral-secondary line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-neutral-subtle text-xs text-neutral-secondary">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-brand-violet" />
                        <span>{tpl.fieldConfiguration?.length || 0} Dynamic Fields</span>
                      </span>
                      <span className="font-mono capitalize text-[11px]">
                        {tpl.orientation}
                      </span>
                    </div>

                    {/* Action Bar with Un-archive and Delete buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-subtle/80">
                      <span className="text-[11px] font-mono text-neutral-secondary">
                        ID: {tpl.id.slice(0, 8)}...
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Un-archive button for archived templates */}
                        {isArchived ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5 h-auto text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 border-emerald-300 font-semibold shadow-2xs flex items-center gap-1"
                            leftIcon={<ArchiveRestore className="w-3.5 h-3.5" />}
                            onClick={() => setTemplateToUnarchive(tpl)}
                            title="Un-archive and move back to active templates"
                          >
                            Un-archive
                          </Button>
                        ) : null}

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1 px-2 h-auto text-brand-violet border-brand-violet/30 hover:bg-brand-violet/5 font-semibold"
                          onClick={() => navigate(`/admin/templates/${tpl.id}/studio`)}
                        >
                          Studio
                        </Button>

                        {isDraft && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5 h-auto text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                            leftIcon={<CheckCircle className="w-3 h-3" />}
                            onClick={() => setTemplateToPublish(tpl)}
                          >
                            Publish
                          </Button>
                        )}

                        {!isArchived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs py-1 px-2 h-auto text-neutral-secondary hover:text-amber-800 hover:bg-amber-50"
                            title="Archive Template"
                            onClick={() => setTemplateToArchive(tpl)}
                          >
                            <Archive className="w-3.5 h-3.5 text-amber-600" />
                          </Button>
                        )}

                        {/* Delete Button to remove any template */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs py-1 px-2 h-auto text-neutral-secondary hover:text-red-600 hover:bg-red-50"
                          title="Delete Template"
                          onClick={() => setTemplateToDelete(tpl)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inspect Template Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          description={`${selectedTemplate.status.toUpperCase()} • Updated ${formatTemplateDate(selectedTemplate)} • ${selectedTemplate.orientation} (${selectedTemplate.pageWidth} × ${selectedTemplate.pageHeight} ${selectedTemplate.pageUnit})`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-neutral-secondary">
                Storage: {selectedTemplate.backgroundStoragePath || 'Managed in template-backgrounds bucket'}
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="relative aspect-[1.414/1] bg-neutral-surface rounded-lg border border-neutral-subtle overflow-hidden">
              <img
                src={selectedTemplate.backgroundUrl}
                alt={selectedTemplate.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                  Active Dynamic Field Map ({selectedTemplate.fieldConfiguration?.length || 0} fields)
                </h4>
                <Badge variant="neutral" size="sm">
                  Interactive Studio: Phase 4
                </Badge>
              </div>

              {!selectedTemplate.fieldConfiguration || selectedTemplate.fieldConfiguration.length === 0 ? (
                <div className="p-4 border border-dashed border-neutral-subtle rounded-md text-center text-xs text-neutral-secondary">
                  No dynamic field placements configured yet. Field coordinates and typography can be customized in Phase 4 Template Studio.
                </div>
              ) : (
                <div className="border border-neutral-subtle rounded-md divide-y divide-neutral-subtle text-xs max-h-48 overflow-y-auto">
                  {selectedTemplate.fieldConfiguration.map((f) => (
                    <div key={f.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-neutral-main">{f.name}</span>
                        <span className="text-neutral-secondary ml-2 font-mono text-[11px]">({f.type})</span>
                      </div>
                      <div className="text-neutral-secondary font-mono text-[11px]">
                        x:{f.x} y:{f.y} | size:{f.fontSize}px | {f.alignment}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Canva Template Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!isUploading) setIsUploadModalOpen(false);
        }}
        title="Upload Canva Certificate Design"
        description="Select a high-resolution PNG or JPG background exported from Canva to create a new template."
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* File Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              previewUrl
                ? 'border-brand-violet/40 bg-brand-violet/5'
                : 'border-neutral-subtle hover:border-brand-violet/50 bg-neutral-surface/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-3">
                <div className="max-h-48 max-w-sm mx-auto overflow-hidden rounded border border-neutral-subtle shadow-xs">
                  <img
                    src={previewUrl}
                    alt="Canva Background Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-xs text-neutral-main font-medium">
                  {selectedFile?.name} ({(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)
                  {imageDimensions && (
                    <span className="text-neutral-secondary block font-mono text-[11px] mt-0.5">
                      Natural Resolution: {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Change Background Image
                </Button>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <FileImage className="w-10 h-10 text-brand-violet mx-auto opacity-80" />
                <div>
                  <p className="text-sm font-semibold text-neutral-main">Click to select Canva design</p>
                  <p className="text-xs text-neutral-secondary mt-0.5">PNG or JPG up to 15MB (Landscape or Portrait)</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Template Name"
              placeholder="e.g. Namdapha Honor Certificate 2026"
              required
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />

            <Select
              label="Category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              options={[
                { value: 'General', label: 'General' },
                { value: 'Merit', label: 'Merit & Achievement' },
                { value: 'Participation', label: 'Participation' },
                { value: 'Sports', label: 'Sports & Athletics' },
                { value: 'Cultural', label: 'Cultural & Arts' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Orientation"
              value={uploadOrientation}
              onChange={(e) => {
                const val = e.target.value as 'landscape' | 'portrait';
                setUploadOrientation(val);
                if (val === 'landscape') {
                  setUploadWidth(297);
                  setUploadHeight(210);
                } else {
                  setUploadWidth(210);
                  setUploadHeight(297);
                }
              }}
              options={[
                { value: 'landscape', label: 'Landscape' },
                { value: 'portrait', label: 'Portrait' },
              ]}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Width"
                type="number"
                value={uploadWidth}
                onChange={(e) => setUploadWidth(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Height"
                type="number"
                value={uploadHeight}
                onChange={(e) => setUploadHeight(parseFloat(e.target.value) || 0)}
              />
            </div>

            <Select
              label="Measurement Unit"
              value={uploadUnit}
              onChange={(e) => setUploadUnit(e.target.value as any)}
              options={[
                { value: 'mm', label: 'Millimeters (mm) - A4 Standard' },
                { value: 'px', label: 'Pixels (px)' },
                { value: 'in', label: 'Inches (in)' },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Design specifications, Canva project notes, or usage criteria..."
              className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-xs text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-2 focus-visible:outline-brand-violet transition-colors"
            />
          </div>

          <div className="p-3 bg-brand-violet-light/50 border border-brand-violet/20 rounded-md text-xs space-y-1">
            <span className="font-semibold text-brand-midnight block">Template Lifecycle:</span>
            <p className="text-neutral-secondary text-[11px] leading-relaxed">
              New templates are initially saved as <strong>Draft</strong>. Once finalized, publishing a template allows it to be assigned to official Events and Award Categories. Issued certificates preserve their snapshot permanently.
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isUploading}
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isUploading}
              disabled={!selectedFile}
            >
              Upload & Register Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!templateToPublish}
        onClose={() => setTemplateToPublish(null)}
        onConfirm={handlePublishConfirm}
        title="Publish Template?"
        message={`Publishing "${templateToPublish?.name}" will make it available for immediate certificate issuance.`}
        confirmLabel="Publish Template"
        variant="info"
        isLoading={isStatusUpdating}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!templateToArchive}
        onClose={() => setTemplateToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Template?"
        message={`Archiving "${templateToArchive?.name}" will move it to the Archived Templates vault and prevent future events from using it. Existing certificates issued with this template remain fully valid.`}
        confirmLabel="Archive Template"
        variant="warning"
        isLoading={isStatusUpdating}
      />

      {/* Un-archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!templateToUnarchive}
        onClose={() => setTemplateToUnarchive(null)}
        onConfirm={handleUnarchiveConfirm}
        title="Un-archive Template?"
        message={`Restore "${templateToUnarchive?.name}" to the active templates library? It will be immediately available for certificates and studio editing.`}
        confirmLabel="Un-archive Template"
        variant="info"
        isLoading={isStatusUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template Permanently?"
        message={`Are you sure you want to delete "${templateToDelete?.name}"? This will permanently remove the template and its field configuration. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={isDeleting}
      />
      {/* Edit Template Details Modal */}
      {templateToEdit && (
        <Modal
          isOpen={!!templateToEdit}
          onClose={() => setTemplateToEdit(null)}
          title="Edit Template Details"
          description="Update the name, category, and description for this certificate template."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditTemplate} className="space-y-4">
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-main mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Annual Tech Hackathon Certificate"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-main mb-1">
                Category
              </label>
              <Select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                options={[
                  { value: 'General', label: 'General / Standard' },
                  { value: 'Academic', label: 'Academic & Course Completion' },
                  { value: 'Technical', label: 'Technical & Hackathons' },
                  { value: 'Participation', label: 'Event Participation' },
                  { value: 'Excellence', label: 'Award of Excellence' },
                  { value: 'Workshop', label: 'Workshop & Bootcamp' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-main mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief summary of what this template is used for..."
                rows={3}
                className="w-full text-xs rounded-lg border border-neutral-subtle bg-white px-3 py-2 text-neutral-main focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-subtle">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplateToEdit(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingEdit}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

