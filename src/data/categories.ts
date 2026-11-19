import type { Category, CategoryId } from '../types/catalog';

export const categories: Category[] = [
  {
    id: 'wallpaper',
    slug: 'wallpapers',
    name: 'Wallpapers',
    singular: 'Wallpaper',
    tagline: 'Walls with a point of view',
    description:
      'Grasscloth, botanicals, art-deco geometrics and quiet limewash finishes — wallcoverings that set the mood of a room.',
    image: '/images/cat-wallpaper.jpg',
    visualizerLabel: 'Wallpapers',
  },
  {
    id: 'curtain',
    slug: 'curtains',
    name: 'Curtains',
    singular: 'Curtain fabric',
    tagline: 'Light, softened',
    description:
      'Airy sheers, washed linens, rich velvets and full blackout weaves, made to measure for every window.',
    image: '/images/cat-curtains.jpg',
    visualizerLabel: 'Curtains',
  },
  {
    id: 'flooring',
    slug: 'wooden-flooring',
    name: 'Wooden Flooring',
    singular: 'Flooring',
    tagline: 'Warmth underfoot',
    description: 'Oak and walnut planks and basket-weave parquet, in tones from pale Nordic to deep espresso.',
    image: '/images/cat-flooring.jpg',
    visualizerLabel: 'Flooring',
  },
  {
    id: 'fabric',
    slug: 'sofa-fabrics',
    name: 'Sofa Fabrics',
    singular: 'Upholstery fabric',
    tagline: 'Texture you can feel',
    description:
      'Linens, bouclé, performance weaves, velvets and leather-look upholstery for sofas, chairs and cushions.',
    image: '/images/cat-fabrics.jpg',
    visualizerLabel: 'Sofa Fabrics',
  },
  {
    id: 'grass',
    slug: 'artificial-grass',
    name: 'Artificial Grass',
    singular: 'Artificial grass',
    tagline: 'Green that stays green',
    description:
      'Soft, natural-looking turf for balconies, terraces, play areas and rooftop gardens. No watering, no mowing.',
    image: '/images/cat-grass.jpg',
    visualizerLabel: 'Artificial Grass',
  },
  {
    id: 'panel',
    slug: 'wall-panels',
    name: 'Wall Panels & Cladding',
    singular: 'Wall panel',
    tagline: 'Architectural detail',
    description:
      'Fluted timber panels and natural stone cladding that add depth, rhythm and texture to feature walls.',
    image: '/images/cat-decor.jpg',
    visualizerLabel: 'Wall Panels',
  },
];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug || c.id === slug);
