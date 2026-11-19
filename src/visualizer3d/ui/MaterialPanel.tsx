import { useEffect, useMemo, useState } from 'react';
import { products } from '../../data/products';
import { categories, categoryById } from '../../data/categories';
import type { CategoryId, ColorFamily, Product } from '../../types/catalog';
import { useDesign } from '../../store/designStore';
import { SURFACES, surfaceById, type SurfaceId } from '../surfaces';
import { MaterialSwatch } from '../../components/ui/MaterialSwatch';
import { Icon } from '../../components/ui/Icon';
import { preloadTexture } from '../textureCache';
import { toast } from '../../store/toastStore';

const tones: ColorFamily[] = ['Neutral', 'Warm', 'Cool', 'Green', 'Dark', 'Pattern'];

function Tile({ product, active, onApply }: { product: Product; active: boolean; onApply: () => void }) {
  return (
    <button
      onClick={onApply}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') preloadTexture(product.id, product.texture).catch(() => undefined);
      }}
      className={`group relative flex flex-col text-left outline-none ${active ? '' : ''}`}
      aria-pressed={active}
      title={product.name}
    >
      <span
        className={`relative block aspect-square overflow-hidden transition-all duration-300 ${
          active ? 'ring-2 ring-gold ring-offset-2 ring-offset-ivory' : 'ring-1 ring-line group-hover:ring-charcoal/40'
        }`}
      >
        <MaterialSwatch product={product} size={256} className="absolute inset-0" />
        {active && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-ivory">
            <Icon name="check" size={12} strokeWidth={2.4} />
          </span>
        )}
      </span>
      <span className="mt-1.5 line-clamp-2 text-[11.5px] leading-tight text-ink">{product.name}</span>
    </button>
  );
}

export function MaterialPanel({ layout = 'grid' }: { layout?: 'grid' | 'strip' }) {
  const selected = useDesign((s) => s.selected);
  const surfaces = useDesign((s) => s.surfaces);
  const apply = useDesign((s) => s.apply);
  const select = useDesign((s) => s.select);
  const allowed: CategoryId[] = selected ? surfaceById[selected].accepts : categories.map((c) => c.id);
  const [cat, setCat] = useState<CategoryId>(allowed[0]);
  const [q, setQ] = useState('');
  const [tone, setTone] = useState<ColorFamily | 'all'>('all');

  // keep the category tab valid for the selected surface
  useEffect(() => {
    if (!allowed.includes(cat)) setCat(allowed[0]);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (s ? allowed.includes(p.category) : p.category === cat) &&
        (tone === 'all' || p.colorFamily === tone) &&
        (!s || [p.name, p.collection, ...p.tags].join(' ').toLowerCase().includes(s)),
    );
  }, [cat, q, tone, allowed]);

  const onApply = (p: Product) => {
    const target = apply(p.id);
    if (target) {
      select(target);
      toast(`${p.name} applied to ${surfaceById[target].label.toLowerCase()}`, 'success');
    }
  };

  const activeId = selected ? surfaces[selected].productId : null;

  const surfaceSelect = (
    <label className="flex items-center gap-2">
      <span className="sr-only">Surface to customise</span>
      <select
        value={selected ?? ''}
        onChange={(e) => select((e.target.value || null) as SurfaceId | null)}
        className="w-full cursor-pointer border border-line bg-white py-2 pr-8 pl-3 text-[13px] font-medium"
      >
        <option value="">Auto (best surface for the material)</option>
        {(['Walls', 'Floors', 'Soft furnishings'] as const).map((g) => (
          <optgroup key={g} label={g}>
            {SURFACES.filter((s) => s.group === g).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );

  const tabs = (
    <div className="no-scrollbar flex gap-1 overflow-x-auto">
      {allowed.map((c) => (
        <button
          key={c}
          onClick={() => {
            setCat(c);
            setQ('');
          }}
          className={`shrink-0 px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.12em] uppercase transition-colors ${
            cat === c && !q ? 'bg-charcoal text-ivory' : 'text-muted hover:bg-charcoal/5 hover:text-charcoal'
          }`}
        >
          {categoryById[c].visualizerLabel}
        </button>
      ))}
    </div>
  );

  if (layout === 'strip') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{surfaceSelect}</div>
        </div>
        {tabs}
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {list.map((p) => (
            <div key={p.id} className="w-[76px] shrink-0">
              <Tile product={p} active={p.id === activeId} onApply={() => onApply(p)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b border-line p-5">
        <div>
          <p className="label-lux">Customising</p>
          {surfaceSelect}
          {!selected && <p className="mt-2 text-xs text-muted">Tip: click any wall, floor, curtain or sofa in the room.</p>}
        </div>
        <div className="relative">
          <Icon name="search" size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-taupe" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search materials"
            className="w-full border border-line bg-white py-2 pr-3 pl-9 text-sm focus:border-gold focus:outline-none"
            aria-label="Search materials"
          />
        </div>
        {tabs}
        <div className="flex flex-wrap gap-1">
          {(['all', ...tones] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`border px-2 py-0.5 text-[10.5px] transition-colors ${tone === t ? 'border-charcoal text-charcoal' : 'border-transparent text-muted hover:text-charcoal'}`}
            >
              {t === 'all' ? 'All tones' : t}
            </button>
          ))}
        </div>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No materials match.</p>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            {list.map((p) => (
              <Tile key={p.id} product={p} active={p.id === activeId} onApply={() => onApply(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
