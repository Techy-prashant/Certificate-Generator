import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Award, Lock, FileCheck } from 'lucide-react';
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
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-violet-light text-brand-midnight text-xs font-semibold border border-brand-violet/20">
            <Award className="w-3.5 h-3.5 text-brand-violet" />
            <span>Namdapha House • Official Certificate Registry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-main">
            Verify Academic & House Certificates
          </h1>
          <p className="text-sm sm:text-base text-neutral-secondary max-w-2xl mx-auto leading-relaxed">
            Enter the unique six-digit code printed on your official certificate or scan the QR code to verify authenticity directly against the Namdapha House registry.
          </p>
        </div>

        {/* Verification Card */}
        <div className="max-w-xl mx-auto w-full bg-white rounded-xl shadow-md border border-neutral-subtle p-6 sm:p-8 space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="cert-code" className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary mb-2">
                Enter 6-Digit Certificate Code
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
                  className="block w-full text-center tracking-[0.3em] font-mono text-2xl sm:text-3xl font-bold py-3.5 px-4 rounded-lg border border-neutral-subtle bg-neutral-surface/30 focus-visible:outline-2 focus-visible:outline-brand-violet text-brand-midnight placeholder:text-neutral-secondary/30 placeholder:tracking-normal placeholder:font-sans placeholder:text-base transition-all"
                  aria-invalid={!!error}
                  aria-describedby={error ? "code-error" : undefined}
                />
              </div>
              {error && (
                <p id="code-error" className="mt-2 text-xs font-medium text-[#A52A2A]" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold tracking-wide"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Verify Certificate Record
            </Button>
          </form>

          {/* Quick Demo Test Codes */}
          <div className="pt-4 border-t border-neutral-subtle space-y-2">
            <span className="text-[11px] font-semibold text-neutral-secondary uppercase tracking-wider block text-center">
              Quick Test Codes (Demo Data)
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
                  className="text-xs px-2.5 py-1 rounded bg-neutral-surface hover:bg-brand-violet-light hover:text-brand-midnight border border-neutral-subtle font-mono text-neutral-main transition-colors flex items-center gap-1.5"
                  title={s.label}
                >
                  <span className="font-semibold">{s.code}</span>
                  <span className="text-[10px] text-neutral-secondary">({s.code === '772109' ? 'Revoked' : 'Valid'})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trust & Architecture Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white rounded-lg p-5 border border-neutral-subtle space-y-2 text-left">
            <div className="w-9 h-9 rounded-md bg-brand-violet-light text-brand-violet flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-main">Cryptographic Safety</h3>
            <p className="text-xs text-neutral-secondary leading-relaxed">
              Every certificate incorporates a pseudo-random unique lookup key and tamper-evident snapshot.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-neutral-subtle space-y-2 text-left">
            <div className="w-9 h-9 rounded-md bg-brand-violet-light text-brand-violet flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-main">Authoritative Registry</h3>
            <p className="text-xs text-neutral-secondary leading-relaxed">
              PDFs are only considered authentic when their live record exists with active status in the database.
            </p>
          </div>

          <div className="bg-white rounded-lg p-5 border border-neutral-subtle space-y-2 text-left">
            <div className="w-9 h-9 rounded-md bg-brand-violet-light text-brand-violet flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-main">Instant QR Resolution</h3>
            <p className="text-xs text-neutral-secondary leading-relaxed">
              Smartphone cameras can scan printed QR codes to directly access this public verification page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
