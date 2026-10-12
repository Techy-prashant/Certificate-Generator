import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, ArrowLeft, Info, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin.namdapha@study.iitm.ac.in');
  const [password, setPassword] = useState('••••••••••••');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error.message || 'Authentication failed. Please verify your credentials.');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected sign-in error occurred.');
    } finally {
      setIsLoading(false);
    }
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
            <img
              src="/logo/Namdapha_bg_colored_rect.png"
              alt="Namdapha House Logo"
              className="h-16 w-auto max-w-[220px] rounded-2xl object-contain mx-auto drop-shadow-sm"
            />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-main">
              Namdapha Admin Portal
            </h1>
            <p className="text-xs text-neutral-secondary max-w-xs mx-auto">
              Authorized access for House administrators, event managers, and reviewers.
            </p>
          </div>

          {/* Backend Status Notice */}
          <div className={`p-3 rounded-md text-xs border flex items-start gap-2.5 ${
            isConfigured
              ? 'bg-[#E2F4E9]/60 border-[#A3D9B8] text-[#17653C]'
              : 'bg-brand-violet-light/60 border-brand-violet/20 text-neutral-main'
          }`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isConfigured ? 'text-[#17653C]' : 'text-brand-violet'}`} />
            <div>
              <strong className="font-semibold block">
                {isConfigured ? 'Live Supabase Auth Active' : 'Demonstration Auth Mode Active'}
              </strong>
              <span className="text-[11px] opacity-90">
                {isConfigured
                  ? 'Sign in using your authorized Supabase administrator credentials.'
                  : 'Supabase credentials pending in .env.local. Demo mode allows test sign-in.'}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#FBE5E5] border border-[#F4AFAF] rounded-md text-xs text-[#A52A2A] flex items-center gap-2" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#A52A2A]" />
              <span>{errorMessage}</span>
            </div>
          )}

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
