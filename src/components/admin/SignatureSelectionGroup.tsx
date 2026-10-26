import React from 'react';
import { Signatory } from '../../types';
import { Select } from '../ui/Select';
import { PenTool, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SignatureSelectionGroupProps {
  signatories: Signatory[];
  leftSignatureId: string;
  rightSignatureId: string;
  onLeftChange: (id: string) => void;
  onRightChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export const SignatureSelectionGroup: React.FC<SignatureSelectionGroupProps> = ({
  signatories,
  leftSignatureId,
  rightSignatureId,
  onLeftChange,
  onRightChange,
  disabled = false,
  required = false,
}) => {
  // Only consider active signatories
  const activeSignatories = signatories.filter((s) => s.status === 'active');

  // Options for Left Signature: exclude whatever is currently selected on the Right
  const leftOptions = [
    { value: '', label: 'None (No left signature)' },
    ...activeSignatories
      .filter((s) => s.id !== rightSignatureId)
      .map((s) => ({
        value: s.id,
        label: `${s.name} (${s.designation})`,
      })),
  ];

  // Options for Right Signature: exclude whatever is currently selected on the Left
  const rightOptions = [
    { value: '', label: 'None (No right signature)' },
    ...activeSignatories
      .filter((s) => s.id !== leftSignatureId)
      .map((s) => ({
        value: s.id,
        label: `${s.name} (${s.designation})`,
      })),
  ];

  // Selected signatory objects for preview
  const leftSignatory = activeSignatories.find((s) => s.id === leftSignatureId);
  const rightSignatory = activeSignatories.find((s) => s.id === rightSignatureId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-neutral-main flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-brand-violet" />
          <span>Certificate Signatures</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[11px] text-neutral-secondary">
          Assign up to two distinct signatures (Left and Right)
        </span>
      </div>

      {activeSignatories.length === 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">No active signatories configured</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Please create and activate signatories under{' '}
              <a href="/admin/signatories" target="_blank" rel="noreferrer" className="underline font-bold">
                Signatures
              </a>{' '}
              first.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left Signature Dropdown */}
          <div className="space-y-2">
            <Select
              label="Left Signature (Position 1)"
              value={leftSignatureId}
              onChange={(e) => {
                const newId = e.target.value;
                onLeftChange(newId);
                // If user somehow picked the right signature, clear the right signature
                if (newId && newId === rightSignatureId) {
                  onRightChange('');
                }
              }}
              options={leftOptions}
              disabled={disabled}
            />

            {/* Left Preview Box */}
            {leftSignatory ? (
              <div className="p-2.5 rounded-xl border border-brand-violet/20 bg-brand-violet/5 flex items-center gap-3 animate-in fade-in duration-150">
                {leftSignatory.signatureAssetUrl ? (
                  <div className="w-16 h-10 bg-white rounded-lg border border-neutral-subtle/80 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img
                      src={leftSignatory.signatureAssetUrl}
                      alt={leftSignatory.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-10 bg-neutral-surface rounded-lg border border-neutral-subtle flex items-center justify-center text-[10px] text-neutral-secondary shrink-0 font-mono">
                    No Asset
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-main truncate">{leftSignatory.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-violet shrink-0" />
                  </div>
                  <span className="text-[10px] text-neutral-secondary block truncate">
                    {leftSignatory.designation}
                  </span>
                  <span className="text-[9px] text-brand-violet font-semibold uppercase tracking-wider block mt-0.5">
                    Position: Left
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl border border-dashed border-neutral-subtle text-[11px] text-neutral-secondary text-center bg-neutral-surface/30">
                No left signature selected
              </div>
            )}
          </div>

          {/* Right Signature Dropdown */}
          <div className="space-y-2">
            <Select
              label="Right Signature (Position 2)"
              value={rightSignatureId}
              onChange={(e) => {
                const newId = e.target.value;
                onRightChange(newId);
                // If user somehow picked the left signature, clear the left signature
                if (newId && newId === leftSignatureId) {
                  onLeftChange('');
                }
              }}
              options={rightOptions}
              disabled={disabled}
            />

            {/* Right Preview Box */}
            {rightSignatory ? (
              <div className="p-2.5 rounded-xl border border-brand-violet/20 bg-brand-violet/5 flex items-center gap-3 animate-in fade-in duration-150">
                {rightSignatory.signatureAssetUrl ? (
                  <div className="w-16 h-10 bg-white rounded-lg border border-neutral-subtle/80 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img
                      src={rightSignatory.signatureAssetUrl}
                      alt={rightSignatory.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-10 bg-neutral-surface rounded-lg border border-neutral-subtle flex items-center justify-center text-[10px] text-neutral-secondary shrink-0 font-mono">
                    No Asset
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-main truncate">{rightSignatory.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-violet shrink-0" />
                  </div>
                  <span className="text-[10px] text-neutral-secondary block truncate">
                    {rightSignatory.designation}
                  </span>
                  <span className="text-[9px] text-brand-violet font-semibold uppercase tracking-wider block mt-0.5">
                    Position: Right
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl border border-dashed border-neutral-subtle text-[11px] text-neutral-secondary text-center bg-neutral-surface/30">
                No right signature selected
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
