/**
 * Loads the live catalogue from Supabase before the app renders.
 *
 * Order of preference:
 *   1. Supabase (published categories + products) — always tried first, so
 *      changes made in the admin panel appear on the next page load.
 *   2. The last successful copy cached in this browser (if Supabase is
 *      unreachable).
 *   3. The built-in starter catalogue (first visit while offline, or before the
 *      database has been set up and filled).
 *
 * Uses plain fetch against the REST API so the public site does not need to
 * download the Supabase client library (only the admin panel does).
 */
import { siteConfig } from '../config/site';
import { setCategories } from '../data/categories';
import { setProducts } from '../data/products';
import type { Category, Product } from '../types/catalog';
import { categoryFromRow, productFromRow, type CategoryRow, type ProductRow } from './catalogRows';

const CACHE_KEY = 'farsh:catalog:v1';
const TIMEOUT_MS = 6000;

export type CatalogSource = 'remote' | 'cache' | 'builtin';
export let catalogSource: CatalogSource = 'builtin';

interface Snapshot {
  categories: Category[];
  products: Product[];
  savedAt: string;
}

async function rest<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(`${siteConfig.supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: siteConfig.supabasePublishableKey, Accept: 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error(`Catalogue request failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** Keep only published items whose category is visible, in display order. */
export function applyCatalog(cats: Category[], prods: Product[]) {
  const visible = new Set(cats.map((c) => c.id));
  setCategories(cats);
  setProducts(prods.filter((p) => visible.has(p.category)));
}

export async function fetchPublishedCatalog(signal: AbortSignal) {
  const [catRows, prodRows] = await Promise.all([
    rest<CategoryRow[]>('categories?select=*&published=is.true&order=sort_order.asc,created_at.asc', signal),
    rest<ProductRow[]>('products?select=*&published=is.true&order=sort_order.asc,created_at.asc', signal),
  ]);
  return { categories: catRows.map(categoryFromRow), products: prodRows.map(productFromRow) };
}

export async function loadCatalog(): Promise<CatalogSource> {
  if (!siteConfig.supabaseUrl || !siteConfig.supabasePublishableKey) return (catalogSource = 'builtin');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const data = await fetchPublishedCatalog(ctrl.signal);
    // An empty category list means the database has not been filled yet:
    // keep showing the starter catalogue rather than an empty site.
    if (!data.categories.length) return (catalogSource = 'builtin');
    applyCatalog(data.categories, data.products);
    try {
      const snap: Snapshot = { ...data, savedAt: new Date().toISOString() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
    } catch {
      /* storage full or blocked – not important */
    }
    return (catalogSource = 'remote');
  } catch (err) {
    console.warn('[catalog] Using offline copy:', err);
    try {
      const snap = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as Snapshot | null;
      if (snap?.categories?.length) {
        applyCatalog(snap.categories, snap.products);
        return (catalogSource = 'cache');
      }
    } catch {
      /* ignore broken cache */
    }
    return (catalogSource = 'builtin');
  } finally {
    clearTimeout(timer);
  }
}
