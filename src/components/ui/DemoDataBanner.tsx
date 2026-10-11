import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

export const DemoDataBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-[#FFF0D7] border-b border-[#F3D19C] text-[#8C5800] px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[#8C5800]" />
          <span>
            <strong className="font-semibold">Milestone 1 Demo Mode:</strong> You are viewing an isolated frontend shell populated with mock records for Namdapha House. Records are not persisted to Supabase yet.
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-[#8C5800] hover:text-black p-0.5 rounded-sm hover:bg-[#F3D19C]/50 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
