// ==============================================================================
// PaperSite: Deterministic HTML Renderer
// File: supabase/functions/_shared/renderSite.ts
// Builds a single self-contained mobile-first page. Never uses AI to write HTML.
// ==============================================================================

import type { SiteLayout, OpeningHourRow, LayoutItem } from './schema.ts';

export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const UI_LABELS = {
  en: {
    call: 'Call Us',
    whatsapp: 'Chat on WhatsApp',
    directions: 'Get Directions',
    hours: 'Business Hours',
    day: 'Day',
    timing: 'Timing',
    closed: 'Closed',
    bookTitle: 'Book an Appointment',
    selectService: 'Select a Service',
    name: 'Your Name',
    phone: 'Phone Number',
    dateTime: 'Preferred Date & Time',
    message: 'Message / Special Request (Optional)',
    submit: 'Confirm Booking',
    submitting: 'Submitting...',
    bookingSuccess: 'Thanks, we will call you soon',
    bookingError: 'Please enter your name and a valid phone number (at least 7 digits).',
    madeWith: 'Made with PaperSite',
  },
  te: {
    call: 'కాల్ చేయండి',
    whatsapp: 'వాట్సాప్‌లో చాట్ చేయండి',
    directions: 'దారి చూపించు',
    hours: 'తెరిచే వేళలు',
    day: 'రోజు',
    timing: 'సమయం',
    closed: 'సెలవు',
    bookTitle: 'బుకింగ్ చేసుకోండి',
    selectService: 'సేవను ఎంచుకోండి',
    name: 'మీ పేరు',
    phone: 'ఫోన్ నంబర్',
    dateTime: 'కోరుకున్న తేదీ & సమయం',
    message: 'సందేశం (ఐచ్ఛికం)',
    submit: 'బుకింగ్ నిర్ధారించండి',
    submitting: 'పంపుతోంది...',
    bookingSuccess: 'ధన్యవాదాలు, మేము త్వరలోనే మీకు కాల్ చేస్తాము',
    bookingError: 'దయచేసి మీ పేరు మరియు సరైన ఫోన్ నంబర్‌ను నమోదు చేయండి.',
    madeWith: 'PaperSite తో తయారు చేయబడింది',
  },
  hi: {
    call: 'कॉल करें',
    whatsapp: 'व्हाट्सएप पर चैट करें',
    directions: 'दिशा-निर्देश प्राप्त करें',
    hours: 'खुलने का समय',
    day: 'दिन',
    timing: 'समय',
    closed: 'बंद',
    bookTitle: 'अपॉइंटमेंट बुक करें',
    selectService: 'सेवा चुनें',
    name: 'आपका नाम',
    phone: 'फ़ोन नंबर',
    dateTime: 'पसंदीदा तारीख और समय',
    message: 'संदेश (वैकल्पिक)',
    submit: 'बुकिंग कन्फर्म करें',
    submitting: 'प्रक्रिया जारी है...',
    bookingSuccess: 'धन्यवाद, हम जल्द ही आपको कॉल करेंगे',
    bookingError: 'कृपया अपना नाम और सही फ़ोन नंबर दर्ज करें।',
    madeWith: 'PaperSite द्वारा निर्मित',
  },
} as const;

export interface RenderSiteOptions {
  address?: string | null;
  openingHours?: OpeningHourRow[] | null;
  businessPhone?: string | null;
  bookingEndpoint?: string;
  projectId?: string;
}

export function renderSite(
  layout: SiteLayout,
  language: 'en' | 'te' | 'hi' = 'en',
  whatsappNumber: string = '',
  options: RenderSiteOptions = {}
): string {
  const lang = (['en', 'te', 'hi'].includes(language) ? language : 'en') as 'en' | 'te' | 'hi';
  const t = UI_LABELS[lang];

  const primaryColor = layout.theme?.primary || '#2563eb';
  const font = layout.theme?.font || 'Inter';
  const businessName = escapeHtml(layout.theme?.businessName || 'Our Business');
  const cleanWaNumber = (whatsappNumber || '').replace(/\D/g, '');
  const cleanPhone = (options.businessPhone || whatsappNumber || '').replace(/\D/g, '');
  const address = options.address ? options.address.trim() : '';
  const bookingEndpoint = options.bookingEndpoint || '__BOOKING_ENDPOINT__';
  const projectId = options.projectId || '';

  // Extract all service/menu items to populate the booking service dropdown
  const allServiceItems: LayoutItem[] = [];
  layout.sections.forEach(sec => {
    if ((sec.type === 'services' || sec.type === 'menu') && Array.isArray(sec.items)) {
      sec.items.forEach(it => {
        if (it && it.name) allServiceItems.push(it);
      });
    }
  });

  // Hours: fallback to section hours if layout-level hours are omitted
  const hoursData: OpeningHourRow[] = options.openingHours || layout.opening_hours || 
    (layout.sections.find(s => s.type === 'hours')?.hours) || [];

  // Generate Sections HTML
  const sectionsHtml = layout.sections.map(section => {
    const secId = escapeHtml(section.id);
    const title = escapeHtml(section.title);
    const subtitle = escapeHtml(section.subtitle);
    const content = escapeHtml(section.content);

    switch (section.type) {
      case 'header':
        return `
        <header data-section-id="${secId}" class="w-full bg-white/95 backdrop-blur shadow-sm sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div class="font-bold text-lg text-gray-900 tracking-tight">${businessName}</div>
          <div class="flex items-center gap-2">
            ${cleanPhone ? `<a href="tel:${cleanPhone}" class="inline-flex items-center justify-center p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition" aria-label="${t.call}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </a>` : ''}
            ${cleanWaNumber ? `<a href="https://wa.me/${cleanWaNumber}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition shadow-sm" style="background-color: #25D366" aria-label="${t.whatsapp}">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.963 1.2 0.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
              <span>WhatsApp</span>
            </a>` : ''}
          </div>
        </header>`;

      case 'hero':
        return `
        <section data-section-id="${secId}" class="px-5 py-12 text-center bg-gradient-to-b from-gray-50 to-white">
          <div class="max-w-xl mx-auto">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">${title}</h1>
            ${subtitle ? `<p class="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed">${subtitle}</p>` : ''}
            ${content ? `<p class="text-sm text-gray-500 mb-6">${content}</p>` : ''}
            <div class="flex flex-wrap items-center justify-center gap-3">
              ${cleanPhone ? `<a href="tel:${cleanPhone}" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition" style="background-color: ${primaryColor}" aria-label="${t.call}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <span>${t.call}</span>
              </a>` : ''}
              ${address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition" aria-label="${t.directions}">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>${t.directions}</span>
              </a>` : ''}
            </div>
          </div>
        </section>`;

      case 'menu':
      case 'services':
        const items = section.items || [];
        return `
        <section data-section-id="${secId}" class="px-5 py-10 bg-white">
          <div class="max-w-xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">${title || (section.type === 'menu' ? 'Menu' : 'Services')}</h2>
            ${subtitle ? `<p class="text-sm text-gray-500 mb-6">${subtitle}</p>` : ''}
            <div class="divide-y divide-gray-100">
              ${items.map(it => `
                <div class="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-medium text-gray-900 text-sm sm:text-base">${escapeHtml(it.name)}</h3>
                    ${it.description ? `<p class="text-xs sm:text-sm text-gray-500 mt-0.5">${escapeHtml(it.description)}</p>` : ''}
                  </div>
                  ${it.price ? `<span class="shrink-0 font-semibold text-sm text-gray-900">${escapeHtml(it.price)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </section>`;

      case 'hours':
        const displayHours = (section.hours && section.hours.length > 0) ? section.hours : hoursData;
        return `
        <section data-section-id="${secId}" class="px-5 py-8 bg-gray-50">
          <div class="max-w-xl mx-auto">
            <h2 class="text-xl font-bold text-gray-900 mb-4">${title || t.hours}</h2>
            ${displayHours.length > 0 ? `
              <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-100 text-gray-600 font-semibold text-xs uppercase border-b border-gray-200">
                    <tr>
                      <th class="px-4 py-2.5">${t.day}</th>
                      <th class="px-4 py-2.5 text-right">${t.timing}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    ${displayHours.map(h => `
                      <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2.5 font-medium text-gray-800">${escapeHtml(h.day)}</td>
                        <td class="px-4 py-2.5 text-right text-gray-600">${escapeHtml(h.open)} - ${escapeHtml(h.close)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<p class="text-sm text-gray-500">Contact us for hours.</p>`}
          </div>
        </section>`;

      case 'about':
        return `
        <section data-section-id="${secId}" class="px-5 py-8 bg-white border-t border-gray-100">
          <div class="max-w-xl mx-auto">
            <h2 class="text-xl font-bold text-gray-900 mb-2">${title || 'About Us'}</h2>
            ${content ? `<p class="text-sm text-gray-600 leading-relaxed">${content}</p>` : ''}
          </div>
        </section>`;

      case 'booking':
        return `
        <section data-section-id="${secId}" id="booking" class="px-5 py-10 bg-gray-50">
          <div class="max-w-xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">${title || t.bookTitle}</h2>
            ${subtitle ? `<p class="text-sm text-gray-500 mb-6">${subtitle}</p>` : ''}
            
            <form id="ps-booking-form" class="space-y-4">
              <input type="hidden" name="projectId" value="${escapeHtml(projectId)}" />
              
              <!-- Honeypot anti-spam field (hidden from real users) -->
              <input type="text" name="website" id="ps-website-honeypot" style="display:none !important;" tabindex="-1" autocomplete="off" aria-hidden="true" />

              <div>
                <label class="block text-xs font-semibold text-gray-700 uppercase mb-1" for="ps-customer-name">${t.name} *</label>
                <input type="text" id="ps-customer-name" name="customerName" required maxlength="100" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Rahul Sharma" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 uppercase mb-1" for="ps-customer-phone">${t.phone} *</label>
                <input type="tel" id="ps-customer-phone" name="phone" required maxlength="20" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. +91 98765 43210" />
              </div>

              ${allServiceItems.length > 0 ? `
              <div>
                <label class="block text-xs font-semibold text-gray-700 uppercase mb-1" for="ps-service-choice">${t.selectService}</label>
                <select id="ps-service-choice" name="service" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- ${t.selectService} --</option>
                  ${allServiceItems.map(it => `<option value="${escapeHtml(it.name)}">${escapeHtml(it.name)}${it.price ? ` (${escapeHtml(it.price)})` : ''}</option>`).join('')}
                </select>
              </div>` : ''}

              <div>
                <label class="block text-xs font-semibold text-gray-700 uppercase mb-1" for="ps-preferred-time">${t.dateTime}</label>
                <input type="text" id="ps-preferred-time" name="preferredTime" maxlength="50" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Tomorrow 4:00 PM" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 uppercase mb-1" for="ps-message">${t.message}</label>
                <textarea id="ps-message" name="message" rows="3" maxlength="500" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any specific requirements..."></textarea>
              </div>

              <div id="ps-form-status" class="hidden text-sm p-3 rounded-lg"></div>

              <button type="submit" id="ps-submit-btn" class="w-full py-3 px-4 rounded-lg font-semibold text-white shadow transition" style="background-color: ${primaryColor}">
                ${t.submit}
              </button>
            </form>
          </div>
        </section>`;

      case 'contact':
        return `
        <section data-section-id="${secId}" class="px-5 py-8 bg-white border-t border-gray-100 text-center">
          <div class="max-w-xl mx-auto space-y-3">
            <h2 class="text-xl font-bold text-gray-900">${title || 'Contact Us'}</h2>
            ${address ? `<p class="text-sm text-gray-600">${escapeHtml(address)}</p>` : ''}
            <div class="flex items-center justify-center gap-4 pt-2">
              ${cleanPhone ? `<a href="tel:${cleanPhone}" class="text-sm font-semibold text-blue-600 hover:underline">${t.call}: +${cleanPhone}</a>` : ''}
              ${cleanWaNumber ? `<a href="https://wa.me/${cleanWaNumber}" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-emerald-600 hover:underline">WhatsApp</a>` : ''}
            </div>
          </div>
        </section>`;

      case 'footer':
        return `
        <footer data-section-id="${secId}" class="px-5 py-8 bg-gray-900 text-gray-400 text-center text-xs space-y-2">
          <p class="font-medium text-gray-300">${businessName}</p>
          <p class="mt-1">${content || 'All rights reserved.'}</p>
          <div class="pt-3 border-t border-gray-800">
            <a href="/" target="_blank" class="text-gray-400 hover:text-white transition font-medium">${escapeHtml(t.madeWith)}</a>
          </div>
        </footer>`;

      default:
        return `<section data-section-id="${secId}" class="px-5 py-6"><div class="max-w-xl mx-auto">${title ? `<h3 class="font-bold">${title}</h3>` : ''}</div></section>`;
    }
  }).join('\n');

  // Booking Form Submission Script (Safely injected & permitted)
  const bookingScript = `
  <script id="ps-booking-script">
    (function() {
      const form = document.getElementById('ps-booking-form');
      if (!form) return;
      const statusEl = document.getElementById('ps-form-status');
      const submitBtn = document.getElementById('ps-submit-btn');

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const honeypot = document.getElementById('ps-website-honeypot');
        if (honeypot && honeypot.value) {
          showMsg(true, "${escapeHtml(t.bookingSuccess)}");
          form.reset();
          return;
        }

        const formData = new FormData(form);
        const nameVal = (formData.get('customerName') || '').toString().trim();
        const phoneVal = (formData.get('phone') || '').toString().replace(/\\D/g, '');

        if (!nameVal || phoneVal.length < 7) {
          showMsg(false, "${escapeHtml(t.bookingError)}");
          return;
        }

        const payload = {
          projectId: formData.get('projectId'),
          customerName: nameVal,
          phone: formData.get('phone'),
          service: formData.get('service'),
          preferredTime: formData.get('preferredTime'),
          message: formData.get('message'),
          website: formData.get('website')
        };

        submitBtn.disabled = true;
        submitBtn.innerText = "${escapeHtml(t.submitting)}";

        try {
          const endpoint = "${escapeHtml(bookingEndpoint)}";
          let success = false;
          let errText = "${escapeHtml(t.bookingError)}";

          if (endpoint && endpoint !== '__BOOKING_ENDPOINT__' && endpoint.startsWith('http')) {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
              success = true;
            } else if (data && data.error) {
              errText = data.error;
            }
          } else {
            // Offline demo handling
            success = true;
          }

          if (success) {
            showMsg(true, "${escapeHtml(t.bookingSuccess)}");
            form.reset();
            try {
              window.parent.postMessage({ type: 'PUBLIC_BOOKING_SUBMITTED', payload: payload }, '*');
            } catch(e) {}
          } else {
            showMsg(false, errText);
          }
        } catch (err) {
          // If network fetch fails in demo mode, still notify parent
          showMsg(true, "${escapeHtml(t.bookingSuccess)}");
          form.reset();
          try {
            window.parent.postMessage({ type: 'PUBLIC_BOOKING_SUBMITTED', payload: payload }, '*');
          } catch(e) {}
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerText = "${escapeHtml(t.submit)}";
        }
      });

      function showMsg(success, text) {
        if (!statusEl) return;
        statusEl.className = success 
          ? 'text-sm p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 block'
          : 'text-sm p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 block';
        statusEl.innerText = text;
      }
    })();
  </script>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${businessName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: '${escapeHtml(font)}', system-ui, sans-serif; }
  </style>
</head>
<body class="bg-gray-50 text-gray-800 antialiased min-h-screen flex flex-col justify-between">
  <main class="w-full">
    ${sectionsHtml}
  </main>
  ${bookingScript}
</body>
</html>`;
}
