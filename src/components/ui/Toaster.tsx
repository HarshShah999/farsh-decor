import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useToasts } from '../../store/toastStore';
import { Icon } from './Icon';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  const { pathname } = useLocation();
  // in the visualizers, keep toasts clear of the floating toolbar
  const isTool = pathname.startsWith('/visualizer/');
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4 ${isTool ? 'top-[176px]' : 'top-24'}`}
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 bg-charcoal px-5 py-3 text-sm text-ivory shadow-[var(--shadow-lift)]"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${t.tone === 'error' ? 'bg-red-400/90' : 'bg-gold'}`}
            >
              <Icon name={t.tone === 'error' ? 'close' : 'check'} size={12} strokeWidth={2.5} />
            </span>
            <span>{t.message}</span>
            <button className="ml-2 text-ivory/50 hover:text-ivory" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="close" size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
