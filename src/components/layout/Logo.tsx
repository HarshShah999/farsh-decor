import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={`group inline-flex flex-col leading-none ${className}`} aria-label={`${siteConfig.fullName} — home`}>
      <span
        className={`font-serif text-[28px] font-medium tracking-[0.32em] transition-colors ${light ? 'text-ivory' : 'text-charcoal'}`}
      >
        {siteConfig.logoText}
      </span>
      <span className="mt-1 flex items-center gap-2 text-[8.5px] font-semibold tracking-[0.42em] text-gold uppercase">
        <span className="h-px w-4 bg-gold/70" />
        {siteConfig.brandSuffix}
      </span>
    </Link>
  );
}
