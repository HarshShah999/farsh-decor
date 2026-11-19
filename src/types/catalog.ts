import type { GenParams, GeneratorId } from '../lib/textures/generators';

export type CategoryId = 'wallpaper' | 'curtain' | 'flooring' | 'fabric' | 'grass' | 'panel';

/**
 * Where a material's texture comes from.
 * - `procedural`: generated in the browser (seamless placeholder textures).
 * - `image`: a real seamless texture file, e.g. `/textures/wallpaper/oak.jpg`.
 *   Optionally provide a greyscale `bumpUrl`; otherwise one is derived.
 */
export type TextureSource =
  | { kind: 'procedural'; generator: GeneratorId; params: GenParams; seed?: number }
  | { kind: 'image'; url: string; bumpUrl?: string };

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
}
