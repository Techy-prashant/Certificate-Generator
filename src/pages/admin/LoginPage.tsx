import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, ArrowLeft, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin.namdapha@study.iitm.ac.in');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/admin');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-neutral-secondary hover:text-brand-violet transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Public Verification</span>
        </Link>

        {/* Brand Card Header */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-subtle p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-brand-midnight text-brand-gold flex items-center justify-center font-bold text-lg mx-auto border border-brand-gold/30 shadow-xs">
              N
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-main">
              Namdapha Admin Portal
            </h1>
            <p className="text-xs text-neutral-secondary max-w-xs mx-auto">
              Authorized access for House administrators, event managers, and reviewers.
            </p>
          </div>

          {/* Phase 1 Architecture Notice */}
          <div className="p-3 bg-brand-violet-light/60 border border-brand-violet/20 rounded-md text-xs text-neutral-main flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-violet shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-brand-midnight block">Phase 1 UI Shell Active</strong>
              <span className="text-neutral-secondary text-[11px]">
                Authentication is simulated with mock credentials. Production Supabase Auth will be connected in Phase 2.
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="IITM BS Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              placeholder="admin@study.iitm.ac.in"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full text-sm font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Dashboard
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-neutral-subtle text-center text-xs text-neutral-secondary">
            <span className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-violet" />
              <span>Role-Based Access Control • Namdapha House</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
