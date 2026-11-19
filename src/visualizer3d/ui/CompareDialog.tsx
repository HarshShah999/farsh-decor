import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { MaterialSwatch } from '../../components/ui/MaterialSwatch';
import { Icon } from '../../components/ui/Icon';
import { products, getProduct } from '../../data/products';
import { useDesign } from '../../store/designStore';
import { SURFACES, surfaceById, type SurfaceId } from '../surfaces';
import { preloadTexture } from '../textureCache';
import { waitForApplied } from '../useSurfaceMaterial';
import { nextFrames } from '../viewer';
import { captureRaw } from '../capture';
import { toast } from '../../store/toastStore';

const MAX = 3;

/**
 * Renders the current camera view once per candidate material (temporarily
 * applied, without touching history) and shows the results side by side.
 */
export function CompareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const selected = useDesign((s) => s.selected);
  const surfaces = useDesign((s) => s.surfaces);
  const [surface, setSurface] = useState<SurfaceId>('wallMain');
  const [picks, setPicks] = useState<string[]>([]);
  const [shots, setShots] = useState<{ productId: string; url: string }[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const s = selected ?? 'wallMain';
    setSurface(s);
    setPicks([surfaces[s].productId]);
    setShots(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = products.filter((p) => surfaceById[surface].accepts.includes(p.category));

  const toggle = (id: string) =>
    setPicks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]));

  const run = async () => {
    setBusy(true);
    const { setPreview } = useDesign.getState();
    const out: { productId: string; url: string }[] = [];
    try {
      for (const id of picks) {
        const p = getProduct(id)!;
        await preloadTexture(p.id, p.texture);
        setPreview({ surface, productId: id });
        await waitForApplied(surface, id);
        await nextFrames(12); // allow the fade-in to finish
        const url = captureRaw();
        if (url) out.push({ productId: id, url });
      }
    } finally {
      setPreview(null);
      setBusy(false);
    }
    setShots(out);
  };

  const applyPick = (id: string) => {
    useDesign.getState().apply(id, surface);
    toast(`${getProduct(id)!.name} applied`, 'success');
    onClose();
  };

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title="Compare materials" eyebrow="Side by side, from your current view" size="xl">
      {shots ? (
        <div>
          <div className={`grid gap-4 ${shots.length > 2 ? 'md:grid-cols-3' : shots.length === 2 ? 'md:grid-cols-2' : ''}`}>
            {shots.map((s) => {
              const p = getProduct(s.productId)!;
              return (
                <figure key={s.productId} className="bg-white shadow-[var(--shadow-soft)]">
                  <img src={s.url} alt={`Room with ${p.name}`} className="aspect-[4/3] w-full object-cover" />
                  <figcaption className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-xl">{p.name}</p>
                      <p className="text-xs text-muted">{surfaceById[surface].label}</p>
                    </div>
                    <Button size="sm" onClick={() => applyPick(s.productId)}>
                      Apply
                    </Button>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" iconLeft="arrowLeft" onClick={() => setShots(null)}>
              Choose others
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block sm:w-72">
              <span className="label-lux">Surface</span>
              <select
                className="input-lux"
                value={surface}
                onChange={(e) => {
                  const s = e.target.value as SurfaceId;
                  setSurface(s);
                  setPicks([surfaces[s].productId]);
                }}
              >
                {SURFACES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-muted">
              Choose up to {MAX} materials ({picks.length}/{MAX}). Frame the view first; the comparison uses your current camera.
            </p>
          </div>
          <div className="scrollbar-thin mt-6 grid max-h-[46vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-7">
            {candidates.map((p) => {
              const on = picks.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggle(p.id)} className="text-left" aria-pressed={on}>
                  <span className={`relative block aspect-square overflow-hidden ${on ? 'ring-2 ring-gold ring-offset-2' : 'ring-1 ring-line'}`}>
                    <MaterialSwatch product={p} className="absolute inset-0" />
                    {on && (
                      <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[10px] text-ivory">
                        {picks.indexOf(p.id) + 1}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[11px]">{p.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={run} disabled={busy || picks.length < 2} iconLeft={busy ? undefined : 'compare'}>
              {busy ? (
                <>
                  <Icon name="reset" size={15} className="animate-spin" /> Rendering…
                </>
              ) : (
                'Compare'
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
