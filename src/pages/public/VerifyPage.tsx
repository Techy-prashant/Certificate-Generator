import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Award,
  Building2,
  Hash,
  Download,
  Share2,
  ShieldCheck
} from 'lucide-react';
import { portalService } from '../../services';
import { PublicVerificationResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';

export const VerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchVerification = async () => {
      if (!code) {
        setIsLoading(false);
        return;
      }

      const cleanCode = code.trim();

      // Client-side rate-limiting check: max 15 lookups per 60 seconds
      try {
        const now = Date.now();
        const historyKey = 'namdapha_verification_lookups';
        const rawHistory = sessionStorage.getItem(historyKey);
        const lookups: number[] = rawHistory ? JSON.parse(rawHistory) : [];
        const recentLookups = lookups.filter((ts) => now - ts < 60000);

        if (recentLookups.length >= 15) {
          if (isMounted) {
            setIsRateLimited(true);
            setIsLoading(false);
          }
          return;
        }

        recentLookups.push(now);
        sessionStorage.setItem(historyKey, JSON.stringify(recentLookups));
      } catch {
        // Fallback gracefully if storage is restricted
      }

      // Input sanitization: must be exactly 6 numeric digits
      if (!/^\d{6}$/.test(cleanCode)) {
        if (isMounted) {
          setResult({ isValid: false, status: 'not_found' });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const res = await portalService.verifyCertificate(cleanCode);
        if (isMounted) {
          setResult(res);
        }
      } catch {
        if (isMounted) {
          setResult({ isValid: false, status: 'not_found' });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVerification();
    return () => {
      isMounted = false;
    };
  }, [code]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingState message={`Checking registry record for code "${code}"...`} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-secondary hover:text-brand-violet transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Search another certificate</span>
          </Link>
          <span className="font-mono text-xs text-neutral-secondary">
            Lookup Code: <strong className="text-neutral-main">{code}</strong>
          </span>
        </div>

        {/* Rate Limited State */}
        {isRateLimited && (
          <div className="bg-amber-50 rounded-xl shadow-md border border-amber-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Verification Rate Limit Reached</h2>
              <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
                To protect six-digit certificate verification codes against brute-force enumeration, queries are limited to 15 per minute per client.
              </p>
            </div>
            <p className="text-[11px] text-amber-700">Please wait 60 seconds before submitting further lookup queries.</p>
          </div>
        )}

        {/* Outcome 1: VALID */}
        {!isRateLimited && result?.isValid && result.status === 'issued' && (
          <div className="bg-white rounded-xl shadow-md border border-neutral-subtle overflow-hidden">
            {/* Status Header */}
            <div className="bg-[#E2F4E9] border-b border-[#A3D9B8] p-5 sm:p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#17653C] text-white flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#17653C]">
                  Official Certificate Verified
                </h1>
                <p className="text-xs sm:text-sm text-[#17653C]/80 mt-1 font-medium">
                  This document is an authentic record in the Namdapha House Registry.
                </p>
              </div>
            </div>

            {/* Certificate Metadata Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center pb-6 border-b border-neutral-subtle space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-secondary">
                  Certificate Awarded To
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-main">
                  {result.recipientName}
                </h2>
                <div className="pt-1">
                  <Badge variant="gold" size="md">
                    {result.achievement}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                  <div className="flex items-center space-x-1.5 text-neutral-secondary">
                    <Award className="w-4 h-4 text-brand-violet" />
                    <span className="font-semibold uppercase text-[11px]">Event / Competition</span>
                  </div>
                  <p className="font-medium text-neutral-main text-sm">{result.eventName}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                  <div className="flex items-center space-x-1.5 text-neutral-secondary">
                    <Building2 className="w-4 h-4 text-brand-violet" />
                    <span className="font-semibold uppercase text-[11px]">Issuing Authority</span>
                  </div>
                  <p className="font-medium text-neutral-main text-sm">{result.organizationName}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                  <div className="flex items-center space-x-1.5 text-neutral-secondary">
                    <Calendar className="w-4 h-4 text-brand-violet" />
                    <span className="font-semibold uppercase text-[11px]">Date of Issuance</span>
                  </div>
                  <p className="font-medium text-neutral-main text-sm">{result.issueDate}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-surface/40 border border-neutral-subtle space-y-1">
                  <div className="flex items-center space-x-1.5 text-neutral-secondary">
                    <Hash className="w-4 h-4 text-brand-violet" />
                    <span className="font-semibold uppercase text-[11px]">Registry Code</span>
                  </div>
                  <p className="font-mono font-bold text-brand-violet text-sm">{result.verificationCode}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => window.print()}
                >
                  Print Verification Record
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  leftIcon={isCopied ? <ShieldCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2500);
                    }
                  }}
                >
                  {isCopied ? 'Link Copied!' : 'Copy Verification Link'}
                </Button>
              </div>
            </div>

            <div className="bg-neutral-surface/50 p-4 border-t border-neutral-subtle text-center text-xs text-neutral-secondary">
              <span className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#17653C]" />
                <span>Digitally confirmed against Namdapha House Supabase database records</span>
              </span>
            </div>
          </div>
        )}

        {/* Outcome 2: REVOKED */}
        {result?.status === 'revoked' && (
          <div className="bg-white rounded-xl shadow-md border border-[#F4AFAF] overflow-hidden">
            <div className="bg-[#FBE5E5] border-b border-[#F4AFAF] p-5 sm:p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#A52A2A] text-white flex items-center justify-center mx-auto shadow-xs">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#A52A2A]">
                  Certificate Revoked
                </h1>
                <p className="text-xs sm:text-sm text-[#A52A2A]/90 mt-1 font-medium">
                  This certificate has been revoked by the issuing authority and is no longer valid.
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="p-4 rounded-lg bg-[#FBE5E5]/40 border border-[#F4AFAF] text-xs text-[#A52A2A] space-y-1.5">
                <span className="font-bold uppercase tracking-wider block">Official Revocation Notice:</span>
                <p className="text-sm font-medium">{result.revocationReasonPublic || 'Revoked by authority action.'}</p>
                {result.revocationDate && (
                  <p className="text-[11px] text-neutral-secondary pt-1">
                    Revocation logged at: {new Date(result.revocationDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                  <span className="text-neutral-secondary block">Originally Issued To:</span>
                  <span className="font-semibold text-neutral-main">{result.recipientName}</span>
                </div>
                <div className="p-3 bg-neutral-surface rounded border border-neutral-subtle">
                  <span className="text-neutral-secondary block">Event:</span>
                  <span className="font-semibold text-neutral-main">{result.eventName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Outcome 3: NOT FOUND */}
        {result?.status === 'not_found' && (
          <div className="bg-white rounded-xl shadow-md border border-neutral-subtle p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-neutral-surface text-neutral-secondary flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-neutral-main">
                No Certificate Record Found
              </h1>
              <p className="text-sm text-neutral-secondary max-w-md mx-auto">
                No issued or recorded certificate matches the verification code <span className="font-mono font-bold text-neutral-main">"{code}"</span>.
              </p>
            </div>
            <p className="text-xs text-neutral-secondary/80 max-w-sm mx-auto">
              Please double check the code printed on the physical document or QR code and try again.
            </p>
            <div className="pt-2">
              <Link to="/">
                <Button variant="primary" size="md">
                  Try Another Code
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
