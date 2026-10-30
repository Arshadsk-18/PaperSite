// ==============================================================================
// PaperSite: Demo Tips & 5-Step Presentation Guide
// File: src/components/DemoTipsModal.tsx
// Explains the exact 5-step flow for demo presenters, with safety tips & reset action.
// ==============================================================================

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  PenTool,
  Mic,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui';

export interface DemoTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDemo?: () => Promise<void>;
}

export const DemoTipsModal: React.FC<DemoTipsModalProps> = ({
  isOpen,
  onClose,
  onResetDemo,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async () => {
    if (!onResetDemo) return;
    setIsResetting(true);
    setResetStatus(null);
    try {
      await onResetDemo();
      setResetStatus('Seed project restored and bookings cleared!');
      setTimeout(() => setResetStatus(null), 3000);
    } catch {
      setResetStatus('Reset encountered an issue, but local data was refreshed.');
    } finally {
      setIsResetting(false);
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Open / Create Site',
      desc: 'Start on Dashboard. Select "Brew Bay Café" or tap "New site" to enter the interactive dual-pane editor.',
      icon: <PenTool className="w-4 h-4 text-[#2F6B4F]" />,
      badge: 'Step 1',
    },
    {
      num: 2,
      title: 'Sketch on Canvas',
      desc: 'Draw rough blocks (hero, menu, booking) on Excalidraw, or tap "Upload photo" to pick a napkin sketch.',
      icon: <Sparkles className="w-4 h-4 text-[#2F6B4F]" />,
      badge: 'Step 2',
    },
    {
      num: 3,
      title: 'Voice or Text Prompt',
      desc: 'Tap the mic and speak in Telugu, Hindi, or English (e.g. "Add specialty brews and table reservation"). Tap lime "Generate".',
      icon: <Mic className="w-4 h-4 text-[#2F6B4F]" />,
      badge: 'Step 3',
    },
    {
      num: 4,
      title: 'Live Responsive Preview & Publish',
      desc: 'Toggle phone and desktop width in the sandbox preview. Tap "Publish" to get the live public URL and instant QR code.',
      icon: <Smartphone className="w-4 h-4 text-[#2F6B4F]" />,
      badge: 'Step 4',
    },
    {
      num: 5,
      title: 'Scan QR & Watch Live Bookings',
      desc: 'Open /site/brew-bay on your phone, submit a table booking, and watch it pop up live on /bookings with a chime. Tap "Confirm" to open WhatsApp!',
      icon: <CheckCircle2 className="w-4 h-4 text-[#2F6B4F]" />,
      badge: 'Step 5',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14221B]/40 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[#E3E8E4] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E3E8E4]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#1F3D33] text-[#D6F26B] font-bold flex items-center justify-center text-sm shadow-xs">
              ?
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#14221B] tracking-tight">
                Demo Tips & 5-Step Order
              </h3>
              <p className="text-xs text-[#5E6B63] mt-0.5">
                Recommended sequence for a smooth 60-second walkthrough
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5E6B63] hover:text-[#14221B] hover:bg-[#F4F6F4] transition"
            aria-label="Close demo tips"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Sequence */}
        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {steps.map((s) => (
            <div
              key={s.num}
              className="flex items-start gap-3.5 p-3 rounded-xl bg-[#F4F6F4]/70 border border-[#E3E8E4] hover:border-[#2F6B4F]/30 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-[#E3E8E4] font-bold text-xs text-[#1F3D33] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {s.num}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#14221B]">{s.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-[#2F6B4F] border border-[#E3E8E4]">
                    {s.badge}
                  </span>
                </div>
                <p className="text-xs text-[#5E6B63] mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}

          {/* Safety & Offline Guard */}
          <div className="p-3.5 rounded-xl bg-[#D6F26B]/15 border border-[#2F6B4F]/25 text-[#14221B] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#1F3D33]">
              <ShieldCheck className="w-4 h-4 text-[#2F6B4F]" />
              <span>Offline & Rate-Limit Safety Built-in</span>
            </div>
            <p className="text-[#5E6B63] leading-relaxed">
              • <strong>Instant Sketch Cache:</strong> Repeating the same sketch generates in 0ms without hitting the AI API.<br />
              • <strong>Bad Wi-Fi / Rate Limit:</strong> If the connection drops or free-tier runs out, the saved Brew Bay sample loads automatically with a clear banner.<br />
              • <strong>Emergency Reset:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[11px] border border-[#E3E8E4]">Shift + D</kbd> on the dashboard anytime.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E3E8E4] flex flex-col sm:flex-row items-center justify-between gap-3">
          {resetStatus ? (
            <span className="text-xs font-semibold text-[#1F8A4C]">{resetStatus}</span>
          ) : (
            <span className="text-xs text-[#5E6B63]">
              Keyboard shortcut: <kbd className="font-mono bg-[#F4F6F4] px-1.5 py-0.5 rounded border border-[#E3E8E4]">Shift + D</kbd>
            </span>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onResetDemo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                isLoading={isResetting}
                icon={<RefreshCw className="w-3.5 h-3.5 text-[#2F6B4F]" />}
              >
                Reset demo
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
