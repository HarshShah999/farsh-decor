/**
 * Centralised state for the 3D room design.
 *
 * `surfaces` holds the material (and its scale / rotation) for every
 * customisable surface. Every committed change pushes a snapshot onto the
 * undo stack, so undo / redo always restore a complete, consistent room.
 */
import { create } from 'zustand';
import { getProduct } from '../data/products';
import {
  defaultSurfaceForCategory,
  defaultSurfaceState,
  surfaceById,
  type SurfaceId,
  type SurfaceMaterialState,
  type SurfaceState,
} from '../visualizer3d/surfaces';

const HISTORY_LIMIT = 60;

interface DesignStore {
  surfaces: SurfaceState;
  past: SurfaceState[];
  future: SurfaceState[];
  selected: SurfaceId | null;
  hovered: SurfaceId | null;
  /** temporary override used by "Compare materials" — never enters history */
  preview: { surface: SurfaceId; productId: string } | null;
  /** snapshot taken at the start of a continuous gesture (slider drag) */
  gestureStart: SurfaceState | null;
  designId: string | null;
  designName: string;

  select: (id: SurfaceId | null) => void;
  hover: (id: SurfaceId | null) => void;
  /** Apply a product. If `surface` is omitted, picks the selected or default surface. Returns the surface used. */
  apply: (productId: string, surface?: SurfaceId) => SurfaceId | null;
  update: (surface: SurfaceId, patch: Partial<SurfaceMaterialState>, opts?: { history?: boolean }) => void;
  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  resetRoom: () => void;
  load: (surfaces: SurfaceState, meta?: { id?: string | null; name?: string }) => void;
  setPreview: (p: DesignStore['preview']) => void;
  setDesignMeta: (meta: { id?: string | null; name?: string }) => void;
}

const same = (a: SurfaceState, b: SurfaceState) => JSON.stringify(a) === JSON.stringify(b);

export const defaultDesignName = () =>
  `Living room – ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;

export const useDesign = create<DesignStore>((set, get) => {
  const commit = (next: SurfaceState) => {
    const { surfaces, past } = get();
    if (same(surfaces, next)) return;
    set({ surfaces: next, past: [...past, surfaces].slice(-HISTORY_LIMIT), future: [] });
  };

  return {
    surfaces: defaultSurfaceState(),
    past: [],
    future: [],
    selected: null,
    hovered: null,
    preview: null,
    gestureStart: null,
    designId: null,
    designName: defaultDesignName(),

    select: (id) => set({ selected: id }),
    hover: (id) => (get().hovered === id ? undefined : set({ hovered: id })),

    apply: (productId, surface) => {
      const product = getProduct(productId);
      if (!product) return null;
      const { selected, surfaces } = get();
      let target: SurfaceId | null = surface ?? null;
      if (!target && selected && surfaceById[selected].accepts.includes(product.category)) target = selected;
      if (!target) target = defaultSurfaceForCategory[product.category];
      if (!surfaceById[target].accepts.includes(product.category)) return null;
      commit({ ...surfaces, [target]: { productId, scale: 1, rotation: surfaces[target].rotation } });
      return target;
    },

    update: (surface, patch, opts = { history: true }) => {
      const { surfaces } = get();
      const next = { ...surfaces, [surface]: { ...surfaces[surface], ...patch } };
      if (opts.history) commit(next);
      else set({ surfaces: next });
    },

    beginGesture: () => set({ gestureStart: get().surfaces }),
    endGesture: () => {
      const { gestureStart, surfaces, past } = get();
      if (gestureStart && !same(gestureStart, surfaces))
        set({ past: [...past, gestureStart].slice(-HISTORY_LIMIT), future: [] });
      set({ gestureStart: null });
    },

    undo: () => {
      const { past, surfaces, future } = get();
      if (!past.length) return;
      set({ surfaces: past[past.length - 1], past: past.slice(0, -1), future: [surfaces, ...future] });
    },
    redo: () => {
      const { past, surfaces, future } = get();
      if (!future.length) return;
      set({ surfaces: future[0], past: [...past, surfaces], future: future.slice(1) });
    },
    resetRoom: () => commit(defaultSurfaceState()),
    load: (surfaces, meta) =>
      set({
        surfaces,
        past: [],
        future: [],
        selected: null,
        preview: null,
        designId: meta?.id ?? null,
        designName: meta?.name ?? defaultDesignName(),
      }),
    setPreview: (preview) => set({ preview }),
    setDesignMeta: (meta) =>
      set({
        ...(meta.id !== undefined ? { designId: meta.id } : {}),
        ...(meta.name !== undefined ? { designName: meta.name } : {}),
      }),
  };
});

/** The product currently shown on a surface (respects compare preview). */
export function useSurfaceProductId(surface: SurfaceId) {
  return useDesign((s) => (s.preview?.surface === surface ? s.preview.productId : s.surfaces[surface].productId));
}
