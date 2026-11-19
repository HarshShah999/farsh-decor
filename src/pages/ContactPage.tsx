import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Page, Reveal } from '../components/ui/Reveal';
import { Button } from '../components/ui/Button';
import { Icon, WhatsAppGlyph } from '../components/ui/Icon';
import { siteConfig, isPlaceholder } from '../config/site';
import { isValidEmail, isValidPhone, mailtoUrl, submitEnquiry } from '../lib/enquiryService';
import { generalEnquiryMessage, openWhatsApp, whatsappUrl } from '../lib/whatsapp';
import { categories } from '../data/categories';
import { EnquiryDialog } from '../components/enquiry/EnquiryDialog';

interface FormState {
  name: string;
  phone: string;
  email: string;
  interest: string;
  message: string;
}

const empty: FormState = { name: '', phone: '', email: '', interest: '', message: '' };

export default function ContactPage() {
  const [f, setF] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'remote' | 'local' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [visitOpen, setVisitOpen] = useState(false);

  useEffect(() => {
    document.title = `Contact | ${siteConfig.fullName}`;
  }, []);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e: typeof errors = {};
    if (f.name.trim().length < 2) e.name = 'Please enter your name';
    if (!isValidPhone(f.phone)) e.phone = 'Please enter a valid phone number';
    if (f.email && !isValidEmail(f.email)) e.email = 'Please enter a valid email address';
    if (f.message.trim().length < 10) e.message = 'Please write a short message (at least 10 characters)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus('sending');
    const message = generalEnquiryMessage({
      name: f.name,
      phone: f.phone,
      note: `${f.interest ? `Interested in: ${f.interest}\n` : ''}${f.email ? `Email: ${f.email}\n` : ''}${f.message}`,
    });
    try {
      const r = await submitEnquiry({
        kind: 'contact',
        name: f.name,
        phone: f.phone,
        email: f.email,
        subject: f.interest,
        message: f.message,
      });
      setSentMessage(message);
      setStatus(r.mode);
      setF(empty);
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus('error');
    }
  };

  const a = siteConfig.address;
  const placeholderMode = isPlaceholder(siteConfig.phoneDisplay) || isPlaceholder(a.line1);

  return (
    <Page className="pt-32 md:pt-40">
      <div className="container-lux">
        <Reveal className="max-w-3xl">
          <p className="eyebrow mb-4">Contact & showroom</p>
          <h1 className="text-5xl leading-[1.02] sm:text-7xl">
            Let's create something
            <span className="italic"> beautiful together</span>
          </h1>
        </Reveal>
        {placeholderMode && (
          <p className="mt-6 inline-flex items-center gap-2 border border-gold/40 bg-white px-3 py-1.5 text-xs text-gold-dark">
            <Icon name="info" size={14} /> Contact details below are placeholders. Update them in src/config/site.ts.
          </p>
        )}

        <div className="mt-16 grid gap-16 pb-24 lg:grid-cols-[1fr_1.25fr]">
          <Reveal className="space-y-10">
            <div className="space-y-6">
              {[
                { icon: 'mapPin' as const, label: 'Showroom', body: [a.line1, a.line2, `${a.city}, ${a.region} ${a.postalCode}`, a.country] },
                { icon: 'phone' as const, label: 'Phone', body: [siteConfig.phoneDisplay], href: `tel:${siteConfig.phoneE164}` },
                { icon: 'mail' as const, label: 'Email', body: [siteConfig.email], href: `mailto:${siteConfig.email}` },
              ].map((x) => (
                <div key={x.label} className="flex gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-gold-dark">
                    <Icon name={x.icon} size={18} />
                  </span>
                  <div>
                    <p className="label-lux !mb-1">{x.label}</p>
                    {x.href ? (
                      <a href={x.href} className="link-underline text-lg">
                        {x.body[0]}
                      </a>
                    ) : (
                      x.body.map((l) => (
                        <p key={l} className="leading-relaxed">
                          {l}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ))}
              <div className="flex gap-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-gold-dark">
                  <Icon name="clock" size={18} />
                </span>
                <div>
                  <p className="label-lux !mb-1">Business hours</p>
                  {siteConfig.hours.map((h) => (
                    <p key={h.days}>
                      <span className="text-muted">{h.days}:</span> {h.time}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappUrl(generalEnquiryMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2.5 bg-[#1f9e55] px-6 text-[11px] font-semibold tracking-[0.16em] text-white uppercase hover:bg-[#178246]"
              >
                <WhatsAppGlyph size={18} /> WhatsApp
              </a>
              <Button variant="outline" className="h-12 flex-1" onClick={() => setVisitOpen(true)} iconLeft="mapPin">
                Book a visit
              </Button>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden border border-line bg-cream">
              {siteConfig.googleMapsEmbedUrl ? (
                <iframe
                  title="Showroom location map"
                  src={siteConfig.googleMapsEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0 grayscale-[30%]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <svg viewBox="0 0 200 150" className="absolute inset-0 h-full w-full opacity-40" aria-hidden="true">
                    <path d="M0 40 Q60 55 100 30 T200 45M0 100 Q80 80 120 110 T200 95M60 0 Q70 70 50 150M150 0 Q130 80 160 150" stroke="#b69a70" fill="none" strokeWidth="0.8" />
                  </svg>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-gold">
                    <Icon name="mapPin" size={22} />
                  </span>
                  <p className="relative font-serif text-2xl">Google Maps placeholder</p>
                  <p className="relative max-w-xs text-xs text-muted">
                    Set <code>googleMapsEmbedUrl</code> in src/config/site.ts to show the live map here.
                  </p>
                  <a href={siteConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="relative text-xs font-semibold tracking-[0.14em] text-gold-dark uppercase">
                    <span className="link-underline">Open Google Maps</span>
                  </a>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white p-7 shadow-[var(--shadow-soft)] sm:p-12">
              <h2 className="text-3xl sm:text-4xl">Send us a message</h2>
              <p className="mt-2 text-sm text-muted">Tell us about your space and we'll get back to you.</p>
              <AnimatePresence mode="wait">
                {status === 'remote' || status === 'local' ? (
                  <motion.div key="ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-white">
                      <Icon name="check" size={26} />
                    </span>
                    <p className="mt-6 font-serif text-3xl">Thank you</p>
                    {status === 'remote' ? (
                      <p className="mt-2 text-muted">Your message has been sent. We'll be in touch shortly.</p>
                    ) : (
                      <>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                          Your message is ready. Online form delivery isn't connected yet in this demo, so please send it
                          to us on WhatsApp or by email:
                        </p>
                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                          <Button variant="whatsapp" onClick={() => openWhatsApp(sentMessage)}>
                            <WhatsAppGlyph size={16} /> Send on WhatsApp
                          </Button>
                          <a href={mailtoUrl('Website enquiry', sentMessage)} className="inline-flex h-11 items-center justify-center border border-charcoal px-6 text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-charcoal hover:text-ivory">
                            Send by email
                          </a>
                        </div>
                      </>
                    )}
                    <button className="mt-8 text-sm text-gold-dark underline" onClick={() => setStatus('idle')}>
                      Write another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={onSubmit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div>
                      <label htmlFor="c-name" className="label-lux">
                        Full name *
                      </label>
                      <input id="c-name" className="input-lux" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} />
                      {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="c-phone" className="label-lux">
                        Phone *
                      </label>
                      <input id="c-phone" className="input-lux" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} />
                      {errors.phone && <p className="mt-1 text-xs text-red-700">{errors.phone}</p>}
                    </div>
                    <div>
                      <label htmlFor="c-email" className="label-lux">
                        Email
                      </label>
                      <input id="c-email" type="email" className="input-lux" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} />
                      {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="c-interest" className="label-lux">
                        Interested in
                      </label>
                      <select id="c-interest" className="input-lux" value={f.interest} onChange={set('interest')}>
                        <option value="">Choose a category</option>
                        {categories.map((c) => (
                          <option key={c.id}>{c.name}</option>
                        ))}
                        <option>Complete room styling</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="c-message" className="label-lux">
                        Message *
                      </label>
                      <textarea id="c-message" rows={5} className="input-lux resize-none" value={f.message} onChange={set('message')} aria-invalid={!!errors.message} />
                      {errors.message && <p className="mt-1 text-xs text-red-700">{errors.message}</p>}
                    </div>
                    {status === 'error' && (
                      <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:col-span-2" role="alert">
                        {errorMsg}
                      </p>
                    )}
                    <div className="sm:col-span-2">
                      <Button type="submit" size="lg" icon="arrowRight" disabled={status === 'sending'} className="w-full sm:w-auto">
                        {status === 'sending' ? 'Sending…' : 'Send message'}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
      <EnquiryDialog open={visitOpen} onClose={() => setVisitOpen(false)} kind="visit" />
    </Page>
  );
}
