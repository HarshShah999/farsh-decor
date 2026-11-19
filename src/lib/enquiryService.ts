/**
 * Enquiry submission service.
 *
 * If `siteConfig.formEndpoint` is set, enquiries are POSTed there as JSON.
 * Otherwise the app runs in LOCAL MODE: the enquiry is kept in this
 * browser's localStorage (so nothing is lost) and the UI offers WhatsApp /
 * email to actually send it. A backend or form service is needed for
 * server-side delivery; see README.md.
 */
import { siteConfig } from '../config/site';

export interface EnquiryPayload {
  kind: 'contact' | 'quotation' | 'design' | 'product' | 'visit';
  name: string;
  phone: string;
  email?: string;
  city?: string;
  subject?: string;
  message: string;
  materials?: string[];
  meta?: Record<string, string>;
}

export type EnquiryResult = { mode: 'remote' } | { mode: 'local' };

export async function submitEnquiry(payload: EnquiryPayload): Promise<EnquiryResult> {
  const body = { ...payload, submittedAt: new Date().toISOString(), page: window.location.href };
  if (siteConfig.formEndpoint) {
    const res = await fetch(siteConfig.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`The enquiry could not be sent (status ${res.status}). Please try WhatsApp or call us.`);
    return { mode: 'remote' };
  }
  try {
    const key = 'farsh:enquiries';
    const list = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
    list.push(body);
    localStorage.setItem(key, JSON.stringify(list.slice(-20)));
  } catch {
    /* ignore storage errors */
  }
  return { mode: 'local' };
}

export function mailtoUrl(subject: string, body: string) {
  return `mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const isValidPhone = (v: string) => /^[+()\-\s\d]{7,20}$/.test(v.trim()) && v.replace(/\D/g, '').length >= 7;
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
