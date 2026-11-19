import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getProductOrPlain } from '../data/products';
import { useDesign, useSurfaceProductId } from '../store/designStore';
import type { SurfaceId } from './surfaces';
import { acquireTexture, releaseTexture, type TexturePair } from './textureCache';
import type { TextureSource } from '../types/catalog';

/* ---------------- registry used for clean screenshots & compare ---------------- */

const registry = new Map<SurfaceId, THREE.MeshPhysicalMaterial>();
const appliedListeners = new Set<(surface: SurfaceId, productId: string) => void>();
let suppressHighlight = false;

export function withHighlightsSuppressed<T>(fn: () => T): T {
  suppressHighlight = true;
  const saved = new Map<THREE.MeshPhysicalMaterial, number>();
  registry.forEach((m) => {
    saved.set(m, m.emissiveIntensity);
    m.emissiveIntensity = 0;
  });
  try {
    return fn();
  } finally {
    saved.forEach((v, m) => (m.emissiveIntensity = v));
    suppressHighlight = false;
  }
}

/** Resolves when `surface` is displaying `productId` (or after a timeout). */
export function waitForApplied(surface: SurfaceId, productId: string, timeout = 15000): Promise<void> {
  const m = registry.get(surface);
  if (m && m.userData.productId === productId && m.userData.ready) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(done, timeout);
    function done() {
      clearTimeout(t);
      appliedListeners.delete(l);
      resolve();
    }
    const l = (s: SurfaceId, p: string) => {
      if (s === surface && p === productId) done();
    };
    appliedListeners.add(l);
  });
}

/* ------------------------------------------------------------------------------ */

const GOLD = new THREE.Color('#d4b27a');

/** Texture pair for a product, with surface-specific repeat & rotation applied to clones. */
function useScaledTextures(key: string | null, source: TextureSource | null, repeat: [number, number], rotation: number) {
  const [loaded, setLoaded] = useState<{ key: string; pair: TexturePair } | null>(null);

  useEffect(() => {
    if (!key || !source) return;
    let alive = true;
    acquireTexture(key, source)
      .then((pair) => alive && setLoaded({ key, pair }))
      .catch(() => {
        /* keep previous texture */
      });
    return () => {
      alive = false;
      releaseTexture(key);
    };
    // source identity is tied to key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const clones = useMemo(() => {
    if (!loaded) return null;
    const make = (t: THREE.Texture) => {
      const c = t.clone();
      c.repeat.set(repeat[0], repeat[1]);
      c.rotation = rotation;
      c.needsUpdate = true;
      return c;
    };
    return { key: loaded.key, map: make(loaded.pair.map), bump: make(loaded.pair.bump) };
  }, [loaded, repeat[0], repeat[1], rotation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      clones?.map.dispose();
      clones?.bump.dispose();
    },
    [clones],
  );
  return clones;
}

/**
 * A MeshPhysicalMaterial bound to a customisable surface. The material
 * instance is stable; textures and properties update when the design changes.
 */
export function useSurfaceMaterial(surface: SurfaceId, opts: { side?: THREE.Side } = {}) {
  const productId = useSurfaceProductId(surface);
  const scale = useDesign((s) => s.surfaces[surface].scale);
  const rotationDeg = useDesign((s) => s.surfaces[surface].rotation);
  const selected = useDesign((s) => s.selected === surface);
  const hovered = useDesign((s) => s.hovered === surface);
  const invalidate = useThree((s) => s.invalidate);
  const product = getProductOrPlain(productId);

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#d9d2c5', roughness: 0.9, side: opts.side ?? THREE.FrontSide });
    m.emissive = GOLD.clone();
    m.emissiveIntensity = 0;
    return m;
  }, [opts.side]);

  useEffect(() => {
    registry.set(surface, material);
    return () => {
      registry.delete(surface);
      material.dispose();
    };
  }, [surface, material]);

  const repeat: [number, number] = [
    product.textureRepeat[0] / (product.textureScale * scale),
    product.textureRepeat[1] / (product.textureScale * scale),
  ];
  const tex = useScaledTextures(product.id, product.texture, repeat, (rotationDeg * Math.PI) / 180);

  // fade-in animation state
  const fade = useRef(1);

  useEffect(() => {
    if (!tex) return;
    const mp = product.materialProperties;
    const hadMap = !!material.map;
    material.map = tex.map;
    material.bumpMap = tex.bump;
    material.bumpScale = mp.bumpScale;
    material.color.set('#ffffff');
    material.roughness = mp.roughness;
    material.metalness = mp.metalness;
    // sheen at full strength washes out deep colours; keep it as a soft edge glow
    material.sheen = (mp.sheen ?? 0) * 0.45;
    material.sheenRoughness = 0.75;
    material.sheenColor.set(mp.sheenColor ?? '#ffffff');
    material.clearcoat = mp.clearcoat ?? 0;
    material.clearcoatRoughness = 0.4;
    const opacity = mp.opacity ?? 1;
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.depthWrite = opacity >= 1;
    material.userData.productId = tex.key;
    material.userData.ready = true;
    if (!hadMap || material.transparent !== material.userData.wasTransparent) material.needsUpdate = true;
    material.userData.wasTransparent = material.transparent;
    fade.current = 0;
    invalidate();
    appliedListeners.forEach((l) => l(surface, tex.key));
  }, [tex, material, product, surface, invalidate]);

  useFrame((_, dt) => {
    let changed = false;
    if (fade.current < 1) {
      fade.current = Math.min(1, fade.current + dt * 3.2);
      const k = 0.55 + 0.45 * (1 - Math.pow(1 - fade.current, 3));
      material.color.setScalar(k);
      changed = true;
    }
    const target = suppressHighlight ? 0 : selected ? 0.11 : hovered ? 0.06 : 0;
    if (Math.abs(material.emissiveIntensity - target) > 0.002) {
      material.emissiveIntensity += (target - material.emissiveIntensity) * Math.min(1, dt * 10);
      changed = true;
    }
    if (changed) invalidate();
  });

  return material;
}

/** Static textured material for fixed decor (rug, artwork, table top). */
export function useDecorMaterial(
  key: string,
  source: TextureSource,
  params: { repeat: [number, number]; roughness?: number; metalness?: number; bumpScale?: number; color?: string },
) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: params.color ?? '#e8e1d6',
        roughness: params.roughness ?? 0.8,
        metalness: params.metalness ?? 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const invalidate = useThree((s) => s.invalidate);
  const tex = useScaledTextures(key, source, params.repeat, 0);
  useEffect(() => {
    if (!tex) return;
    material.map = tex.map;
    material.bumpMap = tex.bump;
    material.bumpScale = params.bumpScale ?? 0.3;
    material.color.set('#ffffff');
    material.needsUpdate = true;
    invalidate();
  }, [tex, material, params.bumpScale, invalidate]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
