/**
 * Photo material overlay engine.
 *
 * Non-destructive: always renders from the original photograph.
 * For each region it:
 *  1. rasterises the polygon into a (feathered) mask,
 *  2. maps every masked pixel to texture space, either directly or through
 *     the region's perspective homography (so a wall or floor recedes correctly),
 *  3. samples a mip-mapped, seamless texture with trilinear filtering (no moiré),
 *  4. transfers the photo's own light and shadow onto the material
 *     ("natural" blend), so the result reads as part of the room rather than a
 *     flat sticker, and
 *  5. blends with the chosen opacity.
 */
import type { PhotoRegion } from './types';
import { apply as applyH, invert, quadSize, squareToQuad } from './homography';

export interface MipTexture {
  levels: { size: number; data: Uint8ClampedArray }[];
}

/** Build a mip chain from a square seamless texture. */
export function buildMips(img: ImageData): MipTexture {
  const levels = [{ size: img.width, data: img.data }];
  let size = img.width;
  let src: CanvasImageSource = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d')!.putImageData(img, 0, 0);
    return c;
  })();
  while (size > 8) {
    size = size >> 1;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, size, size);
    levels.push({ size, data: ctx.getImageData(0, 0, size, size).data });
    src = c;
  }
  return { levels };
}

/** Bilinear, wrapping sample of one mip level into out[0..2]. */
function sample(level: { size: number; data: Uint8ClampedArray }, u: number, v: number, out: Float32Array, k: number) {
  const n = level.size;
  const x = (u - Math.floor(u)) * n - 0.5;
  const y = (v - Math.floor(v)) * n - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const xa = ((x0 % n) + n) % n;
  const ya = ((y0 % n) + n) % n;
  const xb = (xa + 1) % n;
  const yb = (ya + 1) % n;
  const d = level.data;
  const i00 = (ya * n + xa) * 4;
  const i10 = (ya * n + xb) * 4;
  const i01 = (yb * n + xa) * 4;
  const i11 = (yb * n + xb) * 4;
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  out[0] += k * (d[i00] * w00 + d[i10] * w10 + d[i01] * w01 + d[i11] * w11);
  out[1] += k * (d[i00 + 1] * w00 + d[i10 + 1] * w10 + d[i01 + 1] * w01 + d[i11 + 1] * w11);
  out[2] += k * (d[i00 + 2] * w00 + d[i10 + 2] * w10 + d[i01 + 2] * w01 + d[i11 + 2] * w11);
}

export interface RenderInput {
  base: ImageData;
  /** precomputed luminance (0..1) of base */
  luminance: Float32Array;
  regions: PhotoRegion[];
  textures: Map<string, MipTexture>;
  /** real-world size hints keyed by product id: metres per tile + [x,y] repeat multiplier */
  tileMetres: Map<string, { metres: number; repeat: [number, number] }>;
}

export function computeLuminance(img: ImageData) {
  const n = img.width * img.height;
  const L = new Float32Array(n);
  const d = img.data;
  for (let i = 0; i < n; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  return L;
}

/** Rasterise a region's polygon to a mask (0..255) over its bounding box. */
function regionMask(r: PhotoRegion, W: number, H: number) {
  const pad = Math.ceil(r.feather * 2) + 2;
  const xs = r.points.map((p) => p.x);
  const ys = r.points.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)) - pad);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)) - pad);
  const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + pad);
  const y1 = Math.min(H, Math.ceil(Math.max(...ys)) + pad);
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  if (r.feather > 0 && 'filter' in ctx) ctx.filter = `blur(${r.feather}px)`;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  r.points.forEach((p, i) => (i ? ctx.lineTo(p.x - x0, p.y - y0) : ctx.moveTo(p.x - x0, p.y - y0)));
  ctx.closePath();
  ctx.fill();
  const data = ctx.getImageData(0, 0, w, h).data;
  return { x0, y0, w, h, data };
}

export function renderComposite(input: RenderInput, out: ImageData) {
  const { base, luminance, regions, textures, tileMetres } = input;
  const W = base.width;
  const H = base.height;
  const o = out.data;
  o.set(base.data);
  const acc = new Float32Array(3);
  const tmp = { x: 0, y: 0 };

  for (const r of regions) {
    if (!r.visible || !r.closed || !r.productId || r.points.length < 3) continue;
    const tex = textures.get(r.productId);
    if (!tex) continue;
    const mask = regionMask(r, W, H);

    // mean luminance under the mask (for shading transfer)
    let sumL = 0;
    let cnt = 0;
    for (let y = 0; y < mask.h; y += 2) {
      for (let x = 0; x < mask.w; x += 2) {
        if (mask.data[(y * mask.w + x) * 4 + 3] > 128) {
          sumL += luminance[(y + mask.y0) * W + x + mask.x0];
          cnt++;
        }
      }
    }
    const meanL = cnt ? Math.max(0.05, sumL / cnt) : 0.5;

    // texture tile size in pixels: assume ~4 m of room across the photo, scaled by user
    const hint = tileMetres.get(r.productId) ?? { metres: 0.8, repeat: [1, 1] as [number, number] };
    const tilePx = Math.max(8, ((W * hint.metres) / 4) * r.scale);
    const [rx, ry] = hint.repeat;
    const rot = (r.rotation * Math.PI) / 180;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);

    let Hinv: ReturnType<typeof invert> | null = null;
    let qw = 1;
    let qh = 1;
    if (r.perspective) {
      Hinv = invert(squareToQuad(r.perspective));
      const qs = quadSize(r.perspective);
      qw = qs.w;
      qh = qs.h;
    }

    const N0 = tex.levels[0].size;
    const maxLevel = tex.levels.length - 1;
    const alphaMul = r.opacity;
    const shading = r.shading;

    for (let my = 0; my < mask.h; my++) {
      const y = my + mask.y0;
      let pu = NaN;
      let pv = NaN;
      for (let mx = 0; mx < mask.w; mx++) {
        const a = (mask.data[(my * mask.w + mx) * 4 + 3] / 255) * alphaMul;
        const x = mx + mask.x0;
        // texture coordinates in "tiles"
        let tx: number;
        let ty: number;
        if (Hinv) {
          applyH(Hinv, x + 0.5, y + 0.5, tmp);
          tx = (tmp.x * qw) / tilePx;
          ty = (tmp.y * qh) / tilePx;
        } else {
          tx = (x + 0.5) / tilePx;
          ty = (y + 0.5) / tilePx;
        }
        const u = (tx * cr - ty * sr) * rx;
        const v = (tx * sr + ty * cr) * ry;
        if (a <= 0.003) {
          pu = u;
          pv = v;
          continue;
        }

        // footprint → mip level (texels per pixel at level 0)
        let lod = 0;
        if (pu === pu) {
          const fp = Math.hypot(u - pu, v - pv) * N0;
          lod = fp > 1 ? Math.min(maxLevel, Math.log2(fp)) : 0;
        } else {
          const fp = (N0 / tilePx) * (Hinv ? qw / W + 0.5 : 1);
          lod = fp > 1 ? Math.min(maxLevel, Math.log2(fp)) : 0;
        }
        pu = u;
        pv = v;
        const l0 = Math.floor(lod);
        const lf = lod - l0;
        acc[0] = acc[1] = acc[2] = 0;
        sample(tex.levels[l0], u, v, acc, 1 - lf);
        if (lf > 0.01 && l0 < maxLevel) sample(tex.levels[l0 + 1], u, v, acc, lf);

        const i = y * W + x;
        const bi = i * 4;
        let rr = acc[0];
        let gg = acc[1];
        let bb = acc[2];
        if (r.blend === 'natural') {
          const ratio = luminance[i] / meanL;
          let k = 1 + (ratio - 1) * shading;
          k = k < 0.15 ? 0.15 : k > 1.9 ? 1.9 : k;
          rr *= k;
          gg *= k;
          bb *= k;
        } else if (r.blend === 'multiply') {
          rr = (rr * base.data[bi]) / 255;
          gg = (gg * base.data[bi + 1]) / 255;
          bb = (bb * base.data[bi + 2]) / 255;
        }
        const ia = 1 - a;
        o[bi] = o[bi] * ia + rr * a;
        o[bi + 1] = o[bi + 1] * ia + gg * a;
        o[bi + 2] = o[bi + 2] * ia + bb * a;
      }
    }
  }
  return out;
}
