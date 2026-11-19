/**
 * Serialisation of 3D designs into a compact, URL-safe string so a design
 * can be shared publicly as a link without any backend:
 *   /visualizer/3d?d=<encoded>
 *
 * Only product IDs and per-surface scale/rotation are encoded, so links stay short.
 */
import { siteConfig } from '../config/site';
import { productById } from '../data/products';
import { SURFACES, defaultSurfaceState, type SurfaceState } from '../visualizer3d/surfaces';

type Compact = { v: 1; s: Record<string, [string, number?, number?]> };

function b64urlEncode(str: string) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDesign(state: SurfaceState): string {
  const c: Compact = { v: 1, s: {} };
  for (const def of SURFACES) {
    const st = state[def.id];
    const entry: [string, number?, number?] = [st.productId];
    if (st.scale !== 1 || st.rotation !== 0) entry.push(Math.round(st.scale * 100) / 100);
    if (st.rotation !== 0) entry.push(st.rotation);
    c.s[def.id] = entry;
  }
  return b64urlEncode(JSON.stringify(c));
}

/** Decode a share string. Unknown products / surfaces fall back to defaults. */
export function decodeDesign(encoded: string): SurfaceState | null {
  try {
    const c = JSON.parse(b64urlDecode(encoded)) as Compact;
    if (c.v !== 1 || typeof c.s !== 'object') return null;
    const state = defaultSurfaceState();
    for (const def of SURFACES) {
      const e = c.s[def.id];
      if (!e || !productById[e[0]]) continue;
      if (!def.accepts.includes(productById[e[0]].category)) continue;
      state[def.id] = {
        productId: e[0],
        scale: typeof e[1] === 'number' ? Math.min(3, Math.max(0.25, e[1])) : 1,
        rotation: e[2] === 90 ? 90 : 0,
      };
    }
    return state;
  } catch {
    return null;
  }
}

export function shareUrlFor3D(state: SurfaceState) {
  const base = siteConfig.publicBaseUrl || window.location.origin;
  return `${base}/visualizer/3d?d=${encodeDesign(state)}`;
}
