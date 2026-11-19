import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDesign } from '../store/designStore';
import { useTextureLoading } from '../visualizer3d/textureCache';
import { hasWebGL, viewer } from '../visualizer3d/viewer';
import { captureBranded } from '../visualizer3d/capture';
import { MaterialPanel } from '../visualizer3d/ui/MaterialPanel';
import { SummaryPanel } from '../visualizer3d/ui/SummaryPanel';
import { CompareDialog } from '../visualizer3d/ui/CompareDialog';
import { SaveDialog, ShareDialog } from '../components/designs/SaveShareDialogs';
import { EnquiryDialog } from '../components/enquiry/EnquiryDialog';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { IconButton, LinkButton, Button } from '../components/ui/Button';
import { Icon, WhatsAppGlyph } from '../components/ui/Icon';
import { SURFACES, surfaceById } from '../visualizer3d/surfaces';
import { getProduct } from '../data/products';
import { decodeDesign, shareUrlFor3D } from '../lib/shareCodec';
import { getDesign, newId, saveDesign } from '../lib/designStorage';
import { downloadDataUrl, makePreview, stamp } from '../lib/imageUtils';
import { toast } from '../store/toastStore';
import { siteConfig } from '../config/site';

const Scene = lazy(() => import('../visualizer3d/Scene'));

function LoadingOverlay() {
  const { pending, done } = useTextureLoading();
  const [visible, setVisible] = useState(true);
  const total = pending + done;
  const pct = total ? Math.round((done / total) * 100) : 5;
  useEffect(() => {
    if (total > 0 && pending === 0) {
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [pending, total]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ivory"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          role="status"
          aria-live="polite"
        >
          <p className="font-serif text-3xl">Preparing your room</p>
          <p className="mt-2 text-sm text-muted">Weaving fabrics, laying floors, hanging wallpaper…</p>
          <div className="mt-8 h-px w-56 bg-line">
            <motion.div className="h-px bg-gold" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>
          <p className="mt-3 text-[11px] tracking-[0.2em] text-taupe uppercase">{pct}%</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Fallback({ title, body }: { title: string; body: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-cream p-8 text-center">
      <Icon name="cube" size={36} className="text-gold" />
      <p className="font-serif text-3xl">{title}</p>
      <p className="max-w-md text-sm text-muted">{body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <LinkButton to="/visualizer/photo" iconLeft="upload">
          Try the photo visualizer
        </LinkButton>
        <LinkButton to="/collections" variant="outline">
          Browse collections
        </LinkButton>
      </div>
    </div>
  );
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[role="dialog"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDesign.getState().undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        useDesign.getState().redo();
      } else if (e.key === 'Escape') useDesign.getState().select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function Visualizer3DPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [fullscreen, setFullscreen] = useState(false);
  const [drawer, setDrawer] = useState<'materials' | 'design' | null>('materials');
  const [compareOpen, setCompareOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [enquiry, setEnquiry] = useState<'design' | 'quotation' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const canUndo = useDesign((s) => s.past.length > 0);
  const canRedo = useDesign((s) => s.future.length > 0);
  const selected = useDesign((s) => s.selected);
  const surfaces = useDesign((s) => s.surfaces);
  const designId = useDesign((s) => s.designId);
  const designName = useDesign((s) => s.designName);
  const { undo, redo, resetRoom, load, apply, select } = useDesign.getState();

  useKeyboardShortcuts();

  useEffect(() => {
    document.title = `3D Room Visualizer | ${siteConfig.fullName}`;
  }, []);

  // Load from URL: shared design (?d=), saved design (?design=) or apply a product (?apply=)
  useEffect(() => {
    const d = params.get('d');
    const savedId = params.get('design');
    const applyId = params.get('apply');
    let cancelled = false;
    (async () => {
      if (d) {
        const st = decodeDesign(d);
        if (st) {
          load(st, { name: 'Shared design' });
          toast('Shared design loaded', 'success');
        } else toast('That design link could not be read', 'error');
      } else if (savedId) {
        const saved = await getDesign(savedId).catch(() => undefined);
        if (cancelled) return;
        if (saved?.type === '3d') {
          load(saved.data.surfaces, { id: saved.id, name: saved.name });
          toast(`Opened “${saved.name}”`, 'success');
        } else toast('Saved design not found on this device', 'error');
      }
      if (applyId) {
        const p = getProduct(applyId);
        const target = p ? apply(applyId) : null;
        if (target) {
          select(target);
          toast(`${p!.name} applied to ${surfaceById[target].label.toLowerCase()}`, 'success');
        }
      }
      if (d || savedId || applyId) navigate('/visualizer/3d', { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fullscreen handling (with an in-page fallback for iOS Safari)
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = async () => {
    const el = viewportRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else if (el.requestFullscreen) await el.requestFullscreen().catch(() => setFullscreen((f) => !f));
    else setFullscreen((f) => !f);
    setTimeout(() => viewer.invalidate?.(), 100);
  };

  const items = SURFACES.map((s) => ({ label: s.label, product: getProduct(surfaces[s.id].productId)! }));

  const capture = useCallback(async () => {
    const url = await captureBranded(designName);
    if (!url) toast('The 3D view is still loading', 'error');
    return url;
  }, [designName]);

  const screenshot = async () => {
    const url = await capture();
    if (url) {
      downloadDataUrl(url, `farsh-3d-design-${stamp()}.jpg`);
      toast('Screenshot downloaded', 'success');
    }
  };

  const openEnquiry = async (kind: 'design' | 'quotation') => {
    setPreview(await capture());
    setShareUrl(shareUrlFor3D(useDesign.getState().surfaces));
    setEnquiry(kind);
  };

  const openSave = async () => {
    const url = await capture();
    setPreview(url ? await makePreview(url, 640) : null);
    setSaveOpen(true);
  };

  const doSave = async (name: string, asNew: boolean) => {
    const st = useDesign.getState();
    const now = Date.now();
    const id = asNew || !st.designId ? newId() : st.designId;
    await saveDesign({
      id,
      name,
      type: '3d',
      roomType: 'Living room',
      materialIds: [...new Set(Object.values(st.surfaces).map((x) => x.productId))],
      preview: preview ?? '',
      createdAt: now,
      updatedAt: now,
      data: { surfaces: st.surfaces },
    });
    st.setDesignMeta({ id, name });
  };

  const openShare = () => {
    setShareUrl(shareUrlFor3D(useDesign.getState().surfaces));
    setShareOpen(true);
  };

  const pseudoFull = fullscreen && !document.fullscreenElement;

  const toolbar = (
    <div className="pointer-events-auto flex items-center gap-0.5 bg-ivory/90 p-1 shadow-[var(--shadow-soft)] backdrop-blur">
      <IconButton icon="undo" label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
      <IconButton icon="redo" label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo} />
      <span className="mx-1 h-6 w-px bg-line" />
      <IconButton icon="move" label="Reset view" onClick={() => viewer.resetView?.()} />
      <IconButton
        icon="reset"
        label="Reset room"
        onClick={() => {
          resetRoom();
          toast('Room reset to default materials');
        }}
      />
      <span className="mx-1 h-6 w-px bg-line" />
      <IconButton icon="compare" label="Compare materials" onClick={() => setCompareOpen(true)} />
      <IconButton icon="camera" label="Take screenshot" onClick={screenshot} />
      <IconButton icon={fullscreen ? 'exitFullscreen' : 'fullscreen'} label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen} />
    </div>
  );

  return (
    <main className="flex h-[100dvh] flex-col bg-ivory pt-[62px]">
      <div className="flex min-h-0 flex-1">
        {/* LEFT: material catalogue (desktop) */}
        <aside className="hidden w-[330px] shrink-0 border-r border-line bg-ivory lg:block" aria-label="Material catalogue">
          <MaterialPanel />
        </aside>

        {/* CENTRE: viewport */}
        <section
          ref={viewportRef}
          className={`relative min-w-0 flex-1 bg-cream ${pseudoFull ? 'fixed inset-0 z-[70]' : ''}`}
          aria-label="3D room viewport"
        >
          {!webgl ? (
            <Fallback
              title="3D isn't available on this device"
              body="Your browser or device doesn't support WebGL, which the 3D room needs. You can still visualise materials on a photo of your own room."
            />
          ) : (
            <ErrorBoundary
              fallback={(err, reset) => (
                <div className="absolute inset-0">
                  <Fallback title="The 3D room couldn't start" body={`Something went wrong while rendering (${err.message}). Please refresh, or try the photo visualizer.`} />
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                    <Button variant="outline" size="sm" onClick={reset}>
                      Try again
                    </Button>
                  </div>
                </div>
              )}
            >
              <Suspense fallback={null}>
                <Scene />
              </Suspense>
              <LoadingOverlay />
            </ErrorBoundary>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">{toolbar}</div>

          <AnimatePresence>
            {selected && (
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-[68px] left-1/2 z-10 -translate-x-1/2 bg-charcoal px-4 py-2 text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-ivory uppercase shadow-lg"
              >
                <span className="text-gold">Selected:</span> {surfaceById[selected].label}
                <button className="ml-3 text-ivory/60 hover:text-ivory" onClick={() => select(null)} aria-label="Clear selection">
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="pointer-events-none absolute bottom-3 left-3 z-10 hidden bg-ivory/80 px-3 py-1.5 text-[11px] text-muted backdrop-blur md:block">
            Drag to orbit · Scroll to zoom · Right-drag to pan · Click a surface to select it
          </p>
          {pseudoFull && (
            <button onClick={() => setFullscreen(false)} className="absolute top-3 right-3 z-20 bg-charcoal px-3 py-2 text-xs text-ivory">
              Exit fullscreen
            </button>
          )}
        </section>

        {/* RIGHT: design summary (desktop) */}
        <aside className="hidden w-[340px] shrink-0 border-l border-line bg-ivory lg:block" aria-label="Design summary">
          <SummaryPanel onWhatsApp={() => openEnquiry('design')} onQuote={() => openEnquiry('quotation')} onSave={openSave} onShare={openShare} />
        </aside>
      </div>

      {/* MOBILE: bottom drawer */}
      <div className="border-t border-line bg-ivory lg:hidden">
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <div className="flex gap-1">
            {(['materials', 'design'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDrawer(drawer === t ? null : t)}
                className={`px-3 py-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase ${drawer === t ? 'bg-charcoal text-ivory' : 'text-muted'}`}
                aria-expanded={drawer === t}
              >
                {t === 'materials' ? 'Materials' : 'My design'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => openEnquiry('design')} className="inline-flex h-9 items-center gap-1.5 bg-[#1f9e55] px-3 text-[10px] font-semibold tracking-[0.12em] text-white uppercase">
              <WhatsAppGlyph size={15} /> Enquire
            </button>
            <IconButton icon={drawer ? 'chevronDown' : 'chevronUp'} label={drawer ? 'Collapse panel' : 'Expand panel'} onClick={() => setDrawer(drawer ? null : 'materials')} />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {drawer && (
            <motion.div
              key={drawer}
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {drawer === 'materials' ? (
                <div className="px-4 pt-3 pb-4">
                  <MaterialPanel layout="strip" />
                </div>
              ) : (
                <div className="h-[46dvh]">
                  <SummaryPanel onWhatsApp={() => openEnquiry('design')} onQuote={() => openEnquiry('quotation')} onSave={openSave} onShare={openShare} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} />
      <SaveDialog open={saveOpen} onClose={() => setSaveOpen(false)} defaultName={designName} preview={preview} existing={!!designId} onSave={doSave} />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        note="Anyone with this link will see this room with the same materials. The link contains only material choices, no personal data. Saved designs stay private on this device."
        onDownload={screenshot}
      />
      <EnquiryDialog
        open={enquiry !== null}
        onClose={() => setEnquiry(null)}
        kind={enquiry ?? 'design'}
        design={{ designType: '3D Room Visualizer', items, shareUrl: shareUrl ?? undefined }}
        previewDataUrl={preview}
      />
      <span className="sr-only" aria-live="polite">
        {selected ? `${surfaceById[selected].label} selected` : ''}
      </span>
      <Link to="/visualizer" className="sr-only">
        Back to visualizer options
      </Link>
    </main>
  );
}
