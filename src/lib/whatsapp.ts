import { siteConfig } from '../config/site';
import { categoryById } from '../data/categories';
import type { Product } from '../types/catalog';

/**
 * WhatsApp click-to-chat helpers.
 *
 * NOTE: A wa.me link can only pre-fill TEXT. Images cannot be attached
 * through a URL, so design enquiries include a share link (3D designs) and
 * the UI offers to download the preview image before WhatsApp opens.
 */

export function whatsappUrl(message: string, number: string = siteConfig.whatsappNumber) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string) {
  window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
}

export interface CustomerDetails {
  name?: string;
  phone?: string;
  city?: string;
  note?: string;
}

function customerLines(c?: CustomerDetails) {
  if (!c) return [] as string[];
  const lines: string[] = [];
  if (c.name) lines.push(`Name: ${c.name}`);
  if (c.phone) lines.push(`Phone: ${c.phone}`);
  if (c.city) lines.push(`City: ${c.city}`);
  if (c.note) lines.push('', c.note);
  return lines;
}

export function generalEnquiryMessage(c?: CustomerDetails) {
  return [`Hello ${siteConfig.fullName}, I'd like to know more about your interior materials.`, ...customerLines(c)].join(
    '\n',
  );
}

export function productEnquiryMessage(product: Product, c?: CustomerDetails) {
  return [
    `Hello ${siteConfig.brandName}, I'm interested in this product:`,
    '',
    `• ${product.name} (${categoryById[product.category].singular}, ref ${product.id})`,
    `${window.location.origin}/product/${product.id}`,
    '',
    'Could you share pricing and availability?',
    ...customerLines(c),
  ].join('\n');
}

export function showroomVisitMessage(c?: CustomerDetails & { date?: string }) {
  return [
    `Hello ${siteConfig.brandName}, I'd like to book a showroom visit.`,
    c?.date ? `Preferred date: ${c.date}` : '',
    ...customerLines(c),
  ]
    .filter(Boolean)
    .join('\n');
}

export interface DesignEnquiry {
  designType: '3D Room Visualizer' | 'Photo Visualizer';
  items: { label: string; product: Product }[];
  shareUrl?: string;
  quotation?: boolean;
  areaNote?: string;
}

export function designEnquiryMessage(d: DesignEnquiry, c?: CustomerDetails) {
  const lines = [
    d.quotation
      ? `Hello ${siteConfig.brandName}, I'd like a quotation for this design.`
      : `Hello ${siteConfig.brandName}, I'd like to get this design.`,
    '',
    `Design type: ${d.designType}`,
    '',
    'Selected materials:',
    ...d.items.map((i) => `• ${i.label}: ${i.product.name} (${categoryById[i.product.category].singular})`),
  ];
  if (d.areaNote) lines.push('', `Approx. area / sizes: ${d.areaNote}`);
  if (d.shareUrl) lines.push('', `View the design: ${d.shareUrl}`);
  else lines.push('', '(I can share the preview image in this chat.)');
  lines.push(...(customerLines(c).length ? ['', ...customerLines(c)] : []));
  return lines.join('\n');
}
