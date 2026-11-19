import { Link } from 'react-router-dom';
import type { Category } from '../../types/catalog';
import { Icon } from '../ui/Icon';
import { productsByCategory } from '../../data/products';

export function CategoryCard({ category, tall }: { category: Category; tall?: boolean }) {
  const count = productsByCategory(category.id).length;
  return (
    <Link
      to={`/collections/${category.slug}`}
      className={`group relative block overflow-hidden bg-charcoal ${tall ? 'aspect-[3/4] lg:aspect-auto lg:h-full' : 'aspect-[4/5]'}`}
    >
      <img
        src={category.image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-[1400ms] ease-[var(--ease-lux)] group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.24em] text-gold uppercase">
          {count} materials · {category.tagline}
        </p>
        <h3 className="text-3xl text-ivory sm:text-[2.1rem]">{category.name}</h3>
        <p className="mt-2 max-h-0 overflow-hidden text-sm leading-relaxed text-ivory/75 opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100 max-lg:max-h-24 max-lg:opacity-100">
          {category.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase">
          Explore
          <Icon name="arrowRight" size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
