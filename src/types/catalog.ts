import type { GenParams, GeneratorId } from '../lib/textures/generators';

/** Category identifiers are managed in the admin panel (e.g. 'wallpaper', 'curtain'). */
export type CategoryId = string;

/**
 * Where a category's materials can be used in the visualizers.
 * - walls: the four room walls (3D) and "Wall" regions (photo)
 * - floor / terrace: room floor and terrace floor (3D), "Floor" regions (photo)
 * - curtains: curtains (3D and photo)
 * - upholstery: sofa and accent chair (3D), "Sofa" regions (photo)
 * - cushions: cushions (3D)
 */
export type Placement = 'walls' | 'floor' | 'terrace' | 'curtains' | 'upholstery' | 'cushions';

export const PLACEMENTS: { id: Placement; label: string; hint: string }[] = [
  { id: 'walls', label: 'Walls', hint: 'Wallpapers, panels, cladding' },
  { id: 'floor', label: 'Room floor', hint: 'Flooring, rugs, grass' },
  { id: 'terrace', label: 'Terrace / outdoor floor', hint: 'Grass, decking, tiles' },
  { id: 'curtains', label: 'Curtains', hint: 'Curtain and sheer fabrics' },
  { id: 'upholstery', label: 'Sofa & chair', hint: 'Upholstery fabrics, leather' },
  { id: 'cushions', label: 'Cushions', hint: 'Fabrics for cushions' },
];

/**
 * Where a material's texture comes from.
 * - `procedural`: generated in the browser (seamless placeholder textures).
 * - `image`: a real seamless texture file, e.g. `/textures/wallpaper/oak.jpg`.
 *   Optionally provide a greyscale `bumpUrl`; otherwise one is derived.
 */
export type TextureSource =
  | { kind: 'procedural'; generator: GeneratorId; params: GenParams; seed?: number }
  | { kind: 'image'; url: string; bumpUrl?: string; /** set when made from the product photo in the admin panel */ fromPhoto?: boolean };

export interface MaterialProperties {
  roughness: number;
  metalness: number;
  /** strength of the bump map in the 3D viewer */
  bumpScale: number;
  /** fabric sheen (0–1); applied with MeshPhysicalMaterial */
  sheen?: number;
  sheenColor?: string;
  /** 0–1, for sheer fabrics */
  opacity?: number;
  /** clearcoat for lacquered / polished finishes */
  clearcoat?: number;
}

export type Availability = 'in-stock' | 'limited' | 'on-order';

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  collection: string;
  description: string;
  longDescription: string;
  /** Optional photographic thumbnail. When absent, a swatch is rendered from `texture`. */
  thumbnail?: string;
  texture: TextureSource;
  /** Indicative price. Leave undefined to show "Price on request". */
  price?: number;
  unit: string;
  availability: Availability;
  /** Real-world size (metres) covered by ONE tile of the texture. */
  textureScale: number;
  /** Extra repetition multiplier [x, y] applied on top of textureScale. */
  textureRepeat: [number, number];
  materialProperties: MaterialProperties;
  colorFamily: ColorFamily;
  tags: string[];
  specs: Record<string, string>;
  featured?: boolean;
  /** Admin-only fields (the public site only ever receives published items). */
  published?: boolean;
  sortOrder?: number;
  updatedAt?: string;
}

export type ColorFamily = 'Neutral' | 'Warm' | 'Cool' | 'Green' | 'Dark' | 'Pattern';

export interface Category {
  id: CategoryId;
  slug: string;
  name: string;
  singular: string;
  tagline: string;
  description: string;
  image: string;
  /** shown in the 3D visualizer catalogue */
  visualizerLabel: string;
  /** where this category's materials can be applied in the visualizers */
  placements: Placement[];
  published?: boolean;
  sortOrder?: number;
  updatedAt?: string;
}
