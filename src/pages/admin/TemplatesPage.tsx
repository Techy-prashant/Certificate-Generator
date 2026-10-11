import React, { useEffect, useState } from 'react';
import {
  FileCode2,
  Search,
  Upload,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { portalService } from '../../services';
import { Template } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await portalService.getTemplates();
        if (isMounted) setTemplates(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Templates Library' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Canva Templates & Layouts</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Manage exported Canva artwork, dynamic field mappings, and published versions
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Upload Canva Design
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Search templates by name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading templates library..." />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileCode2}
          title="No templates found"
          description="Upload a PNG or JPG background exported from Canva to begin configuring certificates."
          actionLabel="Upload Canva Template"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl) => (
            <Card key={tpl.id} className="overflow-hidden hover:border-brand-violet/50 transition-colors flex flex-col">
              {/* Visual Preview Container */}
              <div className="relative aspect-[1.414/1] bg-neutral-surface border-b border-neutral-subtle overflow-hidden flex items-center justify-center group">
                <img
                  src={tpl.backgroundUrl}
                  alt={tpl.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={tpl.status === 'published' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {tpl.status} • v{tpl.versionNumber}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-brand-midnight/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/90 backdrop-blur-xs text-xs font-semibold"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedTemplate(tpl)}
                  >
                    Inspect Config
                  </Button>
                </div>
              </div>

              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-secondary">
                    <span>{tpl.category || 'General'}</span>
                    <span className="font-mono uppercase">{tpl.pageWidth} × {tpl.pageHeight} {tpl.pageUnit}</span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-main leading-snug">
                    {tpl.name}
                  </h3>
                  {tpl.description && (
                    <p className="text-xs text-neutral-secondary line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-subtle flex items-center justify-between text-xs text-neutral-secondary">
                  <span className="flex items-center gap-1 font-medium">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-brand-violet" />
                    <span>{tpl.fieldConfiguration.length} Dynamic Fields</span>
                  </span>
                  <span className="font-mono text-[11px] text-neutral-secondary">
                    {tpl.orientation}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inspect Template Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          description={`Version ${selectedTemplate.versionNumber} • ${selectedTemplate.status} • ${selectedTemplate.orientation}`}
          maxWidth="lg"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="aspect-[1.414/1] bg-neutral-surface rounded-lg border border-neutral-subtle overflow-hidden">
              <img
                src={selectedTemplate.backgroundUrl}
                alt={selectedTemplate.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-secondary mb-2">
                Active Dynamic Field Map ({selectedTemplate.fieldConfiguration.length} fields)
              </h4>
              {selectedTemplate.fieldConfiguration.length === 0 ? (
                <p className="text-xs text-neutral-secondary italic">No dynamic fields configured yet.</p>
              ) : (
                <div className="border border-neutral-subtle rounded-md divide-y divide-neutral-subtle text-xs">
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
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Canva Certificate Design"
        description="Select a high-resolution PNG or JPG exported from Canva."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="border-2 border-dashed border-neutral-subtle rounded-lg p-8 text-center bg-neutral-surface/20 space-y-3">
            <Upload className="w-8 h-8 text-brand-violet mx-auto" />
            <div>
              <p className="font-semibold text-neutral-main">Drag and drop exported Canva artwork</p>
              <p className="text-neutral-secondary text-[11px] mt-0.5">PNG or JPG up to 10MB (Standard A4 Landscape recommended)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Canva upload demonstration: In Milestone 4, this triggers Supabase Storage upload and opens the Template Studio canvas.')}
            >
              Browse Local File
            </Button>
          </div>

          <div className="p-3 bg-brand-violet-light/50 border border-brand-violet/20 rounded-md space-y-1">
            <span className="font-semibold text-brand-midnight block">Notice on Template Studio (Milestone 4):</span>
            <p className="text-neutral-secondary text-[11px]">
              Full visual drag-and-drop field positioning will be implemented in Milestone 4. Field coordinates configured here will be rendered identically by the client-side PDF engine.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
