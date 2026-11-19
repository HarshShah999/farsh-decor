import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CategoryId, ColorFamily, Product } from '../../types/catalog';
import { categories } from '../../data/categories';
import { ProductCard } from './ProductCard';
import { Icon } from '../ui/Icon';

const families: ColorFamily[] = ['Neutral', 'Warm', 'Cool', 'Green', 'Dark', 'Pattern'];

export function ProductGrid({ items, showCategoryFilter = false }: { items: Product[]; showCategoryFilter?: boolean }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [family, setFamily] = useState<ColorFamily | 'all'>('all');
  const [sort, setSort] = useState<'featured' | 'az' | 'za'>('featured');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = items.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (family === 'all' || p.colorFamily === family) &&
        (!s || [p.name, p.collection, p.description, ...p.tags].join(' ').toLowerCase().includes(s)),
    );
    if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
    else list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return list;
  }, [items, q, cat, family, sort]);

  const availableFamilies = families.filter((f) => items.some((p) => p.colorFamily === f));

  return (
    <div>
      <div className="mb-10 flex flex-col gap-4 border-y border-line py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Icon name="search" size={16} className="absolute top-1/2 left-0 -translate-y-1/2 text-taupe" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search materials, colours, styles…"
            className="w-full border-0 border-b border-transparent bg-transparent py-2 pr-2 pl-7 text-sm focus:border-gold focus:outline-none"
            aria-label="Search materials"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showCategoryFilter && (
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value as CategoryId | 'all')}
              className="border border-line bg-white px-3 py-2 text-xs tracking-wide"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto">
            {(['all', ...availableFamilies] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFamily(f)}
                className={`shrink-0 border px-3 py-1.5 text-[11px] tracking-[0.08em] transition-colors ${
                  family === f ? 'border-charcoal bg-charcoal text-ivory' : 'border-line text-muted hover:border-charcoal'
                }`}
              >
                {f === 'all' ? 'All tones' : f}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="border border-line bg-white px-3 py-2 text-xs tracking-wide"
            aria-label="Sort"
          >
            <option value="featured">Featured first</option>
            <option value="az">Name A–Z</option>
            <option value="za">Name Z–A</option>
          </select>
        </div>
      </div>
      <p className="mb-6 text-xs tracking-[0.14em] text-muted uppercase">
        {filtered.length} {filtered.length === 1 ? 'material' : 'materials'}
      </p>
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-3xl">No materials match those filters</p>
          <button
            className="mt-4 text-sm text-gold-dark underline"
            onClick={() => {
              setQ('');
              setFamily('all');
              setCat('all');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <motion.div layout className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
