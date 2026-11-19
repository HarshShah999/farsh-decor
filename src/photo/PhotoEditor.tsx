import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { usePhoto } from './store';
import type { PhotoRegion, Pt } from './types';
import { apply as applyH, squareToQuad } from './homography';
import { magicWand } from './magicWand';
import { usePhotoRenderer } from './usePhotoRenderer';
import { Icon } from '../components/ui/Icon';
import { toast } from '../store/toastStore';

type Drag =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'vertex'; id: string; index: number }
  | { kind: 'region'; id: string; last: Pt }
  | { kind: 'persp'; id: string; index: number }
  | { kind: 'split' }
  | null;

interface View {
  s: number;
  x: number;
  y: number;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const ptsAttr = (pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

export function PhotoEditor({
  compare,
  canvasRef,
  baseImageRef,
}: {
  compare: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  baseImageRef: RefObject<ImageData | null>;
}) {
  const image = usePhoto((s) => s.image)!;
  const regions = usePhoto((s) => s.regions);
  const selectedId = usePhoto((s) => s.selectedId);
  const activeVertex = usePhoto((s) => s.activeVertex);
  const tool = usePhoto((s) => s.tool);
  const draft = usePhoto((s) => s.draft);
  const st = usePhoto.getState;

  const { ready, pendingTextures } = usePhotoRenderer(canvasRef);

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [split, setSplit] = useState(50);
  const drag = useRef<Drag>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; cx: number; cy: number; v: View } | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const space = useRef(false);

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return; // not laid out yet; ResizeObserver will call again
    const s = Math.min(r.width / image.width, r.height / image.height) * 0.96;
    setView({ s, x: (r.width - image.width * s) / 2, y: (r.height - image.height * s) / 2 });
  }, [image]);

  useLayoutEffect(() => {
    fit();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // keep a copy of the decoded base image for the magic wand
  useEffect(() => {
    if (!ready) return;
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, image.width, image.height);
      baseImageRef.current = ctx.getImageData(0, 0, image.width, image.height);
    };
    img.src = image.url;
  }, [ready, image, baseImageRef]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = containerRef.current!;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setView((v) => {
      const s = Math.min(12, Math.max(0.05, v.s * factor));
      const k = s / v.s;
      return { s, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('input,textarea,select')) space.current = true;
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') space.current = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [zoomAt]);

  const toImage = (clientX: number, clientY: number): Pt => {
    const r = containerRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - r.left - v.x) / v.s, y: (clientY - r.top - v.y) / v.s };
  };
  const clampPt = (p: Pt): Pt => ({ x: Math.min(image.width, Math.max(0, p.x)), y: Math.min(image.height, Math.max(0, p.y)) });

  /* ------------------------------ pointer handling ------------------------------ */

  const onPointerDown = (e: React.PointerEvent) => {
    containerRef.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt.current = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = containerRef.current!.getBoundingClientRect();
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, v: viewRef.current };
      if (drag.current && drag.current.kind !== 'pan' && drag.current.kind !== 'split') st().endGesture();
      drag.current = null;
      return;
    }
    if (drag.current) return; // a handle already claimed this pointer
    if (tool === 'pan' || e.button === 1 || space.current) {
      const v = viewRef.current;
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y };
    } else if (compare) {
      drag.current = { kind: 'split' };
      updateSplit(e.clientX);
    }
  };

  const updateSplit = (clientX: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    setSplit(Math.min(100, Math.max(0, ((clientX - r.left - v.x) / (image.width * v.s)) * 100)));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const r = containerRef.current!.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2 - r.left;
      const cy = (a.y + b.y) / 2 - r.top;
      const p0 = pinch.current;
      const s = Math.min(12, Math.max(0.05, (p0.v.s * d) / p0.d));
      // keep the image point under the initial centre under the current centre
      const ix = (p0.cx - p0.v.x) / p0.v.s;
      const iy = (p0.cy - p0.v.y) / p0.v.s;
      setView({ s, x: cx - ix * s, y: cy - iy * s });
      return;
    }
    const d = drag.current;
    if (tool === 'draw' && !d) setCursor(toImage(e.clientX, e.clientY));
    if (!d) return;
    const p = clampPt(toImage(e.clientX, e.clientY));
    const region = d.kind === 'vertex' || d.kind === 'region' || d.kind === 'persp' ? st().regions.find((r) => r.id === d.id) : null;
    switch (d.kind) {
      case 'pan':
        setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
        break;
      case 'split':
        updateSplit(e.clientX);
        break;
      case 'vertex':
        if (region) st().updateRegion(d.id, { points: region.points.map((q, i) => (i === d.index ? p : q)) }, { history: false });
        break;
      case 'persp':
        if (region?.perspective)
          st().updateRegion(
            d.id,
            { perspective: region.perspective.map((q, i) => (i === d.index ? p : q)) as PhotoRegion['perspective'] },
            { history: false },
          );
        break;
      case 'region': {
        if (!region) break;
        const raw = toImage(e.clientX, e.clientY);
        const dx = raw.x - d.last.x;
        const dy = raw.y - d.last.y;
        d.last = raw;
        const mv = (q: Pt) => ({ x: q.x + dx, y: q.y + dy });
        st().updateRegion(
          d.id,
          { points: region.points.map(mv), perspective: region.perspective ? (region.perspective.map(mv) as PhotoRegion['perspective']) : null },
          { history: false },
        );
        break;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (d && (d.kind === 'vertex' || d.kind === 'region' || d.kind === 'persp')) {
      st().endGesture();
      return;
    }
    const start = downAt.current;
    downAt.current = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5 || d?.kind === 'pan' || compare) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const p = toImage(e.clientX, e.clientY);
    if (p.x < 0 || p.y < 0 || p.x > image.width || p.y > image.height) return;
    if (tool === 'draw') {
      const cur = st().draft;
      if (cur.length >= 3 && dist(p, cur[0]) * viewRef.current.s < 14) st().closeDraft();
      else st().addDraftPoint(clampPt(p));
    } else if (tool === 'wand') {
      const base = baseImageRef.current;
      if (!base) return;
      const poly = magicWand(base, p, st().wandTolerance);
      if (poly && poly.length >= 3) {
        st().addRegion(poly);
        toast('Surface detected. Refine the points if needed.', 'success');
      } else toast('No clear surface found there. Try another spot or adjust the tolerance.', 'error');
    } else if (tool === 'select') {
      st().select(null);
    }
  };

  /* --------------------------------- overlays --------------------------------- */

  const hs = 1 / Math.max(view.s, 0.01); // one screen pixel in image units
  const selected = regions.find((r) => r.id === selectedId) ?? null;

  const perspGrid = useMemo(() => {
    if (!selected?.perspective) return null;
    const H = squareToQuad(selected.perspective);
    const lines: [Pt, Pt][] = [];
    const o1 = { x: 0, y: 0 };
    const o2 = { x: 0, y: 0 };
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      applyH(H, t, 0, o1);
      applyH(H, t, 1, o2);
      lines.push([{ ...o1 }, { ...o2 }]);
      applyH(H, 0, t, o1);
      applyH(H, 1, t, o2);
      lines.push([{ ...o1 }, { ...o2 }]);
    }
    return lines;
  }, [selected?.perspective]);

  const startHandle = (e: React.PointerEvent, next: Drag, regionId: string, vertex: number | null = null) => {
    if (tool !== 'select' || compare || e.button === 1 || space.current) return;
    st().select(regionId, vertex);
    st().beginGesture();
    drag.current = next;
  };

  const cursorCls =
    compare ? 'cursor-ew-resize' : tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : tool === 'draw' ? 'cursor-crosshair' : tool === 'wand' ? 'cursor-cell' : 'cursor-default';

  return (
    <div
      ref={containerRef}
      className={`checker relative h-full w-full touch-none overflow-hidden select-none ${cursorCls}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setCursor(null)}
      onDoubleClick={() => {
        if (tool === 'draw' && st().draft.length >= 4) {
          st().popDraftPoint();
          st().closeDraft();
        }
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]"
        style={{ width: image.width, height: image.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
        {!ready && <img src={image.url} alt="" className="absolute inset-0 h-full w-full" />}

        {compare && (
          <>
            <img
              src={image.url}
              alt="Original photo"
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%`, width: 2 * hs, marginLeft: -hs, background: '#f8f6f1' }} />
            <div
              className="pointer-events-none absolute flex items-center justify-center rounded-full bg-ivory text-charcoal shadow-lg"
              style={{ left: `${split}%`, top: '50%', width: 44 * hs, height: 44 * hs, marginLeft: -22 * hs, marginTop: -22 * hs }}
            >
              <svg viewBox="0 0 24 24" width={22 * hs} height={22 * hs} fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
              </svg>
            </div>
            <span
              className="pointer-events-none absolute bg-charcoal/80 font-semibold tracking-[0.18em] text-ivory uppercase"
              style={{ left: 12 * hs, top: 12 * hs, fontSize: 10 * hs, padding: `${4 * hs}px ${8 * hs}px` }}
            >
              Before
            </span>
            <span
              className="pointer-events-none absolute bg-gold/90 font-semibold tracking-[0.18em] text-white uppercase"
              style={{ right: 12 * hs, top: 12 * hs, fontSize: 10 * hs, padding: `${4 * hs}px ${8 * hs}px` }}
            >
              After
            </span>
          </>
        )}

        {!compare && (
          <svg className="absolute inset-0 overflow-visible" width={image.width} height={image.height} viewBox={`0 0 ${image.width} ${image.height}`}>
            <defs>
              <pattern id="needs-material" width={14 * hs} height={14 * hs} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2={14 * hs} stroke="#b69a70" strokeWidth={3 * hs} strokeOpacity="0.45" />
              </pattern>
            </defs>
            {regions.map((r) => {
              const isSel = r.id === selectedId;
              return (
                <polygon
                  key={r.id}
                  points={ptsAttr(r.points)}
                  fill={!r.productId ? 'url(#needs-material)' : isSel ? 'rgba(182,154,112,0.10)' : 'transparent'}
                  stroke={isSel ? '#b69a70' : 'rgba(255,255,255,0.85)'}
                  strokeWidth={(isSel ? 2 : 1.2) * hs}
                  strokeDasharray={isSel ? undefined : `${6 * hs} ${4 * hs}`}
                  opacity={r.visible ? 1 : 0.4}
                  style={{ pointerEvents: tool === 'select' ? 'auto' : 'none', cursor: tool === 'select' ? 'move' : undefined }}
                  onPointerDown={(e) => startHandle(e, { kind: 'region', id: r.id, last: toImage(e.clientX, e.clientY) }, r.id)}
                />
              );
            })}

            {selected && tool === 'select' && (
              <g>
                {perspGrid?.map(([a, b], i) => (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#6f8fff" strokeWidth={1 * hs} strokeDasharray={`${4 * hs} ${4 * hs}`} opacity={0.8} pointerEvents="none" />
                ))}
                {selected.perspective && (
                  <polygon points={ptsAttr(selected.perspective)} fill="none" stroke="#6f8fff" strokeWidth={1.5 * hs} pointerEvents="none" />
                )}
                {/* edge midpoints: click/drag to add a point */}
                {selected.points.map((p, i) => {
                  const q = selected.points[(i + 1) % selected.points.length];
                  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
                  return (
                    <g
                      key={`m${i}`}
                      style={{ cursor: 'copy' }}
                      onPointerDown={(e) => {
                        if (tool !== 'select' || compare || e.button === 1 || space.current) return;
                        st().beginGesture();
                        const pts = [...selected.points];
                        pts.splice(i + 1, 0, m);
                        st().updateRegion(selected.id, { points: pts }, { history: false });
                        st().select(selected.id, i + 1);
                        drag.current = { kind: 'vertex', id: selected.id, index: i + 1 };
                      }}
                    >
                      <circle cx={m.x} cy={m.y} r={6 * hs} fill="rgba(37,37,34,0.55)" />
                      <path d={`M${m.x - 3 * hs} ${m.y}h${6 * hs}M${m.x} ${m.y - 3 * hs}v${6 * hs}`} stroke="#fff" strokeWidth={1.2 * hs} />
                    </g>
                  );
                })}
                {selected.points.map((p, i) => (
                  <circle
                    key={`v${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={(activeVertex === i ? 8 : 6.5) * hs}
                    fill={activeVertex === i ? '#b69a70' : '#ffffff'}
                    stroke="#252522"
                    strokeWidth={1.5 * hs}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => {
                      if (e.altKey && selected.points.length > 3) {
                        st().updateRegion(selected.id, { points: selected.points.filter((_, k) => k !== i) });
                        return;
                      }
                      startHandle(e, { kind: 'vertex', id: selected.id, index: i }, selected.id, i);
                    }}
                  />
                ))}
                {selected.perspective?.map((p, i) => (
                  <rect
                    key={`p${i}`}
                    x={p.x - 7 * hs}
                    y={p.y - 7 * hs}
                    width={14 * hs}
                    height={14 * hs}
                    transform={`rotate(45 ${p.x} ${p.y})`}
                    fill="#6f8fff"
                    stroke="#fff"
                    strokeWidth={1.5 * hs}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => startHandle(e, { kind: 'persp', id: selected.id, index: i }, selected.id)}
                  >
                    <title>Perspective guide corner</title>
                  </rect>
                ))}
              </g>
            )}

            {tool === 'draw' && draft.length > 0 && (
              <g pointerEvents="none">
                <polyline points={ptsAttr(cursor ? [...draft, cursor] : draft)} fill="rgba(182,154,112,0.12)" stroke="#b69a70" strokeWidth={2 * hs} />
                {draft.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={(i === 0 && draft.length >= 3 ? 9 : 5) * hs}
                    fill={i === 0 && draft.length >= 3 ? '#b69a70' : '#fff'}
                    stroke="#252522"
                    strokeWidth={1.5 * hs}
                  />
                ))}
              </g>
            )}
          </svg>
        )}
      </div>

      {/* zoom controls */}
      <div className="absolute right-3 bottom-3 flex flex-col bg-ivory/90 shadow-[var(--shadow-soft)] backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
        <button className="flex h-9 w-9 items-center justify-center hover:bg-charcoal/5" onClick={() => zoomAt(1.25)} aria-label="Zoom in">
          <Icon name="plus" size={16} />
        </button>
        <button className="flex h-9 w-9 items-center justify-center hover:bg-charcoal/5" onClick={() => zoomAt(0.8)} aria-label="Zoom out">
          <Icon name="minus" size={16} />
        </button>
        <button className="flex h-9 w-9 items-center justify-center border-t border-line text-[10px] font-semibold hover:bg-charcoal/5" onClick={fit} aria-label="Fit to screen">
          FIT
        </button>
      </div>

      {pendingTextures > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-charcoal/85 px-3 py-1.5 text-[11px] text-ivory">Loading material…</div>
      )}
      {tool === 'draw' && !compare && (
        <p className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] bg-ivory/90 px-3 py-1.5 text-[11px] text-muted backdrop-blur">
          {draft.length === 0
            ? 'Click to place the first corner of a surface'
            : draft.length < 3
              ? 'Keep clicking along the edges of the surface'
              : 'Click the first point, double-click or press Enter to close'}
        </p>
      )}
      {tool === 'wand' && !compare && (
        <p className="pointer-events-none absolute bottom-3 left-3 bg-ivory/90 px-3 py-1.5 text-[11px] text-muted backdrop-blur">
          Smart select (beta): click inside a wall, floor or sofa
        </p>
      )}
      {compare && (
        <p className="pointer-events-none absolute bottom-3 left-3 bg-ivory/90 px-3 py-1.5 text-[11px] text-muted backdrop-blur">Drag to compare before and after</p>
      )}
    </div>
  );
}
