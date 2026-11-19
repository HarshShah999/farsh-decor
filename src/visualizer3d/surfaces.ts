import type { CategoryId } from '../types/catalog';

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
  accepts: CategoryId[];
  defaultProduct: string;
}

export const SURFACES: SurfaceDef[] = [
  { id: 'wallMain', label: 'Feature wall', group: 'Walls', accepts: ['wallpaper', 'panel'], defaultProduct: 'wp-ivory-grasscloth' },
  { id: 'wallLeft', label: 'Window wall', group: 'Walls', accepts: ['wallpaper', 'panel'], defaultProduct: 'wp-soft-limewash' },
  { id: 'wallRight', label: 'Terrace wall', group: 'Walls', accepts: ['wallpaper', 'panel'], defaultProduct: 'wp-soft-limewash' },
  { id: 'wallFront', label: 'Entrance wall', group: 'Walls', accepts: ['wallpaper', 'panel'], defaultProduct: 'wp-soft-limewash' },
  { id: 'floor', label: 'Room floor', group: 'Floors', accepts: ['flooring', 'grass'], defaultProduct: 'fl-natural-oak' },
  { id: 'terrace', label: 'Terrace floor', group: 'Floors', accepts: ['grass', 'flooring'], defaultProduct: 'gr-premium-lush' },
  { id: 'curtains', label: 'Curtains', group: 'Soft furnishings', accepts: ['curtain'], defaultProduct: 'cu-beige-linen' },
  { id: 'sofa', label: 'Sofa upholstery', group: 'Soft furnishings', accepts: ['fabric'], defaultProduct: 'fa-beige-linen' },
  { id: 'cushions', label: 'Cushions', group: 'Soft furnishings', accepts: ['fabric', 'curtain'], defaultProduct: 'fa-velvet-teal' },
  { id: 'armchair', label: 'Accent chair', group: 'Soft furnishings', accepts: ['fabric'], defaultProduct: 'fa-velvet-mocha' },
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

export const defaultSurfaceState = (): SurfaceState =>
  Object.fromEntries(SURFACES.map((s) => [s.id, { productId: s.defaultProduct, scale: 1, rotation: 0 }])) as SurfaceState;

/** The surface a category is applied to when no compatible surface is selected. */
export const defaultSurfaceForCategory: Record<CategoryId, SurfaceId> = {
  wallpaper: 'wallMain',
  panel: 'wallMain',
  flooring: 'floor',
  grass: 'terrace',
  curtain: 'curtains',
  fabric: 'sofa',
};
