import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../../types/catalog';
import { categoryById } from '../../data/categories';
import { MaterialSwatch } from '../ui/MaterialSwatch';
import { Icon } from '../ui/Icon';

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const cat = categoryById[product.category];
  return (
    <article className="group flex h-full flex-col">
      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-cream shadow-[var(--shadow-soft)] transition-shadow duration-500 group-hover:shadow-[var(--shadow-lift)]"
        aria-label={`View ${product.name}`}
      >
        <MaterialSwatch product={product} className="absolute inset-0" tiles={product.category === 'flooring' ? 1 : 2} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute top-3 left-3 bg-ivory/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-charcoal uppercase backdrop-blur">
          {cat.name}
        </span>
      </Link>
      <div className="flex flex-1 flex-col pt-5">
        <p className="text-[11px] tracking-[0.14em] text-muted uppercase">{product.collection}</p>
        <h3 className="mt-1.5 text-2xl leading-tight">
          <Link to={`/product/${product.id}`} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{product.description}</p>
        <div className="mt-auto flex items-center gap-5 pt-5">
          <Link
            to={`/product/${product.id}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-charcoal uppercase"
          >
            <span className="link-underline">View details</span>
          </Link>
          <button
            type="button"
            onClick={() => navigate(`/visualizer/3d?apply=${product.id}`)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-gold-dark uppercase hover:text-charcoal"
          >
            <Icon name="cube" size={15} />
            <span className="link-underline">Try in room</span>
          </button>
        </div>
      </div>
    </article>
  );
}
