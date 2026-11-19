/**
 * Reference-counted cache of three.js textures.
 *
 * - One base texture pair (colour + bump) per material, created on demand.
 * - Surfaces use lightweight clones (shared GPU image, own repeat/rotation).
 * - When nothing references a material any more, its textures are disposed
 *   after a grace period, freeing GPU memory.
 */
import * as THREE from 'three';
import { create } from 'zustand';
import type { TextureSource } from '../types/catalog';
import { getMaterialMaps, imageDataToCanvas, preferredTextureSize, PRIORITY } from '../lib/textures/textureService';

export interface TexturePair {
  map: THREE.Texture;
  bump: THREE.Texture;
}

interface Entry {
  promise: Promise<TexturePair>;
  pair?: TexturePair;
  refs: number;
  timer?: ReturnType<typeof setTimeout>;
}

const entries = new Map<string, Entry>();
let anisotropy = 4;
const DISPOSE_DELAY = 20000;

export const setMaxAnisotropy = (n: number) => {
  anisotropy = Math.min(8, n);
};

/** Loading progress for the UI. */
export const useTextureLoading = create<{ pending: number; done: number }>(() => ({ pending: 0, done: 0 }));

function makePair(source: TextureSource): Promise<TexturePair> {
  useTextureLoading.setState((s) => ({ pending: s.pending + 1 }));
  const size = preferredTextureSize();
  return getMaterialMaps(source, size, PRIORITY.scene)
    .then((maps) => {
      const map = new THREE.CanvasTexture(imageDataToCanvas(maps.albedo));
      map.colorSpace = THREE.SRGBColorSpace;
      const bump = new THREE.CanvasTexture(imageDataToCanvas(maps.height));
      bump.colorSpace = THREE.NoColorSpace;
      for (const t of [map, bump]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = anisotropy;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
      }
      return { map, bump };
    })
    .finally(() => useTextureLoading.setState((s) => ({ pending: s.pending - 1, done: s.done + 1 })));
}

export function acquireTexture(key: string, source: TextureSource): Promise<TexturePair> {
  let e = entries.get(key);
  if (!e) {
    const promise = makePair(source);
    const entry: Entry = { promise, refs: 0 };
    promise.then((p) => (entry.pair = p)).catch(() => entries.delete(key));
    entries.set(key, entry);
    e = entry;
  }
  e.refs++;
  if (e.timer) {
    clearTimeout(e.timer);
    e.timer = undefined;
  }
  return e.promise;
}

export function releaseTexture(key: string) {
  const e = entries.get(key);
  if (!e) return;
  e.refs = Math.max(0, e.refs - 1);
  if (e.refs === 0 && !e.timer) {
    e.timer = setTimeout(() => {
      if (e.refs > 0) return;
      e.pair?.map.dispose();
      e.pair?.bump.dispose();
      entries.delete(key);
    }, DISPOSE_DELAY);
  }
}

/** Resolve once a texture is ready, without holding a reference. */
export function preloadTexture(key: string, source: TextureSource) {
  const p = acquireTexture(key, source);
  releaseTexture(key);
  return p;
}
