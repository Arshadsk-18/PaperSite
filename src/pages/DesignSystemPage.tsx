import React, { useState } from 'react';
import {
  Button,
  Card,
  Pill,
  Toast,
  Spinner,
  Skeleton,
  EmptyState,
  ErrorBanner,
  LanguageChips,
} from '../components/ui';
import { Sparkles, Calendar, Coffee, ArrowRight } from 'lucide-react';
import type { SupportedLanguage } from '../types';

export const DesignSystemPage: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const [btnLoading, setBtnLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>('Project published successfully');
  const [showErrorBanner, setShowErrorBanner] = useState(true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Header */}
      <div className="border-b border-[#E3E8E4] pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D6F26B] text-[#1F3D33] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PaperSite Design System</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#14221B] tracking-tight mb-3">
          Clean, calm, & <span className="font-serif italic text-3xl sm:text-4xl text-[#2F6B4F]">trustworthy</span>
        </h1>
        <p className="text-base sm:text-lg text-[#5E6B63] max-w-2xl leading-relaxed">
          Showcase of design tokens, interactive components, regional typography, and accessibility states.
        </p>
      </div>

      {/* 1. Color Tokens Showcase */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">1. Color Palette Tokens</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-[#E3E8E4] bg-white">
            <div className="w-full h-12 rounded-lg bg-white border border-[#E3E8E4] mb-2" />
            <div className="text-xs font-bold text-[#14221B]">Background</div>
            <div className="text-[11px] font-mono text-[#5E6B63]">#FFFFFF</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E3E8E4] bg-white">
            <div className="w-full h-12 rounded-lg bg-[#F4F6F4] border border-[#E3E8E4] mb-2" />
            <div className="text-xs font-bold text-[#14221B]">Surface</div>
            <div className="text-[11px] font-mono text-[#5E6B63]">#F4F6F4</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E3E8E4] bg-white">
            <div className="w-full h-12 rounded-lg bg-[#1F3D33] mb-2" />
            <div className="text-xs font-bold text-[#14221B]">Forest (Dark)</div>
            <div className="text-[11px] font-mono text-[#5E6B63]">#1F3D33</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E3E8E4] bg-white">
            <div className="w-full h-12 rounded-lg bg-[#2F6B4F] mb-2" />
            <div className="text-xs font-bold text-[#14221B]">Green (Button)</div>
            <div className="text-[11px] font-mono text-[#5E6B63]">#2F6B4F</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E3E8E4] bg-white">
            <div className="w-full h-12 rounded-lg bg-[#D6F26B] mb-2" />
            <div className="text-xs font-bold text-[#14221B]">Lime (Accent CTA)</div>
            <div className="text-[11px] font-mono text-[#5E6B63]">#D6F26B</div>
          </div>
        </div>
      </section>

      {/* 2. Typography & Headline Accents */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">2. Typography & Accent Styles</h2>
        <Card variant="surface" padding="lg">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5E6B63]">Headline with One Italic Serif Accent Word</span>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#14221B] tracking-tight mt-1">
                Draw your shop. Go live in <span className="font-serif italic font-normal text-4xl sm:text-5xl text-[#2F6B4F]">60 seconds</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E3E8E4]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5E6B63]">Telugu Unicode Rendering</span>
                <p className="text-lg font-medium text-[#14221B] mt-1 font-telugu">
                  మీ దుకాణం కోసం వెబ్‌సైట్‌ను సులభంగా తయారు చేయండి.
                </p>
                <p className="text-xs text-[#5E6B63] mt-0.5">Noto Sans Telugu: "తెలుగు"</p>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5E6B63]">Hindi Unicode Rendering</span>
                <p className="text-lg font-medium text-[#14221B] mt-1 font-hindi">
                  अपनी दुकान के लिए सिर्फ 60 सेकंड में वेबसाइट बनाएं।
                </p>
                <p className="text-xs text-[#5E6B63] mt-0.5">Noto Sans Devanagari: "हिन्दी"</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Button Component (Every Variant, Size, and State) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#14221B] tracking-tight">3. Buttons (Min 44px Mobile Touch Target)</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBtnLoading(!btnLoading)}
          >
            Toggle loading state
          </Button>
        </div>

        <Card padding="lg">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5E6B63] mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" isLoading={btnLoading}>
                  Publish website
                </Button>
                <Button variant="accent" isLoading={btnLoading} icon={<Sparkles className="w-4 h-4" />}>
                  Create with AI
                </Button>
                <Button variant="ghost">
                  Discard changes
                </Button>
                <Button variant="outline">
                  Save draft
                </Button>
                <Button variant="danger">
                  Unpublish site
                </Button>
                <Button variant="primary" disabled>
                  Disabled state
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E3E8E4]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5E6B63] mb-3">Sizes</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm" variant="primary">
                  Small button
                </Button>
                <Button size="md" variant="primary">
                  Medium button (default)
                </Button>
                <Button size="lg" variant="accent" icon={<ArrowRight className="w-4 h-4" />}>
                  Large call to action
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. Language Chips */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">4. Regional Language Chips</h2>
        <Card padding="md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#14221B]">Select website generation language</h4>
              <p className="text-xs text-[#5E6B63] mt-0.5">Currently active: <strong>{selectedLang.toUpperCase()}</strong></p>
            </div>
            <LanguageChips value={selectedLang} onChange={setSelectedLang} />
          </div>
        </Card>
      </section>

      {/* 5. Pills & Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">5. Pills & Status Badges</h2>
        <Card padding="md">
          <div className="flex flex-wrap gap-2.5 items-center">
            <Pill variant="green" icon={<Calendar className="w-3.5 h-3.5" />}>
              Confirmed
            </Pill>
            <Pill variant="lime">
              New booking
            </Pill>
            <Pill variant="forest">
              Published
            </Pill>
            <Pill variant="surface" icon={<Coffee className="w-3.5 h-3.5" />}>
              Café & Bakery
            </Pill>
            <Pill variant="muted">
              Completed
            </Pill>
            <Pill variant="danger">
              Cancelled
            </Pill>
          </div>
        </Card>
      </section>

      {/* 6. Cards & Surfaces */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">6. Cards & Surfaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="white">
            <h3 className="font-bold text-base mb-1">White Card</h3>
            <p className="text-xs text-[#5E6B63] leading-relaxed">
              Standard content containers with soft subtle borders and high contrast.
            </p>
          </Card>

          <Card variant="surface">
            <h3 className="font-bold text-base mb-1">Surface Card</h3>
            <p className="text-xs text-[#5E6B63] leading-relaxed">
              Muted grey surface `#F4F6F4` for secondary groupings and form panels.
            </p>
          </Card>

          <Card variant="forest">
            <h3 className="font-bold text-base mb-1 text-white">Forest Block</h3>
            <p className="text-xs text-[#E3E8E4]/80 leading-relaxed">
              Deep forest green `#1F3D33` for high-impact callout banners and summaries.
            </p>
          </Card>
        </div>
      </section>

      {/* 7. Feedback & Alerts */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">7. Notifications & Banners</h2>
        <div className="space-y-3">
          {showErrorBanner && (
            <ErrorBanner
              title="Failed to generate site layout"
              message="The image was unclear. Please try sketching with higher contrast or provide voice notes."
              onDismiss={() => setShowErrorBanner(false)}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {toastMessage && (
              <Toast
                type="success"
                message={toastMessage}
                onClose={() => setToastMessage(null)}
              />
            )}
            <Toast type="error" message="Unable to submit booking" />
            <Toast type="info" message="Live bookings enabled" />
          </div>
        </div>
      </section>

      {/* 8. Skeletons & Spinners */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">8. Spinners & Shimmer Skeletons</h2>
        <Card padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="flex items-center gap-4">
              <Spinner size="sm" color="forest" />
              <Spinner size="md" color="green" />
              <Spinner size="lg" color="forest" />
            </div>

            <div className="space-y-2">
              <Skeleton width="60%" height="20px" />
              <Skeleton width="100%" height="14px" />
              <Skeleton width="80%" height="14px" />
            </div>
          </div>
        </Card>
      </section>

      {/* 9. Empty State */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#14221B] tracking-tight">9. Empty State</h2>
        <EmptyState
          icon={<Coffee className="w-7 h-7" />}
          title="No projects created yet"
          description="Draw your first shop layout or upload a paper napkin sketch to generate your website."
          action={{
            label: "Create new website",
            onClick: () => alert('Action clicked!'),
            variant: "accent",
          }}
        />
      </section>
    </div>
  );
};
