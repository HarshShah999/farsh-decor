import { siteConfig } from '../config/site';
import { loadImageEl } from '../lib/imageUtils';
import { viewer } from './viewer';

/** Capture the 3D view and add a discreet brand caption. */
export async function captureBranded(caption?: string): Promise<string | null> {
  const raw = viewer.capture?.('image/png');
  if (!raw) return null;
  const img = await loadImageEl(raw);
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const s = Math.max(1, img.width / 1400);
  const band = 64 * s;
  const g = ctx.createLinearGradient(0, img.height - band * 1.6, 0, img.height);
  g.addColorStop(0, 'rgba(37,37,34,0)');
  g.addColorStop(1, 'rgba(37,37,34,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, img.height - band * 1.6, img.width, band * 1.6);
  ctx.fillStyle = '#f8f6f1';
  ctx.font = `500 ${22 * s}px "Cormorant Garamond", Georgia, serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(siteConfig.fullName.toUpperCase(), 28 * s, img.height - 26 * s);
  if (caption) {
    ctx.font = `500 ${13 * s}px "Manrope Variable", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(248,246,241,0.85)';
    ctx.fillText(caption, img.width - 28 * s, img.height - 28 * s);
  }
  return c.toDataURL('image/jpeg', 0.92);
}

export function captureRaw(): string | null {
  return viewer.capture?.('image/jpeg', 0.9) ?? null;
}
