import { useEffect, useState } from 'react';
import type { Product } from '../../types/catalog';
import { getThumbnailUrl } from '../../lib/textures/textureService';

/** Hook returning a swatch image URL for a product (generated on demand). */
export function useSwatch(product: Product | undefined, size = 256) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!product) return;
    let alive = true;
    setUrl(null);
    getThumbnailUrl(product, size)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [product, size]);
  return url;
}

interface Props {
  product: Product;
  size?: number;
  className?: string;
  /** how many times the swatch tiles inside the box (to show the repeat) */
  tiles?: number;
  rounded?: boolean;
}

/**
 * Displays the material swatch. When tiles > 1, the seamless texture is
 * shown repeating, which is a truthful preview of how it covers a surface.
 */
export function MaterialSwatch({ product, size = 256, className = '', tiles = 1, rounded = false }: Props) {
  const url = useSwatch(product, size);
  const isSheer = (product.materialProperties.opacity ?? 1) < 1;
  return (
    <div
      className={`${/\babsolute\b/.test(className) ? '' : 'relative'} overflow-hidden ${rounded ? 'rounded-full' : ''} ${isSheer ? 'checker' : ''} ${className}`}
      aria-label={`${product.name} swatch`}
      role="img"
    >
      {url ? (
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-lux)] group-hover:scale-[1.06]"
          style={{
            backgroundImage: `url(${url})`,
            backgroundSize: `${100 / tiles}% auto`,
            backgroundRepeat: 'repeat',
            opacity: isSheer ? 0.85 : 1,
          }}
        />
      ) : (
        <div className="skeleton absolute inset-0" />
      )}
    </div>
  );
}
