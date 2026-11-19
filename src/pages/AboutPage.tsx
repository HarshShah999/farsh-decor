import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Page, Reveal, Stagger, StaggerItem } from '../components/ui/Reveal';
import { LinkButton } from '../components/ui/Button';
import { categories } from '../data/categories';
import { siteConfig } from '../config/site';
import { Icon } from '../components/ui/Icon';

export default function AboutPage() {
  useEffect(() => {
    document.title = `About | ${siteConfig.fullName}`;
  }, []);
  return (
    <Page>
      <section className="pt-36 pb-20 md:pt-44">
        <div className="container-lux grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <Reveal>
            <p className="eyebrow mb-4">About {siteConfig.brandName}</p>
            <h1 className="text-5xl leading-[1.02] sm:text-7xl">
              A destination for
              <br />
              <span className="italic">beautifully made interiors</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="leading-relaxed text-muted">
              {siteConfig.fullName} is an interior materials showroom bringing wallcoverings, curtains, flooring,
              upholstery, artificial grass and decorative panels together in one place, so a whole room can be imagined
              and chosen as one.
            </p>
          </Reveal>
        </div>
      </section>

      <Reveal className="container-lux">
        <img src="/images/insp-warm.jpg" alt="A warm, layered living room" className="aspect-[21/9] w-full object-cover" />
      </Reveal>

      <section className="py-24 md:py-32">
        <div className="container-lux grid gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-4">Our story</p>
            <h2 className="text-4xl leading-tight sm:text-5xl">Materials first, because they shape everything else</h2>
          </Reveal>
          <Reveal delay={0.1} className="space-y-5 leading-relaxed text-muted">
            <p>
              A room is remembered for how it feels: the softness of a linen curtain in morning light, the warmth of oak
              underfoot, the quiet depth of a textured wall. Farsh was created around that idea.
            </p>
            <p>
              We curate collections that balance beauty with everyday practicality, and we pair them with tools that
              help you see a material in context before you decide.
            </p>
            <p className="border-l-2 border-gold pl-5 text-sm text-taupe">
              Brand history, founding year, team size and partner brands are business-specific details. Add them in{' '}
              <code className="text-xs">src/pages/AboutPage.tsx</code> or <code className="text-xs">src/config/site.ts</code>.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-cream/60 py-24 md:py-32">
        <div className="container-lux">
          <Reveal className="mb-14 max-w-2xl">
            <p className="eyebrow mb-4">Product range</p>
            <h2 className="text-4xl sm:text-5xl">Six categories, one considered edit</h2>
          </Reveal>
          <Stagger className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <StaggerItem key={c.id}>
                <Link to={`/collections/${c.slug}`} className="group flex h-full flex-col bg-ivory p-8 transition-colors hover:bg-white">
                  <div className="mb-6 aspect-[16/10] overflow-hidden">
                    <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  </div>
                  <h3 className="text-3xl">{c.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{c.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
                    Explore <Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-lux grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="grid grid-cols-2 gap-4">
            <img src="/images/showroom.jpg" alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
            <img src="/images/insp-woodwall.jpg" alt="" className="mt-12 aspect-[3/4] w-full object-cover" loading="lazy" />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow mb-4">The showroom experience</p>
            <h2 className="text-4xl leading-tight sm:text-5xl">Touch, compare and decide with confidence</h2>
            <ul className="mt-8 space-y-5">
              {[
                ['Room-scale displays', 'See finishes at the size they will live in your home, not just as small cuttings.'],
                ['Sample library', 'Take swatches home to see them in your own light.'],
                ['Design consultation', 'Bring photos, plans or saved designs and plan the whole room with us.'],
                ['Measure & install', 'We coordinate measuring, stitching and installation for a seamless finish.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-gold" />
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="bg-charcoal py-24 text-ivory md:py-32">
        <div className="container-lux">
          <Reveal className="mb-14 max-w-2xl">
            <p className="eyebrow mb-4 !text-gold">Quality & design philosophy</p>
            <h2 className="text-4xl sm:text-5xl">What guides every collection</h2>
          </Reveal>
          <Stagger className="grid gap-10 md:grid-cols-3">
            {[
              ['Honest materials', 'We describe finishes plainly and encourage you to see samples before you commit.'],
              ['Timeless over trendy', 'Our edit favours pieces that age gracefully and work with changing décor.'],
              ['Made to be lived in', 'Beauty matters, and so do cleanability, light-fastness and wear. We weigh both.'],
            ].map(([t, d], i) => (
              <StaggerItem key={t} className="border-t border-white/15 pt-6">
                <p className="font-serif text-4xl text-gold">0{i + 1}</p>
                <h3 className="mt-4 text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory/65">{d}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-24">
        <div className="container-lux">
          <Reveal className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-4">Interior inspiration</p>
              <h2 className="text-4xl sm:text-5xl">Moods we love</h2>
            </div>
            <LinkButton to="/visualizer" icon="arrowRight">
              Start designing
            </LinkButton>
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {['insp-bright', 'insp-dining', 'insp-boho', 'about-sofa'].map((s) => (
              <StaggerItem key={s}>
                <img src={`/images/${s}.jpg`} alt="Interior inspiration" loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </Page>
  );
}
