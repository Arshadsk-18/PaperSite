import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Excalidraw } from '@excalidraw/excalidraw';
import QRCode from 'qrcode';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { exportSketch, exportUploadedImage } from '../lib/exportSketch';
import { api } from '../lib/api';
import { renderSite } from '../../supabase/functions/_shared/renderSite';
import { sanitizeHtml } from '../../supabase/functions/_shared/sanitize';
import type { Project, Version, SupportedLanguage, SiteLayout } from '../types';
import {
  Button,
  Pill,
  ErrorBanner,
  LanguageChips,
} from '../components/ui';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  Mic,
  MicOff,
  History,
  Share2,
  Copy,
  Check,
  Download,
  Smartphone,
  Monitor,
  ExternalLink,
  X,
  FileText,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { hashSketch, getCachedSketchResult, setCachedSketchResult } from '../lib/sketchCache';
import { buildSamplePage } from '../demo/demoService';
import { DemoTipsModal } from '../components/DemoTipsModal';

// Sample fallback layout used when Gemini is not configured or in offline demo mode
const FALLBACK_LAYOUTS: Record<SupportedLanguage, SiteLayout> = {
  en: {
    theme: { primary: '#2F6B4F', font: 'Inter', businessName: 'Our Shop' },
    sections: [
      { id: 'header-1', type: 'header' },
      { id: 'hero-1', type: 'hero', title: 'Welcome to Our Shop', subtitle: 'Authentic local flavors & friendly neighborhood service', content: 'Crafted with passion since 2024.' },
      { id: 'services-1', type: 'services', title: 'Specialties', items: [{ name: 'Chef Signature Special', description: 'Freshly prepared daily', price: '₹240' }, { name: 'Artisan Roast', description: 'Single origin brew', price: '₹180' }] },
      { id: 'booking-1', type: 'booking', title: 'Book an Appointment', subtitle: 'Reserve your table or slot in seconds' },
      { id: 'contact-1', type: 'contact', title: 'Visit Us' },
      { id: 'footer-1', type: 'footer' }
    ]
  },
  te: {
    theme: { primary: '#2F6B4F', font: 'Inter', businessName: 'మా దుకాణం' },
    sections: [
      { id: 'header-1', type: 'header' },
      { id: 'hero-1', type: 'hero', title: 'మా దుకాణానికి స్వాగతం', subtitle: 'తాజా రుచులు మరియు నాణ్యమైన సేవలు', content: 'ప్రేమతో తయారు చేయబడిన ఆహారం.' },
      { id: 'services-1', type: 'services', title: 'ప్రముఖ వస్తువులు', items: [{ name: 'ప్రత్యేక వంటకం', description: 'ప్రతిరోజూ తాజా', price: '₹240' }] },
      { id: 'booking-1', type: 'booking', title: 'బుకింగ్ చేసుకోండి', subtitle: 'సులభమైన ఆన్‌లైన్ బుకింగ్' },
      { id: 'contact-1', type: 'contact', title: 'మాతో మాట్లాడండి' },
      { id: 'footer-1', type: 'footer' }
    ]
  },
  hi: {
    theme: { primary: '#2F6B4F', font: 'Inter', businessName: 'हमारी दुकान' },
    sections: [
      { id: 'header-1', type: 'header' },
      { id: 'hero-1', type: 'hero', title: 'हमारी दुकान में आपका स्वागत है', subtitle: 'शुद्ध स्वाद और बेहतरीन सेवा', content: 'ताज़गी और गुणवत्ता की गारंटी।' },
      { id: 'services-1', type: 'services', title: 'खास पेशकश', items: [{ name: 'स्पेशल थाली', description: 'प्रतिदिन ताज़ा तैयार', price: '₹240' }] },
      { id: 'booking-1', type: 'booking', title: 'अपॉइंटमेंट बुक करें', subtitle: 'आसान ऑनलाइन टेबल बुकिंग' },
      { id: 'contact-1', type: 'contact', title: 'संपर्क करें' },
      { id: 'footer-1', type: 'footer' }
    ]
  }
};

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Excalidraw API Ref
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // Project & Version State
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [currentLayout, setCurrentLayout] = useState<SiteLayout | null>(null);
  const [currentHtml, setCurrentHtml] = useState<string>('');

  // UI Tabs & Views
  const [mobileTab, setMobileTab] = useState<'canvas' | 'preview'>('canvas');
  const [previewDevice, setPreviewDevice] = useState<'phone' | 'desktop'>('phone');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Generation & Edit State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [instructionText, setInstructionText] = useState('');
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Versions Dropdown
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  // Publish Dialog & Poster State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Demo Safety State
  const [usingSavedExample, setUsingSavedExample] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [isDemoTipsOpen, setIsDemoTipsOpen] = useState(false);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInstructionText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  // Listen for section click events from sandboxed preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SECTION_CLICKED') {
        setSelectedSectionId(e.data.sectionId);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load Project and Versions
  const loadProject = useCallback(async () => {
    if (!id || id === 'new') {
      // Mock new project
      const mockProject: Project = {
        id: 'new-project',
        owner_id: user?.id || 'demo-owner',
        business_name: 'My New Shop',
        business_type: 'cafe',
        slug: 'my-new-shop',
        whatsapp_number: '+919876543210',
        language: 'en',
        is_published: false,
        current_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProject(mockProject);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      // Offline fallback
      const stored = localStorage.getItem('papersite_projects');
      const all: Project[] = stored ? JSON.parse(stored) : [];
      const found = all.find((p) => p.id === id) || {
        id,
        owner_id: user?.id || 'demo-owner',
        business_name: 'Brew Bay Café',
        business_type: 'cafe',
        slug: 'brew-bay',
        whatsapp_number: '+919876543210',
        language: 'en' as SupportedLanguage,
        is_published: true,
        current_version_id: 'v-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProject(found);

      // Check stored versions
      const storedVers = localStorage.getItem(`papersite_versions_${id}`);
      if (storedVers) {
        const parsed: Version[] = JSON.parse(storedVers);
        setVersions(parsed);
        if (parsed.length > 0) {
          const curr = parsed.find((v) => v.id === found.current_version_id) || parsed[0];
          setCurrentVersion(curr);
          setCurrentLayout(curr.layout_json as any);
          setCurrentHtml(curr.html);
        }
      } else {
        // Initial fallback version
        const fallback = FALLBACK_LAYOUTS[found.language as SupportedLanguage] || FALLBACK_LAYOUTS.en;
        fallback.theme.businessName = found.business_name;
        const html = sanitizeHtml(renderSite(fallback, found.language, found.whatsapp_number, { projectId: found.id }));
        const initVer: Version = {
          id: 'v-1',
          project_id: found.id,
          sketch_url: null,
          layout_json: fallback as any,
          html,
          language: found.language,
          created_at: new Date().toISOString(),
        };
        setVersions([initVer]);
        setCurrentVersion(initVer);
        setCurrentLayout(fallback);
        setCurrentHtml(html);
      }
      return;
    }

    try {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projErr || !projData) throw projErr || new Error('Project not found');
      setProject(projData);

      const { data: verData } = await supabase
        .from('versions')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (verData && verData.length > 0) {
        setVersions(verData);
        const curr = verData.find((v) => v.id === projData.current_version_id) || verData[0];
        setCurrentVersion(curr);
        setCurrentLayout(curr.layout_json);
        setCurrentHtml(curr.html);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading project');
    }
  }, [id, user]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Voice toggle
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      const langMap: Record<SupportedLanguage, string> = {
        en: 'en-IN',
        te: 'te-IN',
        hi: 'hi-IN',
      };
      recognitionRef.current.lang = langMap[project?.language || 'en'];
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Helper to compile layout and save as a version
  const saveAndRenderVersion = async (layout: SiteLayout, sketchBase64?: string, precompiledHtml?: string) => {
    if (!project) return;
    setGenerationStep('Writing your site');

    let html = precompiledHtml || '';

    if (!html) {
      if (isSupabaseConfigured && navigator.onLine) {
        try {
          const res = await api.layoutToHtml({
            layoutJson: layout,
            language: project.language,
            whatsappNumber: project.whatsapp_number,
            projectId: project.id,
            address: project.address,
          });
          html = res.html;
        } catch {
          html = sanitizeHtml(renderSite(layout, project.language, project.whatsapp_number, { projectId: project.id, address: project.address, openingHours: project.opening_hours }));
        }
      } else {
        html = sanitizeHtml(renderSite(layout, project.language, project.whatsapp_number, { projectId: project.id, address: project.address, openingHours: project.opening_hours }));
      }
    }

    const newVerId = crypto.randomUUID ? crypto.randomUUID() : `ver-${Date.now()}`;
    const newVer: Version = {
      id: newVerId,
      project_id: project.id,
      sketch_url: sketchBase64 ? `data:image/png;base64,${sketchBase64.substring(0, 30)}...` : null,
      layout_json: layout as any,
      html,
      language: project.language,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('versions').insert({
          id: newVer.id,
          project_id: project.id,
          sketch_url: newVer.sketch_url,
          layout_json: layout,
          html,
          language: project.language,
        });
        await supabase.from('projects').update({ current_version_id: newVer.id }).eq('id', project.id);
      } catch {
        // Fallback local persistence if network fails mid-way
        const updatedVersions = [newVer, ...versions];
        setVersions(updatedVersions);
        localStorage.setItem(`papersite_versions_${project.id}`, JSON.stringify(updatedVersions));
      }
    } else {
      const updatedVersions = [newVer, ...versions];
      setVersions(updatedVersions);
      localStorage.setItem(`papersite_versions_${project.id}`, JSON.stringify(updatedVersions));
      const storedProjs: Project[] = JSON.parse(localStorage.getItem('papersite_projects') || '[]');
      const updatedProjs = storedProjs.map((p) => (p.id === project.id ? { ...p, current_version_id: newVer.id } : p));
      localStorage.setItem('papersite_projects', JSON.stringify(updatedProjs));
    }

    setVersions((prev) => [newVer, ...prev]);
    setCurrentVersion(newVer);
    setCurrentLayout(layout);
    setCurrentHtml(html);
  };

  // Generate Flow from Canvas
  const handleGenerate = async (uploadedFile?: File) => {
    if (!project) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setFallbackReason(null);
    setGenerationStep('Reading your sketch');

    try {
      let imageBase64 = '';
      if (uploadedFile) {
        imageBase64 = await exportUploadedImage(uploadedFile);
      } else if (excalidrawAPI) {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();
        imageBase64 = await exportSketch(elements, appState, files);
      }

      // 1. Instant Sketch Cache Lookup (0 tokens, instant response)
      // Hash is namespaced by business_type so different types never collide
      const sketchHash = await hashSketch(imageBase64, project.business_type);
      const cached = getCachedSketchResult(sketchHash);
      if (cached && cached.isAiGenerated !== false) {
        setCacheNotice('Instant sketch cache hit — 0 tokens used.');
        setTimeout(() => setCacheNotice(null), 4000);
        setUsingSavedExample(false);
        setFallbackReason(null);
        await saveAndRenderVersion(cached.layout, imageBase64, cached.html);
        setMobileTab('preview');
        setInstructionText('');
        setIsGenerating(false);
        setGenerationStep('');
        return;
      }

      // 2. Try Edge Function / AI Vision Generation
      let layout: SiteLayout | null = null;
      let html: string = '';
      let isAiGenerated = false;

      if (isSupabaseConfigured && navigator.onLine) {
        try {
          const res = await api.sketchToLayout({
            imageBase64,
            businessType: project.business_type,
            businessName: project.business_name,
            language: project.language,
            voiceText: instructionText,
          });
          layout = res.layout;
          isAiGenerated = true;

          try {
            const htmlRes = await api.layoutToHtml({
              layoutJson: layout,
              language: project.language,
              whatsappNumber: project.whatsapp_number,
              projectId: project.id,
              address: project.address,
            });
            html = htmlRes.html;
          } catch {
            html = sanitizeHtml(renderSite(layout, project.language, project.whatsapp_number, { projectId: project.id, address: project.address, openingHours: project.opening_hours }));
          }

          setUsingSavedExample(false);
          setFallbackReason(null);
        } catch (edgeErr: any) {
          console.warn('Edge Function or Gemini free-tier error:', edgeErr);
          layout = null;
          isAiGenerated = false;
          if (edgeErr.code === 'GEMINI_RATE_LIMITED' || edgeErr.status === 429) {
            setFallbackReason('Gemini free-tier quota rate limit reached (HTTP 429). Loaded customized layout.');
          } else if (edgeErr.code === 'GEMINI_NOT_CONFIGURED') {
            setFallbackReason('Gemini API key is not configured in Supabase. Loaded customized layout.');
          } else {
            setFallbackReason(`AI generation unavailable (${edgeErr.message || 'Network error'}). Loaded customized layout.`);
          }
        }
      }

      // 3. Fallback: If Edge Function failed, rate limited (429), or offline: load category-tailored sample
      if (!layout) {
        setUsingSavedExample(true);
        if (!fallbackReason) {
          setFallbackReason(navigator.onLine ? 'AI generation service unavailable. Loaded customized layout.' : 'Offline mode active. Loaded customized layout.');
        }
        const sample = buildSamplePage({
          businessName: project.business_name,
          businessType: project.business_type,
          language: project.language,
          whatsappNumber: project.whatsapp_number,
          projectId: project.id,
          address: project.address,
        });
        layout = sample.layout;
        html = sample.html;
      }

      // 4. Cache and commit version: ONLY cache if genuinely AI generated!
      if (isAiGenerated && layout) {
        setCachedSketchResult(sketchHash, layout, html, project.business_type, true);
      }
      await saveAndRenderVersion(layout, imageBase64, html);

      setMobileTab('preview');
      setInstructionText('');
    } catch (err: any) {
      console.error('Generation error, activating demo safety:', err);
      setUsingSavedExample(true);
      setFallbackReason(`Generation error: ${err.message || 'Demo fallback activated'}`);
      const sample = buildSamplePage({
        businessName: project.business_name,
        businessType: project.business_type,
        language: project.language,
        whatsappNumber: project.whatsapp_number,
        projectId: project.id,
      });
      await saveAndRenderVersion(sample.layout, '', sample.html);
      setMobileTab('preview');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Edit Region Handler
  const handleEditRegion = async () => {
    if (!project || !currentLayout || !instructionText.trim()) return;
    setIsEditingRegion(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured) {
        const res = await api.editRegion({
          currentLayoutJson: currentLayout,
          instructionText,
          sectionId: selectedSectionId,
        });
        await saveAndRenderVersion(res.layout);
      } else {
        // Offline simple title/content update
        const updated = JSON.parse(JSON.stringify(currentLayout)) as SiteLayout;
        if (selectedSectionId) {
          const sec = updated.sections.find((s: any) => s.id === selectedSectionId);
          if (sec) sec.subtitle = instructionText;
        } else {
          updated.sections[1].subtitle = instructionText;
        }
        await saveAndRenderVersion(updated);
      }
      setInstructionText('');
      setSelectedSectionId(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to edit section');
    } finally {
      setIsEditingRegion(false);
    }
  };

  // Change Language Handler
  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    if (!project || !currentLayout || newLang === project.language) return;
    setIsGenerating(true);
    setGenerationStep(`Translating to ${newLang.toUpperCase()}`);

    try {
      const updatedProject = { ...project, language: newLang };
      setProject(updatedProject);

      if (isSupabaseConfigured) {
        try {
          const res = await api.editRegion({
            currentLayoutJson: currentLayout,
            targetLanguage: newLang,
          });
          if (res.layout) {
            await saveAndRenderVersion(res.layout);
          } else {
            throw new Error('Translation returned no layout');
          }
        } catch {
          const fallback = FALLBACK_LAYOUTS[newLang];
          fallback.theme.businessName = project.business_name;
          await saveAndRenderVersion(fallback);
        }
      } else {
        const fallback = FALLBACK_LAYOUTS[newLang];
        fallback.theme.businessName = project.business_name;
        await saveAndRenderVersion(fallback);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Translation failed');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Publish / Unpublish Flow
  const handlePublish = async () => {
    if (!project) return;
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      // 1. Ensure a version exists and is linked
      if (!currentLayout || !currentHtml) {
        throw new Error('Please generate your website before publishing.');
      }

      if (!project.current_version_id && currentLayout) {
        // Save current version first
        await saveAndRenderVersion(currentLayout, '', currentHtml);
      }

      const slug = project.slug;
      setPublishedSlug(slug);

      const siteUrl = `${window.location.origin}/site/${slug}`;
      const qrData = await QRCode.toDataURL(siteUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#1F3D33', light: '#FFFFFF' },
      });
      setQrCodeDataUrl(qrData);

      if (isSupabaseConfigured) {
        await api.publishSite(project.id);
      }

      setProject((prev) => (prev ? { ...prev, is_published: true } : null));
      setIsPublishModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish website');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!project) return;
    setIsPublishing(true);
    try {
      if (isSupabaseConfigured) {
        await api.unpublishSite(project.id);
      }
      setProject((prev) => (prev ? { ...prev, is_published: false } : null));
      setIsPublishModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unpublish');
    } finally {
      setIsPublishing(false);
    }
  };

  // Download QR Code PNG
  const downloadQrCode = () => {
    if (!qrCodeDataUrl || !project) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `${project.slug}-qrcode.png`;
    a.click();
  };

  // Download A4 Printable Poster PNG (Canvas Render)
  const downloadPoster = async () => {
    if (!project || !publishedSlug) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1131; // Standard A4 ratio
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Forest Green Border
    ctx.strokeStyle = '#1F3D33';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Header Background Accent
    ctx.fillStyle = '#1F3D33';
    ctx.fillRect(37, 37, canvas.width - 74, 180);

    // Business Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(project.business_name, canvas.width / 2, 120);

    ctx.fillStyle = '#D6F26B';
    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Order & Reserve Online', canvas.width / 2, 160);

    // QR Code Image
    const qrImg = new Image();
    qrImg.src = qrCodeDataUrl;
    await new Promise((r) => (qrImg.onload = r));
    ctx.drawImage(qrImg, canvas.width / 2 - 190, 290, 380, 380);

    // Callout Text
    ctx.fillStyle = '#14221B';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Scan to book', canvas.width / 2, 740);

    ctx.fillStyle = '#5E6B63';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Point your phone camera here to visit our live page', canvas.width / 2, 790);

    ctx.fillStyle = '#2F6B4F';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${window.location.origin}/site/${publishedSlug}`, canvas.width / 2, 840);

    // Footer info
    ctx.fillStyle = '#5E6B63';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('WhatsApp booking & table reservations enabled', canvas.width / 2, 1010);
    ctx.fillText('Powered by PaperSite', canvas.width / 2, 1050);

    // Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${project.slug}-poster.png`;
    a.click();
  };

  // Injected Section Outline Inspector Script
  const getInspectedSrcDoc = () => {
    if (!currentHtml) return '';
    const inspectorInjection = `
      <style>
        [data-section-id] {
          transition: outline 0.15s ease-in-out;
        }
        [data-section-id]:hover {
          outline: 2px dashed #2F6B4F !important;
          outline-offset: 2px !important;
          cursor: pointer !important;
        }
        [data-section-id].ps-selected-active {
          outline: 3px solid #1F3D33 !important;
          outline-offset: 3px !important;
        }
      </style>
      <script>
        (function() {
          document.addEventListener('click', function(e) {
            const sec = e.target.closest('[data-section-id]');
            if (!sec) return;
            e.preventDefault();
            document.querySelectorAll('.ps-selected-active').forEach(function(el) {
              el.classList.remove('ps-selected-active');
            });
            sec.classList.add('ps-selected-active');
            var sId = sec.getAttribute('data-section-id');
            window.parent.postMessage({ type: 'SECTION_CLICKED', sectionId: sId }, '*');
          }, true);
        })();
      </script>
    `;
    return currentHtml.replace('</body>', `${inspectorInjection}</body>`);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* 1. TOP BAR */}
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-[#E3E8E4] flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg text-[#5E6B63] hover:text-[#14221B] hover:bg-[#F4F6F4]"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#14221B] truncate leading-tight">
              {project?.business_name || 'Loading...'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#5E6B63]">
              <span className="capitalize">{project?.business_type}</span>
              <span>•</span>
              {project?.is_published ? (
                <span className="text-[#1F8A4C] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A4C]" />
                  Published
                </span>
              ) : (
                <span>Draft</span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Chips */}
          {project && (
            <LanguageChips
              size="sm"
              value={project.language}
              onChange={handleLanguageChange}
              className="hidden lg:inline-flex"
            />
          )}

          {/* Versions Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              icon={<History className="w-4 h-4 text-[#5E6B63]" />}
              onClick={() => setIsVersionsOpen(!isVersionsOpen)}
            >
              <span className="hidden sm:inline">Versions</span>
              <span className="text-xs text-[#5E6B63]">({versions.length})</span>
            </Button>

            {isVersionsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#E3E8E4] shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-xs font-bold text-[#5E6B63] uppercase px-3 py-2 border-b border-[#E3E8E4]">
                  Version history
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {versions.map((ver, idx) => (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => {
                        setCurrentVersion(ver);
                        setCurrentLayout(ver.layout_json);
                        setCurrentHtml(ver.html);
                        setIsVersionsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                        ver.id === currentVersion?.id
                          ? 'bg-[#F4F6F4] font-semibold text-[#1F3D33]'
                          : 'hover:bg-gray-50 text-[#14221B]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#5E6B63]" />
                        <span>Version {versions.length - idx}</span>
                      </span>
                      <span className="text-[10px] text-[#5E6B63]">
                        {new Date(ver.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generate Button (Lime) */}
          <Button
            variant="accent"
            size="sm"
            data-testid="generate-btn"
            onClick={() => handleGenerate()}
            isLoading={isGenerating}
            icon={<Sparkles className="w-4 h-4" />}
            className="font-bold shadow-xs"
          >
            <span>{isGenerating ? generationStep || 'Generating' : 'Generate'}</span>
          </Button>

          {/* Publish / Publish Changes Button */}
          <Button
            variant="primary"
            size="sm"
            data-testid="publish-btn"
            onClick={handlePublish}
            isLoading={isPublishing}
            icon={<Share2 className="w-4 h-4" />}
          >
            <span>{project?.is_published ? 'Publish changes' : 'Publish'}</span>
          </Button>

          {/* Demo Tips (?) Button */}
          <button
            type="button"
            onClick={() => setIsDemoTipsOpen(true)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E3E8E4] text-[#5E6B63] hover:text-[#14221B] hover:border-[#2F6B4F]/40 flex items-center justify-center shadow-2xs transition"
            title="Demo Tips & 5-Step Order (?)"
            aria-label="Demo Tips"
          >
            <HelpCircle className="w-4 h-4 text-[#2F6B4F]" />
          </button>
        </div>
      </header>

      {/* "Using a saved example" notification banner */}
      {usingSavedExample && (
        <div
          role="alert"
          className="px-4 py-2.5 bg-[#FEF3C7] border-b border-[#F59E0B]/30 flex items-center justify-between gap-3 text-xs sm:text-sm text-[#92400E] animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-[#B45309] text-white text-[10px] font-bold uppercase tracking-wide">
              Saved Example
            </span>
            <span className="font-bold text-[#92400E]">Using a saved example</span>
            <span className="hidden sm:inline text-[#78350F]">
              — {fallbackReason || `Loaded tailored ${project?.business_type || 'shop'} layout template.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUsingSavedExample(false)}
            className="p-1 rounded text-[#5E6B63] hover:text-[#14221B]"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Instant Cache Notice Banner */}
      {cacheNotice && (
        <div
          role="status"
          className="px-4 py-2 bg-[#F4F6F4] border-b border-[#E3E8E4] flex items-center justify-between text-xs text-[#2F6B4F] font-medium animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <span>{cacheNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setCacheNotice(null)}
            className="text-[#5E6B63] hover:text-[#14221B]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <ErrorBanner
            title="Notice"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-[#E3E8E4] bg-[#F4F6F4] p-1">
        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
            mobileTab === 'canvas' ? 'bg-white text-[#1F3D33] shadow-xs' : 'text-[#5E6B63]'
          }`}
        >
          Canvas Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
            mobileTab === 'preview' ? 'bg-white text-[#1F3D33] shadow-xs' : 'text-[#5E6B63]'
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* 2. SPLIT WORKSPACE: 50% Canvas, 50% Preview */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* LEFT PANE: Excalidraw Canvas & Upload */}
        <div
          className={`flex-1 flex flex-col min-w-0 border-r border-[#E3E8E4] relative ${
            mobileTab === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Canvas Sub-bar */}
          <div className="h-10 px-4 bg-[#F4F6F4] border-b border-[#E3E8E4] flex items-center justify-between text-xs text-[#5E6B63]">
            <span>Draw boxes & titles for your shop layout</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleGenerate(file);
                  }
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-[#E3E8E4] text-[#14221B] font-medium hover:bg-gray-50 shadow-2xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#2F6B4F]" />
                <span>Upload photo of your sketch</span>
              </button>
            </div>
          </div>

          {/* Excalidraw Container */}
          <div className="flex-1 w-full h-full relative">
            <Excalidraw
              excalidrawAPI={(api) => setExcalidrawAPI(api)}
              initialData={{
                appState: {
                  viewBackgroundColor: '#FFFFFF',
                  currentItemFontFamily: 1,
                },
              }}
            />
          </div>
        </div>

        {/* RIGHT PANE: Sandboxed Live Preview & Inline Edit Bar */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-[#F4F6F4] relative ${
            mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Preview Controls Bar */}
          <div className="h-10 px-4 bg-white border-b border-[#E3E8E4] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#5E6B63]">
              <span className="font-semibold text-[#14221B]">Live Preview</span>
              {selectedSectionId && (
                <Pill variant="green" size="sm">
                  <span>Selected: {selectedSectionId}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSectionId(null)}
                    className="ml-1 hover:text-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Pill>
              )}
            </div>

            {/* Device Width Toggle */}
            <div className="flex items-center gap-1 bg-[#F4F6F4] p-0.5 rounded-lg border border-[#E3E8E4]">
              <button
                type="button"
                onClick={() => setPreviewDevice('phone')}
                className={`p-1 rounded ${
                  previewDevice === 'phone' ? 'bg-white text-[#1F3D33] shadow-xs' : 'text-[#5E6B63]'
                }`}
                title="Phone view (375px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1 rounded ${
                  previewDevice === 'desktop' ? 'bg-white text-[#1F3D33] shadow-xs' : 'text-[#5E6B63]'
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sandboxed iframe container */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {currentHtml ? (
              <div
                className={`transition-all bg-white shadow-md rounded-2xl overflow-hidden border border-[#E3E8E4] ${
                  previewDevice === 'phone' ? 'w-[375px] h-[660px]' : 'w-full h-full'
                }`}
              >
                <iframe
                  title="Sandboxed Site Preview"
                  data-testid="preview-iframe"
                  sandbox="allow-scripts allow-forms"
                  srcDoc={getInspectedSrcDoc()}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="text-center p-8 max-w-sm">
                <Sparkles className="w-10 h-10 text-[#2F6B4F] mx-auto mb-3 opacity-60" />
                <h4 className="font-bold text-sm text-[#14221B]">No preview generated yet</h4>
                <p className="text-xs text-[#5E6B63] mt-1">
                  Sketch your boxes on the left or upload a photo, then tap Generate to build your website.
                </p>
              </div>
            )}
          </div>

          {/* 3. EDIT REGION & VOICE BAR */}
          <div className="p-3 bg-white border-t border-[#E3E8E4] flex items-center gap-2 shrink-0">
            {/* Mic Button */}
            {speechSupported ? (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition-all ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                    : 'bg-[#F4F6F4] text-[#14221B] border-[#E3E8E4] hover:bg-gray-100'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Speak instruction in English, Telugu, or Hindi'}
                aria-label="Voice input"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            ) : (
              <div className="p-2 text-[#5E6B63]" title="Web Speech API not supported in this browser. Use Chrome.">
                <HelpCircle className="w-4 h-4 opacity-50" />
              </div>
            )}

            {/* Instruction Input Box */}
            <div className="flex-1 relative">
              <input
                type="text"
                data-testid="instruction-input"
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditRegion();
                }}
                placeholder={
                  selectedSectionId
                    ? `Change selected section (${selectedSectionId})...`
                    : 'Type or speak a change (e.g. "Add a cold brew to menu")...'
                }
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#E3E8E4] bg-white focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>

            {/* Apply Edit Button */}
            <Button
              variant="primary"
              size="sm"
              data-testid="apply-edit-btn"
              onClick={handleEditRegion}
              isLoading={isEditingRegion}
              disabled={!instructionText.trim()}
            >
              <span>Apply</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 7. PUBLISH DIALOG WITH QR CODE & POSTER BUTTON */}
      {isPublishModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="publish-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl border border-[#E3E8E4] shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8E4]">
              <div>
                <h3 className="text-xl font-bold text-[#14221B]">Your website is live!</h3>
                <p className="text-xs text-[#5E6B63] mt-0.5">Share with customers and print your counter QR.</p>
              </div>
              <button
                type="button"
                data-testid="close-publish-modal-btn"
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 rounded-md text-[#5E6B63] hover:text-[#14221B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 my-6 text-center">
              {/* QR Code Preview */}
              {qrCodeDataUrl && (
                <div className="p-4 bg-white rounded-2xl border-2 border-[#1F3D33] inline-block shadow-xs">
                  <img src={qrCodeDataUrl} alt="Website QR Code" className="w-48 h-48 mx-auto" />
                </div>
              )}

              {/* Public Link Box with Copy */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F4F6F4] border border-[#E3E8E4] text-xs">
                <span data-testid="published-site-url" className="truncate flex-1 font-mono text-[#14221B] text-left pl-2">
                  {window.location.origin}/site/{publishedSlug}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/site/${publishedSlug}`);
                    setHasCopiedLink(true);
                    setTimeout(() => setHasCopiedLink(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E3E8E4] font-semibold text-[#1F3D33] hover:bg-gray-50 flex items-center gap-1 shadow-2xs"
                >
                  {hasCopiedLink ? <Check className="w-3.5 h-3.5 text-[#1F8A4C]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Action Buttons: Download QR & Download Poster */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQrCode}
                  icon={<Download className="w-4 h-4 text-[#2F6B4F]" />}
                >
                  <span>Download QR</span>
                </Button>

                <Button
                  variant="accent"
                  size="sm"
                  onClick={downloadPoster}
                  icon={<Download className="w-4 h-4 text-[#1F3D33]" />}
                >
                  <span>Download poster</span>
                </Button>
              </div>

              <div className="pt-2">
                <Link
                  to={`/site/${publishedSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F6B4F] hover:underline"
                >
                  <span>Open published site in new tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Unpublish action */}
            <div className="pt-4 border-t border-[#E3E8E4] flex items-center justify-between">
              <button
                type="button"
                onClick={handleUnpublish}
                className="text-xs text-[#C8382F] hover:underline font-medium"
              >
                Unpublish website
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPublishModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Tips Modal */}
      <DemoTipsModal
        isOpen={isDemoTipsOpen}
        onClose={() => setIsDemoTipsOpen(false)}
      />
    </div>
  );
};
