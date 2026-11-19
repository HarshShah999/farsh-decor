import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePhoto, type Tool } from '../photo/store';
import { PhotoUpload } from '../photo/PhotoUpload';
import { PhotoEditor } from '../photo/PhotoEditor';
import { RegionPanel } from '../photo/RegionPanel';
import { Button, IconButton } from '../components/ui/Button';
import { Icon, WhatsAppGlyph, type IconName } from '../components/ui/Icon';
import { EnquiryDialog } from '../components/enquiry/EnquiryDialog';
import { SaveDialog, ShareDialog } from '../components/designs/SaveShareDialogs';
import { getProduct } from '../data/products';
import { getDesign, newId, saveDesign } from '../lib/designStorage';
import { downloadBlob, makePreview, shareImage, stamp } from '../lib/imageUtils';
import { toast } from '../store/toastStore';
import { siteConfig } from '../config/site';
import { Page } from '../components/ui/Reveal';

const tools: { id: Tool; icon: IconName; label: string }[] = [
  { id: 'select', icon: 'pointer', label: 'Select & edit (V)' },
  { id: 'draw', icon: 'polygon', label: 'Draw surface (P)' },
  { id: 'wand', icon: 'wand', label: 'Smart select, beta (W)' },
  { id: 'pan', icon: 'hand', label: 'Pan (H or hold Space)' },
];

/** Composite canvas → branded JPEG blob. */
async function exportImage(canvas: HTMLCanvasElement, caption: string): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);
  const s = Math.max(1, c.width / 1400);
  const g = ctx.createLinearGradient(0, c.height - 90 * s, 0, c.height);
  g.addColorStop(0, 'rgba(37,37,34,0)');
  g.addColorStop(1, 'rgba(37,37,34,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, c.height - 90 * s, c.width, 90 * s);
  ctx.fillStyle = '#f8f6f1';
  ctx.font = `500 ${20 * s}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillText(siteConfig.fullName.toUpperCase(), 24 * s, c.height - 22 * s);
  ctx.font = `500 ${12 * s}px "Manrope Variable", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(caption, c.width - 24 * s, c.height - 24 * s);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/jpeg', 0.92));
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });

export default function PhotoVisualizerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const image = usePhoto((s) => s.image);
  const regions = usePhoto((s) => s.regions);
  const tool = usePhoto((s) => s.tool);
  const canUndo = usePhoto((s) => s.past.length > 0 || s.draft.length > 0);
  const canRedo = usePhoto((s) => s.future.length > 0);
  const wandTolerance = usePhoto((s) => s.wandTolerance);
  const designId = usePhoto((s) => s.designId);
  const designName = usePhoto((s) => s.designName);
  const pending = usePhoto((s) => s.pendingMaterial);
  const st = usePhoto.getState;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<ImageData | null>(null);
  const [compare, setCompare] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Photo Visualizer | ${siteConfig.fullName}`;
  }, []);

  // switching between the upload step and the editor starts at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [!!image]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL params: ?design=<saved id>, ?material=<product id>
  useEffect(() => {
    const id = params.get('design');
    const material = params.get('material');
    if (material && getProduct(material)) {
      st().setPendingMaterial(material);
      toast(`Outline a surface to try ${getProduct(material)!.name}`);
    }
    if (id) {
      getDesign(id)
        .then((d) => {
          if (d?.type === 'photo') {
            st().load(
              { url: URL.createObjectURL(d.data.image), blob: d.data.image, width: d.data.width, height: d.data.height },
              d.data.regions,
              { id: d.id, name: d.name },
            );
            toast(`Opened “${d.name}”`, 'success');
          } else toast('Saved design not found on this device', 'error');
        })
        .catch(() => toast('Saved designs are unavailable in this browser', 'error'));
    }
    if (id || material) navigate('/visualizer/photo', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[role="dialog"]') || !st().image) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z' && !e.shiftKey) {
        e.preventDefault();
        st().undo();
      } else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) {
        e.preventDefault();
        st().redo();
      } else if (e.key === 'Enter') st().closeDraft();
      else if (e.key === 'Escape') {
        if (st().draft.length) st().cancelDraft();
        else st().select(null);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const s = st();
        if (s.draft.length) s.popDraftPoint();
        else if (s.selectedId) {
          const r = s.regions.find((x) => x.id === s.selectedId);
          if (r && s.activeVertex !== null && r.points.length > 3) {
            s.updateRegion(r.id, { points: r.points.filter((_, i) => i !== s.activeVertex) });
            s.select(r.id, null);
          } else s.deleteRegion(s.selectedId);
        }
        e.preventDefault();
      } else if (!mod && k === 'v') st().setTool('select');
      else if (!mod && k === 'p') st().setTool('draw');
      else if (!mod && k === 'w') st().setTool('wand');
      else if (!mod && k === 'h') st().setTool('pan');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st]);

  const items = regions
    .filter((r) => r.productId && r.visible)
    .map((r) => ({ label: r.name, product: getProduct(r.productId)! }));

  const caption = items.map((i) => i.product.name).slice(0, 4).join(' · ');

  const getBlob = async () => {
    if (!canvasRef.current) throw new Error('Nothing to export yet');
    return exportImage(canvasRef.current, caption);
  };

  const saveImage = async () => {
    try {
      downloadBlob(await getBlob(), `farsh-my-room-${stamp()}.jpg`);
      toast('Image downloaded', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const share = async () => {
    try {
      const blob = await getBlob();
      const text = `My room design with ${siteConfig.fullName}${items.length ? `: ${items.map((i) => i.product.name).join(', ')}` : ''}`;
      const ok = await shareImage(blob, 'farsh-design.jpg', text);
      if (!ok) setShareOpen(true);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const openEnquiry = async () => {
    try {
      setPreview(await blobToDataUrl(await getBlob()));
    } catch {
      setPreview(null);
    }
    setEnquiryOpen(true);
  };

  const openSave = async () => {
    if (!canvasRef.current) return;
    setPreview(await makePreview(canvasRef.current, 640));
    setSaveOpen(true);
  };

  const doSave = async (name: string, asNew: boolean) => {
    const s = st();
    if (!s.image) return;
    const now = Date.now();
    const id = asNew || !s.designId ? newId() : s.designId;
    await saveDesign({
      id,
      name,
      type: 'photo',
      roomType: 'My photo',
      materialIds: [...new Set(s.regions.map((r) => r.productId).filter((x): x is string => !!x))],
      preview: preview ?? '',
      createdAt: now,
      updatedAt: now,
      data: { image: s.image.blob, width: s.image.width, height: s.image.height, regions: s.regions },
    });
    s.setMeta({ id, name });
  };

  if (!image) {
    return (
      <Page className="pt-32 pb-24 md:pt-40">
        <div className="container-lux">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="eyebrow mb-4">Photo visualizer</p>
            <h1 className="text-5xl leading-[1.02] sm:text-7xl">
              Imagine It in <span className="italic">Your Own Space.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-muted">
              Upload a photograph of your room and experiment with different materials before making your decision.
            </p>
            {pending && getProduct(pending) && (
              <p className="mt-5 inline-flex items-center gap-2 border border-gold/40 bg-white px-3 py-1.5 text-xs text-gold-dark">
                <Icon name="sparkle" size={14} /> Ready to try: {getProduct(pending)!.name}
              </p>
            )}
          </div>
          <PhotoUpload onReady={(img) => st().setImage(img)} />
        </div>
      </Page>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-ivory pt-[62px] lg:h-[100dvh]">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <IconButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={tool === t.id && !compare}
              onClick={() => {
                setCompare(false);
                st().setTool(t.id);
              }}
            />
          ))}
          <AnimatePresence>
            {tool === 'wand' && !compare && (
              <motion.label
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-2 hidden items-center gap-2 overflow-hidden text-[11px] whitespace-nowrap text-muted sm:flex"
              >
                Tolerance
                <input
                  type="range"
                  min={8}
                  max={70}
                  value={wandTolerance}
                  onChange={(e) => st().setWandTolerance(Number(e.target.value))}
                  className="range-lux w-24"
                />
              </motion.label>
            )}
          </AnimatePresence>
          <span className="mx-1 h-6 w-px bg-line" />
          <IconButton icon="undo" label="Undo (Ctrl+Z)" onClick={() => st().undo()} disabled={!canUndo} />
          <IconButton icon="redo" label="Redo (Ctrl+Y)" onClick={() => st().redo()} disabled={!canRedo} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={compare ? 'primary' : 'outline'}
            size="sm"
            iconLeft="compare"
            onClick={() => {
              setCompare((c) => !c);
              st().cancelDraft();
            }}
          >
            Before / After
          </Button>
          <IconButton
            icon="reset"
            label="Reset all surfaces"
            onClick={() => {
              if (regions.length && window.confirm('Remove all surfaces and materials? You can undo this.')) st().clearRegions();
            }}
          />
          <IconButton
            icon="image"
            label="Change photo"
            onClick={() => {
              if (!regions.length || window.confirm('Start again with a different photo? Unsaved changes will be lost.')) st().setImage(null);
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative h-[58dvh] min-w-0 flex-none lg:h-auto lg:flex-1" aria-label="Photo editor">
          <PhotoEditor compare={compare} canvasRef={canvasRef} baseImageRef={baseImageRef} />
        </section>
        <aside className="flex w-full shrink-0 flex-col border-t border-line bg-ivory lg:w-[370px] lg:border-t-0 lg:border-l" aria-label="Surfaces and materials">
          <div className="border-b border-line px-5 py-4">
            <p className="label-lux">Your design</p>
            <input
              value={designName}
              onChange={(e) => st().setMeta({ name: e.target.value })}
              className="w-full border-0 border-b border-transparent bg-transparent p-0 font-serif text-2xl hover:border-line focus:border-gold focus:outline-none"
              aria-label="Design name"
            />
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
            <RegionPanel />
          </div>
          <div className="space-y-2 border-t border-line p-5">
            <Button variant="whatsapp" className="w-full" onClick={openEnquiry} disabled={!items.length}>
              <WhatsAppGlyph size={17} /> Get this design on WhatsApp
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={openSave} iconLeft="save">
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={saveImage} iconLeft="download">
                Image
              </Button>
              <Button variant="outline" size="sm" onClick={share} iconLeft="share">
                Share
              </Button>
            </div>
            <p className="pt-1 text-[11px] leading-relaxed text-taupe">
              A photo-based preview. Colours and scale are approximate; please confirm with physical samples.
            </p>
          </div>
        </aside>
      </div>

      <SaveDialog open={saveOpen} onClose={() => setSaveOpen(false)} defaultName={designName} preview={preview} existing={!!designId} onSave={doSave} />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={null}
        note="Your browser can't share images directly. Download the image and send it from your gallery, or use “Get this design on WhatsApp”. Photo designs contain your own photograph, so they're kept on this device and not published as a public link."
        onDownload={saveImage}
      />
      <EnquiryDialog
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        kind="design"
        design={{ designType: 'Photo Visualizer', items }}
        previewDataUrl={preview}
      />
    </main>
  );
}
