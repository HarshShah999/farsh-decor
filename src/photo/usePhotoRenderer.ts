import { useEffect, useRef, useState, type RefObject } from 'react';
import { usePhoto } from './store';
import { buildMips, computeLuminance, renderComposite, type MipTexture } from './compositor';
import { getProduct } from '../data/products';
import { getProductMaps, PRIORITY } from '../lib/textures/textureService';
import { loadImageEl } from '../lib/imageUtils';

interface Base {
  url: string;
  img: ImageData;
  lum: Float32Array;
  out: ImageData;
}

const TEX_SIZE = 512;

/** Keeps the composite canvas in sync with the image + regions. Returns render status. */
export function usePhotoRenderer(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const image = usePhoto((s) => s.image);
  const regions = usePhoto((s) => s.regions);
  const baseRef = useRef<Base | null>(null);
  const [baseVersion, setBaseVersion] = useState(0);
  const textures = useRef(new Map<string, MipTexture>());
  const loading = useRef(new Set<string>());
  const [texVersion, setTexVersion] = useState(0);
  const [pendingTextures, setPendingTextures] = useState(0);

  // decode the working image once
  useEffect(() => {
    if (!image) return;
    let alive = true;
    loadImageEl(image.url).then((el) => {
      if (!alive) return;
      const c = document.createElement('canvas');
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(el, 0, 0, image.width, image.height);
      const img = ctx.getImageData(0, 0, image.width, image.height);
      baseRef.current = { url: image.url, img, lum: computeLuminance(img), out: new ImageData(image.width, image.height) };
      setBaseVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [image]);

  // load textures used by regions (on demand)
  useEffect(() => {
    for (const r of regions) {
      const id = r.productId;
      if (!id || textures.current.has(id) || loading.current.has(id)) continue;
      const p = getProduct(id);
      if (!p) continue;
      loading.current.add(id);
      setPendingTextures((n) => n + 1);
      getProductMaps(p, TEX_SIZE, PRIORITY.preview)
        .then((m) => {
          textures.current.set(id, buildMips(m.albedo));
          setTexVersion((v) => v + 1);
        })
        .catch(() => undefined)
        .finally(() => {
          loading.current.delete(id);
          setPendingTextures((n) => n - 1);
        });
    }
    // drop textures no longer used (memory)
    const used = new Set(regions.map((r) => r.productId));
    for (const id of textures.current.keys()) if (!used.has(id) && textures.current.size > 6) textures.current.delete(id);
  }, [regions]);

  // render (rAF-throttled)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const b = baseRef.current;
      const canvas = canvasRef.current;
      if (!b || !canvas || !image || b.url !== image.url) return;
      if (canvas.width !== image.width) canvas.width = image.width;
      if (canvas.height !== image.height) canvas.height = image.height;
      const tileMetres = new Map<string, { metres: number; repeat: [number, number] }>();
      regions.forEach((r) => {
        const p = r.productId ? getProduct(r.productId) : undefined;
        if (p) tileMetres.set(p.id, { metres: p.textureScale, repeat: p.textureRepeat });
      });
      renderComposite({ base: b.img, luminance: b.lum, regions, textures: textures.current, tileMetres }, b.out);
      canvas.getContext('2d')!.putImageData(b.out, 0, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [regions, baseVersion, texVersion, image, canvasRef]);

  return { ready: baseVersion > 0, pendingTextures };
}
