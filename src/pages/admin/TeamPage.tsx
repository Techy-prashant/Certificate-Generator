import React, { useEffect, useState } from 'react';
import {
  Plus
} from 'lucide-react';
import { portalService } from '../../services';
import { UserProfile, UserRole } from '../../types';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LoadingState } from '../../components/ui/LoadingState';

export const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('certificate_admin');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await portalService.getTeamMembers();
        if (isMounted) setMembers(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Team & Permissions' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-main">Team & Role-Based Access Control</h1>
          <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">
            Manage authorized House administrators, reviewers, and operational issuance privileges
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Administrator
        </Button>
      </div>

      {/* Role Hierarchy Reference Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-neutral-subtle space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-main">Super Admin</span>
            <Badge variant="gold" size="sm">Full Access</Badge>
          </div>
          <p className="text-neutral-secondary leading-relaxed text-[11px]">
            Manages team roles, audits, signature assets, event scopes, and certificate revocations.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-neutral-subtle space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-main">Certificate Admin</span>
            <Badge variant="info" size="sm">Issuance</Badge>
          </div>
          <p className="text-neutral-secondary leading-relaxed text-[11px]">
            Can create events, upload templates, configure fields, and issue certificates.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-neutral-subtle space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-main">Reviewer</span>
            <Badge variant="neutral" size="sm">Audit & Review</Badge>
          </div>
          <p className="text-neutral-secondary leading-relaxed text-[11px]">
            Reviews draft certificates and inspects batch spreadsheets prior to issuance.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading team members..." />
      ) : (
        <Card>
          <CardHeader
            title="Registered Administrative Accounts"
            subtitle="Accounts provisioned in the Namdapha House profiles table"
          />
          <div className="divide-y divide-neutral-subtle">
            {members.map((member) => (
              <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-brand-midnight text-brand-gold flex items-center justify-center font-bold text-sm shrink-0">
                    {member.displayName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-main">{member.displayName}</h3>
                    <p className="font-mono text-neutral-secondary text-[11px]">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      member.role === 'super_admin'
                        ? 'gold'
                        : member.role === 'certificate_admin'
                        ? 'info'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {member.role.replace('_', ' ')}
                  </Badge>

                  <Badge
                    variant={member.isActive ? 'success' : 'error'}
                    size="sm"
                  >
                    {member.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Administrator Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Administrator Account"
        description="Invite an authorized Namdapha House coordinator or council member."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert(`Administrator provision demonstration for ${inviteEmail}. In Milestone 8, this executes Supabase Auth invitation and assigns verified profile role.`);
            setIsModalOpen(false);
          }}
          className="space-y-4 text-xs"
        >
          <Input
            label="Full Name"
            placeholder="e.g. Vikramaditya Singhania"
            required
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />

          <Input
            label="IIT Madras BS Email"
            placeholder="e.g. student@study.iitm.ac.in"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <Select
            label="Assigned System Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={[
              { value: 'certificate_admin', label: 'Certificate Admin (Issuance)' },
              { value: 'reviewer', label: 'Reviewer (Batch Approval)' },
              { value: 'super_admin', label: 'Super Admin (Full Governance)' },
            ]}
          />

          <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle text-neutral-secondary text-[11px] space-y-1">
            <span className="font-semibold text-neutral-main block">Mandatory Security Rule:</span>
            <p>
              Per Section 3 of AGENTS.md, public signups are disabled in production; privileges are granted strictly through authorized database policies.
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-subtle flex justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
