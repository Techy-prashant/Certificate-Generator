import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export const DemoDataBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const configured = isSupabaseConfigured();

  if (isDismissed) return null;

  if (configured) {
    return (
      <div className="bg-[#E2F4E9] border-b border-[#A3D9B8] text-[#17653C] px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#17653C]" />
            <span>
              <strong className="font-semibold">Connected to Supabase:</strong> Live PostgreSQL registry and Supabase Auth are active.
            </span>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-[#17653C] hover:text-black p-0.5 rounded-sm hover:bg-[#A3D9B8]/50 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFF0D7] border-b border-[#F3D19C] text-[#8C5800] px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[#8C5800]" />
          <span>
            <strong className="font-semibold">Supabase Pending Configuration:</strong> Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to activate live database & authentication. Running in demo mode.
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
