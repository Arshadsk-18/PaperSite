import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Card, SupabaseBanner } from '../components/ui';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Field-specific validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { signInWithPassword, signUp, loginAsDemoUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Demo credentials from environment (visible only when both are defined and non-empty)
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL?.trim();
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD?.trim();
  const showDemoButton = Boolean(demoEmail && demoPassword);

  const validate = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    if (activeTab === 'signup' && !fullName.trim()) {
      setNameError('Please enter your full name (e.g. Ravi Sharma)');
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError('Please enter your email address');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address (e.g. name@shop.com)');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter a password');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError(null);

    try {
      if (activeTab === 'login') {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setGeneralError('Invalid email or password. Please verify your details or sign up.');
          } else {
            setGeneralError(error.message);
          }
          setIsLoading(false);
          return;
        }
      } else {
        const { error } = await signUp(email.trim(), password, fullName.trim());
        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            setEmailError('An account with this email already exists. Please log in instead.');
          } else {
            setGeneralError(error.message);
          }
          setIsLoading(false);
          return;
        }
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      setGeneralError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsDemo = async () => {
    setIsLoading(true);
    setGeneralError(null);

    if (demoEmail && demoPassword && isSupabaseConfigured) {
      const { error } = await signInWithPassword(demoEmail, demoPassword);
      if (error) {
        // Fallback to local session
        loginAsDemoUser();
      }
    } else {
      loginAsDemoUser();
    }

    setIsLoading(false);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F4F6F4]/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Supabase unconfigured banner if keys are missing */}
        <div className="mb-6">
          <SupabaseBanner />
        </div>

        {/* Brand header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <span className="w-10 h-10 rounded-xl bg-[#1F3D33] text-[#D6F26B] font-extrabold flex items-center justify-center text-base shadow-xs group-hover:scale-105 transition-transform">
              P
            </span>
            <span className="font-extrabold text-2xl tracking-tight text-[#14221B]">
              PaperSite
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#14221B]">
            {activeTab === 'login' ? 'Welcome back' : 'Create your shop account'}
          </h1>
          <p className="text-sm text-[#5E6B63] mt-1">
            {activeTab === 'login'
              ? 'Log in to manage your website and view live customer bookings.'
              : 'Draw your shop and go live with appointments in 60 seconds.'}
          </p>
        </div>

        {/* Auth Card */}
        <Card variant="white" padding="lg" className="shadow-sm">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#F4F6F4] border border-[#E3E8E4] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setNameError(null);
                setEmailError(null);
                setPasswordError(null);
                setGeneralError(null);
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all min-h-[40px] ${
                activeTab === 'login'
                  ? 'bg-white text-[#1F3D33] shadow-xs'
                  : 'text-[#5E6B63] hover:text-[#14221B]'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setNameError(null);
                setEmailError(null);
                setPasswordError(null);
                setGeneralError(null);
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all min-h-[40px] ${
                activeTab === 'signup'
                  ? 'bg-white text-[#1F3D33] shadow-xs'
                  : 'text-[#5E6B63] hover:text-[#14221B]'
              }`}
            >
              Sign up
            </button>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C8382F] flex items-start gap-2.5"
            >
              <div className="shrink-0 mt-0.5 font-bold">!</div>
              <div className="leading-relaxed">{generalError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name field (Sign-up only) */}
            {activeTab === 'signup' && (
              <div>
                <label
                  htmlFor="full-name"
                  className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1"
                >
                  Your full name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E6B63]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="e.g. Ravi Sharma"
                    className={`w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                      nameError ? 'border-[#C8382F] bg-red-50/20' : 'border-[#E3E8E4]'
                    }`}
                  />
                </div>
                {nameError && (
                  <p className="text-xs text-[#C8382F] mt-1 font-medium">{nameError}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1"
              >
                Email address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E6B63]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="name@shop.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                    emailError ? 'border-[#C8382F] bg-red-50/20' : 'border-[#E3E8E4]'
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-xs text-[#C8382F] mt-1 font-medium">{emailError}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1"
              >
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E6B63]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                    passwordError ? 'border-[#C8382F] bg-red-50/20' : 'border-[#E3E8E4]'
                  }`}
                />
              </div>
              {passwordError && (
                <p className="text-xs text-[#C8382F] mt-1 font-medium">{passwordError}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full font-semibold shadow-xs"
            >
              <span>{activeTab === 'login' ? 'Log in' : 'Create account'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Conditional "Continue as demo" button (Visible only when VITE_DEMO_EMAIL & VITE_DEMO_PASSWORD exist) */}
          {showDemoButton && (
            <div className="mt-5 pt-5 border-t border-[#E3E8E4]">
              <Button
                type="button"
                variant="accent"
                size="md"
                onClick={handleContinueAsDemo}
                isLoading={isLoading}
                icon={<Sparkles className="w-4 h-4" />}
                className="w-full font-semibold"
              >
                Continue as demo
              </Button>
              <p className="text-[11px] text-[#5E6B63] text-center mt-1.5">
                Quick 1-click test login using configured demo environment credentials.
              </p>
            </div>
          )}

          {/* Trust reassurance */}
          <div className="mt-6 pt-5 border-t border-[#E3E8E4] flex items-center justify-center gap-2 text-xs text-[#5E6B63]">
            <ShieldCheck className="w-4 h-4 text-[#1F8A4C]" />
            <span>Encrypted with Supabase Row-Level Security</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
