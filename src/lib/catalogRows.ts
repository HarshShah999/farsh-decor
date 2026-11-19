/**
 * Conversion between database rows (snake_case, Supabase) and the app's
 * Category / Product types. Shared by the public loader and the admin panel.
 */
import type { Availability, Category, ColorFamily, MaterialProperties, Placement, Product, TextureSource } from '../types/catalog';

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  singular: string;
  tagline: string;
  description: string;
  image: string;
  visualizer_label: string;
  placements: string[];
  sort_order: number;
  published: boolean;
  updated_at?: string;
}

export interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  collection: string;
  description: string;
  long_description: string;
  thumbnail: string | null;
  texture: TextureSource;
  price: number | string | null;
  unit: string;
  availability: Availability;
  texture_scale: number | string;
  texture_repeat: [number, number];
  material_properties: MaterialProperties;
  color_family: ColorFamily;
  tags: string[];
  specs: { label: string; value: string }[];
  featured: boolean;
  sort_order: number;
  published: boolean;
  updated_at?: string;
}

const DEFAULT_MATERIAL: MaterialProperties = { roughness: 0.8, metalness: 0, bumpScale: 0.6 };

const num = (v: number | string | null | undefined, fallback: number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};

export function categoryFromRow(r: CategoryRow): Category {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    singular: r.singular || r.name,
    tagline: r.tagline ?? '',
    description: r.description ?? '',
    image: r.image ?? '',
    visualizerLabel: r.visualizer_label || r.name,
    placements: (r.placements ?? []) as Placement[],
    published: r.published,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  };
}

export function categoryToRow(c: Category): CategoryRow {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name.trim(),
    singular: c.singular.trim(),
    tagline: c.tagline.trim(),
    description: c.description.trim(),
    image: c.image,
    visualizer_label: c.visualizerLabel.trim(),
    placements: c.placements,
    sort_order: c.sortOrder ?? 0,
    published: c.published ?? true,
  };
}

export function productFromRow(r: ProductRow): Product {
  const repeat = Array.isArray(r.texture_repeat) && r.texture_repeat.length === 2 ? r.texture_repeat : [1, 1];
  const price = r.price == null || r.price === '' ? undefined : num(r.price, 0);
  return {
    id: r.id,
    name: r.name,
    category: r.category_id,
    collection: r.collection ?? '',
    description: r.description ?? '',
    longDescription: r.long_description ?? '',
    thumbnail: r.thumbnail || undefined,
    texture: r.texture,
    price,
    unit: r.unit ?? '',
    availability: r.availability,
    textureScale: num(r.texture_scale, 1),
    textureRepeat: [num(repeat[0], 1), num(repeat[1], 1)],
    materialProperties: { ...DEFAULT_MATERIAL, ...(r.material_properties ?? {}) },
    colorFamily: r.color_family,
    tags: r.tags ?? [],
    specs: Object.fromEntries((r.specs ?? []).filter((s) => s && s.label).map((s) => [s.label, s.value ?? ''])),
    featured: r.featured,
    published: r.published,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  };
}

export function productToRow(p: Product): ProductRow {
  return {
    id: p.id,
    category_id: p.category,
    name: p.name.trim(),
    collection: p.collection.trim(),
    description: p.description.trim(),
    long_description: p.longDescription.trim(),
    thumbnail: p.thumbnail || null,
    texture: p.texture,
    price: p.price ?? null,
    unit: p.unit.trim(),
    availability: p.availability,
    texture_scale: p.textureScale,
    texture_repeat: p.textureRepeat,
    material_properties: p.materialProperties,
    color_family: p.colorFamily,
    tags: p.tags,
    specs: Object.entries(p.specs).map(([label, value]) => ({ label, value })),
    featured: !!p.featured,
    sort_order: p.sortOrder ?? 0,
    published: p.published ?? true,
  };
}
