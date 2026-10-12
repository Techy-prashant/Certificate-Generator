import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Archive,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { portalService } from '../../services';
import { Event, EventCategory, EventScope, EventStatus, Template } from '../../types';
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

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'status'>('date_desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('Technology');
  const [formScope, setFormScope] = useState<EventScope>('Pan-Namdapha');
  const [formStatus, setFormStatus] = useState<EventStatus>('active');
  const [formDate, setFormDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formApproval, setFormApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Archive Confirmation
  const [eventToArchive, setEventToArchive] = useState<Event | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, templatesData] = await Promise.all([
        portalService.getEvents(),
        portalService.getTemplates()
      ]);
      setEvents(eventsData);
      setTemplates(templatesData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormName('');
    setFormCategory('Technology');
    setFormScope('Pan-Namdapha');
    setFormStatus('active');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDesc('');
    setFormTemplateId('');
    setFormApproval(false);
    setIsModalOpen(true);
  };

  const openEditModal = (evt: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(evt);
    setFormName(evt.name);
    setFormCategory(evt.category);
    setFormScope(evt.scope);
    setFormStatus(evt.status);
    setFormDate(evt.eventDate);
    setFormDesc(evt.description || '');
    setFormTemplateId(evt.defaultTemplateId || '');
    setFormApproval(evt.issuanceApprovalRequired || false);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        await portalService.updateEvent(editingEvent.id, {
          name: formName.trim(),
          category: formCategory,
          scope: formScope,
          status: formStatus,
          eventDate: formDate,
          description: formDesc.trim(),
          defaultTemplateId: formTemplateId || undefined,
          issuanceApprovalRequired: formApproval,
        });
      } else {
        await portalService.createEvent({
          name: formName.trim(),
          category: formCategory,
          scope: formScope,
          status: formStatus,
          eventDate: formDate || new Date().toISOString().split('T')[0],
          description: formDesc.trim(),
          defaultTemplateId: formTemplateId || undefined,
          issuanceApprovalRequired: formApproval,
        });
      }
      setIsModalOpen(false);
      await fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!eventToArchive) return;
    setIsArchiving(true);
    try {
      await portalService.archiveEvent(eventToArchive.id);
      setEventToArchive(null);
      await fetchData();
    } finally {
      setIsArchiving(false);
    }
  };

  // Filter and Sort
  const processedEvents = events
    .filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return b.eventDate.localeCompare(a.eventDate);
      if (sortBy === 'date_asc') return a.eventDate.localeCompare(b.eventDate);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Events Management' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Events & Competitions</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Manage official House competitions, category taxonomies, template bindings, and issuance approvals
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Create Event
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search events by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full md:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            options={[
              { value: 'date_desc', label: 'Date: Newest First' },
              { value: 'date_asc', label: 'Date: Oldest First' },
              { value: 'name_asc', label: 'Name: Alphabetical' },
              { value: 'status', label: 'Status' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading events registry..." />
      ) : processedEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description={searchTerm ? `No events match "${searchTerm}".` : "No events created yet."}
          actionLabel="Create First Event"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {processedEvents.map((evt) => {
            const isArchived = evt.status === 'archived';
            return (
              <Card
                key={evt.id}
                className={`flex flex-col transition-all border ${
                  isArchived
                    ? 'opacity-80 bg-neutral-surface/30 border-neutral-subtle'
                    : 'hover:border-brand-violet/50 hover:shadow-sm bg-white'
                }`}
              >
                <CardContent className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            evt.status === 'active'
                              ? 'info'
                              : evt.status === 'completed'
                              ? 'success'
                              : evt.status === 'archived'
                              ? 'neutral'
                              : 'pending'
                          }
                          size="sm"
                        >
                          {evt.status}
                        </Badge>
                        <span className="text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider">
                          {evt.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-neutral-main pt-1 leading-snug line-clamp-1">
                        {evt.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => openEditModal(evt, e)}
                        title="Quick Edit Event"
                        className="p-1.5 text-neutral-secondary hover:text-brand-violet rounded hover:bg-neutral-surface transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isArchived && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToArchive(evt);
                          }}
                          title="Archive Event"
                          className="p-1.5 text-neutral-secondary hover:text-[#8C5800] rounded hover:bg-neutral-surface transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {evt.description && (
                    <p className="text-xs text-neutral-secondary line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-neutral-subtle text-xs text-neutral-secondary">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Scope:</span>
                      <span className="text-neutral-main font-medium">{evt.scope}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Event Date:</span>
                      <span className="text-neutral-main font-mono">{evt.eventDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Default Template:</span>
                      <span className="text-neutral-main truncate max-w-[150px]">
                        {evt.defaultTemplateName || (evt.defaultTemplateId ? 'Assigned' : 'None')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Review Approval:</span>
                      <span className={evt.issuanceApprovalRequired ? 'text-[#8C5800] font-semibold' : 'text-neutral-secondary'}>
                        {evt.issuanceApprovalRequired ? 'Mandatory' : 'Direct'}
                      </span>
                    </div>
                  </div>

                  {isArchived && (
                    <div className="p-2 rounded bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                      <span>Archived: Read-only event. Issuance locked.</span>
                    </div>
                  )}
                </CardContent>

                <div className="px-5 py-3 bg-neutral-surface/50 border-t border-neutral-subtle flex items-center justify-between text-xs">
                  <span className="text-neutral-secondary">By {evt.createdByName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-violet hover:text-brand-violet-hover hover:bg-brand-violet/5 font-semibold text-xs py-1 px-2.5 h-auto"
                    rightIcon={<ExternalLink className="w-3 h-3" />}
                    onClick={() => navigate(`/admin/events/${evt.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? "Edit Event Details" : "Create New Event"}
        description={editingEvent ? "Update event configuration and parameters." : "Define an official Namdapha competition or student initiative."}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <Input
            label="Event Name"
            placeholder="e.g. Namdapha Annual Tech Symposium 2026"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as EventCategory)}
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
              value={formScope}
              onChange={(e) => setFormScope(e.target.value as EventScope)}
              options={[
                { value: 'Pan-Namdapha', label: 'Pan-Namdapha' },
                { value: 'House-level', label: 'House-level' },
                { value: 'Inter-house', label: 'Inter-house' },
              ]}
            />
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as EventStatus)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Event Date"
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <Select
              label="Default Template (Optional)"
              value={formTemplateId}
              onChange={(e) => setFormTemplateId(e.target.value)}
              options={[
                { value: '', label: 'None (Set per Category)' },
                ...templates.map((t) => ({
                  value: t.id,
                  label: `${t.name} (v${t.versionNumber})`
                }))
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Provide event context and criteria..."
              className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-sm text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-2 focus-visible:outline-brand-violet transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="approval-req"
              checked={formApproval}
              onChange={(e) => setFormApproval(e.target.checked)}
              className="rounded border-neutral-subtle text-brand-violet focus:ring-brand-violet"
            />
            <label htmlFor="approval-req" className="text-xs text-neutral-main font-medium cursor-pointer">
              Require Reviewer approval before certificate batches can be issued
            </label>
          </div>

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              {editingEvent ? "Update Event" : "Save Event Record"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!eventToArchive}
        onClose={() => setEventToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Event?"
        message={`Archiving "${eventToArchive?.name}" will lock all certificate issuance for this event. Existing certificates will remain verifiable.`}
        confirmLabel="Archive Event"
        variant="warning"
        isLoading={isArchiving}
      />
    </div>
  );
};

