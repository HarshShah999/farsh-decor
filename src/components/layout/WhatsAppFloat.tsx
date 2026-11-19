import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WhatsAppGlyph } from '../ui/Icon';
import { generalEnquiryMessage, whatsappUrl } from '../../lib/whatsapp';

export function WhatsAppFloat() {
  const { pathname } = useLocation();
  // In the visualizers it sits beside the side panel on desktop. On mobile the tool
  // drawer has its own WhatsApp "Enquire" button, so the floating one is hidden there.
  const isTool = pathname.startsWith('/visualizer/');
  return (
    <motion.a
      href={whatsappUrl(generalEnquiryMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
      className={`group fixed right-4 z-[60] flex items-center sm:right-6 ${isTool ? 'max-lg:hidden lg:right-[392px] lg:bottom-36' : 'bottom-5 sm:bottom-6'}`}
    >
      <span className="pointer-events-none mr-3 hidden translate-x-2 bg-charcoal px-3 py-2 text-[11px] font-semibold tracking-[0.12em] text-ivory uppercase opacity-0 shadow-lg transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
        Chat with us
      </span>
      <span
        className={`relative flex items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform duration-300 group-hover:scale-105 ${isTool ? 'h-12 w-12' : 'h-14 w-14'}`}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25d366] opacity-20 [animation-duration:2.8s]" />
        <WhatsAppGlyph size={isTool ? 24 : 28} />
      </span>
    </motion.a>
  );
}
