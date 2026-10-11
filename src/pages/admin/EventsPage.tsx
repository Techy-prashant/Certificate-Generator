import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  Search
} from 'lucide-react';
import { portalService } from '../../services';
import { Event, EventCategory, EventScope } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<EventCategory>('Technology');
  const [newEventScope, setNewEventScope] = useState<EventScope>('Pan-Namdapha');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventApproval, setNewEventApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await portalService.getEvents();
      setEvents(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setIsSubmitting(true);
    try {
      await portalService.createEvent({
        name: newEventName.trim(),
        category: newEventCategory,
        scope: newEventScope,
        eventDate: newEventDate || new Date().toISOString().split('T')[0],
        description: newEventDesc.trim(),
        status: 'active',
        issuanceApprovalRequired: newEventApproval,
      });
      setIsModalOpen(false);
      setNewEventName('');
      setNewEventDesc('');
      await fetchEvents();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Events Management' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Events & Competitions</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Configure House events, award categories, and approval criteria for issuance
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Event
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search events by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'draft', label: 'Draft' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading events..." />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description={searchTerm ? `No events match "${searchTerm}".` : "No events created yet."}
          actionLabel="Create First Event"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((evt) => (
            <Card key={evt.id} className="hover:border-brand-violet/40 transition-colors flex flex-col">
              <CardContent className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
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
                    <h3 className="text-base font-bold text-neutral-main pt-1 leading-snug">
                      {evt.name}
                    </h3>
                  </div>
                </div>

                {evt.description && (
                  <p className="text-xs text-neutral-secondary line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>
                )}

                <div className="space-y-1.5 pt-2 border-t border-neutral-subtle text-xs text-neutral-secondary">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Category:</span>
                    <span className="text-neutral-main font-semibold">{evt.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Scope:</span>
                    <span className="text-neutral-main">{evt.scope}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Event Date:</span>
                    <span className="text-neutral-main font-mono">{evt.eventDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Review Approval:</span>
                    <span className={evt.issuanceApprovalRequired ? 'text-[#8C5800] font-semibold' : 'text-neutral-secondary'}>
                      {evt.issuanceApprovalRequired ? 'Mandatory' : 'Direct'}
                    </span>
                  </div>
                </div>
              </CardContent>

              <div className="px-5 py-3 bg-neutral-surface/40 border-t border-neutral-subtle flex items-center justify-between text-xs text-neutral-secondary">
                <span>By {evt.createdByName}</span>
                <span className="font-mono text-[11px] text-brand-violet font-semibold">
                  {evt.id}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Event"
        description="Define an official Namdapha competition or student initiative."
        maxWidth="md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input
            label="Event Name"
            placeholder="e.g. Namdapha Annual Sports Meet 2026"
            required
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={newEventCategory}
              onChange={(e) => setNewEventCategory(e.target.value as EventCategory)}
              options={[
                { value: 'Technology', label: 'Technology' },
                { value: 'Debate', label: 'Debate' },
                { value: 'Cultural', label: 'Cultural' },
                { value: 'Music', label: 'Music' },
                { value: 'Sports', label: 'Sports' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <Select
              label="Scope"
              value={newEventScope}
              onChange={(e) => setNewEventScope(e.target.value as EventScope)}
              options={[
                { value: 'Pan-Namdapha', label: 'Pan-Namdapha' },
                { value: 'House-level', label: 'House-level' },
                { value: 'Inter-house', label: 'Inter-house' },
              ]}
            />
          </div>

          <Input
            label="Event Date"
            type="date"
            required
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={newEventDesc}
              onChange={(e) => setNewEventDesc(e.target.value)}
              placeholder="Provide event context and criteria..."
              className="block w-full rounded-md border border-neutral-subtle bg-white p-2.5 text-sm text-neutral-main placeholder:text-neutral-secondary/60 focus-visible:outline-2 focus-visible:outline-brand-violet transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="approval-req"
              checked={newEventApproval}
              onChange={(e) => setNewEventApproval(e.target.checked)}
              className="rounded border-neutral-subtle text-brand-violet focus:ring-brand-violet"
            />
            <label htmlFor="approval-req" className="text-xs text-neutral-main font-medium cursor-pointer">
              Require Reviewer approval before bulk certificate batches can be issued
            </label>
          </div>

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Save Event Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
