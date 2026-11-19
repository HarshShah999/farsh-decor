import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { categories } from '../../data/categories';
import { Logo } from './Logo';
import { Icon, type IconName } from '../ui/Icon';
import { whatsappUrl, generalEnquiryMessage } from '../../lib/whatsapp';

export function Footer() {
  const a = siteConfig.address;
  const socials = (Object.entries(siteConfig.social) as [IconName, string][]).filter(([, url]) => url);
  return (
    <footer className="bg-charcoal text-ivory/80">
      <div className="container-lux grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-6 max-w-xs font-serif text-2xl leading-snug text-ivory">{siteConfig.tagline}</p>
          <div className="mt-8 flex gap-2">
            {socials.map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-ivory/80 transition-colors hover:border-gold hover:text-gold"
              >
                <Icon name={name} size={17} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-6 !text-gold">Collections</h3>
          <ul className="space-y-3 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/collections/${c.slug}`} className="link-underline hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="eyebrow mb-6 !text-gold">Design</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <Link to="/visualizer/3d" className="link-underline hover:text-white">
                3D Room Visualizer
              </Link>
            </li>
            <li>
              <Link to="/visualizer/photo" className="link-underline hover:text-white">
                Upload Your Room
              </Link>
            </li>
            <li>
              <Link to="/visualizer#saved" className="link-underline hover:text-white">
                My Saved Designs
              </Link>
            </li>
            <li>
              <Link to="/about" className="link-underline hover:text-white">
                About Farsh
              </Link>
            </li>
            <li>
              <Link to="/contact" className="link-underline hover:text-white">
                Contact & Showroom
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="eyebrow mb-6 !text-gold">Visit the showroom</h3>
          <address className="space-y-1 text-sm not-italic leading-relaxed">
            <p>{a.line1}</p>
            <p>{a.line2}</p>
            <p>
              {a.city}, {a.region} {a.postalCode}
            </p>
          </address>
          <ul className="mt-5 space-y-1 text-sm">
            {siteConfig.hours.map((h) => (
              <li key={h.days}>
                <span className="text-ivory/50">{h.days}:</span> {h.time}
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 text-sm">
            <a href={`tel:${siteConfig.phoneE164}`} className="flex items-center gap-2 hover:text-white">
              <Icon name="phone" size={15} /> {siteConfig.phoneDisplay}
            </a>
            <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-2 hover:text-white">
              <Icon name="mail" size={15} /> {siteConfig.email}
            </a>
            <a
              href={whatsappUrl(generalEnquiryMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white"
            >
              <Icon name="arrowUpRight" size={15} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-lux flex flex-col gap-3 py-6 text-xs text-ivory/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.fullName}. All rights reserved.
          </p>
          <p>Placeholder imagery via Unsplash. Material swatches are illustrative; please view samples in the showroom.</p>
        </div>
      </div>
    </footer>
  );
}
