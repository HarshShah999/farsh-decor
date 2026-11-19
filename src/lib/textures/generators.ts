/**
 * Procedural, seamless material texture generators.
 *
 * Each generator returns an RGBA albedo buffer and an RGBA greyscale height
 * buffer (used as a bump map). All patterns tile seamlessly so they can be
 * repeated across large surfaces without visible seams.
 *
 * These run inside a Web Worker (see texture.worker.ts) but are plain
 * functions so they can also run on the main thread as a fallback.
 *
 * Real showroom textures can replace these at any time: set a product's
 * `texture` to `{ kind: 'image', url: '/textures/...' }` in the catalogue.
 */
import {
  TileFbm,
  TileNoise,
  TileWorley,
  clamp01,
  fract,
  hex,
  mulberry32,
  smoothstep,
  type RGB,
} from './noise';

export type GeneratorId =
  | 'wood'
  | 'weave'
  | 'velvet'
  | 'leather'
  | 'boucle'
  | 'marble'
  | 'plaster'
  | 'grasscloth'
  | 'stone'
  | 'stripes'
  | 'floral'
  | 'foliage'
  | 'deco'
  | 'lattice'
  | 'abstract'
  | 'grass';

export type GenParams = Record<string, string | number | undefined>;

export interface GenResult {
  albedo: Uint8ClampedArray;
  height: Uint8ClampedArray;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export interface GenEnv {
  createCanvas(w: number, h: number): AnyCanvas;
}

const num = (p: GenParams, k: string, d: number) => (typeof p[k] === 'number' ? (p[k] as number) : d);
const str = (p: GenParams, k: string, d: string) => (typeof p[k] === 'string' ? (p[k] as string) : d);
const col = (p: GenParams, k: string, d: string): RGB => hex(str(p, k, d));

interface Buf {
  size: number;
  a: Uint8ClampedArray;
  h: Float32Array;
}

function makeBuf(size: number): Buf {
  return { size, a: new Uint8ClampedArray(size * size * 4), h: new Float32Array(size * size) };
}

function put(b: Buf, i: number, r: number, g: number, bl: number, h: number) {
  const o = i * 4;
  b.a[o] = r;
  b.a[o + 1] = g;
  b.a[o + 2] = bl;
  b.a[o + 3] = 255;
  b.h[i] = h;
}

/** Mix two colours; t in [-1, 1] picks between `neg` (t<0), `mid` and `pos` (t>0). */
function tri(mid: RGB, neg: RGB, pos: RGB, t: number): RGB {
  if (t >= 0) {
    const k = Math.min(1, t);
    return [mid[0] + (pos[0] - mid[0]) * k, mid[1] + (pos[1] - mid[1]) * k, mid[2] + (pos[2] - mid[2]) * k];
  }
  const k = Math.min(1, -t);
  return [mid[0] + (neg[0] - mid[0]) * k, mid[1] + (neg[1] - mid[1]) * k, mid[2] + (neg[2] - mid[2]) * k];
}

function finalize(b: Buf): GenResult {
  const { size, h } = b;
  // normalise height to full range for a consistent bump strength
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < h.length; i++) {
    if (h[i] < min) min = h[i];
    if (h[i] > max) max = h[i];
  }
  const range = max - min || 1;
  const height = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < h.length; i++) {
    const v = ((h[i] - min) / range) * 255;
    const o = i * 4;
    height[o] = height[o + 1] = height[o + 2] = v;
    height[o + 3] = 255;
  }
  return { albedo: b.a, height };
}

/* ------------------------------------------------------------------ */
/* WOOD: planks, basket-weave parquet and fluted wall panels           */
/* ------------------------------------------------------------------ */
function wood(size: number, p: GenParams, seed: number): GenResult {
  const style = str(p, 'style', 'plank');
  const light = col(p, 'light', '#caa27a');
  const base = col(p, 'base', '#a87b52');
  const dark = col(p, 'dark', '#6b4529');
  const cols = Math.round(num(p, 'planks', 4));
  const rows = Math.round(num(p, 'rows', 2));
  const variation = num(p, 'variation', 0.22);
  const ringDensity = num(p, 'rings', 6);
  const gap = num(p, 'gap', 0.0016);
  const contrast = num(p, 'contrast', 1);
  const blocks = Math.round(num(p, 'blocks', 4));
  const slats = Math.round(num(p, 'slats', 3));

  const rng = mulberry32(seed);
  const offsets = Array.from({ length: cols }, () => rng());
  const tints = new Float32Array(4096).map(() => rng() * 2 - 1);
  const warp = new TileNoise(64, 64, seed + 1);
  const fibre = new TileNoise(256, 24, seed + 2);
  const mott = new TileFbm(4, 4, 4, seed + 3);
  const b = makeBuf(size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let s: number;
      let t: number;
      let pid: number;
      let gapS: number;
      let gapT: number;

      if (style === 'parquet') {
        const bx = Math.floor(u * blocks);
        const by = Math.floor(v * blocks);
        const lx = fract(u * blocks);
        const ly = fract(v * blocks);
        let slat: number;
        if ((bx + by) % 2 === 0) {
          s = fract(lx * slats);
          slat = Math.floor(lx * slats);
          t = ly;
        } else {
          s = fract(ly * slats);
          slat = Math.floor(ly * slats);
          t = lx;
        }
        pid = (by * blocks + bx) * slats + slat;
        gapS = gap * blocks * slats;
        gapT = gap * blocks;
      } else {
        const c = Math.floor(u * cols);
        s = fract(u * cols);
        const yy = (v + (style === 'fluted' ? 0 : offsets[c])) * rows;
        const seg = Math.floor(yy);
        t = fract(yy);
        pid = c * rows + (((seg % rows) + rows) % rows);
        gapS = gap * cols;
        gapT = style === 'fluted' ? 0 : gap * rows;
      }

      const tint = tints[pid % 4096] * variation;
      const po = fract(pid * 0.6180339);
      // gentle, low-frequency drift keeps grain lines mostly straight along the board
      const w = warp.at(po * 64 + t * 0.9, s * 0.6 + po * 17) - 0.5;
      // "cathedral" arcs on some boards: rings bend with distance along the board
      const arch = tints[(pid + 5) % 4096] > 0.2 ? Math.pow(Math.abs(t - 0.5) * 2, 2) * 1.6 : 0;
      const ring = s * ringDensity * (0.75 + 0.5 * fract(po * 7.3)) + w * 1.1 + arch + t * 0.35 * tints[(pid + 3) % 4096];
      const g = Math.abs(Math.sin(Math.PI * ring));
      const late = Math.pow(1 - g, 5) * 0.75 + Math.pow(1 - g, 2) * 0.25;
      // fine pores/fibres: high frequency across the board, long along it
      const fib = fibre.at(po * 256 + s * 70, t * 5) * 0.6 + fibre.at(po * 97 + s * 150, t * 11 + 3) * 0.4;
      const m = mott.uv(u, v);

      const tone = late * 0.42 * contrast + (fib - 0.5) * 0.42 + (m - 0.5) * 0.16 + tint;
      let c3 = tri(base, light, dark, tone);
      let height = 0.6 - late * 0.06 + (fib - 0.5) * 0.08;

      if (style === 'fluted') {
        const prof = Math.sqrt(Math.max(0, 1 - (2 * s - 1) ** 2));
        const shade = 0.62 + 0.38 * prof;
        c3 = [c3[0] * shade, c3[1] * shade, c3[2] * shade];
        height = prof * 0.9 + (fib - 0.5) * 0.04;
      } else {
        const dS = Math.min(s, 1 - s) / gapS;
        const dT = gapT > 0 ? Math.min(t, 1 - t) / gapT : 99;
        const edge = Math.min(dS, dT);
        if (edge < 1) {
          c3 = [c3[0] * 0.62, c3[1] * 0.6, c3[2] * 0.58];
          height = 0;
        } else {
          const bevel = smoothstep(1, 2.5, edge);
          const k = 0.92 + 0.08 * bevel;
          c3 = [c3[0] * k, c3[1] * k, c3[2] * k];
          height *= 0.6 + 0.4 * bevel;
        }
      }
      put(b, y * size + x, c3[0], c3[1], c3[2], height);
    }
  }
  return finalize(b);
}

/* ------------------------------------------------------------------ */
/* WEAVE: plain, twill and basket woven textiles                        */
/* ------------------------------------------------------------------ */
function weave(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#d8cbb5');
  const alt = col(p, 'alt', str(p, 'base', '#d8cbb5'));
  const pattern = str(p, 'pattern', 'plain');
  let threads = Math.round(num(p, 'threads', 48));
  if (pattern !== 'plain') threads = Math.max(4, Math.round(threads / 4) * 4);
  else threads = Math.max(2, Math.round(threads / 2) * 2);
  const slub = num(p, 'slub', 0.3);
  const heather = num(p, 'heather', 0);
  const varAmt = num(p, 'variation', 0.08);
  const depth = num(p, 'depth', 1);
  const openness = num(p, 'open', 0);

  const rng = mulberry32(seed);
  const warpVar = new Float32Array(threads).map(() => rng() * 2 - 1);
  const weftVar = new Float32Array(threads).map(() => rng() * 2 - 1);
  const warpAlt = Array.from({ length: threads }, () => rng() < heather);
  const weftAlt = Array.from({ length: threads }, () => rng() < heather);
  const slubA = new TileNoise(threads, 24, seed + 5);
  const slubB = new TileNoise(threads, 24, seed + 6);
  const mott = new TileFbm(3, 3, 4, seed + 9);
  const b = makeBuf(size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const yy = v * threads;
    const j = Math.floor(yy);
    const fy = yy - j;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const xx = u * threads;
      const i = Math.floor(xx);
      const fx = xx - i;
      let top: boolean;
      if (pattern === 'twill') top = (((i - j) % 4) + 4) % 4 < 2;
      else if (pattern === 'basket') top = (((i >> 1) + (j >> 1)) & 1) === 0;
      else top = ((i + j) & 1) === 0;

      const pw = Math.sin(Math.PI * fx);
      const pf = Math.sin(Math.PI * fy);
      let prof: number;
      let tv: number;
      let sl: number;
      let useAlt: boolean;
      if (top) {
        prof = pw * (0.8 + 0.2 * pf);
        tv = warpVar[i];
        sl = slubA.at(i, v * 24);
        useAlt = warpAlt[i];
      } else {
        prof = pf * (0.8 + 0.2 * pw);
        tv = weftVar[j];
        sl = slubB.at(j, u * 24);
        useAlt = weftAlt[j];
      }
      const c0 = useAlt ? alt : base;
      const m = mott.uv(u, v);
      const bright = 1 + tv * varAmt + (sl - 0.5) * slub * 0.6 + (m - 0.5) * 0.08;
      let shade = 1 - depth * (1 - (0.62 + 0.38 * prof));
      if (openness > 0) {
        const gapv = 1 - Math.max(pw, pf);
        shade *= 1 - openness * smoothstep(0.55, 0.95, gapv) * 0.5;
      }
      const k = bright * shade;
      put(b, y * size + x, c0[0] * k, c0[1] * k, c0[2] * k, prof * 0.8 + (top ? 0.2 : 0) + (sl - 0.5) * slub * 0.2);
    }
  }
  return finalize(b);
}

/* ------------------------------------------------------------------ */
function velvet(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#6e5545');
  const crushAmt = num(p, 'crush', 1);
  const crush = new TileFbm(3, 3, 5, seed + 1, 0.55);
  const pile = new TileNoise(size / 2, size / 2, seed + 2);
  const streak = new TileNoise(4, 64, seed + 3);
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = crush.uv(u, v);
      const f = pile.uv(u, v);
      const s = streak.uv(u, v);
      const k = 0.8 + 0.42 * Math.pow(n, 1.4) * crushAmt + (f - 0.5) * 0.06 + (s - 0.5) * 0.06;
      put(b, y * size + x, base[0] * k, base[1] * k, base[2] * k, n * 0.4 + f * 0.15);
    }
  }
  return finalize(b);
}

function leather(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#7a4a2b');
  const cells = Math.round(num(p, 'cells', 44));
  const wor = new TileWorley(cells, seed + 1);
  const wor2 = new TileWorley(Math.round(cells / 3), seed + 4);
  const mott = new TileFbm(3, 3, 5, seed + 2);
  const out: [number, number] = [0, 0];
  const out2: [number, number] = [0, 0];
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      wor.uv(u, v, out);
      wor2.uv(u, v, out2);
      const crease = smoothstep(0, 0.14, out[1] - out[0]);
      const big = smoothstep(0, 0.08, out2[1] - out2[0]);
      const m = mott.uv(u, v);
      const k = (0.74 + 0.26 * crease) * (0.9 + 0.1 * big) * (0.82 + 0.36 * m);
      put(b, y * size + x, base[0] * k, base[1] * k, base[2] * k, (1 - out[0]) * crease * 0.8 + big * 0.2);
    }
  }
  return finalize(b);
}

function boucle(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#e7e0d3');
  const cells = Math.round(num(p, 'cells', 64));
  const wor = new TileWorley(cells, seed + 1);
  const wor2 = new TileWorley(Math.round(cells * 1.5), seed + 7);
  const mott = new TileFbm(4, 4, 4, seed + 2);
  const out: [number, number] = [0, 0];
  const out2: [number, number] = [0, 0];
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      wor.uv(u, v, out);
      wor2.uv(u, v, out2);
      const loop1 = 1 - smoothstep(0.02, 0.16, Math.abs(out[0] - 0.32));
      const loop2 = 1 - smoothstep(0.02, 0.14, Math.abs(out2[0] - 0.3));
      const loops = Math.max(loop1, loop2 * 0.85);
      const m = mott.uv(u, v);
      const k = 0.7 + 0.3 * loops + (m - 0.5) * 0.1;
      put(b, y * size + x, base[0] * k, base[1] * k, base[2] * k, loops);
    }
  }
  return finalize(b);
}

/* ------------------------------------------------------------------ */
function marble(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#f3f0ea');
  const cloud = col(p, 'cloud', '#d9d4cc');
  const vein = col(p, 'vein', '#8b8580');
  const vein2 = col(p, 'vein2', '#b69a70');
  const turbAmt = num(p, 'turbulence', 1.4);
  const turb = new TileFbm(3, 3, 6, seed + 1, 0.55);
  const turb2 = new TileFbm(4, 4, 5, seed + 5, 0.5);
  const clouds = new TileFbm(2, 2, 5, seed + 9);
  const b = makeBuf(size);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = turb.uv(u, v);
      const n2 = turb2.uv(u, v);
      const t1 = Math.sin(TAU * (u * 1 + v * 2) + n * turbAmt * TAU);
      const t2 = Math.sin(TAU * (u * 3 - v * 1) + n2 * turbAmt * 1.3 * TAU);
      const v1 = Math.pow(1 - Math.abs(t1), 22);
      const v1b = Math.pow(1 - Math.abs(t1), 4) * 0.25;
      const v2 = Math.pow(1 - Math.abs(t2), 40) * 0.7;
      const cl = clouds.uv(u, v);
      let r = base[0] + (cloud[0] - base[0]) * cl * 0.7;
      let g = base[1] + (cloud[1] - base[1]) * cl * 0.7;
      let bl = base[2] + (cloud[2] - base[2]) * cl * 0.7;
      const vk = clamp01(v1 * 0.85 + v1b);
      r += (vein[0] - r) * vk;
      g += (vein[1] - g) * vk;
      bl += (vein[2] - bl) * vk;
      r += (vein2[0] - r) * v2;
      g += (vein2[1] - g) * v2;
      bl += (vein2[2] - bl) * v2;
      put(b, y * size + x, r, g, bl, 0.5 - vk * 0.1 + cl * 0.05);
    }
  }
  return finalize(b);
}

function plaster(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#e6ddd0');
  const amount = num(p, 'amount', 1);
  const broad = new TileFbm(2, 2, 6, seed + 1, 0.55);
  const brush = new TileNoise(3, 40, seed + 2);
  const brush2 = new TileNoise(40, 3, seed + 4);
  const fine = new TileNoise(size / 4, size / 4, seed + 3);
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = broad.uv(u, v);
      const br = brush.uv(u, v) * 0.5 + brush2.uv(u, v) * 0.5;
      const f = fine.uv(u, v);
      const k = 1 + ((n - 0.5) * 0.16 + (br - 0.5) * 0.05 + (f - 0.5) * 0.03) * amount;
      put(b, y * size + x, base[0] * k, base[1] * k, base[2] * k, n * 0.3 + f * 0.2 + br * 0.1);
    }
  }
  return finalize(b);
}

function grasscloth(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#d9cbb0');
  const alt = col(p, 'alt', '#c4b391');
  const fibres = new TileNoise(5, 260, seed + 1);
  const fibres2 = new TileNoise(14, 520, seed + 2);
  const slubs = new TileNoise(24, 130, seed + 3);
  const mott = new TileFbm(3, 3, 4, seed + 4);
  const warp = new TileNoise(size / 8, 1, seed + 5);
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const f1 = fibres.uv(u, v);
      const f2 = fibres2.uv(u, v);
      const sl = slubs.uv(u, v);
      const m = mott.uv(u, v);
      const w = warp.uv(u, 0);
      const mixT = clamp01(f2 * 1.2 - 0.1);
      const k = 1 + (f1 - 0.5) * 0.28 + (sl - 0.5) * 0.12 + (m - 0.5) * 0.1 - (w > 0.8 ? 0.05 : 0);
      const r = (base[0] + (alt[0] - base[0]) * mixT) * k;
      const g = (base[1] + (alt[1] - base[1]) * mixT) * k;
      const bl = (base[2] + (alt[2] - base[2]) * mixT) * k;
      put(b, y * size + x, r, g, bl, f1 * 0.6 + f2 * 0.3 + sl * 0.2);
    }
  }
  return finalize(b);
}

function stone(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#cbbba3');
  const alt = col(p, 'alt', '#a99781');
  const mortar = col(p, 'mortar', '#8f8577');
  const rows = Math.round(num(p, 'rows', 6));
  const variation = num(p, 'variation', 0.5);
  const rng = mulberry32(seed);
  const rowData = Array.from({ length: rows }, () => {
    const n = 2 + Math.floor(rng() * 3);
    const cuts = Array.from({ length: n }, (_, i) => (i + 0.2 + rng() * 0.6) / n).sort((a, c) => a - c);
    const tints = cuts.map(() => rng());
    return { offset: rng(), cuts, tints };
  });
  const surf = new TileFbm(6, 6, 5, seed + 2, 0.55);
  const fine = new TileNoise(size / 3, size / 3, seed + 3);
  const gap = num(p, 'gap', 0.006);
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const ry = v * rows;
    const r = Math.floor(ry);
    const t = ry - r;
    const row = rowData[r];
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const uu = fract(u - row.offset);
      // find stone index
      let idx = row.cuts.length - 1;
      for (let k = 0; k < row.cuts.length; k++) {
        if (uu < row.cuts[k]) {
          idx = k - 1;
          break;
        }
      }
      if (idx < 0) idx = row.cuts.length - 1;
      const left = row.cuts[idx];
      const right = idx + 1 < row.cuts.length ? row.cuts[idx + 1] : row.cuts[0] + 1;
      let pos = uu;
      if (pos < left) pos += 1;
      const dx = Math.min(pos - left, right - pos);
      const dy = Math.min(t, 1 - t) / rows;
      const edge = Math.min(dx, dy);
      const sn = surf.uv(u, v);
      const fn = fine.uv(u, v);
      let c3: RGB;
      let h: number;
      if (edge < gap) {
        const k = 0.9 + fn * 0.2;
        c3 = [mortar[0] * k, mortar[1] * k, mortar[2] * k];
        h = 0;
      } else {
        const tint = row.tints[idx];
        const mixT = clamp01(tint * variation + (sn - 0.5) * 0.8);
        const k = 0.88 + sn * 0.2 + (fn - 0.5) * 0.12;
        const bevel = smoothstep(gap, gap * 4, edge);
        c3 = [
          (base[0] + (alt[0] - base[0]) * mixT) * k * (0.85 + 0.15 * bevel),
          (base[1] + (alt[1] - base[1]) * mixT) * k * (0.85 + 0.15 * bevel),
          (base[2] + (alt[2] - base[2]) * mixT) * k * (0.85 + 0.15 * bevel),
        ];
        h = 0.5 * bevel + sn * 0.4 + fn * 0.1;
      }
      put(b, y * size + x, c3[0], c3[1], c3[2], h);
    }
  }
  return finalize(b);
}

function stripes(size: number, p: GenParams, seed: number): GenResult {
  const base = col(p, 'base', '#e8e1d5');
  const stripe = col(p, 'stripe', '#cdbfa8');
  const count = Math.round(num(p, 'count', 8));
  const width = num(p, 'width', 0.18);
  const pin = col(p, 'pin', '#b69a70');
  const fibres = new TileNoise(6, 300, seed + 1);
  const mott = new TileFbm(3, 3, 4, seed + 2);
  const b = makeBuf(size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const s = fract(u * count);
      const inStripe = s < width;
      const pinLine = Math.abs(s - (width + (1 - width) / 2)) < 0.012;
      const c0 = pinLine ? pin : inStripe ? stripe : base;
      const f = fibres.uv(u, v);
      const m = mott.uv(u, v);
      const k = 1 + (f - 0.5) * 0.1 + (m - 0.5) * 0.06;
      put(b, y * size + x, c0[0] * k, c0[1] * k, c0[2] * k, (inStripe ? 0.6 : 0.4) + f * 0.2);
    }
  }
  return finalize(b);
}

/* ------------------------------------------------------------------ */
/* Canvas-drawn patterns                                               */
/* ------------------------------------------------------------------ */

function ctxOf(env: GenEnv, size: number): { c: AnyCanvas; ctx: Ctx2D } {
  const c = env.createCanvas(size, size);
  const ctx = c.getContext('2d') as Ctx2D | null;
  if (!ctx) throw new Error('2D canvas unavailable');
  return { c, ctx };
}

/** Draw `fn` at (x,y) and at every wrapped copy needed for seamless tiling. */
function wrapped(size: number, x: number, y: number, r: number, fn: (x: number, y: number) => void) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx * size;
      const Y = y + dy * size;
      if (X + r < 0 || X - r > size || Y + r < 0 || Y - r > size) continue;
      fn(X, Y);
    }
  }
}

function rgba(c: RGB, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function shadeC(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Read the canvas, add paper grain and derive a height map from luminance. */
function fromCanvas(ctx: Ctx2D, size: number, seed: number, grain = 0.06, heightGain = 1): GenResult {
  const img = ctx.getImageData(0, 0, size, size);
  const fine = new TileNoise(size / 2, size / 2, seed + 101);
  const paper = new TileFbm(8, 8, 3, seed + 102);
  const b = makeBuf(size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const o = i * 4;
      const u = x / size;
      const v = y / size;
      const g = (fine.uv(u, v) - 0.5) * grain + (paper.uv(u, v) - 0.5) * grain * 0.8;
      const k = 1 + g;
      const r = d[o] * k;
      const gg = d[o + 1] * k;
      const bl = d[o + 2] * k;
      const lum = (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / 255;
      put(b, i, r, gg, bl, lum * heightGain + g * 2);
    }
  }
  return finalize(b);
}

function leafPath(ctx: Ctx2D, x: number, y: number, len: number, wid: number, ang: number) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const tx = x + ca * len;
  const ty = y + sa * len;
  const nx = -sa * wid;
  const ny = ca * wid;
  const mx = x + ca * len * 0.5;
  const my = y + sa * len * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  ctx.quadraticCurveTo(mx - nx, my - ny, x, y);
  ctx.closePath();
}

function floral(size: number, p: GenParams, seed: number, env: GenEnv): GenResult {
  const bg = col(p, 'bg', '#efe7da');
  const petal = col(p, 'petal', '#c98a7c');
  const petal2 = col(p, 'petal2', '#e9bfae');
  const leaf = col(p, 'leaf', '#7f8c6a');
  const center = col(p, 'center', '#b69a70');
  const n = Math.round(num(p, 'motifs', 2));
  const rng = mulberry32(seed);
  const { ctx } = ctxOf(env, size);
  ctx.fillStyle = rgba(bg);
  ctx.fillRect(0, 0, size, size);
  const cell = size / n;
  const R = cell * 0.2;

  const drawFlower = (cx: number, cy: number, r: number, rot: number) => {
    // leaves
    for (let k = 0; k < 3; k++) {
      const a = rot + (k * Math.PI * 2) / 3 + 0.5;
      const sx = cx + Math.cos(a) * r * 0.55;
      const sy = cy + Math.sin(a) * r * 0.55;
      leafPath(ctx, sx, sy, r * 1.35, r * 0.42, a);
      ctx.fillStyle = rgba(leaf);
      ctx.fill();
      ctx.strokeStyle = rgba(shadeC(leaf, 1.25), 0.8);
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * r * 1.25, sy + Math.sin(a) * r * 1.25);
      ctx.stroke();
    }
    // outer petals
    const np = 6;
    for (let k = 0; k < np; k++) {
      const a = rot + (k * Math.PI * 2) / np;
      const px = cx + Math.cos(a) * r * 0.5;
      const py = cy + Math.sin(a) * r * 0.5;
      const gr = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      gr.addColorStop(0, rgba(petal2));
      gr.addColorStop(1, rgba(petal));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.52, r * 0.3, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(shadeC(petal, 0.8), 0.6);
      ctx.lineWidth = Math.max(1, r * 0.02);
      ctx.stroke();
    }
    // inner petals
    for (let k = 0; k < np; k++) {
      const a = rot + ((k + 0.5) * Math.PI * 2) / np;
      ctx.fillStyle = rgba(petal2, 0.95);
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.28, cy + Math.sin(a) * r * 0.28, r * 0.3, r * 0.17, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba(center);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      ctx.fillStyle = rgba(shadeC(center, 0.7));
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.23, cy + Math.sin(a) * r * 0.23, r * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawSprig = (cx: number, cy: number, r: number, rot: number) => {
    ctx.strokeStyle = rgba(leaf);
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(rot) * r, cy - Math.sin(rot) * r);
    ctx.quadraticCurveTo(cx + Math.sin(rot) * r * 0.3, cy - Math.cos(rot) * r * 0.3, cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    ctx.stroke();
    for (let k = -1; k <= 1; k++) {
      const a = rot + k * 0.9 + Math.PI / 2;
      leafPath(ctx, cx + Math.cos(rot) * r * k * 0.5, cy + Math.sin(rot) * r * k * 0.5, r * 0.6, r * 0.2, a);
      ctx.fillStyle = rgba(shadeC(leaf, 1.1));
      ctx.fill();
    }
    for (const k of [-1, 1]) {
      ctx.fillStyle = rgba(petal);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(rot) * r * k, cy + Math.sin(rot) * r * k, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  for (let cx = 0; cx < n; cx++) {
    for (let cy = 0; cy < n; cy++) {
      const x = (cx + 0.5) * cell;
      const y = (cy + 0.5 + (cx % 2) * 0.5) * cell;
      const rot = rng() * Math.PI;
      wrapped(size, x, y, R * 2.2, (X, Y) => drawFlower(X, Y, R, rot));
      const sx = cx * cell + cell * 0.02;
      const sy = (cy + (cx % 2) * 0.5) * cell + cell * 0.02;
      const srot = rng() * Math.PI;
      wrapped(size, sx, sy, R * 1.4, (X, Y) => drawSprig(X, Y, R * 0.75, srot));
    }
  }
  return fromCanvas(ctx, size, seed, 0.05);
}

function foliage(size: number, p: GenParams, seed: number, env: GenEnv): GenResult {
  const bg = col(p, 'bg', '#f2ede3');
  const greens = [col(p, 'g1', '#5f7356'), col(p, 'g2', '#7f9373'), col(p, 'g3', '#a5b39a')];
  const count = Math.round(num(p, 'count', 26));
  const rng = mulberry32(seed);
  const { ctx } = ctxOf(env, size);
  ctx.fillStyle = rgba(bg);
  ctx.fillRect(0, 0, size, size);
  const L = size * 0.2;
  for (let i = 0; i < count; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const a = rng() * Math.PI * 2;
    const len = L * (0.7 + rng() * 0.6);
    const g = greens[Math.floor(rng() * greens.length)];
    wrapped(size, x, y, len * 1.1, (X, Y) => {
      leafPath(ctx, X, Y, len, len * 0.24, a);
      ctx.fillStyle = rgba(g);
      ctx.fill();
      ctx.strokeStyle = rgba(shadeC(g, 1.3), 0.7);
      ctx.lineWidth = Math.max(1, size * 0.0025);
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.lineTo(X + Math.cos(a) * len * 0.95, Y + Math.sin(a) * len * 0.95);
      ctx.stroke();
      ctx.lineWidth = Math.max(0.5, size * 0.0012);
      for (let k = 1; k < 9; k++) {
        const t = k / 9;
        const bx = X + Math.cos(a) * len * t;
        const by = Y + Math.sin(a) * len * t;
        const w = len * 0.2 * Math.sin(Math.PI * t);
        for (const side of [-1, 1]) {
          const va = a + side * 0.9;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(va) * w, by + Math.sin(va) * w);
          ctx.stroke();
        }
      }
    });
  }
  return fromCanvas(ctx, size, seed, 0.05);
}

function deco(size: number, p: GenParams, seed: number, env: GenEnv): GenResult {
  const bg = col(p, 'bg', '#e9e2d4');
  const line = col(p, 'line', '#b69a70');
  const fill2 = col(p, 'fill2', str(p, 'bg', '#e9e2d4'));
  const cols = Math.round(num(p, 'cols', 5));
  const { ctx } = ctxOf(env, size);
  const w = size / cols;
  const R = w / 2;
  const rows = Math.round(size / R);
  ctx.fillStyle = rgba(bg);
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = Math.max(1, size * 0.0028);
  for (let j = -2; j <= rows + 1; j++) {
    for (let i = -1; i <= cols; i++) {
      const cx = i * w + (((j % 2) + 2) % 2) * R;
      const cy = j * R;
      const gr = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      gr.addColorStop(0, rgba(fill2));
      gr.addColorStop(1, rgba(bg));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(line);
      for (const k of [1, 0.76, 0.52, 0.28]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k - ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  return fromCanvas(ctx, size, seed, 0.05);
}

function lattice(size: number, p: GenParams, seed: number, env: GenEnv): GenResult {
  const bg = col(p, 'bg', '#dfe3dc');
  const line = col(p, 'line', '#f6f2ea');
  const n = Math.round(num(p, 'cells', 4));
  const { ctx } = ctxOf(env, size);
  ctx.fillStyle = rgba(bg);
  ctx.fillRect(0, 0, size, size);
  const s = size / n;
  ctx.strokeStyle = rgba(line);
  ctx.lineCap = 'round';
  const lw = size * 0.012;
  for (let k = -n; k <= 2 * n; k++) {
    for (const off of [-lw * 0.9, lw * 0.9]) {
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(k * s + off, 0);
      ctx.lineTo(k * s + off + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(k * s + off, 0);
      ctx.lineTo(k * s + off - size, size);
      ctx.stroke();
    }
  }
  // quatrefoil rosettes at intersections
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n * 2; j++) {
      const x = i * s + (j % 2) * (s / 2);
      const y = (j * s) / 2;
      wrapped(size, x, y, s * 0.2, (X, Y) => {
        ctx.fillStyle = rgba(bg);
        ctx.beginPath();
        ctx.arc(X, Y, s * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = lw * 0.5;
        for (let q = 0; q < 4; q++) {
          const a = (q * Math.PI) / 2;
          ctx.beginPath();
          ctx.arc(X + Math.cos(a) * s * 0.06, Y + Math.sin(a) * s * 0.06, s * 0.05, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }
  }
  return fromCanvas(ctx, size, seed, 0.05);
}

function abstract(size: number, p: GenParams, seed: number, env: GenEnv): GenResult {
  const bg = col(p, 'bg', '#efe6d8');
  const palette = ['c1', 'c2', 'c3', 'c4'].map((k, i) =>
    col(p, k, ['#c07a5a', '#9aa58a', '#d9bf98', '#4a4640'][i]),
  );
  const rng = mulberry32(seed);
  const { ctx } = ctxOf(env, size);
  ctx.fillStyle = rgba(bg);
  ctx.fillRect(0, 0, size, size);
  const n = 3;
  const cell = size / n;
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const x = (gx + 0.5) * cell + (rng() - 0.5) * cell * 0.5;
      const y = (gy + 0.5) * cell + (rng() - 0.5) * cell * 0.5;
      const r = cell * (0.22 + rng() * 0.2);
      const type = Math.floor(rng() * 4);
      const c = palette[Math.floor(rng() * palette.length)];
      const rot = Math.floor(rng() * 4) * (Math.PI / 2);
      wrapped(size, x, y, r * 1.6, (X, Y) => {
        ctx.save();
        ctx.translate(X, Y);
        ctx.rotate(rot);
        ctx.fillStyle = rgba(c, 0.92);
        ctx.strokeStyle = rgba(c);
        if (type === 0) {
          // arch
          ctx.beginPath();
          ctx.moveTo(-r * 0.6, r);
          ctx.lineTo(-r * 0.6, 0);
          ctx.arc(0, 0, r * 0.6, Math.PI, 0);
          ctx.lineTo(r * 0.6, r);
          ctx.closePath();
          ctx.fill();
        } else if (type === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 2) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r, 0, Math.PI / 2);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.lineWidth = size * 0.008;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let k = 0; k <= 30; k++) {
            const t = k / 30;
            const px = -r + t * r * 2;
            const py = Math.sin(t * Math.PI * 3) * r * 0.25;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  }
  // fine dot accents
  for (let i = 0; i < 40; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const c = palette[3];
    wrapped(size, x, y, 6, (X, Y) => {
      ctx.fillStyle = rgba(c, 0.6);
      ctx.beginPath();
      ctx.arc(X, Y, size * 0.003, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return fromCanvas(ctx, size, seed, 0.07);
}

function grass(size: number, p: GenParams, seed: number, env: GenEnv): GenResult {
  const dark = col(p, 'dark', '#2f4a1f');
  const mid = col(p, 'mid', '#4f7a2c');
  const light = col(p, 'light', '#86b04a');
  const thatch = col(p, 'thatch', '#8c7a4a');
  const density = num(p, 'density', 1);
  const bladeLen = num(p, 'length', 1);
  const thatchAmt = num(p, 'thatchAmount', 0.5);
  const rng = mulberry32(seed);
  const { ctx } = ctxOf(env, size);
  ctx.fillStyle = rgba(shadeC(dark, 0.7));
  ctx.fillRect(0, 0, size, size);
  const area = (size / 512) ** 2;
  const lw = Math.max(0.8, size * 0.0035);
  ctx.lineCap = 'round';

  // thatch layer – short curly fibres
  const thatchCount = Math.floor(3500 * area * thatchAmt);
  for (let i = 0; i < thatchCount; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = size * (0.008 + rng() * 0.012);
    const a = rng() * Math.PI * 2;
    const k = 0.7 + rng() * 0.5;
    wrapped(size, x, y, r * 2, (X, Y) => {
      ctx.strokeStyle = rgba(shadeC(thatch, k), 0.8);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.arc(X, Y, r, a, a + 2.5);
      ctx.stroke();
    });
  }

  const count = Math.floor(16000 * area * density);
  for (let i = 0; i < count; i++) {
    const t = i / count; // later blades are on top -> lighter
    const x = rng() * size;
    const y = rng() * size;
    const len = size * (0.022 + rng() * 0.03) * bladeLen;
    const a = rng() * Math.PI * 2;
    const bend = (rng() - 0.5) * 0.9;
    const tone = clamp01(t * 1.1 + (rng() - 0.5) * 0.35);
    const c0: RGB =
      tone < 0.5
        ? [
            dark[0] + (mid[0] - dark[0]) * tone * 2,
            dark[1] + (mid[1] - dark[1]) * tone * 2,
            dark[2] + (mid[2] - dark[2]) * tone * 2,
          ]
        : [
            mid[0] + (light[0] - mid[0]) * (tone - 0.5) * 2,
            mid[1] + (light[1] - mid[1]) * (tone - 0.5) * 2,
            mid[2] + (light[2] - mid[2]) * (tone - 0.5) * 2,
          ];
    wrapped(size, x, y, len * 1.2, (X, Y) => {
      const ex = X + Math.cos(a) * len;
      const ey = Y + Math.sin(a) * len;
      const mx = X + Math.cos(a + bend) * len * 0.55;
      const my = Y + Math.sin(a + bend) * len * 0.55;
      const g = ctx.createLinearGradient(X, Y, ex, ey);
      g.addColorStop(0, rgba(shadeC(c0, 0.55)));
      g.addColorStop(1, rgba(shadeC(c0, 1.08)));
      ctx.strokeStyle = g;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    });
  }
  return fromCanvas(ctx, size, seed, 0.04, 1.2);
}

/* ------------------------------------------------------------------ */

export function generate(
  generator: GeneratorId,
  params: GenParams,
  size: number,
  seed: number,
  env: GenEnv,
): GenResult {
  switch (generator) {
    case 'wood':
      return wood(size, params, seed);
    case 'weave':
      return weave(size, params, seed);
    case 'velvet':
      return velvet(size, params, seed);
    case 'leather':
      return leather(size, params, seed);
    case 'boucle':
      return boucle(size, params, seed);
    case 'marble':
      return marble(size, params, seed);
    case 'plaster':
      return plaster(size, params, seed);
    case 'grasscloth':
      return grasscloth(size, params, seed);
    case 'stone':
      return stone(size, params, seed);
    case 'stripes':
      return stripes(size, params, seed);
    case 'floral':
      return floral(size, params, seed, env);
    case 'foliage':
      return foliage(size, params, seed, env);
    case 'deco':
      return deco(size, params, seed, env);
    case 'lattice':
      return lattice(size, params, seed, env);
    case 'abstract':
      return abstract(size, params, seed, env);
    case 'grass':
      return grass(size, params, seed, env);
    default: {
      const never: never = generator;
      throw new Error(`Unknown generator ${String(never)}`);
    }
  }
}
