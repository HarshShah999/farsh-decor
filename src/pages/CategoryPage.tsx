import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Page } from '../components/ui/Reveal';
import { categories, categoryBySlug } from '../data/categories';
import { productsByCategory } from '../data/products';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { LinkButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import NotFoundPage from './NotFoundPage';
import { siteConfig } from '../config/site';

export default function CategoryPage() {
  const { category: slug = '' } = useParams();
  const category = categoryBySlug(slug);

  useEffect(() => {
    if (category) document.title = `${category.name} | ${siteConfig.fullName}`;
  }, [category]);

  if (!category) return <NotFoundPage />;
  const items = productsByCategory(category.id);

  return (
    <Page>
      <section className="relative h-[62vh] min-h-[460px] overflow-hidden bg-charcoal">
        <motion.img
          src={category.image}
          alt={`${category.name} in an interior`}
          className="absolute inset-0 h-full w-full object-cover opacity-85"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: [0.22, 0.61, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/30 to-charcoal/20" />
        <div className="container-lux relative flex h-full flex-col justify-end pb-14">
          <nav className="mb-6 flex items-center gap-2 text-[11px] tracking-[0.16em] text-ivory/70 uppercase" aria-label="Breadcrumb">
            <Link to="/collections" className="hover:text-white">
              Collections
            </Link>
            <Icon name="chevronRight" size={12} />
            <span className="text-ivory">{category.name}</span>
          </nav>
          <motion.h1
            className="text-5xl text-ivory sm:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
          >
            {category.name}
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl text-ivory/80"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
          >
            {category.description}
          </motion.p>
        </div>
      </section>

      <div className="border-b border-line bg-ivory">
        <div className="container-lux no-scrollbar flex gap-6 overflow-x-auto py-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/collections/${c.slug}`}
              className={`shrink-0 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${
                c.id === category.id ? 'border-b border-gold text-charcoal' : 'text-muted hover:text-charcoal'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <section className="container-lux py-16 md:py-20">
        <ProductGrid items={items} />
      </section>

      <section className="container-lux pb-24">
        <div className="flex flex-col items-start justify-between gap-6 bg-charcoal px-8 py-12 text-ivory sm:px-12 md:flex-row md:items-center">
          <div>
            <p className="eyebrow mb-3 !text-gold">Not sure yet?</p>
            <h2 className="text-3xl sm:text-4xl">See {category.name.toLowerCase()} in a real room</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton to="/visualizer/3d" variant="light" iconLeft="cube">
              3D room
            </LinkButton>
            <LinkButton to="/visualizer/photo" variant="outlineLight" iconLeft="upload">
              Your photo
            </LinkButton>
          </div>
        </div>
      </section>
    </Page>
  );
}
