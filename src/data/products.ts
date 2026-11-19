/**
 * The LIVE product catalogue used by every page and both visualizers.
 *
 * It starts with the built-in starter catalogue and is replaced by the data
 * managed in the admin panel (Supabase) by `loadCatalog()` before the app
 * renders. The exports are live bindings, so importers always read the
 * current list.
 */
import type { CategoryId, Product } from '../types/catalog';
import { seedProducts } from './seedProducts';

export let products: Product[] = seedProducts;
export let productById: Record<string, Product> = {};
export let featuredProducts: Product[] = [];

export function setProducts(list: Product[]) {
  products = list;
  productById = Object.fromEntries(list.map((x) => [x.id, x]));
  featuredProducts = list.filter((x) => x.featured);
}
setProducts(seedProducts);

export const getProduct = (id: string | null | undefined): Product | undefined => (id ? productById[id] : undefined);

/**
 * Neutral stand-in used by the visualizers when a surface has no usable
 * product (e.g. a saved design refers to a product that has since been
 * deleted and no compatible product remains). Never listed in the catalogue.
 */
export const PLAIN_PRODUCT: Product = {
  id: '__plain',
  name: 'Plain finish',
  category: '',
  collection: '',
  description: '',
  longDescription: '',
  texture: { kind: 'procedural', generator: 'plaster', params: { base: '#e9e4da', amount: 0.4 } },
  unit: '',
  availability: 'in-stock',
  textureScale: 1.8,
  textureRepeat: [1, 1],
  materialProperties: { roughness: 0.9, metalness: 0, bumpScale: 0.2 },
  colorFamily: 'Neutral',
  tags: [],
  specs: {},
};

/** Like getProduct, but never undefined (falls back to the plain finish). */
export const getProductOrPlain = (id: string | null | undefined): Product => getProduct(id) ?? PLAIN_PRODUCT;

export const productsByCategory = (category: CategoryId) => products.filter((x) => x.category === category);

export const availabilityLabel: Record<Product['availability'], string> = {
  'in-stock': 'In showroom',
  limited: 'Limited stock',
  'on-order': 'Made to order',
};

export const formatPrice = (product: Product) =>
  product.price != null ? `₹${product.price.toLocaleString('en-IN')} ${product.unit}`.trim() : 'Price on request';
