/**
 * Admin catalogue state + every write the admin panel performs.
 * All writes go through Supabase and are checked by Row Level Security.
 */
import { create } from 'zustand';
import { BUCKET, friendlyError, supabase } from './supabase';
import type { PreparedImage } from './images';
import { categoryFromRow, categoryToRow, productFromRow, productToRow, type CategoryRow, type ProductRow } from '../lib/catalogRows';
import { setCategories } from '../data/categories';
import { setProducts } from '../data/products';
import { seedCategories } from '../data/seedCategories';
import { seedProducts } from '../data/seedProducts';
import type { Category, Product } from '../types/catalog';

interface AdminCatalog {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  categories: Category[];
  products: Product[];
  load: () => Promise<void>;
  saveCategory: (c: Category, isNew: boolean) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, dir: -1 | 1) => Promise<void>;
  saveProduct: (p: Product, isNew: boolean) => Promise<Product>;
  setPublished: (ids: string[], published: boolean) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  importStarter: () => Promise<{ categories: number; products: number }>;
}

const byOrder = <T extends { sortOrder?: number; name: string }>(a: T, b: T) =>
  (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw new Error(friendlyError(res.error));
  return res.data;
}

/** Keep the shared catalogue modules in sync so previews (cards, swatches) use admin data. */
function syncLive(categories: Category[], products: Product[]) {
  setCategories(categories);
  setProducts(products);
}

export const useAdminCatalog = create<AdminCatalog>((set, get) => {
  const commit = (patch: Partial<Pick<AdminCatalog, 'categories' | 'products'>>) => {
    const categories = [...(patch.categories ?? get().categories)].sort(byOrder);
    const products = [...(patch.products ?? get().products)].sort(byOrder);
    set({ categories, products });
    syncLive(categories, products);
  };

  return {
    status: 'idle',
    error: null,
    categories: [],
    products: [],

    load: async () => {
      set({ status: 'loading', error: null });
      try {
        const [c, p] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order').order('created_at'),
          supabase.from('products').select('*').order('sort_order').order('created_at'),
        ]);
        const categories = check(c as { data: CategoryRow[]; error: unknown }).map(categoryFromRow);
        const products = check(p as { data: ProductRow[]; error: unknown }).map(productFromRow);
        commit({ categories, products });
        set({ status: 'ready' });
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : friendlyError(e) });
      }
    },

    saveCategory: async (cat, isNew) => {
      const row = categoryToRow(cat);
      if (isNew) row.sort_order = Math.max(0, ...get().categories.map((c) => c.sortOrder ?? 0)) + 10;
      const res = isNew
        ? await supabase.from('categories').insert(row).select().single()
        : await supabase.from('categories').update(row).eq('id', cat.id).select().single();
      const saved = categoryFromRow(check(res as { data: CategoryRow; error: unknown }));
      commit({ categories: [...get().categories.filter((c) => c.id !== saved.id), saved] });
      return saved;
    },

    deleteCategory: async (id) => {
      const cat = get().categories.find((c) => c.id === id);
      check(await supabase.from('categories').delete().eq('id', id));
      if (cat) await removeStoredFiles([cat.image]);
      commit({ categories: get().categories.filter((c) => c.id !== id) });
    },

    moveCategory: async (id, dir) => {
      const before = get().categories;
      const list = [...before];
      const i = list.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      const renumbered = list.map((c, k) => ({ ...c, sortOrder: (k + 1) * 10 }));
      const changed = renumbered.filter((c) => before.find((o) => o.id === c.id)?.sortOrder !== c.sortOrder);
      commit({ categories: renumbered }); // optimistic
      try {
        for (const c of changed) check(await supabase.from('categories').update({ sort_order: c.sortOrder }).eq('id', c.id));
      } catch (e) {
        await get().load();
        throw e;
      }
    },

    saveProduct: async (prod, isNew) => {
      const row = productToRow(prod);
      if (isNew) row.sort_order = Math.max(0, ...get().products.map((p) => p.sortOrder ?? 0)) + 10;
      const res = isNew
        ? await supabase.from('products').insert(row).select().single()
        : await supabase.from('products').update(row).eq('id', prod.id).select().single();
      const saved = productFromRow(check(res as { data: ProductRow; error: unknown }));
      commit({ products: [...get().products.filter((p) => p.id !== saved.id), saved] });
      return saved;
    },

    setPublished: async (ids, published) => {
      check(await supabase.from('products').update({ published }).in('id', ids));
      commit({ products: get().products.map((p) => (ids.includes(p.id) ? { ...p, published } : p)) });
    },

    deleteProducts: async (ids) => {
      const gone = get().products.filter((p) => ids.includes(p.id));
      check(await supabase.from('products').delete().in('id', ids));
      await removeStoredFiles(gone.flatMap((p) => [p.thumbnail, p.texture.kind === 'image' ? p.texture.url : undefined]));
      commit({ products: get().products.filter((p) => !ids.includes(p.id)) });
    },

    importStarter: async () => {
      const cats = seedCategories.map((c, i) => categoryToRow({ ...c, sortOrder: (i + 1) * 10, published: true }));
      const prods = seedProducts.map((p, i) => productToRow({ ...p, sortOrder: (i + 1) * 10, published: true }));
      check(await supabase.from('categories').upsert(cats, { onConflict: 'id', ignoreDuplicates: true }));
      check(await supabase.from('products').upsert(prods, { onConflict: 'id', ignoreDuplicates: true }));
      await get().load();
      return { categories: cats.length, products: prods.length };
    },
  };
});

/* --------------------------------- photos --------------------------------- */

const publicPrefix = () => supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;

/** Upload a prepared image and return its public URL. */
export async function uploadImage(folder: string, img: PreparedImage): Promise<string> {
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${img.ext}`;
  const path = `${folder}/${name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, img.blob, { contentType: img.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(friendlyError(error));
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort removal of photos that live in our storage bucket (ignores site images like /images/...). */
export async function removeStoredFiles(urls: (string | undefined | null)[]) {
  const prefix = publicPrefix();
  const paths = urls
    .filter((u): u is string => !!u && u.startsWith(prefix))
    .map((u) => decodeURIComponent(u.slice(prefix.length).replace(/^\/+/, '')));
  if (!paths.length) return;
  try {
    await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    /* leaving an unused photo behind is harmless */
  }
}

/* ---------------------------------- utils --------------------------------- */

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  );
}

export function uniqueId(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Download the full catalogue (including hidden items) as a JSON backup file. */
export function downloadBackup() {
  const { categories, products } = useAdminCatalog.getState();
  const data = {
    exportedAt: new Date().toISOString(),
    categories: categories.map(categoryToRow),
    products: products.map(productToRow),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `farsh-catalogue-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
