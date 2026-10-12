import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Award,
  PenTool,
  ArrowLeft,
  Edit2,
  Plus,
  Trash2,
  FileCheck2,
  Layers,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { portalService } from '../../services';
import {
  Event,
  AwardCategory,
  EventSignatory,
  Template,
  Signatory,
  EventCategory,
  EventScope,
  EventStatus,
} from '../../types';
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

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [eventSignatories, setEventSignatories] = useState<EventSignatory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableSignatories, setAvailableSignatories] = useState<Signatory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'signatories'>('overview');

  // Edit Event Modal
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<EventCategory>('Technology');
  const [editScope, setEditScope] = useState<EventScope>('Pan-Namdapha');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<EventStatus>('draft');
  const [editTemplateId, setEditTemplateId] = useState('');
  const [editApproval, setEditApproval] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Add / Edit Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AwardCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryTemplateId, setCategoryTemplateId] = useState('');
  const [categoryStatus, setCategoryStatus] = useState<'active' | 'inactive'>('active');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Assign Signatory Modal
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [selectedSignatoryId, setSelectedSignatoryId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDisplayOrder, setSelectedDisplayOrder] = useState('1');
  const [isSavingSignatory, setIsSavingSignatory] = useState(false);

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    action: async () => {},
  });

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [evt, cats, esigs, tpls, sigs] = await Promise.all([
        portalService.getEventById(id),
        portalService.getAwardCategories(id),
        portalService.getEventSignatories(id),
        portalService.getTemplates(),
        portalService.getSignatories(),
      ]);

      setEvent(evt);
      setCategories(cats);
      setEventSignatories(esigs);
      setTemplates(tpls);
      setAvailableSignatories(sigs.filter((s) => s.status === 'active'));

      if (evt) {
        setEditName(evt.name);
        setEditDesc(evt.description || '');
        setEditCategory(evt.category);
        setEditScope(evt.scope);
        setEditDate(evt.eventDate);
        setEditStatus(evt.status);
        setEditTemplateId(evt.defaultTemplateId || '');
        setEditApproval(evt.issuanceApprovalRequired);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName.trim()) return;

    setIsSavingEvent(true);
    try {
      const updated = await portalService.updateEvent(id, {
        name: editName.trim(),
        description: editDesc.trim(),
        category: editCategory,
        scope: editScope,
        eventDate: editDate,
        status: editStatus,
        defaultTemplateId: editTemplateId || undefined,
        issuanceApprovalRequired: editApproval,
      });
      setEvent(updated);
      setIsEditEventOpen(false);
    } catch (err: any) {
      alert(`Error updating event: ${err.message}`);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleStatusChange = (newStatus: EventStatus) => {
    if (!id || !event) return;
    if (newStatus === 'archived') {
      setConfirmDialog({
        isOpen: true,
        title: 'Archive Event?',
        message:
          'Archiving this event will prevent any new certificate issuance. Existing issued certificates remain permanently verifiable.',
        variant: 'danger',
        action: async () => {
          await portalService.archiveEvent(id);
          await loadData();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Change Status to ${newStatus.toUpperCase()}?`,
      message: `Are you sure you want to transition this event status to ${newStatus}?`,
      variant: 'info',
      action: async () => {
        await portalService.updateEvent(id, { status: newStatus });
        await loadData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Category Operations
  const handleOpenCategoryModal = (cat?: AwardCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
      setCategoryDesc(cat.description || '');
      setCategoryTemplateId(cat.templateId || '');
      setCategoryStatus(cat.status);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDesc('');
      setCategoryTemplateId('');
      setCategoryStatus('active');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !categoryName.trim()) return;

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await portalService.updateAwardCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim() || undefined,
          templateId: categoryTemplateId || undefined,
          status: categoryStatus,
        });
      } else {
        await portalService.createAwardCategory({
          eventId: id,
          name: categoryName.trim(),
          description: categoryDesc.trim() || undefined,
          templateId: categoryTemplateId || undefined,
          status: categoryStatus,
        });
      }
      setIsCategoryModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Error saving category: ${err.message}`);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: AwardCategory) => {
    setConfirmDialog({
      isOpen: true,
      title: `Remove Category: ${cat.name}?`,
      message:
        'If certificates reference this category, it will be safely deactivated to maintain historical verification records.',
      variant: 'warning',
      action: async () => {
        await portalService.deleteAwardCategory(cat.id);
        await loadData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Signatory Operations
  const handleAssignSignatory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedSignatoryId) return;

    setIsSavingSignatory(true);
    try {
      await portalService.addEventSignatory({
        eventId: id,
        signatoryId: selectedSignatoryId,
        awardCategoryId: selectedCategoryId || undefined,
        displayOrder: parseInt(selectedDisplayOrder, 10) || 1,
      });
      setIsSignatoryModalOpen(false);
      setSelectedSignatoryId('');
      setSelectedCategoryId('');
      await loadData();
    } catch (err: any) {
      alert(`Error assigning signatory: ${err.message}`);
    } finally {
      setIsSavingSignatory(false);
    }
  };

  const handleRemoveSignatory = (esigId: string, sigName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: `Remove Signatory: ${sigName}?`,
      message: 'This official will no longer be attached to future certificate issuances for this event.',
      variant: 'warning',
      action: async () => {
        await portalService.removeEventSignatory(esigId);
        await loadData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading event configuration..." />;
  }

  if (!event) {
    return (
      <EmptyState
        icon={Calendar}
        title="Event Not Found"
        description="The requested event does not exist in the official registry."
        actionLabel="Back to Events"
        onAction={() => navigate('/admin/events')}
      />
    );
  }

  const isArchived = event.status === 'archived';

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Events Management', href: '/admin/events' },
          { label: event.name },
        ]}
      />

      {/* Archival Security Warning */}
      {isArchived && (
        <div className="p-4 bg-neutral-surface border-l-4 border-[#8C5800] rounded-r-lg flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-[#8C5800] shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-neutral-secondary">
            <span className="font-bold text-neutral-main uppercase tracking-wider">
              Event Archived — Issuance Prohibited
            </span>
            <p className="leading-relaxed">
              Per security policy, archived events cannot receive new certificates. All previously issued certificates remain permanently valid in the public registry.
            </p>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-subtle">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/events')}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
            <Badge
              variant={
                event.status === 'active'
                  ? 'info'
                  : event.status === 'completed'
                  ? 'success'
                  : event.status === 'archived'
                  ? 'neutral'
                  : 'pending'
              }
              size="sm"
            >
              {event.status.toUpperCase()}
            </Badge>
            <Badge variant="neutral" size="sm">
              {event.category}
            </Badge>
            <Badge variant="neutral" size="sm">
              {event.scope}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-main">
            {event.name}
          </h1>
          <p className="text-xs text-neutral-secondary">
            Event Date: <span className="font-semibold text-neutral-main font-mono">{event.eventDate}</span> • Created by {event.createdByName}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select
            value={event.status}
            onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={() => setIsEditEventOpen(true)}
          >
            Edit Event
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isArchived}
            leftIcon={<Award className="w-4 h-4" />}
            onClick={() => navigate(`/admin/certificates?eventId=${event.id}`)}
          >
            Issue Certificates
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-subtle gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-brand-violet text-brand-violet'
              : 'border-transparent text-neutral-secondary hover:text-neutral-main'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Overview & Template</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-brand-violet text-brand-violet'
              : 'border-transparent text-neutral-secondary hover:text-neutral-main'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Award Categories ({categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('signatories')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'signatories'
              ? 'border-brand-violet text-brand-violet'
              : 'border-transparent text-neutral-secondary hover:text-neutral-main'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Authorized Signatories ({eventSignatories.length})</span>
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-base font-bold text-neutral-main">Event Information</h3>
                <p className="text-sm text-neutral-secondary leading-relaxed">
                  {event.description || 'No detailed description provided for this event.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-subtle text-xs">
                  <div className="space-y-1">
                    <span className="text-neutral-secondary font-medium uppercase tracking-wider text-[11px]">Category</span>
                    <p className="text-sm font-semibold text-neutral-main">{event.category}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-secondary font-medium uppercase tracking-wider text-[11px]">Scope</span>
                    <p className="text-sm font-semibold text-neutral-main">{event.scope}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-secondary font-medium uppercase tracking-wider text-[11px]">Event Date</span>
                    <p className="text-sm font-mono font-semibold text-neutral-main">{event.eventDate}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-secondary font-medium uppercase tracking-wider text-[11px]">Issuance Approval</span>
                    <p className="text-sm font-semibold text-neutral-main">
                      {event.issuanceApprovalRequired ? 'Mandatory (Reviewer Required)' : 'Direct Admin Issuance'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-neutral-main">Default Template Binding</h3>
                  <Link
                    to="/admin/templates"
                    className="text-xs text-brand-violet font-semibold hover:underline flex items-center gap-1"
                  >
                    Template Library <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {event.defaultTemplateId ? (
                  <div className="p-4 rounded-lg bg-neutral-surface/60 border border-neutral-subtle flex items-start gap-4">
                    <div className="w-16 h-12 bg-brand-midnight text-brand-gold rounded flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-neutral-main">
                        {event.defaultTemplateName || 'Official Design Template'}
                      </h4>
                      <p className="text-xs text-neutral-secondary">
                        This template is automatically applied to all categories unless overridden.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-neutral-subtle text-center text-xs text-neutral-secondary space-y-2">
                    <p>No default template selected. Award categories can specify custom templates.</p>
                    <Button variant="outline" size="sm" onClick={() => setIsEditEventOpen(true)}>
                      Assign Default Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-base font-bold text-neutral-main">Workflow Quick Stats</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-subtle">
                    <span className="text-neutral-secondary">Award Categories</span>
                    <span className="font-bold text-neutral-main">{categories.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-subtle">
                    <span className="text-neutral-secondary">Authorized Signatories</span>
                    <span className="font-bold text-neutral-main">{eventSignatories.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-subtle">
                    <span className="text-neutral-secondary">Review Requirement</span>
                    <span className="font-semibold text-brand-violet">
                      {event.issuanceApprovalRequired ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-neutral-secondary">Issuance Status</span>
                    <span className={isArchived ? 'text-[#A52A2A] font-bold' : 'text-[#17653C] font-bold'}>
                      {isArchived ? 'Locked' : 'Open'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Award Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-base font-bold text-neutral-main">Award Categories</h3>
              <p className="text-xs text-neutral-secondary">
                Configure positions and participation awards (e.g. Winner, Runner-up, Participation)
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenCategoryModal()}
            >
              Add Category
            </Button>
          </div>

          {categories.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No Award Categories"
              description="Define categories like First Place, Runner-up, or Certificate of Participation."
              actionLabel="Add Category"
              onAction={() => handleOpenCategoryModal()}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <Card key={cat.id} className="hover:border-brand-violet/40 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-neutral-main">{cat.name}</h4>
                          <Badge variant={cat.status === 'active' ? 'success' : 'neutral'} size="sm">
                            {cat.status}
                          </Badge>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-neutral-secondary mt-1">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="p-1 h-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-neutral-secondary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 h-auto hover:text-[#A52A2A]"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-neutral-secondary" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-subtle flex items-center justify-between text-xs text-neutral-secondary">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-brand-violet" />
                        Template: <span className="font-semibold text-neutral-main">{cat.templateName || 'Event Default'}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Authorized Signatories */}
      {activeTab === 'signatories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-base font-bold text-neutral-main">Event Signatories</h3>
              <p className="text-xs text-neutral-secondary">
                Assign authorized officials and manage signature ordering on generated certificates
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsSignatoryModalOpen(true)}
            >
              Assign Signatory
            </Button>
          </div>

          {eventSignatories.length === 0 ? (
            <EmptyState
              icon={PenTool}
              title="No Signatories Bound"
              description="Assign officials whose signatures will be included on certificates for this event."
              actionLabel="Assign Signatory"
              onAction={() => setIsSignatoryModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventSignatories.map((esig) => (
                <Card key={esig.id} className="hover:border-brand-violet/40 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <Badge variant="neutral" size="sm">
                          Order #{esig.displayOrder}
                        </Badge>
                        <h4 className="text-sm font-bold text-neutral-main pt-1">{esig.signatoryName}</h4>
                        <p className="text-xs font-medium text-brand-violet">{esig.signatoryDesignation}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSignatory(esig.id, esig.signatoryName)}
                        className="p-1 h-auto hover:text-[#A52A2A]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-neutral-secondary" />
                      </Button>
                    </div>

                    {/* Private Signature Image Preview Canvas */}
                    <div className="p-2 bg-neutral-surface/60 rounded border border-neutral-subtle flex items-center justify-center min-h-[60px]">
                      {esig.signatureAssetUrl ? (
                        <img
                          src={esig.signatureAssetUrl}
                          alt={esig.signatoryName}
                          className="max-h-12 max-w-full object-contain filter contrast-125"
                        />
                      ) : (
                        <span className="text-xs text-neutral-secondary">Secure signature token loaded</span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-subtle text-xs text-neutral-secondary">
                      <span>Scope: <span className="font-semibold text-neutral-main">{esig.awardCategoryName || 'All Categories'}</span></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      <Modal
        isOpen={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
        title="Edit Event Details"
        description="Update official competition configuration and issuance settings."
        maxWidth="md"
      >
        <form onSubmit={handleUpdateEvent} className="space-y-4">
          <Input
            label="Event Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as EventCategory)}
              options={[
                { value: 'Sports', label: 'Sports' },
                { value: 'Impact', label: 'Impact' },
                { value: 'Cultural', label: 'Cultural' },
                { value: 'Technology', label: 'Technology' },
                { value: 'Debate', label: 'Debate' },
                { value: 'Music', label: 'Music' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <Select
              label="Scope"
              value={editScope}
              onChange={(e) => setEditScope(e.target.value as EventScope)}
              options={[
                { value: 'Pan-Namdapha', label: 'Pan-Namdapha' },
                { value: 'House-level', label: 'House-level' },
                { value: 'Inter-house', label: 'Inter-house' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Event Date"
              type="date"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as EventStatus)}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          <Select
            label="Default Certificate Template"
            value={editTemplateId}
            onChange={(e) => setEditTemplateId(e.target.value)}
            options={[
              { value: '', label: 'None (Select per category)' },
              ...templates.map((t) => ({ value: t.id, label: `${t.name} (${t.status})` })),
            ]}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Description
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-sm text-neutral-main focus-visible:outline-2 focus-visible:outline-brand-violet"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="edit-approval"
              checked={editApproval}
              onChange={(e) => setEditApproval(e.target.checked)}
              className="rounded border-neutral-subtle text-brand-violet focus:ring-brand-violet"
            />
            <label htmlFor="edit-approval" className="text-xs text-neutral-main font-medium cursor-pointer">
              Require Reviewer approval before certificate batches can be issued
            </label>
          </div>

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEditEventOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSavingEvent}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Award Category' : 'Create Award Category'}
        description="Specify prize tier or participation category for this event."
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. First Place (Winner), Finalist, Participation"
            required
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />

          <Select
            label="Custom Template (Optional)"
            value={categoryTemplateId}
            onChange={(e) => setCategoryTemplateId(e.target.value)}
            options={[
              { value: '', label: 'Use Event Default Template' },
              ...templates.map((t) => ({ value: t.id, label: `${t.name} (${t.status})` })),
            ]}
          />

          <Select
            label="Category Status"
            value={categoryStatus}
            onChange={(e) => setCategoryStatus(e.target.value as 'active' | 'inactive')}
            options={[
              { value: 'active', label: 'Active (Available for issuance)' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              placeholder="e.g. Awarded to highest scoring team in algorithm round..."
              className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-sm text-neutral-main focus-visible:outline-2 focus-visible:outline-brand-violet"
            />
          </div>

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSavingCategory}>
              {editingCategory ? 'Save Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Signatory Modal */}
      <Modal
        isOpen={isSignatoryModalOpen}
        onClose={() => setIsSignatoryModalOpen(false)}
        title="Assign Signatory to Event"
        description="Bind an authorized official to this event and define signature display order."
        maxWidth="md"
      >
        <form onSubmit={handleAssignSignatory} className="space-y-4">
          <Select
            label="Official Signatory"
            required
            value={selectedSignatoryId}
            onChange={(e) => setSelectedSignatoryId(e.target.value)}
            options={[
              { value: '', label: 'Select an authorized official...' },
              ...availableSignatories.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.designation})`,
              })),
            ]}
          />

          <Select
            label="Category Scope"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            options={[
              { value: '', label: 'All Categories (Global for this event)' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label="Display Order"
            value={selectedDisplayOrder}
            onChange={(e) => setSelectedDisplayOrder(e.target.value)}
            options={[
              { value: '1', label: '#1 Primary Signature' },
              { value: '2', label: '#2 Secondary Signature' },
              { value: '3', label: '#3 Tertiary Signature' },
            ]}
          />

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsSignatoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSavingSignatory}>
              Bind Signatory
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
};
