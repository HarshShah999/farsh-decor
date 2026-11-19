import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { WhatsAppFloat } from './WhatsAppFloat';
import { Toaster } from '../ui/Toaster';

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation();
  const isTool = pathname.startsWith('/visualizer/');

  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 400);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only z-[100] bg-charcoal px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Navbar />
      <div id="content" className="flex-1">
        {children}
      </div>
      {!isTool && <Footer />}
      <WhatsAppFloat />
      <Toaster />
    </div>
  );
}
