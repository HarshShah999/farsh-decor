import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from './Logo';
import { LinkButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { siteConfig } from '../../config/site';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/collections', label: 'Collections' },
  { to: '/visualizer', label: 'Visualizer' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

export function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overHero = pathname === '/' && !scrolled;
  const isTool = pathname.startsWith('/visualizer/');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const light = overHero && !open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[var(--ease-lux)] ${
          light
            ? 'bg-transparent py-5'
            : `border-b border-line/80 bg-ivory/90 backdrop-blur-md ${isTool ? 'py-2.5' : scrolled ? 'py-3' : 'py-4'}`
        }`}
      >
        <div className={`flex items-center justify-between ${isTool ? 'px-4 sm:px-6' : 'container-lux'}`}>
          <Logo light={light} />
          <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `relative py-2 text-[11.5px] font-semibold tracking-[0.18em] uppercase transition-colors ${
                    light ? 'text-ivory/85 hover:text-white' : 'text-charcoal/75 hover:text-charcoal'
                  } ${isActive ? (light ? '!text-white' : '!text-charcoal') : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-0 -bottom-0.5 h-px bg-gold"
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden md:block">
              <LinkButton to="/visualizer" variant={light ? 'outlineLight' : 'primary'} size="sm" icon="arrowRight">
                Design Your Space
              </LinkButton>
            </span>
            <button
              className={`inline-flex h-11 w-11 items-center justify-center lg:hidden ${light ? 'text-ivory' : 'text-charcoal'}`}
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <Icon name={open ? 'close' : 'menu'} size={24} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col bg-ivory pt-24 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <nav className="container-lux flex flex-1 flex-col gap-1" aria-label="Mobile">
              {links.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.5 }}
                >
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      `flex items-center justify-between border-b border-line py-5 font-serif text-4xl ${isActive ? 'text-gold-dark' : 'text-charcoal'}`
                    }
                  >
                    {l.label}
                    <Icon name="arrowUpRight" size={22} className="text-taupe" />
                  </NavLink>
                </motion.div>
              ))}
              <div className="mt-auto pb-10">
                <LinkButton to="/visualizer" variant="primary" size="lg" className="w-full" icon="arrowRight">
                  Design Your Space
                </LinkButton>
                <p className="mt-6 text-center text-sm text-muted">
                  {siteConfig.phoneDisplay} · {siteConfig.email}
                </p>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
