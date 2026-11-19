import { useMemo, useState } from 'react';
import { usePhoto, surfaceCategories, surfaceLabels } from './store';
import type { BlendMode, PhotoRegion, PhotoSurfaceType } from './types';
import { products, getProduct } from '../data/products';
import { categoryById } from '../data/categories';
import type { CategoryId } from '../types/catalog';
import { MaterialSwatch } from '../components/ui/MaterialSwatch';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/Button';
import { defaultQuadFor } from './homography';

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { beginGesture, endGesture } = usePhoto.getState();
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={beginGesture}
        onPointerUp={endGesture}
        onKeyDown={beginGesture}
        onKeyUp={endGesture}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-lux mt-2"
      />
    </label>
  );
}

function RegionDetails({ region }: { region: PhotoRegion }) {
  const { updateRegion, deleteRegion, duplicateRegion, moveRegion } = usePhoto.getState();
  const cats = useMemo(() => surfaceCategories(region.surfaceType), [region.surfaceType]);
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const list = useMemo(
    () => products.filter((p) => cats.includes(p.category) && (cat === 'all' || p.category === cat)),
    [cats, cat],
  );
  const live = (patch: Partial<PhotoRegion>) => updateRegion(region.id, patch, { history: false });
  const product = getProduct(region.productId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <input
          value={region.name}
          onChange={(e) => live({ name: e.target.value })}
          onBlur={() => usePhoto.getState().endGesture()}
          onFocus={() => usePhoto.getState().beginGesture()}
          className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent p-0 font-serif text-2xl hover:border-line focus:border-gold focus:outline-none"
          aria-label="Region name"
        />
        <IconButton icon="chevronUp" label="Bring forward" onClick={() => moveRegion(region.id, 1)} />
        <IconButton icon="chevronDown" label="Send backward" onClick={() => moveRegion(region.id, -1)} />
      </div>

      <div>
        <p className="label-lux">Surface type</p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(surfaceLabels) as PhotoSurfaceType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                const keep = product && surfaceCategories(t).includes(product.category);
                updateRegion(region.id, { surfaceType: t, productId: keep ? region.productId : null });
                setCat('all');
              }}
              className={`border px-2.5 py-1 text-[11px] ${region.surfaceType === t ? 'border-charcoal bg-charcoal text-ivory' : 'border-line text-muted hover:border-charcoal'}`}
            >
              {surfaceLabels[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label-lux !mb-0">Material</p>
          {product && <span className="truncate text-xs text-muted">{product.name}</span>}
        </div>
        {cats.length > 1 && (
          <div className="no-scrollbar mb-2 flex gap-1 overflow-x-auto">
            {(['all', ...cats] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 px-2 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase ${cat === c ? 'bg-charcoal text-ivory' : 'text-muted hover:text-charcoal'}`}
              >
                {c === 'all' ? 'All' : (categoryById[c]?.visualizerLabel ?? c)}
              </button>
            ))}
          </div>
        )}
        {!region.productId && <p className="mb-2 text-xs text-gold-dark">Choose a material for this surface ↓</p>}
        <div className="scrollbar-thin grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => updateRegion(region.id, { productId: p.id })}
              title={p.name}
              aria-pressed={p.id === region.productId}
              className={`relative aspect-square overflow-hidden ${p.id === region.productId ? 'ring-2 ring-gold ring-offset-2 ring-offset-ivory' : 'ring-1 ring-line hover:ring-charcoal/40'}`}
            >
              <MaterialSwatch product={p} size={128} className="absolute inset-0" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <Slider label="Pattern scale" value={region.scale} min={0.2} max={3} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(scale) => live({ scale })} />
        <Slider label="Rotation" value={region.rotation} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(rotation) => live({ rotation })} />
        <Slider label="Opacity" value={region.opacity} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => live({ opacity })} />
        <Slider label="Keep room light & shadow" value={region.shading} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(shading) => live({ shading })} />
        <Slider label="Edge softness" value={region.feather} min={0} max={12} step={0.5} format={(v) => `${v}px`} onChange={(feather) => live({ feather })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label-lux">Blend</span>
          <select
            className="input-lux !py-2"
            value={region.blend}
            onChange={(e) => updateRegion(region.id, { blend: e.target.value as BlendMode })}
          >
            <option value="natural">Natural (recommended)</option>
            <option value="multiply">Multiply</option>
            <option value="normal">Flat colour</option>
          </select>
        </label>
        <div>
          <span className="label-lux">Perspective</span>
          <button
            onClick={() => updateRegion(region.id, { perspective: region.perspective ? null : defaultQuadFor(region.points) })}
            className={`flex h-[38px] w-full items-center justify-center gap-2 border text-xs ${region.perspective ? 'border-[#6f8fff] bg-[#6f8fff]/10 text-[#3550b8]' : 'border-line text-muted hover:border-charcoal'}`}
            aria-pressed={!!region.perspective}
          >
            <Icon name="grid" size={14} /> {region.perspective ? 'Guide on' : 'Guide off'}
          </button>
        </div>
      </div>
      {region.perspective && (
        <p className="flex items-start gap-2 bg-[#6f8fff]/8 p-3 text-xs leading-relaxed text-muted">
          <Icon name="info" size={14} className="mt-0.5 shrink-0 text-[#6f8fff]" />
          <span>
            Drag the four blue corners onto lines that are parallel in the real room, such as the floor–wall edges or a
            rug's corners. The texture will recede with the surface.{' '}
            <button className="underline" onClick={() => updateRegion(region.id, { perspective: defaultQuadFor(region.points) })}>
              Reset guide
            </button>
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          onClick={() => updateRegion(region.id, { visible: !region.visible })}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase hover:bg-charcoal/5"
        >
          <Icon name={region.visible ? 'eyeOff' : 'eye'} size={14} /> {region.visible ? 'Hide' : 'Show'}
        </button>
        <button onClick={() => duplicateRegion(region.id)} className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase hover:bg-charcoal/5">
          <Icon name="copy" size={14} /> Duplicate
        </button>
        <button onClick={() => deleteRegion(region.id)} className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-red-800 uppercase hover:bg-red-50">
          <Icon name="trash" size={14} /> Delete
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-taupe">
        Drag points to refine edges · Click a “+” to add a point · Alt-click a point to remove it · Drag inside the shape to move it
      </p>
    </div>
  );
}

export function RegionPanel() {
  const regions = usePhoto((s) => s.regions);
  const selectedId = usePhoto((s) => s.selectedId);
  const { select, setTool, updateRegion } = usePhoto.getState();
  const selected = regions.find((r) => r.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label-lux !mb-0">Surfaces ({regions.length})</p>
          <button onClick={() => setTool('draw')} className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.12em] text-gold-dark uppercase">
            <Icon name="plus" size={14} /> New
          </button>
        </div>
        {regions.length === 0 ? (
          <div className="border border-dashed border-line p-5 text-sm leading-relaxed text-muted">
            <p className="font-medium text-charcoal">Outline your first surface</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
              <li>Pick the Draw tool (pen) and click around the edge of a wall, floor or sofa.</li>
              <li>Close the shape by clicking the first point.</li>
              <li>Choose a material and fine-tune it.</li>
            </ol>
            <p className="mt-3 text-xs">Or try Smart select (wand) and click once inside a plain wall.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {[...regions].reverse().map((r) => {
              const p = getProduct(r.productId);
              return (
                <li key={r.id} className={`flex items-center gap-3 px-2 py-2 ${r.id === selectedId ? 'bg-cream' : ''}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { select(r.id); setTool('select'); }}>
                    {p ? (
                      <MaterialSwatch product={p} size={128} className="h-9 w-9 shrink-0" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-dashed border-gold text-gold">
                        <Icon name="plus" size={14} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block truncate text-[11px] text-muted">{p ? p.name : 'No material yet'}</span>
                    </span>
                  </button>
                  <IconButton
                    icon={r.visible ? 'eye' : 'eyeOff'}
                    label={r.visible ? 'Hide' : 'Show'}
                    onClick={() => updateRegion(r.id, { visible: !r.visible })}
                    className="!h-8 !w-8"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selected && <RegionDetails key={selected.id} region={selected} />}
    </div>
  );
}
