import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Page, Reveal, Stagger, StaggerItem } from '../components/ui/Reveal';
import { LinkButton, Button } from '../components/ui/Button';
import { Icon, WhatsAppGlyph } from '../components/ui/Icon';
import { SectionHeading } from '../components/ui/SectionHeading';
import { CategoryCard } from '../components/catalog/CategoryCard';
import { ProductCard } from '../components/catalog/ProductCard';
import { categories } from '../data/categories';
import { featuredProducts, products } from '../data/products';
import { siteConfig } from '../config/site';
import { EnquiryDialog } from '../components/enquiry/EnquiryDialog';
import { whatsappUrl, generalEnquiryMessage } from '../lib/whatsapp';
import type { CategoryId } from '../types/catalog';

const heroImages = ['/images/hero-living.jpg', '/images/hero-modern.jpg', '/images/hero-neutral.jpg'];
const ease = [0.22, 0.61, 0.36, 1] as const;

function Hero() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % heroImages.length), 7000);
    return () => clearInterval(t);
  }, [reduce]);

  const words = ['Transform Your Space.', 'Define Your Style.'];

  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-charcoal">
      <AnimatePresence initial={false}>
        <motion.img
          key={index}
          src={heroImages[index]}
          alt="A sunlit, elegantly furnished living room"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.6 }, scale: { duration: 8, ease: 'linear' } }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/75 via-charcoal/35 to-charcoal/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-charcoal/30" />

      <div className="container-lux relative flex h-full flex-col justify-end pb-24 sm:pb-28 lg:justify-center lg:pb-0">
        <motion.p
          className="eyebrow mb-6 !text-gold"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
        >
          {siteConfig.fullName} · Interior Materials Showroom
        </motion.p>
        <h1 className="max-w-4xl text-[3.1rem] leading-[0.98] text-ivory sm:text-7xl lg:text-[6.2rem]">
          {words.map((w, i) => (
            <span key={w} className="block overflow-hidden pb-1">
              <motion.span
                className={`block ${i === 1 ? 'italic text-cream' : ''}`}
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, delay: 0.35 + i * 0.15, ease }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          className="mt-7 max-w-xl text-base leading-relaxed text-ivory/80 sm:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75, ease }}
        >
          Discover thoughtfully curated wallpapers, curtains, flooring, and furnishing materials that bring your dream
          interiors to life.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease }}
        >
          <LinkButton to="/collections" variant="light" size="lg" icon="arrowRight">
            Explore Collections
          </LinkButton>
          <LinkButton to="/visualizer" variant="outlineLight" size="lg" iconLeft="cube">
            Design Your Space
          </LinkButton>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-6 hidden sm:block">
        <div className="container-lux flex items-center justify-between text-ivory/70">
          <div className="flex gap-2" role="tablist" aria-label="Hero images">
            {heroImages.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Show image ${i + 1}`}
                onClick={() => setIndex(i)}
                className="group py-3"
              >
                <span
                  className={`block h-px transition-all duration-700 ${i === index ? 'w-14 bg-gold' : 'w-7 bg-ivory/40 group-hover:bg-ivory/80'}`}
                />
              </button>
            ))}
          </div>
          <a href="#categories" className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.3em] uppercase">
            Scroll to explore
            <motion.span animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Icon name="chevronDown" size={16} />
            </motion.span>
          </a>
        </div>
      </div>
    </section>
  );
}

function IntroStrip() {
  const stats = [
    [String(categories.length), 'Material categories'],
    [`${products.length}+`, 'Curated finishes online'],
    ['2', 'Ways to visualise'],
    ['1:1', 'Personal design advice'],
  ];
  return (
    <section className="border-b border-line bg-ivory">
      <div className="container-lux grid gap-10 py-16 md:grid-cols-[1.3fr_2fr] md:items-center md:py-20">
        <Reveal>
          <p className="font-serif text-3xl leading-snug sm:text-4xl">
            A showroom of finishes,
            <span className="italic text-gold-dark"> chosen with care</span>, for homes that feel considered.
          </p>
        </Reveal>
        <Stagger className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map(([n, l]) => (
            <StaggerItem key={l}>
              <p className="font-serif text-5xl text-charcoal">{n}</p>
              <p className="mt-2 text-xs tracking-[0.14em] text-muted uppercase">{l}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section id="categories" className="scroll-mt-20 py-24 md:py-32">
      <div className="container-lux">
        <SectionHeading
          eyebrow="The Collections"
          title={
            <>
              Materials for every
              <br />
              <span className="italic">surface of the home</span>
            </>
          }
          description="From the walls that frame a room to the fabric you sink into, explore materials selected for quality, character and longevity."
          action={
            <LinkButton to="/collections" variant="outline" icon="arrowRight">
              All collections
            </LinkButton>
          }
        />
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <StaggerItem key={c.id}>
              <CategoryCard category={c} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Featured() {
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const list = useMemo(
    () => (filter === 'all' ? featuredProducts : featuredProducts.filter((p) => p.category === filter)).slice(0, 8),
    [filter],
  );
  const cats = categories.filter((c) => featuredProducts.some((p) => p.category === c.id));
  return (
    <section className="bg-cream/60 py-24 md:py-32">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Featured Collections"
          title="Curated by our designers"
          description="A selection of the finishes our clients love most. Open any of them in the 3D room to see it at full scale."
        />
        <div className="no-scrollbar -mx-5 mb-10 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {[{ id: 'all' as const, name: 'All' }, ...cats].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`shrink-0 border px-4 py-2 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                filter === c.id ? 'border-charcoal bg-charcoal text-ivory' : 'border-line text-muted hover:border-charcoal hover:text-charcoal'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <motion.div layout className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {list.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function IsoRoomArt() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="iso-floor" width="22" height="12.7" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
          <path d="M0 0h22" stroke="#b69a70" strokeOpacity=".35" />
        </pattern>
        <pattern id="iso-wall" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1" fill="#b69a70" fillOpacity=".35" />
        </pattern>
      </defs>
      <g stroke="#b69a70" strokeWidth="1.2" fill="none">
        <path d="M200 40 L340 110 L340 230 L200 160 Z" fill="url(#iso-wall)" />
        <path d="M200 40 L60 110 L60 230 L200 160 Z" fill="#b69a70" fillOpacity=".06" />
        <path d="M60 230 L200 300 L340 230 L200 160 Z" fill="url(#iso-floor)" />
        <path d="M90 140 L150 110 L150 175 L90 205 Z" fill="#f8f6f1" fillOpacity=".08" />
        <path d="M95 142v58M145 115v58" strokeOpacity=".6" />
        <path d="M150 215 L230 255 L280 230 L200 190 Z" fill="#b69a70" fillOpacity=".25" />
        <path d="M150 215v16l80 40v-16M230 271l50-25v-16" />
        <path d="M230 200 L275 222 L300 210 L255 188 Z" />
      </g>
      <g fill="#b69a70">
        <circle cx="270" cy="150" r="4" />
        <circle cx="120" cy="155" r="4" />
        <circle cx="200" cy="240" r="4" />
      </g>
    </svg>
  );
}

function VisualizerPromo() {
  return (
    <section className="relative overflow-hidden bg-charcoal py-24 text-ivory md:py-32">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gold/10 blur-3xl" />
      <div className="container-lux relative">
        <SectionHeading
          light
          align="center"
          eyebrow="The Farsh Visualizer"
          title={
            <>
              Your Vision. Your Space.
              <br />
              <span className="italic text-gold">Your Design.</span>
            </>
          }
          description="Explore materials, experiment with combinations, and see how your favourite finishes transform your space."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Link
              to="/visualizer/3d"
              className="group relative flex h-full flex-col overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-8 transition-colors duration-500 hover:border-gold/60 sm:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <Icon name="cube" size={22} />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.3em] text-ivory/50 uppercase">Option 01</span>
              </div>
              <div className="my-8 aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-[1.03]">
                <IsoRoomArt />
              </div>
              <h3 className="text-4xl sm:text-5xl">Design in 3D</h3>
              <p className="mt-3 max-w-md text-ivory/65">
                Step into a fully furnished, interactive 3D living room. Click any wall, floor, curtain or sofa and apply
                real catalogue materials instantly.
              </p>
              <span className="mt-8 inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">
                Launch 3D room <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              to="/visualizer/photo"
              className="group relative flex h-full flex-col overflow-hidden bg-ivory p-8 text-charcoal transition-shadow duration-500 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] sm:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-ivory">
                  <Icon name="upload" size={20} />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.3em] text-muted uppercase">Option 02</span>
              </div>
              <div className="relative my-8 aspect-[4/3] w-full overflow-hidden">
                <img
                  src="/images/sample-room-1.jpg"
                  alt="A sample room photograph with a wall area being outlined"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <polygon
                    points="2,2 98,2 98,52 2,52"
                    fill="rgba(182,154,112,0.18)"
                    stroke="#b69a70"
                    strokeWidth="0.5"
                    strokeDasharray="2 1.2"
                  />
                  {[
                    [2, 2],
                    [98, 2],
                    [98, 52],
                    [2, 52],
                  ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#fff" stroke="#b69a70" strokeWidth="0.5" />
                  ))}
                </svg>
                <span className="absolute bottom-3 left-3 bg-charcoal/85 px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-ivory uppercase">
                  Outline · Apply · Compare
                </span>
              </div>
              <h3 className="text-4xl sm:text-5xl">Upload Your Room</h3>
              <p className="mt-3 max-w-md text-muted">
                Use a photo of your own space. Outline the wall, floor or sofa, then try materials with
                perspective-aware overlays and a before/after slider.
              </p>
              <span className="mt-8 inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] text-gold-dark uppercase">
                Upload a photo <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function AboutTeaser() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-lux grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <img src="/images/about-texture.jpg" alt="Layered natural textures in a styled interior" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          <img
            src="/images/about-minimal.jpg"
            alt=""
            className="absolute -right-4 -bottom-10 hidden w-1/2 border-8 border-ivory object-cover shadow-[var(--shadow-lift)] sm:block lg:-right-10"
            loading="lazy"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="eyebrow mb-4">About Farsh</p>
          <h2 className="text-4xl leading-tight sm:text-5xl">
            Where good interiors
            <br />
            <span className="italic">begin with good materials</span>
          </h2>
          <p className="mt-6 leading-relaxed text-muted">
            {siteConfig.fullName} brings together wallpapers, curtains, wooden flooring, artificial grass, upholstery
            fabrics and decorative panels under one roof. Homeowners, architects and designers can compare, touch and
            choose in one calm, considered space.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            We believe the right finish changes how a room feels. Our team helps you find it, from the first swatch to
            the final installation.
          </p>
          <LinkButton to="/about" variant="outline" className="mt-9" icon="arrowRight">
            Our story
          </LinkButton>
        </Reveal>
      </div>
    </section>
  );
}

function WhyFarsh() {
  const items = [
    ['01', 'Curated, not crowded', 'Every collection is edited for quality, durability and design relevance, so choosing feels easy.'],
    ['02', 'See it before you buy', 'Visualise materials in our 3D room or on a photo of your own space before you commit.'],
    ['03', 'Expert guidance', 'Talk through colour, scale and practicality with our in-showroom design consultants.'],
    ['04', 'Measured to finish', 'We coordinate measurements, stitching and installation for a clean, complete result.'],
  ];
  return (
    <section className="border-y border-line bg-ivory py-24 md:py-28">
      <div className="container-lux">
        <SectionHeading eyebrow="Why choose Farsh" title="The considered way to finish a home" />
        <Stagger className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([n, t, d]) => (
            <StaggerItem key={n} className="group bg-ivory p-8 transition-colors duration-500 hover:bg-white">
              <p className="font-serif text-5xl text-gold/70 transition-colors group-hover:text-gold">{n}</p>
              <h3 className="mt-8 text-2xl">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{d}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const inspiration = [
  { src: '/images/insp-openplan.jpg', title: 'Warm Modern', note: 'Walnut panelling · Oak floors', to: '/collections/wall-panels', span: 'lg:col-span-2 lg:row-span-2' },
  { src: '/images/insp-bedroom-dark.jpg', title: 'Moody Retreat', note: 'Dark walls · Velvet drapes', to: '/collections/curtains', span: '' },
  { src: '/images/insp-boho.jpg', title: 'Relaxed Boho', note: 'Natural textures · Linen', to: '/collections/sofa-fabrics', span: '' },
  { src: '/images/insp-pendants.jpg', title: 'Soft Heritage', note: 'Limewash · Woven accents', to: '/collections/wallpapers', span: '' },
  { src: '/images/insp-garden.jpg', title: 'Garden Living', note: 'Evergreen artificial lawns', to: '/collections/artificial-grass', span: '' },
];

function Inspiration() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Interior Inspiration"
          title={
            <>
              Rooms that <span className="italic">tell a story</span>
            </>
          }
          description="Ideas to start from. Each look links to the materials that create it."
        />
        <Stagger className="grid auto-rows-[260px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {inspiration.map((i) => (
            <StaggerItem key={i.title} className={i.span}>
              <Link to={i.to} className="group relative block h-full overflow-hidden">
                <img
                  src={i.src}
                  alt={`${i.title} interior inspiration`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-lux)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <h3 className="text-3xl text-ivory">{i.title}</h3>
                  <p className="mt-1 text-xs tracking-[0.14em] text-ivory/75 uppercase">{i.note}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Showroom({ onBook }: { onBook: () => void }) {
  const a = siteConfig.address;
  return (
    <section className="relative">
      <img src="/images/showroom.jpg" alt="An elegant, light-filled interior" className="h-[80vh] min-h-[560px] w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-charcoal/30" />
      <div className="absolute inset-0 flex items-center">
        <div className="container-lux">
          <Reveal className="max-w-lg bg-ivory/95 p-8 shadow-[var(--shadow-lift)] backdrop-blur sm:p-12">
            <p className="eyebrow mb-4">The Showroom Experience</p>
            <h2 className="text-4xl leading-tight sm:text-5xl">Feel every finish in person</h2>
            <p className="mt-5 leading-relaxed text-muted">
              Walk through room-scale displays, compare swatches in natural light and leave with samples. Bring your
              saved designs and our consultants will take it from there.
            </p>
            <div className="mt-6 space-y-2 border-t border-line pt-6 text-sm">
              <p className="flex items-start gap-2">
                <Icon name="mapPin" size={16} className="mt-0.5 shrink-0 text-gold" /> {a.line1}, {a.city}
              </p>
              <p className="flex items-start gap-2">
                <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-gold" /> {siteConfig.hours[0].days}, {siteConfig.hours[0].time}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={onBook} icon="arrowRight">
                Book a visit
              </Button>
              <LinkButton to="/contact" variant="outline">
                Get directions
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote: 'Seeing the fluted panels and the walnut floor together in the 3D room settled a two-week debate in five minutes.',
    name: 'Sample Client A',
    role: 'Homeowner · Living room renovation',
  },
  {
    quote: 'The team understood scale and colour immediately. The linen curtains and limewash walls feel calm and finished.',
    name: 'Sample Client B',
    role: 'Interior designer · Apartment project',
  },
  {
    quote: 'I uploaded a photo of my balcony, tried three grass options and walked into the showroom knowing what I wanted.',
    name: 'Sample Client C',
    role: 'Homeowner · Terrace makeover',
  },
];

function Testimonials() {
  return (
    <section className="bg-cream/60 py-24 md:py-32">
      <div className="container-lux">
        <SectionHeading
          align="center"
          eyebrow="Client words"
          title="Spaces our clients love"
          description={
            <span className="inline-flex items-center gap-2 border border-gold/40 bg-ivory px-3 py-1 text-xs tracking-wide text-gold-dark">
              <Icon name="info" size={14} /> Sample testimonials. Placeholder content until real reviews are added.
            </span>
          }
        />
        <Stagger className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <StaggerItem key={t.name} className="flex h-full flex-col bg-ivory p-8 shadow-[var(--shadow-soft)] sm:p-10">
              <Icon name="quote" size={30} className="text-gold" />
              <blockquote className="mt-6 flex-1 font-serif text-2xl leading-snug">“{t.quote}”</blockquote>
              <div className="mt-8 border-t border-line pt-5">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function ContactCta() {
  return (
    <section className="py-24 md:py-28">
      <div className="container-lux">
        <Reveal className="flex flex-col items-start justify-between gap-10 border border-line bg-white px-8 py-14 sm:px-14 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Let's begin</p>
            <h2 className="text-4xl leading-tight sm:text-5xl">
              Have a room in mind? <span className="italic">Let's talk materials.</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl(generalEnquiryMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2.5 bg-[#1f9e55] px-8 text-[11px] font-semibold tracking-[0.16em] text-white uppercase transition-colors hover:bg-[#178246]"
            >
              <WhatsAppGlyph size={18} /> WhatsApp us
            </a>
            <LinkButton to="/contact" variant="outline" size="lg" icon="arrowRight">
              Contact
            </LinkButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [visitOpen, setVisitOpen] = useState(false);
  useEffect(() => {
    document.title = `${siteConfig.fullName} | ${siteConfig.tagline}`;
  }, []);
  return (
    <Page>
      <Hero />
      <IntroStrip />
      <Categories />
      <Featured />
      <VisualizerPromo />
      <AboutTeaser />
      <WhyFarsh />
      <Inspiration />
      <Showroom onBook={() => setVisitOpen(true)} />
      <Testimonials />
      <ContactCta />
      <EnquiryDialog open={visitOpen} onClose={() => setVisitOpen(false)} kind="visit" />
    </Page>
  );
}
