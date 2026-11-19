/**
 * The LIVE category list (see products.ts for how it is loaded).
 */
import type { Category } from '../types/catalog';
import { seedCategories } from './seedCategories';

export let categories: Category[] = seedCategories;
export let categoryById: Record<string, Category> = {};

export function setCategories(list: Category[]) {
  categories = list;
  categoryById = Object.fromEntries(list.map((c) => [c.id, c]));
}
setCategories(seedCategories);

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug || c.id === slug);
