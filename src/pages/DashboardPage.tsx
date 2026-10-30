import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Project, SupportedLanguage } from '../types';
import {
  Button,
  Card,
  Pill,
  EmptyState,
  ErrorBanner,
  Skeleton,
  LanguageChips,
} from '../components/ui';
import {
  Plus,
  ExternalLink,
  Trash2,
  PenTool,
  Calendar,
  AlertTriangle,
  X,
  Store,
  Clock,
  Globe,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { resetDemo } from '../demo/demoService';
import { DemoTipsModal } from '../components/DemoTipsModal';

// Demo initial project when running offline without Supabase keys
const INITIAL_DEMO_PROJECTS: Project[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    owner_id: '00000000-0000-0000-0000-000000000001',
    business_name: 'Brew Bay Café',
    business_type: 'cafe',
    slug: 'brew-bay',
    whatsapp_number: '+919876543210',
    language: 'en',
    is_published: true,
    current_version_id: '22222222-2222-2222-2222-222222222222',
    address: 'Shop 4, Promenade Walk, Bandra West, Mumbai',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Site Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<string>('cafe');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Dialog State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Demo Safety State
  const [isDemoTipsOpen, setIsDemoTipsOpen] = useState(false);
  const [resetNotification, setResetNotification] = useState<{
    type: 'success' | 'loading' | 'error';
    message: string;
  } | null>(null);

  // Load Projects
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      // Offline fallback: use local storage
      const stored = localStorage.getItem('papersite_projects');
      if (stored) {
        try {
          setProjects(JSON.parse(stored));
        } catch {
          setProjects(INITIAL_DEMO_PROJECTS);
        }
      } else {
        setProjects(INITIAL_DEMO_PROJECTS);
        localStorage.setItem('papersite_projects', JSON.stringify(INITIAL_DEMO_PROJECTS));
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProjects(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to fetch your projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Hidden Reset Demo Action (Shift+D or manual button)
  const handleResetDemo = useCallback(async () => {
    setResetNotification({
      type: 'loading',
      message: 'Resetting demo data & restoring seed project...',
    });
    const res = await resetDemo(user?.id);
    if (res.success) {
      setResetNotification({ type: 'success', message: res.message });
      await fetchProjects();
      setTimeout(() => setResetNotification(null), 5000);
    } else {
      setResetNotification({ type: 'error', message: res.message });
    }
  }, [user, fetchProjects]);

  // Listen for Shift+D shortcut anywhere on Dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        handleResetDemo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetDemo]);

  // Clean and validate WhatsApp number (must be 10-15 digits after removing non-digits)
  const validatePhone = (raw: string): { valid: boolean; formatted: string; message?: string } => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      return { valid: false, formatted: '', message: 'WhatsApp number is required' };
    }
    if (digits.length < 10 || digits.length > 15) {
      return {
        valid: false,
        formatted: digits,
        message: 'WhatsApp number must be 10 to 15 digits including country code (e.g. +91 98765 43210)',
      };
    }
    return { valid: true, formatted: `+${digits}` };
  };

  // Generate URL-safe slug with unique suffix
  const generateSlug = (name: string): string => {
    const cleanBase = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'shop';
    const randSuffix = Math.random().toString(36).substring(2, 6);
    return `${cleanBase}-${randSuffix}`;
  };

  // Create Project Handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!businessName.trim()) {
      setFormError('Please enter a business name');
      return;
    }

    const phoneValidation = validatePhone(whatsappNumber);
    if (!phoneValidation.valid) {
      setFormError(phoneValidation.message || 'Invalid WhatsApp number');
      return;
    }

    setIsSubmitting(true);
    const newSlug = generateSlug(businessName);

    if (!isSupabaseConfigured || !supabase) {
      // Local demo mode
      const newProject: Project = {
        id: crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`,
        owner_id: user?.id || 'demo-owner',
        business_name: businessName.trim(),
        business_type: businessType,
        slug: newSlug,
        whatsapp_number: phoneValidation.formatted,
        language,
        is_published: false,
        current_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = [newProject, ...projects];
      setProjects(updated);
      localStorage.setItem('papersite_projects', JSON.stringify(updated));

      setIsSubmitting(false);
      setIsModalOpen(false);
      navigate(`/editor/${newProject.id}`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: user?.id,
          business_name: businessName.trim(),
          business_type: businessType,
          slug: newSlug,
          whatsapp_number: phoneValidation.formatted,
          language,
          is_published: false,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      setIsModalOpen(false);
      navigate(`/editor/${data.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Project Handler
  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    if (!isSupabaseConfigured || !supabase) {
      const updated = projects.filter((p) => p.id !== projectToDelete.id);
      setProjects(updated);
      localStorage.setItem('papersite_projects', JSON.stringify(updated));
      setIsDeleting(false);
      setProjectToDelete(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: any) {
      setErrorMessage(`Failed to delete project: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex-1 bg-[#F4F6F4]/40 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#E3E8E4]">
        <div>
          <h1 className="text-3xl font-extrabold text-[#14221B] tracking-tight">
            Shop projects
          </h1>
          <p className="text-sm text-[#5E6B63] mt-1">
            Manage your sketches, generated sites, and public customer pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDemoTipsOpen(true)}
            className="w-10 h-10 rounded-xl bg-white border border-[#E3E8E4] text-[#5E6B63] hover:text-[#14221B] hover:border-[#2F6B4F]/40 flex items-center justify-center shadow-2xs transition"
            title="Demo Tips & Guide (?)"
            aria-label="Demo Tips"
          >
            <HelpCircle className="w-5 h-5 text-[#2F6B4F]" />
          </button>
          <Link to="/bookings">
            <Button variant="outline" size="md" icon={<Calendar className="w-4 h-4 text-[#2F6B4F]" />}>
              <span>Live bookings</span>
            </Button>
          </Link>
          <Button
            variant="accent"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setBusinessName('');
              setBusinessType('cafe');
              setWhatsappNumber('');
              setLanguage('en');
              setFormError(null);
              setIsModalOpen(true);
            }}
          >
            <span>New site</span>
          </Button>
        </div>
      </div>

      {/* Reset Notification Banner */}
      {resetNotification && (
        <div
          role="status"
          className={`mt-4 p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium animate-in fade-in ${
            resetNotification.type === 'success'
              ? 'bg-[#1F8A4C]/10 border border-[#1F8A4C]/25 text-[#1F8A4C]'
              : resetNotification.type === 'loading'
              ? 'bg-[#D6F26B]/20 border border-[#2F6B4F]/25 text-[#14221B]'
              : 'bg-[#C8382F]/10 border border-[#C8382F]/25 text-[#C8382F]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{resetNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setResetNotification(null)}
            className="text-xs hover:opacity-75"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-6">
          <ErrorBanner
            title="Failed to load projects"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        </div>
      )}

      {/* Projects Grid */}
      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Card key={n} variant="white" padding="lg">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton width="60%" height="24px" />
                    <Skeleton width="20%" height="20px" rounded="full" />
                  </div>
                  <Skeleton width="40%" height="16px" />
                  <Skeleton width="100%" height="40px" />
                </div>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Store className="w-7 h-7" />}
            title="Create your first site"
            description="Draw your shop layout or upload a paper napkin sketch to generate a live website with bookings in 60 seconds."
            action={{
              label: 'New site',
              onClick: () => setIsModalOpen(true),
              variant: 'accent',
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <Card
                key={proj.id}
                variant="white"
                padding="lg"
                className="flex flex-col justify-between hover:border-[#2F6B4F]/40 transition-all hover:shadow-xs group"
              >
                <div>
                  {/* Header: Business Name & Status Pill */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-lg text-[#14221B] group-hover:text-[#2F6B4F] transition-colors leading-snug">
                      {proj.business_name}
                    </h3>
                    {proj.is_published ? (
                      <Pill variant="green" size="sm">
                        Published
                      </Pill>
                    ) : (
                      <Pill variant="muted" size="sm">
                        Draft
                      </Pill>
                    )}
                  </div>

                  {/* Metadata Chips: Business Type & Language */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Pill variant="surface" size="sm">
                      {proj.business_type}
                    </Pill>
                    <span className="text-xs text-[#5E6B63] flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#5E6B63]" />
                      <span>{proj.language.toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-[#5E6B63] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#5E6B63]" />
                      <span>{formatDate(proj.updated_at || proj.created_at)}</span>
                    </span>
                  </div>

                  {/* WhatsApp contact badge */}
                  <div className="text-xs text-[#5E6B63] mb-5 bg-[#F4F6F4] px-3 py-1.5 rounded-lg border border-[#E3E8E4] flex items-center justify-between">
                    <span>WhatsApp:</span>
                    <span className="font-mono font-medium text-[#14221B]">
                      {proj.whatsapp_number}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-[#E3E8E4] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link to={`/editor/${proj.id}`}>
                      <Button variant="primary" size="sm" icon={<PenTool className="w-3.5 h-3.5" />}>
                        <span>Open</span>
                      </Button>
                    </Link>

                    {proj.is_published && (
                      <Link to={`/site/${proj.slug}`} target="_blank" rel="noreferrer">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          title="View live published page"
                        >
                          <span>View</span>
                        </Button>
                      </Link>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#C8382F] hover:bg-red-50 hover:text-[#b02e26]"
                    onClick={() => setProjectToDelete(proj)}
                    aria-label={`Delete ${proj.business_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Site Dialog Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border border-[#E3E8E4] shadow-xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8E4]">
              <h2 id="modal-title" className="text-xl font-bold text-[#14221B]">
                Create new website
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-[#5E6B63] hover:text-[#14221B] hover:bg-[#F4F6F4]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#C8382F]">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-5 mt-5">
              {/* Business Name */}
              <div>
                <label
                  htmlFor="business-name-input"
                  className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1"
                >
                  Business name *
                </label>
                <input
                  id="business-name-input"
                  type="text"
                  required
                  placeholder="e.g. Brew Bay Café"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-lg border border-[#E3E8E4] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              {/* Business Type */}
              <div>
                <label
                  htmlFor="business-type-select"
                  className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1"
                >
                  Business type *
                </label>
                <select
                  id="business-type-select"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-lg border border-[#E3E8E4] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  <option value="cafe">Café & Coffee Shop</option>
                  <option value="salon">Salon & Spa</option>
                  <option value="tutor">Tutor & Coaching</option>
                  <option value="restaurant">Restaurant & Eatery</option>
                  <option value="shop">Local Retail Shop</option>
                  <option value="other">Other Service</option>
                </select>
              </div>

              {/* WhatsApp Number */}
              <div>
                <label
                  htmlFor="whatsapp-number-input"
                  className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1"
                >
                  WhatsApp number (with country code) *
                </label>
                <input
                  id="whatsapp-number-input"
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-lg border border-[#E3E8E4] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
                <p className="text-[11px] text-[#5E6B63] mt-1">
                  Digits only after removing formatting (10-15 digits total) so wa.me links never break.
                </p>
              </div>

              {/* Language Chips */}
              <div>
                <label className="block text-xs font-semibold text-[#14221B] uppercase tracking-wider mb-1.5">
                  Website language
                </label>
                <LanguageChips value={language} onChange={setLanguage} />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E3E8E4] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Create and open canvas
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl border border-[#E3E8E4] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#C8382F] mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 id="delete-title" className="text-lg font-bold text-[#14221B]">
                Delete project?
              </h2>
            </div>

            <p className="text-sm text-[#5E6B63] leading-relaxed mb-6">
              Are you sure you want to delete <strong>{projectToDelete.business_name}</strong>? This action cannot be undone and will permanently remove all associated sketches, drafts, and customer bookings.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={isDeleting}
                onClick={confirmDelete}
              >
                Delete project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Tips Modal */}
      <DemoTipsModal
        isOpen={isDemoTipsOpen}
        onClose={() => setIsDemoTipsOpen(false)}
        onResetDemo={handleResetDemo}
      />
    </div>
  );
};
