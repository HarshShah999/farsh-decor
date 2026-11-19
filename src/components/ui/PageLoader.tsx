export default function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border border-gold/30" />
        <span className="absolute inset-0 animate-spin rounded-full border-t border-gold" />
      </div>
      <p className="eyebrow">{label}</p>
    </div>
  );
}
