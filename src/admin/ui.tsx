/** Small, plain-language form building blocks for the admin panel. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ImageError, type PreparedImage } from './images';

/* ------------------------------ unsaved changes ---------------------------- */

export const useDirty = create<{ dirty: boolean; setDirty: (d: boolean) => void }>((set) => ({
  dirty: false,
  setDirty: (dirty) => set({ dirty }),
}));

export const LEAVE_MESSAGE = 'You have unsaved changes. Leave this page and lose them?';

/** Mark the page as having unsaved changes (warns on reload / close / in-panel navigation). */
export function useUnsavedWarning(dirty: boolean) {
  const setDirty = useDirty((s) => s.setDirty);
  useEffect(() => {
    setDirty(dirty);
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
}

/** Use in onClick of links that leave a form. */
export const confirmLeave = (e: { preventDefault: () => void }) => {
  if (useDirty.getState().dirty && !window.confirm(LEAVE_MESSAGE)) e.preventDefault();
  else useDirty.getState().setDirty(false);
};

/* ---------------------------------- layout --------------------------------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, description, children, className = '' }: { title?: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-line bg-white p-5 sm:p-7 ${className}`}>
      {title && <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={title || description ? 'mt-5 space-y-5' : 'space-y-5'}>{children}</div>
    </section>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-gold" />
      {label}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'live' | 'hidden' | 'gold'; children: ReactNode }) {
  const cls = {
    live: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    hidden: 'bg-stone-100 text-stone-600 ring-stone-200',
    gold: 'bg-amber-50 text-amber-800 ring-amber-200',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>{children}</span>;
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const cls = {
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-line bg-cream/60 text-ink',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

/* ---------------------------------- fields --------------------------------- */

const inputCls =
  'w-full border border-line bg-white px-3.5 py-2.5 text-[15px] text-charcoal transition-colors placeholder:text-taupe focus:border-gold focus:outline-none aria-[invalid=true]:border-red-400';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string }) => ReactNode;
  counter?: string;
}

export function Field({ label, hint, error, required, children, counter }: FieldProps) {
  const id = useId();
  const descId = hint || error ? `${id}-desc` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-charcoal">
          {label}
          {required ? <span className="text-gold-dark"> *</span> : <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>}
        </label>
        {counter && <span className="text-xs text-muted">{counter}</span>}
      </div>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': descId, className: inputCls })}
      {(error || hint) && (
        <p id={descId} className={`mt-1.5 text-[13px] ${error ? 'text-red-700' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-stone-300'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

/* ------------------------------ confirm dialog ----------------------------- */

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={title} size="sm">
      <div className="space-y-6 text-sm leading-relaxed text-ink">
        <div>{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className={danger ? '!bg-red-700 hover:!bg-red-800' : ''}
            onClick={onConfirm}
            disabled={busy}
            data-autofocus
          >
            {busy ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------- image picker ------------------------------ */

export interface PendingImage {
  prepared: PreparedImage;
  previewUrl: string;
  /** the original file, e.g. to cut a texture from a product photo */
  file: File;
}

/**
 * Drag-and-drop / click-to-choose image field with preview.
 * `value` is the current saved URL; `pending` a newly chosen (not yet uploaded) image.
 */
export function ImagePicker({
  label,
  hint,
  value,
  pending,
  onPick,
  onRemove,
  prepare,
  aspect = 'aspect-[4/3]',
  removable = true,
}: {
  label: string;
  hint?: ReactNode;
  value?: string;
  pending: PendingImage | null;
  onPick: (img: PendingImage) => void;
  onRemove: () => void;
  prepare: (file: File) => Promise<PreparedImage>;
  aspect?: string;
  removable?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = pending?.previewUrl ?? value;

  const handle = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepare(file);
      onPick({ prepared, previewUrl: URL.createObjectURL(prepared.blob), file });
    } catch (e) {
      setError(e instanceof ImageError || e instanceof Error ? e.message : 'This image could not be used.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`relative ${aspect} w-full overflow-hidden border-2 border-dashed transition-colors ${drag ? 'border-gold bg-gold/5' : 'border-line bg-ivory'}`}
      >
        {shown ? (
          <img src={shown} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted hover:bg-cream/40"
          >
            <Icon name="upload" size={26} />
            <span className="font-semibold text-charcoal">Click to choose a photo</span>
            <span>or drag and drop it here · JPG, PNG or WEBP</span>
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-line border-t-gold" /> Preparing photo…
          </div>
        )}
        {pending && (
          <span className="absolute top-2 left-2 rounded-full bg-gold px-2.5 py-0.5 text-xs font-medium text-white">New – saved when you click Save</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => handle(e.target.files?.[0])} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" iconLeft="upload" onClick={() => inputRef.current?.click()} disabled={busy}>
          {shown ? 'Replace photo' : 'Choose photo'}
        </Button>
        {shown && removable && (
          <Button size="sm" variant="ghost" iconLeft="trash" onClick={onRemove} disabled={busy}>
            Remove
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
      {hint && !error && <p className="mt-2 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
