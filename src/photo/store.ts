import { create } from 'zustand';
import type { PhotoRegion, PhotoSurfaceType, Pt } from './types';
import { defaultQuadFor } from './homography';
import { getProduct } from '../data/products';
import { categories } from '../data/categories';
import type { CategoryId, Placement } from '../types/catalog';

export type Tool = 'select' | 'draw' | 'wand' | 'pan';

export interface PhotoImage {
  url: string; // object URL of the working-resolution JPEG
  blob: Blob;
  width: number;
  height: number;
}

/** Which category placements suit each photo surface type ('other' accepts everything). */
const photoPlacements: Record<PhotoSurfaceType, Placement[] | null> = {
  wall: ['walls'],
  floor: ['floor', 'terrace'],
  curtain: ['curtains'],
  sofa: ['upholstery'],
  other: null,
};

/** Categories that can be applied to a photo surface type, in catalogue order. */
export function surfaceCategories(type: PhotoSurfaceType): CategoryId[] {
  const allowed = photoPlacements[type];
  return categories
    .filter((c) => (allowed ? c.placements.some((p) => allowed.includes(p)) : true))
    .map((c) => c.id);
}

export const surfaceLabels: Record<PhotoSurfaceType, string> = {
  wall: 'Wall',
  floor: 'Floor',
  curtain: 'Curtain',
  sofa: 'Sofa / upholstery',
  other: 'Other surface',
};

const HISTORY = 60;
let rid = 1;

interface PhotoStore {
  image: PhotoImage | null;
  regions: PhotoRegion[];
  past: PhotoRegion[][];
  future: PhotoRegion[][];
  gestureStart: PhotoRegion[] | null;
  selectedId: string | null;
  activeVertex: number | null;
  tool: Tool;
  draft: Pt[];
  wandTolerance: number;
  pendingMaterial: string | null;
  designId: string | null;
  designName: string;

  setImage: (img: PhotoImage | null) => void;
  setTool: (t: Tool) => void;
  addDraftPoint: (p: Pt) => void;
  popDraftPoint: () => void;
  cancelDraft: () => void;
  closeDraft: () => void;
  addRegion: (points: Pt[], extra?: Partial<PhotoRegion>) => string;
  updateRegion: (id: string, patch: Partial<PhotoRegion>, opts?: { history?: boolean }) => void;
  deleteRegion: (id: string) => void;
  duplicateRegion: (id: string) => void;
  moveRegion: (id: string, dir: -1 | 1) => void;
  select: (id: string | null, vertex?: number | null) => void;
  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  clearRegions: () => void;
  load: (img: PhotoImage, regions: PhotoRegion[], meta?: { id?: string; name?: string }) => void;
  setWandTolerance: (n: number) => void;
  setPendingMaterial: (id: string | null) => void;
  setMeta: (m: { id?: string | null; name?: string }) => void;
}

const same = (a: PhotoRegion[], b: PhotoRegion[]) => JSON.stringify(a) === JSON.stringify(b);

export const defaultPhotoName = () =>
  `My room – ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;

export const usePhoto = create<PhotoStore>((set, get) => {
  const commit = (regions: PhotoRegion[]) => {
    const cur = get().regions;
    if (same(cur, regions)) return;
    set({ regions, past: [...get().past, cur].slice(-HISTORY), future: [] });
  };

  const guessType = (): PhotoSurfaceType => {
    const n = get().regions.length;
    return (['wall', 'floor', 'sofa', 'curtain'] as const)[n % 4];
  };

  return {
    image: null,
    regions: [],
    past: [],
    future: [],
    gestureStart: null,
    selectedId: null,
    activeVertex: null,
    tool: 'draw',
    draft: [],
    wandTolerance: 30,
    pendingMaterial: null,
    designId: null,
    designName: defaultPhotoName(),

    setImage: (image) => {
      const prev = get().image;
      if (prev && prev.url !== image?.url) URL.revokeObjectURL(prev.url);
      set({ image, regions: [], past: [], future: [], selectedId: null, draft: [], tool: 'draw', designId: null, designName: defaultPhotoName() });
    },
    setTool: (tool) => set({ tool, draft: tool === 'draw' ? get().draft : [] }),
    addDraftPoint: (p) => set({ draft: [...get().draft, p] }),
    popDraftPoint: () => set({ draft: get().draft.slice(0, -1) }),
    cancelDraft: () => set({ draft: [] }),
    closeDraft: () => {
      const pts = get().draft;
      if (pts.length < 3) return;
      get().addRegion(pts);
      set({ draft: [] });
    },
    addRegion: (points, extra = {}) => {
      const id = `r${Date.now().toString(36)}${rid++}`;
      const type = extra.surfaceType ?? guessType();
      const pending = get().pendingMaterial;
      let productId: string | null = null;
      if (pending) {
        const p = getProduct(pending);
        if (p && surfaceCategories(type).includes(p.category)) productId = pending;
      }
      const region: PhotoRegion = {
        id,
        name: `${surfaceLabels[type]} ${get().regions.filter((r) => r.surfaceType === type).length + 1}`,
        surfaceType: type,
        points,
        closed: true,
        productId,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blend: 'natural',
        shading: type === 'floor' ? 0.75 : 0.9,
        feather: 1.5,
        perspective: type === 'floor' || points.length === 4 ? defaultQuadFor(points) : null,
        visible: true,
        ...extra,
      };
      commit([...get().regions, region]);
      set({ selectedId: id, activeVertex: null, tool: 'select' });
      return id;
    },
    updateRegion: (id, patch, opts = { history: true }) => {
      const regions = get().regions.map((r) => (r.id === id ? { ...r, ...patch } : r));
      if (opts.history) commit(regions);
      else set({ regions });
    },
    deleteRegion: (id) => {
      commit(get().regions.filter((r) => r.id !== id));
      if (get().selectedId === id) set({ selectedId: null, activeVertex: null });
    },
    duplicateRegion: (id) => {
      const r = get().regions.find((x) => x.id === id);
      if (!r) return;
      const off = 24;
      const shift = (p: Pt) => ({ x: p.x + off, y: p.y + off });
      const copy: PhotoRegion = {
        ...r,
        id: `r${Date.now().toString(36)}${rid++}`,
        name: `${r.name} copy`,
        points: r.points.map(shift),
        perspective: r.perspective ? (r.perspective.map(shift) as PhotoRegion['perspective']) : null,
      };
      commit([...get().regions, copy]);
      set({ selectedId: copy.id });
    },
    moveRegion: (id, dir) => {
      const list = [...get().regions];
      const i = list.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      commit(list);
    },
    select: (id, vertex = null) => set({ selectedId: id, activeVertex: vertex }),
    beginGesture: () => set({ gestureStart: get().regions }),
    endGesture: () => {
      const { gestureStart, regions, past } = get();
      if (gestureStart && !same(gestureStart, regions)) set({ past: [...past, gestureStart].slice(-HISTORY), future: [] });
      set({ gestureStart: null });
    },
    undo: () => {
      const { past, regions, future, draft } = get();
      if (draft.length) return set({ draft: draft.slice(0, -1) });
      if (!past.length) return;
      set({ regions: past[past.length - 1], past: past.slice(0, -1), future: [regions, ...future], activeVertex: null });
    },
    redo: () => {
      const { past, regions, future } = get();
      if (!future.length) return;
      set({ regions: future[0], past: [...past, regions], future: future.slice(1), activeVertex: null });
    },
    clearRegions: () => {
      commit([]);
      set({ selectedId: null, draft: [] });
    },
    load: (image, regions, meta) => {
      const prev = get().image;
      if (prev && prev.url !== image.url) URL.revokeObjectURL(prev.url);
      set({
        image,
        regions,
        past: [],
        future: [],
        selectedId: regions[0]?.id ?? null,
        draft: [],
        tool: 'select',
        designId: meta?.id ?? null,
        designName: meta?.name ?? defaultPhotoName(),
      });
    },
    setWandTolerance: (wandTolerance) => set({ wandTolerance }),
    setPendingMaterial: (pendingMaterial) => set({ pendingMaterial }),
    setMeta: (m) =>
      set({ ...(m.id !== undefined ? { designId: m.id } : {}), ...(m.name !== undefined ? { designName: m.name } : {}) }),
  };
});
