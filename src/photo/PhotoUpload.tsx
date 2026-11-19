import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { PhotoImage } from './store';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { loadImageEl } from '../lib/imageUtils';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 15 * 1024 * 1024;
const WORK_MAX = 1800;

const samples = [
  { src: '/images/sample-room-1.jpg', label: 'Living room' },
  { src: '/images/about-minimal.jpg', label: 'Minimal corner' },
  { src: '/images/insp-bright.jpg', label: 'Open plan' },
];

export function validateImageFile(file: File): string | null {
  if (!ACCEPT.includes(file.type)) {
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
      return 'HEIC photos are not supported by browsers yet. Please export the photo as JPG first.';
    return 'Please upload a JPG, PNG or WEBP image.';
  }
  if (file.size > MAX_BYTES) return `That file is ${(file.size / 1048576).toFixed(1)} MB. Please use an image under 15 MB.`;
  return null;
}

/** Crop + downscale to working resolution and encode as JPEG. */
async function prepare(src: string, crop: { x: number; y: number; w: number; h: number }): Promise<PhotoImage> {
  const img = await loadImageEl(src);
  const k = Math.min(1, WORK_MAX / Math.max(crop.w, crop.h));
  const w = Math.round(crop.w * k);
  const h = Math.round(crop.h * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Encoding failed'))), 'image/jpeg', 0.92));
  return { url: URL.createObjectURL(blob), blob, width: w, height: h };
}

export function PhotoUpload({ onReady }: { onReady: (img: PhotoImage) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // fraction of frame
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(
    () => () => {
      if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
    },
    [src],
  );

  const accept = async (file: File) => {
    const err = validateImageFile(file);
    if (err) return setError(err);
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageEl(url);
      if (img.naturalWidth < 300 || img.naturalHeight < 300) {
        URL.revokeObjectURL(url);
        return setError('That image is very small. Please use a photo at least 300 × 300 pixels.');
      }
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setSrc(url);
      setZoom(1);
      setOff({ x: 0, y: 0 });
    } catch {
      setError('That file could not be read as an image.');
    }
  };

  const useSample = async (s: string) => {
    setBusy(true);
    try {
      const blob = await (await fetch(s)).blob();
      await accept(new File([blob], 'sample.jpg', { type: 'image/jpeg' }));
    } finally {
      setBusy(false);
    }
  };

  const clampOff = (o: { x: number; y: number }, z = zoom) => {
    const lim = (z - 1) / 2 / z; // max offset as fraction so the frame stays covered
    return { x: Math.max(-lim, Math.min(lim, o.x)), y: Math.max(-lim, Math.min(lim, o.y)) };
  };

  const proceed = async () => {
    if (!src || !nat) return;
    setBusy(true);
    try {
      const w = nat.w / zoom;
      const h = nat.h / zoom;
      const x = (nat.w - w) / 2 - off.x * nat.w;
      const y = (nat.h - h) / 2 - off.y * nat.h;
      onReady(await prepare(src, { x, y, w, h }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (src && nat) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Step 1 of 2 · Frame your photo</p>
            <h2 className="text-3xl sm:text-4xl">Zoom and position your room</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" iconLeft="upload" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconLeft="trash"
              onClick={() => {
                setSrc(null);
                setNat(null);
              }}
            >
              Remove
            </Button>
          </div>
        </div>
        <div
          ref={frameRef}
          className="relative mx-auto max-h-[62vh] touch-none overflow-hidden bg-charcoal"
          style={{ aspectRatio: `${nat.w} / ${nat.h}`, cursor: zoom > 1 ? 'grab' : 'default' }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            dragRef.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d || !frameRef.current) return;
            const r = frameRef.current.getBoundingClientRect();
            setOff(clampOff({ x: d.ox + (e.clientX - d.x) / r.width / zoom, y: d.oy + (e.clientY - d.y) / r.height / zoom }));
          }}
          onPointerUp={() => (dragRef.current = null)}
        >
          <img
            src={src}
            alt="Your uploaded room"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: `scale(${zoom}) translate(${off.x * 100}%, ${off.y * 100}%)` }}
          />
        </div>
        <div className="mt-5 flex flex-col items-center justify-between gap-5 sm:flex-row">
          <label className="flex w-full max-w-xs items-center gap-3 text-xs text-muted">
            <Icon name="minus" size={14} />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => {
                const z = Number(e.target.value);
                setZoom(z);
                setOff((o) => clampOff(o, z));
              }}
              className="range-lux"
              aria-label="Zoom"
            />
            <Icon name="plus" size={14} />
          </label>
          <p className="text-xs text-muted">
            {nat.w} × {nat.h}px · {zoom > 1 ? 'Drag to position. The photo will be cropped to this frame.' : 'Use the slider to zoom and crop if you need to.'}
          </p>
          <Button size="lg" icon="arrowRight" onClick={proceed} disabled={busy}>
            {busy ? 'Preparing…' : 'Continue'}
          </Button>
        </div>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) accept(f);
            e.target.value = '';
          }}
        />
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) accept(f);
        }}
        className={`flex flex-col items-center justify-center border border-dashed px-6 py-16 text-center transition-colors sm:py-20 ${
          dragOver ? 'border-gold bg-gold/5' : 'border-taupe/60 bg-white'
        }`}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-charcoal text-ivory">
          <Icon name="upload" size={26} />
        </span>
        <p className="mt-6 font-serif text-3xl">Drop your room photo here</p>
        <p className="mt-2 text-sm text-muted">JPG, PNG or WEBP · up to 15 MB · taken in good daylight works best</p>
        <Button className="mt-8" size="lg" iconLeft="image" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose a photo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) accept(f);
            e.target.value = '';
          }}
        />
        {error && (
          <p className="mt-5 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="mt-10">
        <p className="label-lux text-center">Or try a sample room</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {samples.map((s) => (
            <button key={s.src} onClick={() => useSample(s.src)} className="group relative overflow-hidden" disabled={busy}>
              <img src={s.src} alt={s.label} className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent p-2 text-left text-[11px] font-semibold tracking-[0.12em] text-ivory uppercase">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted">
        Your photo stays in your browser and is never uploaded to a server. This tool overlays materials onto your 2D
        photo; it does not create a 3D model of your room.
      </p>
    </div>
  );
}
