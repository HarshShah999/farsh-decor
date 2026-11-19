/**
 * Assisted surface detection ("Smart select", beta).
 *
 * Runs entirely in the browser with no AI service: a colour-similarity flood
 * fill from the clicked point on a downscaled copy of the photo, followed by
 * hole filling, a small morphological clean-up, contour tracing and polygon
 * simplification. The result is an ordinary, editable polygon.
 */
import type { Pt } from './types';

export function magicWand(base: ImageData, seed: Pt, tolerance = 30): Pt[] | null {
  const maxSide = 420;
  const k = Math.min(1, maxSide / Math.max(base.width, base.height));
  const w = Math.max(2, Math.round(base.width * k));
  const h = Math.max(2, Math.round(base.height * k));

  // downscale
  const c = document.createElement('canvas');
  c.width = base.width;
  c.height = base.height;
  c.getContext('2d')!.putImageData(base, 0, 0);
  const s = document.createElement('canvas');
  s.width = w;
  s.height = h;
  const sctx = s.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(c, 0, 0, w, h);
  const img = sctx.getImageData(0, 0, w, h).data;

  const sx = Math.min(w - 1, Math.max(0, Math.round(seed.x * k)));
  const sy = Math.min(h - 1, Math.max(0, Math.round(seed.y * k)));

  // seed colour = 3×3 average
  let r0 = 0;
  let g0 = 0;
  let b0 = 0;
  let n0 = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = Math.min(w - 1, Math.max(0, sx + dx));
      const y = Math.min(h - 1, Math.max(0, sy + dy));
      const i = (y * w + x) * 4;
      r0 += img[i];
      g0 += img[i + 1];
      b0 += img[i + 2];
      n0++;
    }
  r0 /= n0;
  g0 /= n0;
  b0 /= n0;

  const tol2 = tolerance * tolerance * 3;
  const mask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;
  const start = sy * w + sx;
  mask[start] = 1;
  queue[qt++] = start;
  while (qh < qt) {
    const p = queue[qh++];
    const x = p % w;
    const y = (p / w) | 0;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of nb) {
      if (q < 0 || mask[q]) continue;
      const i = q * 4;
      const dr = img[i] - r0;
      const dg = img[i + 1] - g0;
      const db = img[i + 2] - b0;
      // weight luminance less so soft shadows stay inside the surface
      const d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.9;
      if (d <= tol2) {
        mask[q] = 1;
        queue[qt++] = q;
      }
    }
  }
  if (qt < 30) return null;

  // close small gaps: dilate then erode (radius 1, twice)
  const morph = (src: Uint8Array, dilate: boolean) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = dilate ? 0 : 1;
        for (let dy = -1; dy <= 1 && (dilate ? !v : v); dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
            if (dilate && m) {
              v = 1;
              break;
            }
            if (!dilate && !m) {
              v = 0;
              break;
            }
          }
        out[y * w + x] = v;
      }
    return out;
  };
  let m = morph(morph(mask, true), true);
  m = morph(morph(m, false), false);

  // fill interior holes: flood the background from the border
  const bg = new Uint8Array(w * h);
  qh = qt = 0;
  for (let x = 0; x < w; x++)
    for (const y of [0, h - 1]) {
      const p = y * w + x;
      if (!m[p] && !bg[p]) {
        bg[p] = 1;
        queue[qt++] = p;
      }
    }
  for (let y = 0; y < h; y++)
    for (const x of [0, w - 1]) {
      const p = y * w + x;
      if (!m[p] && !bg[p]) {
        bg[p] = 1;
        queue[qt++] = p;
      }
    }
  while (qh < qt) {
    const p = queue[qh++];
    const x = p % w;
    const y = (p / w) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q < 0 || m[q] || bg[q]) continue;
      bg[q] = 1;
      queue[qt++] = q;
    }
  }
  for (let i = 0; i < m.length; i++) if (!bg[i]) m[i] = 1;
  // keep only the component containing the seed is implicit (fill started there)
  if (!m[start]) return null;

  const contour = traceContour(m, w, h);
  if (contour.length < 3) return null;
  let eps = 1.2;
  let simp = rdp(contour, eps);
  while (simp.length > 48 && eps < 12) {
    eps *= 1.5;
    simp = rdp(contour, eps);
  }
  return simp.map((p) => ({ x: Math.min(base.width, Math.max(0, p.x / k)), y: Math.min(base.height, Math.max(0, p.y / k)) }));
}

/** Moore-neighbour boundary tracing of the outer contour. */
function traceContour(m: Uint8Array, w: number, h: number): Pt[] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? m[y * w + x] : 0);
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (m[y * w + x]) {
        sx = x;
        sy = y;
        break outer;
      }
  if (sx < 0) return [];
  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const pts: Pt[] = [];
  let x = sx;
  let y = sy;
  let dir = 7; // came from the top-left area
  const limit = w * h * 2;
  for (let step = 0; step < limit; step++) {
    pts.push({ x: x + 0.5, y: y + 0.5 });
    let found = false;
    const startDir = (dir + 6) % 8; // backtrack
    for (let i = 0; i < 8; i++) {
      const d = (startDir + i) % 8;
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (at(nx, ny)) {
        x = nx;
        y = ny;
        dir = d;
        found = true;
        break;
      }
    }
    if (!found || (x === sx && y === sy && step > 2)) break;
  }
  return pts;
}

/** Ramer–Douglas–Peucker simplification for a closed polygon. */
function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 4) return pts;
  // split the ring at the farthest point from the first point
  let far = 0;
  let best = 0;
  pts.forEach((p, i) => {
    const d = Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
    if (d > best) {
      best = d;
      far = i;
    }
  });
  const a = simplifyLine(pts.slice(0, far + 1), eps);
  const b = simplifyLine([...pts.slice(far), pts[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function simplifyLine(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let idx = 0;
  let max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max > eps) {
    const l = simplifyLine(pts.slice(0, idx + 1), eps);
    const r = simplifyLine(pts.slice(idx), eps);
    return [...l.slice(0, -1), ...r];
  }
  return [a, b];
}
