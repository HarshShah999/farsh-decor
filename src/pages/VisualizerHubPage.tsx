import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Page, Reveal, Stagger, StaggerItem } from '../components/ui/Reveal';
import { Icon } from '../components/ui/Icon';
import { SavedDesigns } from '../components/designs/SavedDesigns';
import { siteConfig } from '../config/site';

export default function VisualizerHubPage() {
  useEffect(() => {
    document.title = `Visualizer | ${siteConfig.fullName}`;
  }, []);
  return (
    <Page className="pt-32 md:pt-40">
      <div className="container-lux">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-4">The Farsh Visualizer</p>
          <h1 className="text-5xl leading-[1.02] sm:text-7xl">
            Your Vision. Your Space.
            <br />
            <span className="italic">Your Design.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-muted">
            Explore materials, experiment with combinations, and see how your favourite finishes transform your space.
            Choose how you'd like to start.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Link to="/visualizer/3d" className="group relative block overflow-hidden bg-charcoal text-ivory">
              <img src="/images/hero-modern.jpg" alt="" className="aspect-[16/11] w-full object-cover opacity-55 transition-all duration-1000 group-hover:scale-105 group-hover:opacity-45" />
              <div className="absolute inset-0 flex flex-col justify-between p-8 sm:p-10">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 text-gold">
                  <Icon name="cube" size={22} />
                </span>
                <div>
                  <h2 className="text-4xl sm:text-5xl">Design in 3D</h2>
                  <p className="mt-3 max-w-md text-sm text-ivory/75">
                    An interactive, furnished 3D living room. Orbit, zoom and click any surface to apply catalogue
                    materials, then save, compare and share.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">
                    Enter the 3D room <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <Link to="/visualizer/photo" className="group relative block overflow-hidden bg-cream">
              <img src="/images/sample-room-1.jpg" alt="" className="aspect-[16/11] w-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ivory via-ivory/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-8 sm:p-10">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-ivory">
                  <Icon name="upload" size={20} />
                </span>
                <div>
                  <h2 className="text-4xl sm:text-5xl">Upload Your Room</h2>
                  <p className="mt-3 max-w-md text-sm text-muted">
                    Imagine it in your own space. Upload a photo, outline the surfaces and try materials with natural,
                    perspective-aware overlays.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-gold-dark uppercase">
                    Upload a photo <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        </div>

        <section className="py-24">
          <Reveal className="mb-12 max-w-2xl">
            <p className="eyebrow mb-4">How it works</p>
            <h2 className="text-4xl sm:text-5xl">From idea to enquiry in minutes</h2>
          </Reveal>
          <Stagger className="grid gap-10 md:grid-cols-4">
            {[
              ['Choose', 'Start in the 3D room or upload a photo of your own space.'],
              ['Apply', 'Select a surface and try wallpapers, flooring, curtains and fabrics.'],
              ['Compare', 'Undo, redo and compare options side by side or before and after.'],
              ['Enquire', 'Save your design and send it to us on WhatsApp for a quotation.'],
            ].map(([t, d], i) => (
              <StaggerItem key={t} className="border-t border-line pt-6">
                <p className="font-serif text-4xl text-gold">0{i + 1}</p>
                <h3 className="mt-3 text-2xl">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="saved" className="scroll-mt-28 pb-28">
          <Reveal className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-4">My saved designs</p>
              <h2 className="text-4xl sm:text-5xl">Pick up where you left off</h2>
            </div>
            <p className="flex max-w-sm items-start gap-2 text-xs leading-relaxed text-muted">
              <Icon name="info" size={14} className="mt-0.5 shrink-0" />
              Saved designs are stored privately on this device only. To share a 3D design publicly, use “Share link”
              inside the 3D visualizer.
            </p>
          </Reveal>
          <SavedDesigns />
        </section>
      </div>
    </Page>
  );
}
