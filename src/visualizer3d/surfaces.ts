import type { CategoryId, Placement, Product } from '../types/catalog';
import { categories, categoryById } from '../data/categories';
import { PLAIN_PRODUCT, getProduct, products } from '../data/products';

export type SurfaceId =
  | 'wallMain'
  | 'wallLeft'
  | 'wallRight'
  | 'wallFront'
  | 'floor'
  | 'terrace'
  | 'curtains'
  | 'sofa'
  | 'cushions'
  | 'armchair';

export interface SurfaceDef {
  id: SurfaceId;
  label: string;
  group: 'Walls' | 'Floors' | 'Soft furnishings';
  /** which category placement this surface accepts (set per category in the admin panel) */
  placement: Placement;
  /** preferred starting product; if it no longer exists, the first compatible product is used */
  defaultProduct: string;
}

export const SURFACES: SurfaceDef[] = [
  { id: 'wallMain', label: 'Feature wall', group: 'Walls', placement: 'walls', defaultProduct: 'wp-ivory-grasscloth' },
  { id: 'wallLeft', label: 'Window wall', group: 'Walls', placement: 'walls', defaultProduct: 'wp-soft-limewash' },
  { id: 'wallRight', label: 'Terrace wall', group: 'Walls', placement: 'walls', defaultProduct: 'wp-soft-limewash' },
  { id: 'wallFront', label: 'Entrance wall', group: 'Walls', placement: 'walls', defaultProduct: 'wp-soft-limewash' },
  { id: 'floor', label: 'Room floor', group: 'Floors', placement: 'floor', defaultProduct: 'fl-natural-oak' },
  { id: 'terrace', label: 'Terrace floor', group: 'Floors', placement: 'terrace', defaultProduct: 'gr-premium-lush' },
  { id: 'curtains', label: 'Curtains', group: 'Soft furnishings', placement: 'curtains', defaultProduct: 'cu-beige-linen' },
  { id: 'sofa', label: 'Sofa upholstery', group: 'Soft furnishings', placement: 'upholstery', defaultProduct: 'fa-beige-linen' },
  { id: 'cushions', label: 'Cushions', group: 'Soft furnishings', placement: 'cushions', defaultProduct: 'fa-velvet-teal' },
  { id: 'armchair', label: 'Accent chair', group: 'Soft furnishings', placement: 'upholstery', defaultProduct: 'fa-velvet-mocha' },
];

export const surfaceById = Object.fromEntries(SURFACES.map((s) => [s.id, s])) as Record<SurfaceId, SurfaceDef>;

export interface SurfaceMaterialState {
  productId: string;
  /** user scale multiplier (1 = real-world size) */
  scale: number;
  /** rotation in degrees (0 / 90) */
  rotation: number;
}

export type SurfaceState = Record<SurfaceId, SurfaceMaterialState>;

/** Can products of this category be applied to this surface? */
export const surfaceAccepts = (surface: SurfaceId, category: CategoryId) =>
  !!categoryById[category]?.placements.includes(surfaceById[surface].placement);

/** Categories that can be applied to a surface, in catalogue order. */
export const acceptedCategories = (surface: SurfaceId): CategoryId[] =>
  categories.filter((c) => c.placements.includes(surfaceById[surface].placement)).map((c) => c.id);

/** Products that can be applied to a surface. */
export const productsForSurface = (surface: SurfaceId): Product[] =>
  products.filter((p) => surfaceAccepts(surface, p.category));

/** The surface a category is applied to when no compatible surface is selected. */
export function defaultSurfaceForCategory(category: CategoryId): SurfaceId | null {
  const first = categoryById[category]?.placements[0];
  return SURFACES.find((s) => s.placement === first)?.id ?? null;
}

/** A valid product for a surface: the given one if usable, else the default, else the first compatible. */
function usableProductId(surface: SurfaceId, productId?: string): string {
  const ok = (id?: string) => {
    const p = getProduct(id);
    return !!p && surfaceAccepts(surface, p.category);
  };
  if (ok(productId)) return productId!;
  const def = surfaceById[surface].defaultProduct;
  if (ok(def)) return def;
  return productsForSurface(surface)[0]?.id ?? PLAIN_PRODUCT.id;
}

export const defaultSurfaceState = (): SurfaceState =>
  Object.fromEntries(
    SURFACES.map((s) => [s.id, { productId: usableProductId(s.id), scale: 1, rotation: 0 }]),
  ) as SurfaceState;

/**
 * Repair a saved / shared design so it only references products that still
 * exist and suit their surface (products can be deleted in the admin panel).
 */
export function sanitizeSurfaceState(state: Partial<Record<string, Partial<SurfaceMaterialState>>>): SurfaceState {
  return Object.fromEntries(
    SURFACES.map((s) => {
      const st = state[s.id];
      const productId = usableProductId(s.id, st?.productId);
      const kept = productId === st?.productId;
      return [
        s.id,
        {
          productId,
          scale: kept && typeof st?.scale === 'number' ? Math.min(3, Math.max(0.25, st.scale)) : 1,
          rotation: st?.rotation === 90 ? 90 : 0,
        },
      ];
    }),
  ) as SurfaceState;
}
