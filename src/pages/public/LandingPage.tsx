import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const LandingPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().replace(/\s+/g, '');
    if (!cleanCode) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('The verification code must be exactly 6 digits (e.g. 889124).');
      return;
    }
    setError('');
    navigate(`/verify/${cleanCode}`);
  };

  const sampleCodes = [
    { label: 'Valid Award (Hackathon Winner)', code: '889124' },
    { label: 'Valid Award (Debate Speaker)', code: '102948' },
    { label: 'Revoked Certificate (Audit)', code: '772109' },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <img
            src="/logo/Namdapha_bg_colored_rect.png"
            alt="Namdapha House Official Crest"
            className="h-16 sm:h-20 w-auto max-w-[240px] mx-auto rounded-2xl object-contain drop-shadow-sm mb-3"
          />
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-violet-light/60 text-brand-midnight text-xs font-semibold border border-brand-violet/20">
            <Award className="w-3.5 h-3.5 text-brand-violet" />
            <span>Official Certificate Registry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-main">
            Verify Certificate Authenticity
          </h1>
          <p className="text-sm sm:text-base text-neutral-secondary max-w-lg mx-auto leading-relaxed">
            Enter the 6-digit verification code printed on the certificate to check its official registry record.
          </p>
        </div>

        {/* Verification Card */}
        <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-lg border border-neutral-subtle p-6 sm:p-8 space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="cert-code" className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary mb-2 text-center">
                6-Digit Certificate Code
              </label>
              <div className="relative">
                <input
                  id="cert-code"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 889124"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    if (error) setError('');
                  }}
                  className="block w-full text-center tracking-[0.35em] font-mono text-2xl sm:text-3xl font-bold py-3.5 px-4 rounded-xl border border-neutral-subtle bg-neutral-surface/30 focus-visible:outline-2 focus-visible:outline-brand-violet text-brand-midnight placeholder:text-neutral-secondary/30 placeholder:tracking-normal placeholder:font-sans placeholder:text-base transition-all"
                  aria-invalid={!!error}
                  aria-describedby={error ? "code-error" : undefined}
                />
              </div>
              {error && (
                <p id="code-error" className="mt-2 text-xs font-medium text-[#A52A2A] text-center" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold tracking-wide py-3 rounded-xl shadow-xs"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Verify Certificate
            </Button>
          </form>

          {/* Quick Demo Test Codes */}
          <div className="pt-4 border-t border-neutral-subtle space-y-2">
            <span className="text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider block text-center">
              Sample Codes
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {sampleCodes.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    setCode(s.code);
                    setError('');
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-neutral-surface hover:bg-brand-violet-light hover:text-brand-midnight border border-neutral-subtle font-mono text-neutral-main transition-colors flex items-center gap-1.5"
                  title={s.label}
                >
                  <span className="font-semibold">{s.code}</span>
                  <span className="text-[10px] text-neutral-secondary">({s.code === '772109' ? 'Revoked' : 'Valid'})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
