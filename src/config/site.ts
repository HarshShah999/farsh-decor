/**
 * Central business configuration.
 *
 * Every business-specific detail lives here. Components must read from this
 * file rather than hard-coding names, numbers or addresses.
 *
 * Values marked PLACEHOLDER are not real and must be replaced before launch.
 */
export const siteConfig = {
  brandName: 'Farsh',
  brandSuffix: 'The Decor Hub',
  fullName: 'Farsh – The Decor Hub',
  tagline: 'Transform Your Space. Define Your Style.',
  logoText: 'FARSH',

  /** PLACEHOLDER – display phone number */
  phoneDisplay: '+91 00000 00000',
  /** PLACEHOLDER – phone number in E.164 form, used for tel: links */
  phoneE164: '+910000000000',
  /** PLACEHOLDER – WhatsApp business number, digits only with country code, no "+" */
  whatsappNumber: '910000000000',
  /** PLACEHOLDER */
  email: 'hello@example.com',

  /** PLACEHOLDER showroom address */
  address: {
    line1: 'Showroom address line 1 (placeholder)',
    line2: 'Area / Locality (placeholder)',
    city: 'City',
    region: 'State',
    postalCode: '000000',
    country: 'India',
  },

  /** PLACEHOLDER business hours */
  hours: [
    { days: 'Monday – Saturday', time: '10:30 AM – 8:30 PM' },
    { days: 'Sunday', time: '11:00 AM – 6:00 PM (placeholder)' },
  ],

  /** PLACEHOLDER social links – set to empty string to hide */
  social: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    pinterest: 'https://pinterest.com/',
    youtube: '',
  },

  /**
   * PLACEHOLDER Google Maps embed URL (Share → Embed a map → copy the src).
   * Leave empty to show the styled placeholder panel instead of an iframe.
   */
  googleMapsEmbedUrl: '',
  /** PLACEHOLDER link that opens the showroom in Google Maps */
  googleMapsUrl: 'https://maps.google.com/',

  /**
   * Optional endpoint that receives contact / quotation form submissions as
   * JSON (e.g. Formspree, a serverless function or your CRM). When empty, the
   * forms work in "local mode": the enquiry is stored in this browser and the
   * customer is offered WhatsApp / email to send it.
   */
  formEndpoint: '',

  /** Public base URL used when building share links. Defaults to the current origin. */
  publicBaseUrl: '',
} as const;

export type SiteConfig = typeof siteConfig;

export const isPlaceholder = (value: string) =>
  /placeholder|0000000|example\.com/i.test(value);
