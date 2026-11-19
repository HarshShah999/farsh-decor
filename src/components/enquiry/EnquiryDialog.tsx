import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { WhatsAppGlyph, Icon } from '../ui/Icon';
import type { Product } from '../../types/catalog';
import {
  designEnquiryMessage,
  generalEnquiryMessage,
  openWhatsApp,
  productEnquiryMessage,
  showroomVisitMessage,
  type DesignEnquiry,
} from '../../lib/whatsapp';
import { isValidPhone, mailtoUrl, submitEnquiry } from '../../lib/enquiryService';
import { downloadDataUrl } from '../../lib/imageUtils';
import { toast } from '../../store/toastStore';
import { MaterialSwatch } from '../ui/MaterialSwatch';

export type EnquiryKind = 'design' | 'quotation' | 'product' | 'general' | 'visit';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: EnquiryKind;
  design?: Omit<DesignEnquiry, 'quotation' | 'areaNote'>;
  product?: Product;
  previewDataUrl?: string | null;
}

const titles: Record<EnquiryKind, [string, string]> = {
  design: ['Get this design', 'Send your design to our team on WhatsApp'],
  quotation: ['Request a quotation', 'Share a few details and we will prepare an estimate'],
  product: ['Product enquiry', 'Ask about pricing, samples and availability'],
  general: ['Enquiry', 'We usually reply within business hours'],
  visit: ['Book a showroom visit', 'See and feel the materials in person'],
};

export function EnquiryDialog({ open, onClose, kind, design, product, previewDataUrl }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [area, setArea] = useState('');
  const [date, setDate] = useState('');
  const [downloadPreview, setDownloadPreview] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setErrors({});
  }, [open]);

  const buildMessage = () => {
    const c = { name: name.trim(), phone: phone.trim(), city: city.trim(), note: note.trim() };
    switch (kind) {
      case 'design':
      case 'quotation':
        return designEnquiryMessage(
          { ...(design as DesignEnquiry), quotation: kind === 'quotation', areaNote: area.trim() || undefined },
          c,
        );
      case 'product':
        return product ? productEnquiryMessage(product, c) : generalEnquiryMessage(c);
      case 'visit':
        return showroomVisitMessage({ ...c, date });
      default:
        return generalEnquiryMessage(c);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please tell us your name';
    if (!isValidPhone(phone)) e.phone = 'Please enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const materials = design?.items.map((i) => `${i.label}: ${i.product.name}`) ?? (product ? [product.name] : []);

  const send = async (channel: 'whatsapp' | 'email', ev?: FormEvent) => {
    ev?.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const message = buildMessage();
    try {
      await submitEnquiry({
        kind: kind === 'general' ? 'contact' : kind,
        name,
        phone,
        city,
        message,
        materials,
      });
    } catch {
      /* the WhatsApp / email hand-off below still works */
    }
    if (previewDataUrl && downloadPreview) downloadDataUrl(previewDataUrl, `farsh-design-${Date.now()}.jpg`);
    if (channel === 'whatsapp') openWhatsApp(message);
    else window.location.href = mailtoUrl(titles[kind][0], message);
    setBusy(false);
    toast(channel === 'whatsapp' ? 'Opening WhatsApp with your enquiry' : 'Opening your email app');
    onClose();
  };

  const [title, subtitle] = titles[kind];

  return (
    <Modal open={open} onClose={onClose} title={title} eyebrow={subtitle} size="lg">
      <form onSubmit={(e) => send('whatsapp', e)} className="grid gap-8 md:grid-cols-[1fr_1.1fr]" noValidate>
        <div className="space-y-4">
          {previewDataUrl && (
            <img src={previewDataUrl} alt="Your design preview" className="aspect-[4/3] w-full object-cover shadow-[var(--shadow-soft)]" />
          )}
          {design && (
            <div>
              <p className="label-lux">{design.designType}</p>
              <ul className="divide-y divide-line border-y border-line">
                {design.items.map((i) => (
                  <li key={i.label} className="flex items-center gap-3 py-2.5">
                    <MaterialSwatch product={i.product} size={128} className="h-9 w-9 shrink-0" />
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium">{i.product.name}</p>
                      <p className="text-xs text-muted">{i.label}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {product && !design && (
            <div className="flex items-center gap-4">
              <MaterialSwatch product={product} className="h-20 w-20 shrink-0" />
              <div>
                <p className="font-serif text-2xl">{product.name}</p>
                <p className="text-sm text-muted">{product.collection}</p>
              </div>
            </div>
          )}
          {(kind === 'general' || kind === 'visit') && !product && !design && (
            <p className="text-sm leading-relaxed text-muted">
              Leave your details and a short note. We'll pick up the conversation on WhatsApp or by phone.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-lux" htmlFor="enq-name">
                Your name *
              </label>
              <input id="enq-name" className="input-lux" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
            </div>
            <div>
              <label className="label-lux" htmlFor="enq-phone">
                Phone *
              </label>
              <input
                id="enq-phone"
                className="input-lux"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-700">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label className="label-lux" htmlFor="enq-city">
              City / Area
            </label>
            <input id="enq-city" className="input-lux" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          {kind === 'quotation' && (
            <div>
              <label className="label-lux" htmlFor="enq-area">
                Approximate sizes
              </label>
              <input
                id="enq-area"
                className="input-lux"
                placeholder="e.g. Wall 12 × 9 ft, floor 180 sq ft, 2 windows"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
          )}
          {kind === 'visit' && (
            <div>
              <label className="label-lux" htmlFor="enq-date">
                Preferred date
              </label>
              <input id="enq-date" type="date" className="input-lux" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label-lux" htmlFor="enq-note">
              Message
            </label>
            <textarea
              id="enq-note"
              rows={3}
              className="input-lux resize-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything we should know: timelines, budget, installation…"
            />
          </div>
          {previewDataUrl && (
            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
              <input
                type="checkbox"
                className="mt-1 accent-[#252522]"
                checked={downloadPreview}
                onChange={(e) => setDownloadPreview(e.target.checked)}
              />
              <span>
                Download my design image so I can attach it in WhatsApp.
                <span className="block text-xs text-taupe">WhatsApp links can't attach images automatically.</span>
              </span>
            </label>
          )}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="submit" variant="whatsapp" size="lg" className="flex-1" disabled={busy}>
              <WhatsAppGlyph size={18} />
              {kind === 'design' ? 'Get this design on WhatsApp' : 'Send on WhatsApp'}
            </Button>
            <Button variant="outline" size="lg" onClick={() => send('email')} disabled={busy}>
              <Icon name="mail" size={16} /> Email
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
