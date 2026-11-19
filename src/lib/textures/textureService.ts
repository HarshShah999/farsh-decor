/**
 * Texture service – the single entry point for obtaining material textures.
 *
 * - Procedural textures are generated in a small pool of Web Workers so the
 *   UI and the 3D scene stay responsive.
 * - Image textures (real showroom scans) are loaded, resampled to a power of
 *   two and given a derived bump map when none is supplied.
 * - Results are cached (LRU) and requests are prioritised so visible 3D
 *   surfaces load before catalogue thumbnails.
 */
import type { Product, TextureSource } from '../../types/catalog';
import { generate, type GenParams, type GeneratorId } from './generators';
import { hashString } from './noise';

export interface MaterialMaps {
  size: number;
  albedo: ImageData;
  height: ImageData;
}

export const PRIORITY = { thumbnail: 0, preview: 5, scene: 10 } as const;

/* ------------------------------ worker pool ------------------------------ */

interface Job {
  id: number;
  priority: number;
  payload: { generator: GeneratorId; params: GenParams; size: number; seed: number };
  resolve: (m: MaterialMaps) => void;
  reject: (e: unknown) => void;
}

interface Slot {
  worker: Worker;
  job: Job | null;
}

let nextId = 1;
const pool: Slot[] = [];
const queue: Job[] = [];
let workersUnavailable = false;

function initPool() {
  if (pool.length || workersUnavailable) return;
  const n = Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1));
  for (let i = 0; i < n; i++) {
    try {
      const worker = new Worker(new URL('./texture.worker.ts', import.meta.url), { type: 'module' });
      const slot: Slot = { worker, job: null };
      worker.onmessage = (e: MessageEvent) => {
        const job = slot.job;
        slot.job = null;
        if (job) {
          const d = e.data as { error?: string; size: number; albedo: Uint8ClampedArray; height: Uint8ClampedArray };
          if (d.error) runOnMainThread(job);
          else
            job.resolve({
              size: d.size,
              albedo: new ImageData(new Uint8ClampedArray(d.albedo.buffer as ArrayBuffer), d.size, d.size),
              height: new ImageData(new Uint8ClampedArray(d.height.buffer as ArrayBuffer), d.size, d.size),
            });
        }
        pump();
      };
      worker.onerror = (ev) => {
        ev.preventDefault();
        const job = slot.job;
        slot.job = null;
        workersUnavailable = true;
        if (job) runOnMainThread(job);
        pump();
      };
      pool.push(slot);
    } catch {
      workersUnavailable = true;
      break;
    }
  }
}

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function runOnMainThread(job: Job) {
  setTimeout(() => {
    try {
      const { generator, params, size, seed } = job.payload;
      const r = generate(generator, params, size, seed, { createCanvas: makeCanvas });
      job.resolve({
        size,
        albedo: new ImageData(new Uint8ClampedArray(r.albedo.buffer as ArrayBuffer), size, size),
        height: new ImageData(new Uint8ClampedArray(r.height.buffer as ArrayBuffer), size, size),
      });
    } catch (err) {
      job.reject(err);
    }
  }, 0);
}

function pump() {
  if (workersUnavailable) {
    while (queue.length) runOnMainThread(queue.shift()!);
    return;
  }
  for (const slot of pool) {
    if (slot.job || !queue.length) continue;
    // highest priority first, FIFO within a priority
    let best = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].priority > queue[best].priority) best = i;
    const job = queue.splice(best, 1)[0];
    slot.job = job;
    slot.worker.postMessage({ id: job.id, ...job.payload });
  }
}

function requestProcedural(
  source: Extract<TextureSource, { kind: 'procedural' }>,
  size: number,
  priority: number,
): Promise<MaterialMaps> {
  initPool();
  return new Promise((resolve, reject) => {
    const job: Job = {
      id: nextId++,
      priority,
      payload: {
        generator: source.generator,
        params: source.params,
        size,
        seed: source.seed ?? hashString(JSON.stringify(source.params) + source.generator),
      },
      resolve,
      reject,
    };
    queue.push(job);
    pump();
  });
}

/* ------------------------------ image sources ----------------------------- */

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load texture ${url}`));
    img.src = url;
  });
}

function imageToData(img: CanvasImageSource, size: number): ImageData {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

function deriveHeight(albedo: ImageData): ImageData {
  const out = new ImageData(albedo.width, albedo.height);
  const s = albedo.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const l = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
    d[i] = d[i + 1] = d[i + 2] = l;
    d[i + 3] = 255;
  }
  return out;
}

async function requestImage(source: Extract<TextureSource, { kind: 'image' }>, size: number): Promise<MaterialMaps> {
  const img = await loadImage(source.url);
  const albedo = imageToData(img, size);
  const height = source.bumpUrl ? imageToData(await loadImage(source.bumpUrl), size) : deriveHeight(albedo);
  return { size, albedo, height };
}

/* --------------------------------- cache --------------------------------- */

const MAX_CACHE = 10;
const cache = new Map<string, Promise<MaterialMaps>>();

const keyOf = (source: TextureSource, size: number) => `${hashString(JSON.stringify(source))}@${size}`;

/** Get albedo + height maps for a texture source. Cached (LRU). */
export function getMaterialMaps(source: TextureSource, size: number, priority: number = PRIORITY.scene) {
  const key = keyOf(source, size);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const p =
    source.kind === 'procedural' ? requestProcedural(source, size, priority) : requestImage(source, size);
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value as string;
    cache.delete(oldest);
  }
  return p;
}

export function getProductMaps(product: Product, size: number, priority: number = PRIORITY.scene) {
  return getMaterialMaps(product.texture, size, priority);
}

/** Recommended texture resolution for the current device. */
export function preferredTextureSize(): number {
  if (typeof window === 'undefined') return 512;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse || mem < 4 || Math.min(window.innerWidth, window.innerHeight) < 600) return 512;
  return 1024;
}

export function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = data.width;
  c.height = data.height;
  c.getContext('2d')!.putImageData(data, 0, 0);
  return c;
}

/* ------------------------------- thumbnails ------------------------------- */

/** Bump when generators change so cached swatches refresh. */
const THUMB_VERSION = 'v4';
const thumbCache = new Map<string, Promise<string>>();

/** A data-URL swatch for a product (or its photographic thumbnail if provided). */
export function getThumbnailUrl(product: Product, size = 256): Promise<string> {
  if (product.thumbnail) return Promise.resolve(product.thumbnail);
  const key = `farsh:thumb:${THUMB_VERSION}:${product.id}:${size}:${hashString(JSON.stringify(product.texture))}`;
  const hit = thumbCache.get(key);
  if (hit) return hit;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    /* storage unavailable */
  }
  if (stored) {
    const p = Promise.resolve(stored);
    thumbCache.set(key, p);
    return p;
  }
  const p = (async () => {
    const maps =
      product.texture.kind === 'procedural'
        ? await requestProcedural(product.texture, size, PRIORITY.thumbnail)
        : await requestImage(product.texture, size);
    const c = imageDataToCanvas(maps.albedo);
    const url = c.toDataURL('image/jpeg', 0.86);
    try {
      localStorage.setItem(key, url);
    } catch {
      /* quota – ignore, memory cache still works */
    }
    return url;
  })();
  thumbCache.set(key, p);
  p.catch(() => thumbCache.delete(key));
  return p;
}
