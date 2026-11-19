/**
 * Small, dependency-free noise toolkit for generating SEAMLESS (tileable)
 * textures. Every noise here wraps around its period so the resulting
 * texture tiles without visible seams.
 */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Periodic value noise on a px × py lattice. */
export class TileNoise {
  readonly px: number;
  readonly py: number;
  private v: Float32Array;

  constructor(px: number, py: number, seed: number) {
    this.px = Math.max(1, Math.round(px));
    this.py = Math.max(1, Math.round(py));
    const r = mulberry32(seed);
    this.v = new Float32Array(this.px * this.py);
    for (let i = 0; i < this.v.length; i++) this.v[i] = r();
  }

  /** Sample in lattice units (wraps). Returns 0..1 */
  at(x: number, y: number): number {
    const { px, py } = this;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = ((xi % px) + px) % px;
    const y0 = ((yi % py) + py) % py;
    const x1 = (x0 + 1) % px;
    const y1 = (y0 + 1) % py;
    const u = xf * xf * (3 - 2 * xf);
    const w = yf * yf * (3 - 2 * yf);
    const a = this.v[y0 * px + x0];
    const b = this.v[y0 * px + x1];
    const c = this.v[y1 * px + x0];
    const d = this.v[y1 * px + x1];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }

  /** Sample with normalised texture coordinates in [0,1). */
  uv(u: number, v: number): number {
    return this.at(u * this.px, v * this.py);
  }
}

/** Fractal (multi-octave) periodic noise. */
export class TileFbm {
  private layers: TileNoise[] = [];
  constructor(
    px: number,
    py: number,
    octaves: number,
    seed: number,
    private gain = 0.5,
  ) {
    for (let o = 0; o < octaves; o++) {
      this.layers.push(new TileNoise(px * 2 ** o, py * 2 ** o, seed + o * 7919));
    }
  }
  uv(u: number, v: number): number {
    let s = 0;
    let a = 1;
    let n = 0;
    for (const l of this.layers) {
      s += a * l.uv(u, v);
      n += a;
      a *= this.gain;
    }
    return s / n;
  }
}

/** Periodic Worley / cellular noise. Returns F1 and F2 in cell units. */
export class TileWorley {
  private pts: Float32Array;
  constructor(
    readonly cells: number,
    seed: number,
    jitter = 1,
  ) {
    const r = mulberry32(seed);
    this.pts = new Float32Array(cells * cells * 2);
    for (let i = 0; i < cells * cells; i++) {
      this.pts[i * 2] = 0.5 + (r() - 0.5) * jitter;
      this.pts[i * 2 + 1] = 0.5 + (r() - 0.5) * jitter;
    }
  }
  uv(u: number, v: number, out: [number, number]) {
    const c = this.cells;
    const x = u * c;
    const y = v * c;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let f1 = 9;
    let f2 = 9;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx;
        const cy = iy + dy;
        const wx = ((cx % c) + c) % c;
        const wy = ((cy % c) + c) % c;
        const k = (wy * c + wx) * 2;
        const ddx = cx + this.pts[k] - x;
        const ddy = cy + this.pts[k + 1] - y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) f2 = d;
      }
    }
    out[0] = f1;
    out[1] = f2;
  }
}

export type RGB = [number, number, number];

export function hex(h: string): RGB {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const fract = (x: number) => x - Math.floor(x);
