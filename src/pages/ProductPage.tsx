import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Page, Reveal } from '../components/ui/Reveal';
import { availabilityLabel, formatPrice, getProduct, productsByCategory } from '../data/products';
import { categoryById } from '../data/categories';
import { MaterialSwatch, useSwatch } from '../components/ui/MaterialSwatch';
import { Button } from '../components/ui/Button';
import { Icon, WhatsAppGlyph } from '../components/ui/Icon';
import { ProductCard } from '../components/catalog/ProductCard';
import { EnquiryDialog, type EnquiryKind } from '../components/enquiry/EnquiryDialog';
import NotFoundPage from './NotFoundPage';
import { siteConfig } from '../config/site';
import { toast } from '../store/toastStore';

function Loupe({ url }: { url: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const Z = 2.5;
  return (
    <div
      ref={ref}
      className="absolute inset-0 cursor-zoom-in"
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height });
      }}
      onPointerLeave={() => setPos(null)}
    >
      {pos && url && (
        <div
          className="pointer-events-none absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ivory shadow-xl"
          style={{
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            backgroundImage: `url(${url})`,
            backgroundSize: `${pos.w * Z}px ${pos.h * Z}px`,
            backgroundPosition: `${80 - pos.x * pos.w * Z}px ${80 - pos.y * pos.h * Z}px`,
          }}
        />
      )}
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const product = getProduct(id);
  const navigate = useNavigate();
  const [tiles, setTiles] = useState(1);
  const [enquiry, setEnquiry] = useState<EnquiryKind | null>(null);
  const hiRes = useSwatch(product, 512);

  useEffect(() => {
    if (product) document.title = `${product.name} | ${siteConfig.fullName}`;
    setTiles(1);
  }, [product]);

  if (!product) return <NotFoundPage />;
  const cat = categoryById[product.category];
  const related = productsByCategory(product.category).filter((p) => p.id !== product.id).slice(0, 4);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard', 'success');
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <Page className="pt-28 pb-24 md:pt-32">
      <div className="container-lux">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.16em] text-muted uppercase" aria-label="Breadcrumb">
          <Link to="/collections" className="hover:text-charcoal">
            Collections
          </Link>
          <Icon name="chevronRight" size={12} />
          <Link to={`/collections/${cat.slug}`} className="hover:text-charcoal">
            {cat.name}
          </Link>
          <Icon name="chevronRight" size={12} />
          <span className="text-charcoal">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <div>
            <motion.div
              className="group relative aspect-square overflow-hidden bg-cream shadow-[var(--shadow-soft)]"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <MaterialSwatch key={product.id + tiles} product={product} size={512} tiles={tiles} className="absolute inset-0" />
              {tiles === 1 && <Loupe url={hiRes} />}
            </motion.div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1" role="group" aria-label="Swatch scale">
                {[
                  [1, 'Close-up'],
                  [2, 'Repeat ×2'],
                  [4, 'Wall view'],
                ].map(([t, l]) => (
                  <button
                    key={t}
                    onClick={() => setTiles(t as number)}
                    className={`border px-3 py-1.5 text-[11px] tracking-[0.08em] ${tiles === t ? 'border-charcoal bg-charcoal text-ivory' : 'border-line text-muted hover:border-charcoal'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">
                One repeat ≈ {Math.round(product.textureScale * 100)} cm · Seamless texture preview
              </p>
            </div>
          </div>

          <Reveal>
            <p className="eyebrow mb-3">
              {cat.singular} · {product.collection}
            </p>
            <h1 className="text-5xl leading-[1.02] sm:text-6xl">{product.name}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink">{product.description}</p>
            <p className="mt-4 leading-relaxed text-muted">{product.longDescription}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-line py-5 text-sm">
              <p>
                <span className="text-muted">Price: </span>
                <span className="font-semibold">{formatPrice(product)}</span>
              </p>
              <p className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${product.availability === 'in-stock' ? 'bg-emerald-600' : product.availability === 'limited' ? 'bg-amber-500' : 'bg-taupe'}`}
                />
                {availabilityLabel[product.availability]}
              </p>
              <p>
                <span className="text-muted">Ref: </span>
                {product.id}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Button size="lg" iconLeft="cube" onClick={() => navigate(`/visualizer/3d?apply=${product.id}`)}>
                Try in 3D room
              </Button>
              <Button size="lg" variant="outline" iconLeft="upload" onClick={() => navigate(`/visualizer/photo?material=${product.id}`)}>
                Try on my photo
              </Button>
              <Button size="lg" variant="whatsapp" onClick={() => setEnquiry('product')}>
                <WhatsAppGlyph size={18} /> Enquire on WhatsApp
              </Button>
              <Button size="lg" variant="ghost" iconLeft="share" onClick={share} className="border border-line">
                Share
              </Button>
            </div>

            <dl className="mt-10 divide-y divide-line border-t border-line text-sm">
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-muted">Category</dt>
                <dd>{cat.name}</dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-muted">Sold</dt>
                <dd>{product.unit}</dd>
              </div>
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-muted">Tone</dt>
                <dd>{product.colorFamily}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="bg-cream px-3 py-1 text-xs text-muted">
                  {t}
                </span>
              ))}
            </div>
            <button onClick={() => setEnquiry('visit')} className="mt-8 inline-flex items-center gap-2 text-sm text-gold-dark hover:text-charcoal">
              <Icon name="mapPin" size={16} />
              <span className="link-underline">Request a sample or book a showroom visit</span>
            </button>
          </Reveal>
        </div>

        {related.length > 0 && (
          <section className="mt-32">
            <div className="mb-10 flex items-end justify-between">
              <h2 className="text-4xl">More {cat.name.toLowerCase()}</h2>
              <Link to={`/collections/${cat.slug}`} className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                <span className="link-underline">View all</span>
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
      <EnquiryDialog open={enquiry !== null} onClose={() => setEnquiry(null)} kind={enquiry ?? 'product'} product={product} />
    </Page>
  );
}
