import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminCatalog } from '../store';
import { Badge, ConfirmDialog, PageHeader } from '../ui';
import { Button, LinkButton } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { MaterialSwatch } from '../../components/ui/MaterialSwatch';
import { formatPrice } from '../../data/products';
import { toast } from '../../store/toastStore';
import type { Product } from '../../types/catalog';

type StatusFilter = 'all' | 'live' | 'hidden' | 'featured';

export default function ProductsPage() {
  const { products, categories, setPublished, deleteProducts } = useAdminCatalog();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') ?? '';
  const cat = params.get('category') ?? 'all';
  const status = (params.get('filter') ?? 'all') as StatusFilter;
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Product[] | null>(null);
  const [busy, setBusy] = useState(false);

  const setParam = (k: string, v: string, empty: string) => {
    const next = new URLSearchParams(params);
    if (v === empty) next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
    setSelected([]);
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (status === 'all' ||
          (status === 'live' && p.published) ||
          (status === 'hidden' && !p.published) ||
          (status === 'featured' && p.featured)) &&
        (!s || [p.name, p.collection, p.id, ...p.tags].join(' ').toLowerCase().includes(s)),
    );
  }, [products, q, cat, status]);

  const allChecked = list.length > 0 && list.every((p) => selected.includes(p.id));
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const publish = async (ids: string[], value: boolean) => {
    setBusy(true);
    try {
      await setPublished(ids, value);
      toast(
        ids.length === 1
          ? `${products.find((p) => p.id === ids[0])?.name} is now ${value ? 'on the website' : 'hidden'}`
          : `${ids.length} products ${value ? 'shown on the website' : 'hidden'}`,
        'success',
      );
      setSelected([]);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update', 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteProducts(confirmDelete.map((p) => p.id));
      toast(confirmDelete.length === 1 ? `${confirmDelete[0].name} deleted` : `${confirmDelete.length} products deleted`, 'success');
      setSelected([]);
      setConfirmDelete(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete', 'error');
    } finally {
      setBusy(false);
    }
  };

  const selectCls = 'border border-line bg-white px-3 py-2.5 text-sm focus:border-gold focus:outline-none';

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} products in total. Click a product to change its title, description, photos or price.`}
        actions={
          <LinkButton to={`/admin/products/new${cat !== 'all' ? `?category=${cat}` : ''}`} iconLeft="plus">
            New product
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search products</span>
          <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setParam('q', e.target.value, '')}
            placeholder="Search by title, collection or tag…"
            className={`${selectCls} w-full pl-9`}
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select value={cat} onChange={(e) => setParam('category', e.target.value, 'all')} className={selectCls}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => setParam('filter', e.target.value, 'all')} className={selectCls}>
            <option value="all">All statuses</option>
            <option value="live">On the website</option>
            <option value="hidden">Hidden</option>
            <option value="featured">Featured on homepage</option>
          </select>
        </label>
      </div>

      {selected.length > 0 && (
        <div className="sticky top-[65px] z-30 mb-4 flex flex-wrap items-center gap-2 bg-charcoal px-4 py-3 text-sm text-ivory lg:top-0">
          <span className="mr-2 font-semibold">{selected.length} selected</span>
          <Button size="sm" variant="light" onClick={() => publish(selected, true)} disabled={busy}>
            Show on website
          </Button>
          <Button size="sm" variant="light" onClick={() => publish(selected, false)} disabled={busy}>
            Hide
          </Button>
          <Button size="sm" variant="light" className="!text-red-700" onClick={() => setConfirmDelete(products.filter((p) => selected.includes(p.id)))} disabled={busy}>
            Delete
          </Button>
          <button className="ml-auto text-ivory/70 hover:text-ivory" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="border border-dashed border-line bg-white px-6 py-16 text-center">
          <p className="font-serif text-2xl">No products found</p>
          <p className="mt-1 text-sm text-muted">{products.length ? 'Try a different search or filter.' : 'Add your first product to get started.'}</p>
        </div>
      ) : (
        <div className="border border-line bg-white">
          <div className="hidden grid-cols-[40px_64px_1fr_170px_150px_120px_96px] items-center gap-4 border-b border-line px-4 py-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase md:grid">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allChecked}
              onChange={() => setSelected(allChecked ? [] : list.map((p) => p.id))}
              className="h-4 w-4 accent-charcoal"
            />
            <span />
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li
                key={p.id}
                className="grid cursor-pointer grid-cols-[28px_56px_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-ivory md:grid-cols-[40px_64px_1fr_170px_150px_120px_96px] md:gap-4"
                onClick={() => navigate(`/admin/products/${p.id}`)}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${p.name}`}
                  checked={selected.includes(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 accent-charcoal"
                />
                <MaterialSwatch product={p} size={128} className="h-14 w-14 bg-cream md:h-16 md:w-16" />
                <div className="min-w-0">
                  <Link to={`/admin/products/${p.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                    {p.name}
                  </Link>
                  <p className="truncate text-xs text-muted">{p.collection || '—'}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted md:hidden">
                    {catName(p.category)} · {p.published ? 'On website' : 'Hidden'}
                  </p>
                </div>
                <span className="hidden truncate text-sm md:block">{catName(p.category)}</span>
                <span className="hidden truncate text-sm md:block">{formatPrice(p)}</span>
                <span className="hidden flex-wrap gap-1 md:flex">
                  {p.published ? <Badge tone="live">On website</Badge> : <Badge tone="hidden">Hidden</Badge>}
                  {p.featured && <Badge tone="gold">Featured</Badge>}
                </span>
                <div className="col-span-3 flex justify-end gap-1 md:col-span-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-charcoal/5"
                    title={p.published ? 'Hide from website' : 'Show on website'}
                    aria-label={p.published ? `Hide ${p.name} from website` : `Show ${p.name} on website`}
                    onClick={() => publish([p.id], !p.published)}
                    disabled={busy}
                  >
                    <Icon name={p.published ? 'eye' : 'eyeOff'} size={18} />
                  </button>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-700 hover:bg-red-50"
                    title="Delete"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setConfirmDelete([p])}
                    disabled={busy}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.length === 1 ? 'Delete this product?' : `Delete ${confirmDelete?.length} products?`}
        confirmLabel="Delete permanently"
        danger
        busy={busy}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      >
        <p>
          {confirmDelete?.length === 1 ? <strong>{confirmDelete[0].name}</strong> : 'These products'} will be removed from the website and
          the database, together with their photos. <strong>This cannot be undone.</strong>
        </p>
        <p className="mt-3 text-muted">Tip: to take a product off the website temporarily, use Hide instead.</p>
      </ConfirmDialog>
    </div>
  );
}
