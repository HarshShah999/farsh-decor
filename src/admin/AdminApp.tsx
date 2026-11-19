/**
 * Admin panel (/admin). Loaded on demand, never linked from the public site,
 * and every route requires a signed-in account listed in the `admins` table.
 * The database enforces the same rule (Row Level Security), so hiding this
 * page is not the only protection.
 */
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { useAdminCatalog } from './store';
import { Alert, Spinner, confirmLeave } from './ui';
import { Icon, type IconName } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Toaster } from '../components/ui/Toaster';
import { siteConfig } from '../config/site';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductEditPage from './pages/ProductEditPage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryEditPage from './pages/CategoryEditPage';

function Brand() {
  return <span className="font-serif text-[26px] leading-none font-medium tracking-[0.32em]">{siteConfig.logoText}</span>;
}

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const title = document.title;
    document.title = 'Admin | Farsh';
    return () => {
      meta.remove();
      document.title = title;
    };
  }, []);
}

export default function AdminApp() {
  useNoIndex();
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  if (status === 'loading') return <Spinner label="Checking your sign-in…" />;
  if (status !== 'admin')
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  return <AdminShell />;
}

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/products', label: 'Products', icon: 'layers' },
  { to: '/admin/categories', label: 'Categories', icon: 'filter' },
];

function AdminShell() {
  const { status, error, load } = useAdminCatalog();
  const email = useAuth((s) => s.email);
  const signOut = useAuth((s) => s.signOut);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (status === 'idle') load();
  }, [status, load]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={confirmLeave}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 text-[15px] transition-colors ${isActive ? 'bg-charcoal text-ivory' : 'text-ink hover:bg-charcoal/5'}`
          }
        >
          <Icon name={n.icon} size={18} />
          {n.label}
        </NavLink>
      ))}
      <a href="/" target="_blank" rel="noopener" className="mt-4 flex items-center gap-3 px-3 py-2.5 text-[15px] text-ink hover:bg-charcoal/5">
        <Icon name="arrowUpRight" size={18} />
        View website
      </a>
    </nav>
  );

  const account = (
    <div className="border-t border-line pt-4 text-sm">
      <p className="truncate text-muted" title={email ?? ''}>
        Signed in as
        <br />
        <span className="text-charcoal">{email}</span>
      </p>
      <button
        onClick={(e) => {
          confirmLeave(e);
          if (!e.defaultPrevented) signOut();
        }}
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-charcoal hover:text-gold-dark"
      >
        <Icon name="arrowLeft" size={16} /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f0ea]">
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ivory px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Brand />
          <span className="text-xs font-semibold tracking-[0.2em] text-gold-dark uppercase">Admin</span>
        </div>
        <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu" className="inline-flex h-10 w-10 items-center justify-center">
          <Icon name={menu ? 'close' : 'menu'} />
        </button>
      </div>
      {menu && (
        <div className="fixed inset-x-0 top-[65px] bottom-0 z-40 space-y-6 overflow-y-auto bg-ivory p-4 lg:hidden">
          {nav}
          {account}
        </div>
      )}

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-line bg-ivory p-5 lg:flex">
          <div className="space-y-8">
            <div>
              <Brand />
              <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-gold-dark uppercase">Catalogue admin</p>
            </div>
            {nav}
          </div>
          {account}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
          {status === 'error' ? (
            <div className="space-y-4">
              <Alert>{error}</Alert>
              <Button onClick={load} iconLeft="reset">
                Try again
              </Button>
            </div>
          ) : status !== 'ready' ? (
            <Spinner label="Loading your catalogue…" />
          ) : (
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductEditPage />} />
              <Route path="products/:id" element={<ProductEditPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="categories/new" element={<CategoryEditPage />} />
              <Route path="categories/:id" element={<CategoryEditPage />} />
              <Route path="login" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          )}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
