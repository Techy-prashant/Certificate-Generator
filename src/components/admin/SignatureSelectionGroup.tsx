import React from 'react';
import { Signatory } from '../../types';
import { Select } from '../ui/Select';
import { AlertCircle } from 'lucide-react';

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

  // Options for Left Signature: None + signatories not chosen on Right
  const leftOptions = [
    { value: '', label: 'None' },
    ...activeSignatories
      .filter((s) => s.id !== rightSignatureId)
      .map((s) => ({
        value: s.id,
        label: `${s.name} (${s.designation})`,
      })),
  ];

  // Options for Right Signature: None + signatories not chosen on Left
  const rightOptions = [
    { value: '', label: 'None' },
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
      {activeSignatories.length === 0 ? (
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">No active signatories configured</p>
            <p className="text-[11px] text-amber-800">
              Certificates can still be issued without signatures, or you can register signatories in the{' '}
              <a href="/admin/signatories" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-950">
                Signatories Registry
              </a>.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Signature Column */}
          <div className="space-y-1.5">
            <Select
              label="Left Signature"
              value={leftSignatureId}
              required={required}
              onChange={(e) => {
                const newId = e.target.value;
                onLeftChange(newId);
                if (newId && newId === rightSignatureId) {
                  onRightChange('');
                }
              }}
              options={leftOptions}
              disabled={disabled}
            />

            {/* Small clean preview only when selected */}
            {leftSignatory ? (
              <div className="p-2 rounded-lg border border-neutral-subtle bg-neutral-surface/40 flex items-center gap-2.5 animate-in fade-in duration-150">
                {leftSignatory.signatureAssetUrl ? (
                  <div className="w-14 h-8 bg-white rounded border border-neutral-subtle flex items-center justify-center p-1 shrink-0">
                    <img
                      src={leftSignatory.signatureAssetUrl}
                      alt={leftSignatory.name}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-8 bg-neutral-surface rounded border border-neutral-subtle flex items-center justify-center text-[9px] text-neutral-secondary shrink-0 font-mono">
                    No Asset
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-medium text-neutral-main truncate">{leftSignatory.name}</p>
                  <p className="text-[11px] text-neutral-secondary truncate">{leftSignatory.designation}</p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-secondary/80 font-mono px-0.5">
                No signature assigned to left position.
              </p>
            )}
          </div>

          {/* Right Signature Column */}
          <div className="space-y-1.5">
            <Select
              label="Right Signature"
              value={rightSignatureId}
              onChange={(e) => {
                const newId = e.target.value;
                onRightChange(newId);
                if (newId && newId === leftSignatureId) {
                  onLeftChange('');
                }
              }}
              options={rightOptions}
              disabled={disabled}
            />

            {/* Small clean preview only when selected */}
            {rightSignatory ? (
              <div className="p-2 rounded-lg border border-neutral-subtle bg-neutral-surface/40 flex items-center gap-2.5 animate-in fade-in duration-150">
                {rightSignatory.signatureAssetUrl ? (
                  <div className="w-14 h-8 bg-white rounded border border-neutral-subtle flex items-center justify-center p-1 shrink-0">
                    <img
                      src={rightSignatory.signatureAssetUrl}
                      alt={rightSignatory.name}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-8 bg-neutral-surface rounded border border-neutral-subtle flex items-center justify-center text-[9px] text-neutral-secondary shrink-0 font-mono">
                    No Asset
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-medium text-neutral-main truncate">{rightSignatory.name}</p>
                  <p className="text-[11px] text-neutral-secondary truncate">{rightSignatory.designation}</p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-secondary/80 font-mono px-0.5">
                No signature assigned to right position.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
