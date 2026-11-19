import { useEffect } from 'react';
import { Page, Reveal, Stagger, StaggerItem } from '../components/ui/Reveal';
import { categories } from '../data/categories';
import { products } from '../data/products';
import { CategoryCard } from '../components/catalog/CategoryCard';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { siteConfig } from '../config/site';

export default function CollectionsPage() {
  useEffect(() => {
    document.title = `Collections | ${siteConfig.fullName}`;
  }, []);
  return (
    <Page className="pt-32 pb-24 md:pt-40">
      <div className="container-lux">
        <Reveal className="max-w-3xl">
          <p className="eyebrow mb-4">The Collections</p>
          <h1 className="text-5xl leading-[1.02] sm:text-7xl">
            Finishes for walls, windows,
            <span className="italic"> floors & furniture</span>
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-muted">
            Browse the full Farsh catalogue. Every material here can be opened in the 3D room or applied to a photo of
            your own space.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <StaggerItem key={c.id}>
              <CategoryCard category={c} />
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-28">
          <Reveal className="mb-10">
            <p className="eyebrow mb-3">All materials</p>
            <h2 className="text-4xl sm:text-5xl">Browse the full catalogue</h2>
          </Reveal>
          <ProductGrid items={products} showCategoryFilter />
        </div>
      </div>
    </Page>
  );
}
