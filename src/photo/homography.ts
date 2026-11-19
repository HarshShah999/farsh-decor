import type { Pt } from './types';

/** 3×3 projective transform stored row-major: [a,b,c,d,e,f,g,h,i] */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

/**
 * Homography mapping the unit square (0,0),(1,0),(1,1),(0,1) to quad p0..p3
 * (Heckbert, "Fundamentals of Texture Mapping and Image Warping").
 */
export function squareToQuad(q: [Pt, Pt, Pt, Pt]): Mat3 {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0;
  let h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;
  return [a, b, c, d, e, f, g, h, 1];
}

export function invert(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C || 1e-12;
  return [
    A / det,
    -(b * i - c * h) / det,
    (b * f - c * e) / det,
    B / det,
    (a * i - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * h - b * g) / det,
    (a * e - b * d) / det,
  ];
}

export function apply(m: Mat3, x: number, y: number, out: { x: number; y: number }) {
  const w = m[6] * x + m[7] * y + m[8];
  out.x = (m[0] * x + m[1] * y + m[2]) / w;
  out.y = (m[3] * x + m[4] * y + m[5]) / w;
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Approximate rectified size of the quad in pixels (width, height). */
export function quadSize(q: [Pt, Pt, Pt, Pt]) {
  return {
    w: (dist(q[0], q[1]) + dist(q[3], q[2])) / 2,
    h: (dist(q[0], q[3]) + dist(q[1], q[2])) / 2,
  };
}

/** Order 4 points as TL, TR, BR, BL. */
export function orderQuad(pts: Pt[]): [Pt, Pt, Pt, Pt] {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  // atan2 ordering starts near -π (left) → rotate so the first is top-left (min x+y)
  let start = 0;
  let best = Infinity;
  sorted.forEach((p, i) => {
    if (p.x + p.y < best) {
      best = p.x + p.y;
      start = i;
    }
  });
  const r = [...sorted.slice(start), ...sorted.slice(0, start)];
  return [r[0], r[1], r[2], r[3]];
}

export function defaultQuadFor(points: Pt[]): [Pt, Pt, Pt, Pt] {
  if (points.length === 4) return orderQuad(points);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}
