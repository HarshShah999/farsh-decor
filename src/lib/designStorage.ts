/**
 * Local persistence for saved designs (IndexedDB).
 *
 * Designs are stored ONLY in this browser. They are private to this device
 * and are not publicly shareable. Public share links exist for 3D designs
 * (state encoded in the URL, see shareCodec.ts). Photo designs contain the
 * customer's own photograph and need a backend before they can be shared
 * by link. That is documented in README.md as a future service.
 */
import type { SurfaceState } from '../visualizer3d/surfaces';
import type { PhotoRegion } from '../photo/types';

export type DesignType = '3d' | 'photo';

interface SavedDesignBase {
  id: string;
  name: string;
  type: DesignType;
  roomType: string;
  materialIds: string[];
  preview: string; // small JPEG data URL
  createdAt: number;
  updatedAt: number;
}

export interface Saved3DDesign extends SavedDesignBase {
  type: '3d';
  data: { surfaces: SurfaceState };
}

export interface SavedPhotoDesign extends SavedDesignBase {
  type: 'photo';
  data: { image: Blob; width: number; height: number; regions: PhotoRegion[] };
}

export type SavedDesign = Saved3DDesign | SavedPhotoDesign;

const DB_NAME = 'farsh-decor';
const STORE = 'designs';
const EVENT = 'farsh:designs-changed';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB is not available in this browser'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

const notify = () => window.dispatchEvent(new Event(EVENT));

export const newId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).slice(0, 18);

export async function listDesigns(): Promise<SavedDesign[]> {
  const all = await tx<SavedDesign[]>('readonly', (s) => s.getAll() as IDBRequest<SavedDesign[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getDesign = (id: string) => tx<SavedDesign | undefined>('readonly', (s) => s.get(id));

export async function saveDesign(design: SavedDesign) {
  await tx('readwrite', (s) => s.put({ ...design, updatedAt: Date.now() }));
  notify();
  return design;
}

export async function deleteDesign(id: string) {
  await tx('readwrite', (s) => s.delete(id));
  notify();
}

export async function renameDesign(id: string, name: string) {
  const d = await getDesign(id);
  if (!d) return;
  await saveDesign({ ...d, name });
}

export async function duplicateDesign(id: string) {
  const d = await getDesign(id);
  if (!d) return;
  const now = Date.now();
  await saveDesign({ ...d, id: newId(), name: `${d.name} (copy)`, createdAt: now, updatedAt: now });
}

export function onDesignsChanged(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
