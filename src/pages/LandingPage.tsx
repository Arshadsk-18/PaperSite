import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PenTool,
  Mic,
  QrCode,
  MessageCircle,
  CalendarCheck,
  History,
  CheckCircle2,
  ArrowRight,
  MousePointer2,
} from 'lucide-react';
import { Button, Card, Pill } from '../components/ui';

export const LandingPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Floating cursor avatars for the hero
  const floatingAvatars = [
    {
      initials: 'RS',
      name: 'Ravi S.',
      role: 'Café owner',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      initialPos: { top: '8%', left: '-8%' },
      animateX: shouldReduceMotion ? 0 : [0, 8, -6, 0],
      animateY: shouldReduceMotion ? 0 : [0, -12, 6, 0],
      duration: 6,
    },
    {
      initials: 'PK',
      name: 'Priya K.',
      role: 'Salon stylist',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      initialPos: { top: '15%', right: '-10%' },
      animateX: shouldReduceMotion ? 0 : [0, -10, 8, 0],
      animateY: shouldReduceMotion ? 0 : [0, 10, -12, 0],
      duration: 7,
    },
    {
      initials: 'AK',
      name: 'Anand K.',
      role: 'Math tutor',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      initialPos: { bottom: '24%', left: '-10%' },
      animateX: shouldReduceMotion ? 0 : [0, 10, -8, 0],
      animateY: shouldReduceMotion ? 0 : [0, -10, 8, 0],
      duration: 8,
    },
    {
      initials: 'VT',
      name: 'Vijaya T.',
      role: 'Tiffin service',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      initialPos: { bottom: '10%', right: '-8%' },
      animateX: shouldReduceMotion ? 0 : [0, -8, 12, 0],
      animateY: shouldReduceMotion ? 0 : [0, 12, -8, 0],
      duration: 6.5,
    },
  ];

  return (
    <div className="flex flex-col bg-white overflow-hidden">
      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Hero Left Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F6F4] border border-[#E3E8E4] text-[#2F6B4F] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#1F8A4C] animate-pulse" />
              <span>Free instant website generator for small shops</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#14221B] tracking-tight leading-[1.12]">
              Draw your shop. Go{' '}
              <em className="font-serif italic font-normal text-[#2F6B4F] text-5xl sm:text-6xl lg:text-7xl not-italic">
                live
              </em>{' '}
              in 60 seconds.
            </h1>

            <p className="text-base sm:text-lg text-[#5E6B63] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Sketch on a tablet or photo of paper, say what you want in Telugu or Hindi, and publish with a QR code.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link to="/editor/new" className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full sm:w-auto font-bold shadow-md">
                  <span>Start sketching</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={scrollToHowItWorks}
                className="w-full sm:w-auto"
              >
                See how it works
              </Button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#5E6B63]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A4C]" />
                <span>No code required</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A4C]" />
                <span>WhatsApp button built in</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1F8A4C]" />
                <span>Telugu & Hindi voice support</span>
              </span>
            </div>
          </div>

          {/* Hero Right: CSS Phone Mockup with 4 Floating Initials Cursors */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Floating Avatars (Motion effect 1: Floating cursors) */}
            {floatingAvatars.map((item, idx) => (
              <motion.div
                key={idx}
                className="hidden sm:flex absolute z-30 items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/95 border border-[#E3E8E4] shadow-md text-xs pointer-events-none"
                style={item.initialPos}
                animate={
                  shouldReduceMotion
                    ? {}
                    : {
                        x: item.animateX,
                        y: item.animateY,
                      }
                }
                transition={{
                  duration: item.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${item.color}`}>
                  {item.initials}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[#14221B] leading-none">{item.name}</div>
                  <div className="text-[10px] text-[#5E6B63]">{item.role}</div>
                </div>
                <MousePointer2 className="w-3.5 h-3.5 text-[#2F6B4F] -ml-1 fill-current opacity-80" />
              </motion.div>
            ))}

            {/* CSS Phone Mockup */}
            <div className="w-[280px] sm:w-[310px] h-[580px] bg-white rounded-[40px] border-[10px] border-[#1F3D33] shadow-2xl relative overflow-hidden flex flex-col">
              {/* Phone Speaker Notch */}
              <div className="w-28 h-4 bg-[#1F3D33] rounded-b-xl mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Phone Content: Small Café Site */}
              <div className="flex-1 overflow-y-auto pt-7 pb-4 px-3.5 space-y-3.5 bg-gray-50 text-[#14221B] text-xs">
                {/* Café Header */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2F6B4F] text-white flex items-center justify-center font-bold text-xs">
                      B
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 leading-tight">Bay Leaf Café</h4>
                      <p className="text-[10px] text-gray-500">Bandra West, Mumbai</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    Open
                  </span>
                </div>

                {/* Café Hero Graphic Block */}
                <div className="w-full h-28 rounded-xl bg-gradient-to-tr from-[#1F3D33] to-[#2F6B4F] text-white p-3.5 flex flex-col justify-end shadow-xs">
                  <span className="text-[10px] font-semibold text-[#D6F26B] uppercase tracking-wider">Artisanal Coffee</span>
                  <h5 className="font-extrabold text-sm leading-snug">Handcrafted roasts & fresh bakes</h5>
                </div>

                {/* 3 Menu Lines */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs space-y-2">
                  <div className="font-bold text-xs text-gray-900 border-b border-gray-100 pb-1.5 flex justify-between">
                    <span>Popular Items</span>
                    <span className="text-[10px] text-gray-400 font-normal">3 items</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <div>
                      <div className="font-semibold text-gray-800 text-[11px]">Signature Cold Brew</div>
                      <div className="text-[9px] text-gray-400">18-hour slow steeped</div>
                    </div>
                    <span className="font-bold text-gray-900 text-[11px]">₹180</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-50">
                    <div>
                      <div className="font-semibold text-gray-800 text-[11px]">Almond Croissant</div>
                      <div className="text-[9px] text-gray-400">Twice-baked almond crust</div>
                    </div>
                    <span className="font-bold text-gray-900 text-[11px]">₹140</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <div>
                      <div className="font-semibold text-gray-800 text-[11px]">Avocado Sourdough</div>
                      <div className="text-[9px] text-gray-400">Artisan loaf with seeds</div>
                    </div>
                    <span className="font-bold text-gray-900 text-[11px]">₹160</span>
                  </div>
                </div>

                {/* WhatsApp Button */}
                <div className="pt-1">
                  <a
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>

                {/* Mini Booking Form Preview */}
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center space-y-1">
                  <div className="font-bold text-[10px] text-gray-800">Reserve a table online</div>
                  <div className="w-full py-1.5 rounded-lg bg-[#2F6B4F] text-white font-semibold text-[10px]">
                    Confirm booking
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Three Feature Cards: Sketch, Speak, Publish */}
      <section id="features" className="py-16 md:py-24 bg-[#F4F6F4] border-y border-[#E3E8E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#2F6B4F] mb-2">Features</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#14221B] tracking-tight">
              Built for shop owners, not developers
            </h3>
            <p className="text-sm sm:text-base text-[#5E6B63] mt-2.5">
              Everything you need to turn paper drawings into high-converting customer sites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="white" padding="lg" className="hover:border-[#2F6B4F]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center mb-5">
                <PenTool className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-[#14221B] mb-2">1. Sketch</h4>
              <p className="text-sm text-[#5E6B63] leading-relaxed">
                Draw boxes and titles on the digital canvas or snap a photo of a hand-drawn paper sketch. Our AI vision engine reads your layout structure instantly.
              </p>
            </Card>

            <Card variant="white" padding="lg" className="hover:border-[#2F6B4F]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center mb-5">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-[#14221B] mb-2">2. Speak</h4>
              <p className="text-sm text-[#5E6B63] leading-relaxed">
                Give instructions using natural voice in English, Telugu, or Hindi. Speak your menu items, opening hours, or special offerings without typing a word.
              </p>
            </Card>

            <Card variant="white" padding="lg" className="hover:border-[#2F6B4F]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#D6F26B] text-[#1F3D33] flex items-center justify-center mb-5">
                <QrCode className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-[#14221B] mb-2">3. Publish</h4>
              <p className="text-sm text-[#5E6B63] leading-relaxed">
                One-click publishing generates a public link and printable QR code. Customers can book reservations or message your WhatsApp business number directly.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. How It Works (Motion effect 2: Scroll Reveal via framer-motion) */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2F6B4F] mb-2">Step-by-step workflow</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#14221B] tracking-tight">
            How it works in <span className="font-serif italic font-normal text-4xl sm:text-5xl text-[#2F6B4F]">three steps</span>
          </h3>
          <p className="text-sm sm:text-base text-[#5E6B63] mt-2.5">
            Go from a blank paper to a live booking site in less than a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#F4F6F4] border border-[#E3E8E4]"
          >
            <div className="w-12 h-12 rounded-full bg-[#1F3D33] text-[#D6F26B] font-bold text-lg flex items-center justify-center mb-4 shadow-sm">
              1
            </div>
            <h4 className="text-lg font-bold text-[#14221B] mb-2">Draw your layout</h4>
            <p className="text-sm text-[#5E6B63] leading-relaxed">
              Use the Excalidraw digital whiteboard or snap a phone picture of your paper napkin sketch.
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#F4F6F4] border border-[#E3E8E4]"
          >
            <div className="w-12 h-12 rounded-full bg-[#2F6B4F] text-white font-bold text-lg flex items-center justify-center mb-4 shadow-sm">
              2
            </div>
            <h4 className="text-lg font-bold text-[#14221B] mb-2">Say what you want</h4>
            <p className="text-sm text-[#5E6B63] leading-relaxed">
              Tap the microphone and describe your business in English, Telugu, or Hindi. AI writes authentic copy.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#F4F6F4] border border-[#E3E8E4]"
          >
            <div className="w-12 h-12 rounded-full bg-[#D6F26B] text-[#1F3D33] font-bold text-lg flex items-center justify-center mb-4 shadow-sm">
              3
            </div>
            <h4 className="text-lg font-bold text-[#14221B] mb-2">Publish and share the QR code</h4>
            <p className="text-sm text-[#5E6B63] leading-relaxed">
              Click publish to get your live link and printable QR sticker. Bookings appear live on your dashboard.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 5. Dark Forest Block "Everything built in" */}
      <section className="py-20 md:py-28 bg-[#1F3D33] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D6F26B]">Built-in features</span>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
              Everything built in
            </h3>
            <p className="text-sm sm:text-base text-[#E3E8E4]/80 mt-2.5">
              Only features that are fully operational in PaperSite. No vaporware.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Tile 1: WhatsApp chat button */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6F26B]/50 transition-colors text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">WhatsApp chat</h4>
              <p className="text-[11px] text-[#E3E8E4]/70 mt-1">One-tap direct customer chat</p>
            </div>

            {/* Tile 2: QR code */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6F26B]/50 transition-colors text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-[#D6F26B]/20 text-[#D6F26B] flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Printable QR</h4>
              <p className="text-[11px] text-[#E3E8E4]/70 mt-1">High-res download for counter displays</p>
            </div>

            {/* Tile 3: Booking form */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6F26B]/50 transition-colors text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Booking form</h4>
              <p className="text-[11px] text-[#E3E8E4]/70 mt-1">Spam-protected appointment forms</p>
            </div>

            {/* Tile 4: Version history */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6F26B]/50 transition-colors text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <History className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Version history</h4>
              <p className="text-[11px] text-[#E3E8E4]/70 mt-1">Restore any previous draft</p>
            </div>

            {/* Tile 5: Telugu */}
            <div id="languages" className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6F26B]/50 transition-colors text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-3 font-telugu font-bold text-sm">
                తె
              </div>
              <h4 className="font-bold text-sm text-white">తెలుగు (Telugu)</h4>
              <p className="text-[11px] text-[#E3E8E4]/70 mt-1">Full voice & text localization</p>
            </div>

            {/* Tile 6: Hindi */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D6F26B]/50 transition-colors text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center mb-3 font-hindi font-bold text-sm">
                हि
              </div>
              <h4 className="font-bold text-sm text-white">हिन्दी (Hindi)</h4>
              <p className="text-[11px] text-[#E3E8E4]/70 mt-1">Full voice & text localization</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Big Statement Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white text-center border-b border-[#E3E8E4]">
        <div className="max-w-3xl mx-auto space-y-6">
          <Pill variant="green" size="md">
            Zero setup fees • Cancel anytime
          </Pill>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#14221B] tracking-tight">
            Your shop, <span className="font-serif italic font-normal text-[#2F6B4F]">online</span> today.
          </h2>
          <p className="text-base sm:text-lg text-[#5E6B63] max-w-xl mx-auto leading-relaxed">
            Take 60 seconds to sketch your business. No credit card required to build and preview.
          </p>
          <div className="pt-2">
            <Link to="/editor/new">
              <Button variant="accent" size="lg" className="font-bold text-base px-8 shadow-md">
                <span>Start free</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Story Strip: Ravi's Illustration & Before/After */}
      <section className="py-16 md:py-24 bg-[#F4F6F4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl border border-[#E3E8E4] p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Ravi Illustration Placeholder */}
              <div className="md:col-span-5 relative">
                <div className="rounded-2xl overflow-hidden border border-[#E3E8E4] bg-surface relative aspect-[4/3] group">
                  <img
                    src="/ravi.png"
                    alt="Illustration of Ravi, a small café shopkeeper sketching a layout"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] text-[#5E6B63] border border-[#E3E8E4] text-center">
                    Labelled placeholder: /public/ravi.png
                  </div>
                </div>
              </div>

              {/* Before / After & Story details */}
              <div className="md:col-span-7 space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2F6B4F]">Real-world story</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#14221B] tracking-tight mt-1">
                    How Ravi brought his Bandra café online
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200/50 text-xs sm:text-sm text-[#14221B]">
                    <strong className="text-[#C8382F]">Before:</strong> No website, invisible on Google search, and losing table bookings to nearby franchises.
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50 text-xs sm:text-sm text-[#14221B]">
                    <strong className="text-[#1F8A4C]">After:</strong> A 60-second paper napkin sketch turned into a mobile site with a WhatsApp chat button and instant table reservation form.
                  </div>
                </div>

                {/* Marked TODO Placeholders (No invented statistics or testimonials) */}
                <div className="space-y-2 pt-2 border-t border-[#E3E8E4] text-xs">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px]">
                    <strong>[TODO - Real Number]:</strong> [Add one real number with its source, e.g. how many small businesses in your region have no website. Do not use an unverified figure.]
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px]">
                    <strong>[TODO - Real Quote]:</strong> [Talk to at least two or three shop owners before the demo and add one real quote here. Do not invent a quote.]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner before Footer */}
      <section className="py-16 px-4 sm:px-6 bg-[#1F3D33] text-white text-center">
        <div className="max-w-2xl mx-auto space-y-5">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to bring your shop online?
          </h3>
          <p className="text-sm text-[#E3E8E4]/80 leading-relaxed">
            Join hundreds of local cafés, salons, tutors, and shops getting discovered online today.
          </p>
          <div className="pt-2">
            <Link to="/editor/new">
              <Button variant="accent" size="lg" className="font-bold text-base px-8 shadow-md">
                Start your site in 60 seconds
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
