import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminCatalog } from '../store';
import { Badge, PageHeader } from '../ui';
import { LinkButton } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../store/toastStore';
import { PLACEMENTS } from '../../types/catalog';

export default function CategoriesPage() {
  const { categories, products, moveCategory } = useAdminCatalog();
  const [busy, setBusy] = useState(false);

  const move = async (id: string, dir: -1 | 1) => {
    setBusy(true);
    try {
      await moveCategory(id, dir);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change the order', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Categories group your products on the website (e.g. Wallpapers, Curtains). Use the arrows to change the order they appear in."
        actions={
          <LinkButton to="/admin/categories/new" iconLeft="plus">
            New category
          </LinkButton>
        }
      />

      {categories.length === 0 ? (
        <div className="border border-dashed border-line bg-white px-6 py-16 text-center">
          <p className="font-serif text-2xl">No categories yet</p>
          <p className="mt-1 text-sm text-muted">Create your first category, then add products to it.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {categories.map((c, i) => {
            const count = products.filter((p) => p.category === c.id).length;
            return (
              <li key={c.id} className="flex items-center gap-3 border border-line bg-white p-3 sm:gap-5 sm:p-4">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(c.id, -1)}
                    disabled={busy || i === 0}
                    aria-label={`Move ${c.name} up`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-charcoal/5 disabled:opacity-25"
                  >
                    <Icon name="chevronUp" size={18} />
                  </button>
                  <button
                    onClick={() => move(c.id, 1)}
                    disabled={busy || i === categories.length - 1}
                    aria-label={`Move ${c.name} down`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-charcoal/5 disabled:opacity-25"
                  >
                    <Icon name="chevronDown" size={18} />
                  </button>
                </div>
                <Link to={`/admin/categories/${c.id}`} className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
                  <div className="h-16 w-24 shrink-0 overflow-hidden bg-cream sm:h-20 sm:w-32">
                    {c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-2xl leading-tight hover:underline">{c.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">{c.tagline || '—'}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {c.published ? <Badge tone="live">On website</Badge> : <Badge tone="hidden">Hidden</Badge>}
                      <span>
                        {count} product{count === 1 ? '' : 's'}
                      </span>
                      {c.placements.length > 0 && (
                        <span className="hidden sm:inline">
                          · Visualizer: {c.placements.map((p) => PLACEMENTS.find((x) => x.id === p)?.label).join(', ')}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="hidden shrink-0 gap-2 sm:flex">
                  <LinkButton to={`/admin/products?category=${c.id}`} variant="ghost" size="sm">
                    Products
                  </LinkButton>
                  <LinkButton to={`/admin/categories/${c.id}`} variant="outline" size="sm" iconLeft="edit">
                    Edit
                  </LinkButton>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
