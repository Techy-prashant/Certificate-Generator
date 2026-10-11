import React, { useEffect, useState } from 'react';
import {
  PenTool,
  Plus,
  Search,
  Lock
} from 'lucide-react';
import { portalService } from '../../services';
import { Signatory } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const SignatoriesPage: React.FC = () => {
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [permissions, setPermissions] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await portalService.getSignatories();
        if (isMounted) setSignatories(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSignatories = signatories.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          onClick={() => setIsModalOpen(true)}
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
            Per the mandatory security specification, signature assets are restricted to authorized administrators and stored in private Supabase buckets. They are never accessible to anonymous public visitors.
          </p>
        </div>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Search signatories by name or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading signatories..." />
      ) : filteredSignatories.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="No signatories found"
          description="Add an authorized official (e.g. Faculty Advisor, House Captain) to issue certificates."
          actionLabel="Add Signatory"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSignatories.map((sig) => (
            <Card key={sig.id} className="hover:border-brand-violet/40 transition-colors flex flex-col">
              <CardContent className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-main">{sig.name}</h3>
                    <p className="text-xs font-medium text-brand-violet mt-0.5">{sig.designation}</p>
                  </div>
                  <Badge variant={sig.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {sig.status}
                  </Badge>
                </div>

                {/* Signature Preview Canvas */}
                <div className="p-3 bg-neutral-surface/60 rounded-md border border-neutral-subtle flex items-center justify-center min-h-[90px]">
                  <img
                    src={sig.signatureAssetUrl}
                    alt={`Signature of ${sig.name}`}
                    className="max-h-16 max-w-full object-contain filter contrast-125"
                  />
                </div>

                {sig.usagePermissions && (
                  <div className="text-xs text-neutral-secondary space-y-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-secondary/80">
                      Usage Scope
                    </span>
                    <p className="leading-relaxed bg-white p-2 rounded border border-neutral-subtle">
                      {sig.usagePermissions}
                    </p>
                  </div>
                )}
              </CardContent>

              <div className="px-5 py-3 bg-neutral-surface/40 border-t border-neutral-subtle flex items-center justify-between text-xs text-neutral-secondary">
                <span className="font-mono text-[11px]">{sig.id}</span>
                <span className="text-[11px]">Since {new Date(sig.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Signatory Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Authorized Signatory"
        description="Configure an official authorized to sign Namdapha House certificates."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert('Signatory creation demonstration. In Milestone 3, this uploads transparent PNG to private storage and logs an audit event.');
            setIsModalOpen(false);
          }}
          className="space-y-4 text-xs"
        >
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

          <Input
            label="Usage Scope / Permissions"
            placeholder="e.g. Authorized for Pan-Namdapha official competitions"
            value={permissions}
            onChange={(e) => setPermissions(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
              Upload Transparent Signature PNG <span className="text-[#A52A2A]">*</span>
            </label>
            <div className="border border-neutral-subtle rounded-md p-4 bg-white text-center space-y-2">
              <p className="text-neutral-secondary">Select transparent PNG (Recommended resolution: 600x200px)</p>
              <Button variant="outline" size="sm" type="button">
                Select PNG Image
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Signatory Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
