import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDesign } from '../../store/designStore';
import { SURFACES } from '../surfaces';
import { getProduct } from '../../data/products';
import { categoryById } from '../../data/categories';
import { MaterialSwatch } from '../../components/ui/MaterialSwatch';
import { Button } from '../../components/ui/Button';
import { Icon, WhatsAppGlyph } from '../../components/ui/Icon';

interface Props {
  onWhatsApp: () => void;
  onQuote: () => void;
  onSave: () => void;
  onShare: () => void;
}

export function SummaryPanel({ onWhatsApp, onQuote, onSave, onShare }: Props) {
  const surfaces = useDesign((s) => s.surfaces);
  const selected = useDesign((s) => s.selected);
  const select = useDesign((s) => s.select);
  const update = useDesign((s) => s.update);
  const beginGesture = useDesign((s) => s.beginGesture);
  const endGesture = useDesign((s) => s.endGesture);
  const designName = useDesign((s) => s.designName);
  const setDesignMeta = useDesign((s) => s.setDesignMeta);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-5">
        <p className="label-lux">Your design</p>
        <input
          value={designName}
          onChange={(e) => setDesignMeta({ name: e.target.value })}
          className="w-full border-0 border-b border-transparent bg-transparent p-0 font-serif text-2xl hover:border-line focus:border-gold focus:outline-none"
          aria-label="Design name"
        />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {(['Walls', 'Floors', 'Soft furnishings'] as const).map((group) => (
          <div key={group} className="border-b border-line px-5 py-4">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-taupe uppercase">{group}</p>
            <ul className="space-y-1">
              {SURFACES.filter((s) => s.group === group).map((s) => {
                const st = surfaces[s.id];
                const p = getProduct(st.productId)!;
                const isSel = selected === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => select(isSel ? null : s.id)}
                      className={`flex w-full items-center gap-3 px-2 py-2 text-left transition-colors ${isSel ? 'bg-cream' : 'hover:bg-cream/60'}`}
                      aria-expanded={isSel}
                    >
                      <MaterialSwatch product={p} size={128} className={`h-10 w-10 shrink-0 ${isSel ? 'ring-2 ring-gold' : ''}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] tracking-wide text-muted">{s.label}</span>
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                      </span>
                      <Icon name={isSel ? 'chevronUp' : 'chevronDown'} size={14} className="text-taupe" />
                    </button>
                    <AnimatePresence initial={false}>
                      {isSel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 px-2 pt-2 pb-3">
                            <p className="text-xs text-muted">
                              {categoryById[p.category].singular} · {p.collection}
                            </p>
                            <label className="block">
                              <span className="flex justify-between text-[11px] text-muted">
                                <span>Pattern scale</span>
                                <span>{Math.round(st.scale * 100)}%</span>
                              </span>
                              <input
                                type="range"
                                min={0.5}
                                max={2}
                                step={0.05}
                                value={st.scale}
                                onPointerDown={beginGesture}
                                onPointerUp={endGesture}
                                onKeyUp={endGesture}
                                onKeyDown={beginGesture}
                                onChange={(e) => update(s.id, { scale: Number(e.target.value) }, { history: false })}
                                className="range-lux mt-2"
                              />
                            </label>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => update(s.id, { rotation: st.rotation === 90 ? 0 : 90 })}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase hover:text-gold-dark"
                              >
                                <Icon name="rotate" size={14} /> Rotate 90°
                              </button>
                              <Link to={`/product/${p.id}`} className="text-[11px] font-semibold tracking-[0.12em] text-gold-dark uppercase">
                                <span className="link-underline">Product</span>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-line bg-ivory p-5">
        <Button variant="whatsapp" className="w-full" onClick={onWhatsApp}>
          <WhatsAppGlyph size={17} /> Get this design on WhatsApp
        </Button>
        <Button variant="primary" className="w-full" onClick={onQuote} iconLeft="quote">
          Get a quotation
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onSave} iconLeft="save">
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={onShare} iconLeft="link">
            Share link
          </Button>
        </div>
      </div>
    </div>
  );
}
