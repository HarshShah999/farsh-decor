import { useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadBackup, useAdminCatalog } from '../store';
import { Alert, Card, ConfirmDialog, PageHeader } from '../ui';
import { LinkButton, Button } from '../../components/ui/Button';
import { MaterialSwatch } from '../../components/ui/MaterialSwatch';
import { toast } from '../../store/toastStore';

const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export default function DashboardPage() {
  const { categories, products, importStarter } = useAdminCatalog();
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const live = products.filter((p) => p.published).length;
  const recent = [...products].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 6);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const runImport = async () => {
    setBusy(true);
    try {
      const r = await importStarter();
      toast(`Imported ${r.categories} categories and ${r.products} products`, 'success');
      setImportOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Manage the categories and products shown on your website. Changes appear on the site as soon as you save."
        actions={
          <>
            <LinkButton to="/admin/categories/new" variant="outline" iconLeft="plus">
              New category
            </LinkButton>
            <LinkButton to="/admin/products/new" iconLeft="plus">
              New product
            </LinkButton>
          </>
        }
      />

      {categories.length === 0 && (
        <Card title="Your catalogue is empty" className="mb-8 border-gold/50">
          <p className="text-sm text-ink">
            The website is currently showing its built-in starter products. Import them here to start editing them, or create your
            own categories from scratch.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setImportOpen(true)} iconLeft="download">
              Import starter catalogue
            </Button>
            <LinkButton to="/admin/categories/new" variant="outline" iconLeft="plus">
              Start with a new category
            </LinkButton>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { n: products.length, l: 'Products', sub: `${live} on the website · ${products.length - live} hidden`, to: '/admin/products' },
          { n: categories.length, l: 'Categories', sub: `${categories.filter((c) => c.published).length} on the website`, to: '/admin/categories' },
          { n: products.filter((p) => p.featured && p.published).length, l: 'Featured', sub: 'Shown on the homepage', to: '/admin/products?filter=featured' },
        ].map((s) => (
          <Link key={s.l} to={s.to} className="border border-line bg-white p-6 transition-shadow hover:shadow-[var(--shadow-soft)]">
            <p className="font-serif text-5xl">{s.n}</p>
            <p className="mt-1 font-semibold">{s.l}</p>
            <p className="mt-0.5 text-sm text-muted">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Recently edited">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nothing here yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/products/${p.id}`} className="flex items-center gap-4 py-3 hover:bg-ivory">
                    <MaterialSwatch product={p} size={96} className="h-12 w-12 shrink-0 bg-cream" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted">
                        {catName(p.category)} · {when(p.updatedAt)}
                      </p>
                    </div>
                    {!p.published && <span className="text-xs text-muted">Hidden</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-8">
          <Card title="Backup" description="Download a copy of your whole catalogue (including hidden items). Keep it somewhere safe.">
            <Button variant="outline" iconLeft="download" onClick={downloadBackup}>
              Download backup
            </Button>
          </Card>
          <Card title="Tips">
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
              <li>
                <strong>Hide</strong> a product to take it off the website without losing it. You can show it again later.
              </li>
              <li>Use clear, close-up photos in good daylight. Square photos work best.</li>
              <li>The website updates as soon as you save. Refresh the website tab to see changes.</li>
            </ul>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={importOpen}
        title="Import starter catalogue?"
        confirmLabel="Import"
        busy={busy}
        onConfirm={runImport}
        onClose={() => setImportOpen(false)}
      >
        <p>This adds the 6 starter categories and 40 placeholder products to your database so you can edit, replace or delete them.</p>
        <Alert tone="info">Items that already exist are left unchanged.</Alert>
      </ConfirmDialog>
    </div>
  );
}
