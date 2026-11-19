import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  deleteDesign,
  duplicateDesign,
  listDesigns,
  onDesignsChanged,
  renameDesign,
  type SavedDesign,
} from '../../lib/designStorage';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { getProduct } from '../../data/products';
import { toast } from '../../store/toastStore';

export function SavedDesigns() {
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = () =>
      listDesigns()
        .then(setDesigns)
        .catch((e) => setError((e as Error).message));
    load();
    return onDesignsChanged(load);
  }, []);

  const open = (d: SavedDesign) => navigate(d.type === '3d' ? `/visualizer/3d?design=${d.id}` : `/visualizer/photo?design=${d.id}`);

  const commitRename = async (id: string) => {
    if (draft.trim()) await renameDesign(id, draft.trim());
    setEditing(null);
  };

  if (error)
    return <p className="text-sm text-muted">Saved designs are unavailable in this browser ({error}).</p>;
  if (!designs) return <div className="skeleton h-40 w-full" />;
  if (!designs.length)
    return (
      <div className="border border-dashed border-line px-6 py-14 text-center">
        <p className="font-serif text-2xl">No saved designs yet</p>
        <p className="mt-2 text-sm text-muted">Use “Save design” in either visualizer. Your designs will appear here.</p>
      </div>
    );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {designs.map((d) => (
          <motion.article
            key={d.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="group flex flex-col bg-white shadow-[var(--shadow-soft)]"
          >
            <button onClick={() => open(d)} className="relative block aspect-[4/3] overflow-hidden bg-cream" aria-label={`Open ${d.name}`}>
              <img src={d.preview} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-charcoal/85 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-ivory uppercase">
                <Icon name={d.type === '3d' ? 'cube' : 'image'} size={12} />
                {d.type === '3d' ? '3D room' : 'Photo'}
              </span>
            </button>
            <div className="flex flex-1 flex-col p-5">
              {editing === d.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitRename(d.id);
                  }}
                  className="flex gap-2"
                >
                  <input autoFocus className="input-lux !py-2" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commitRename(d.id)} aria-label="Design name" />
                </form>
              ) : (
                <h3 className="truncate font-serif text-2xl">{d.name}</h3>
              )}
              <p className="mt-1 text-xs text-muted">
                {new Date(d.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {d.materialIds.length} materials
              </p>
              <p className="mt-2 line-clamp-1 text-xs text-taupe">
                {d.materialIds
                  .map((id) => getProduct(id)?.name)
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <button onClick={() => open(d)} className="text-[11px] font-semibold tracking-[0.16em] uppercase">
                  <span className="link-underline">Reopen</span>
                </button>
                <div className="flex">
                  <IconButton
                    icon="edit"
                    label="Rename"
                    onClick={() => {
                      setDraft(d.name);
                      setEditing(d.id);
                    }}
                  />
                  <IconButton
                    icon="copy"
                    label="Duplicate"
                    onClick={async () => {
                      await duplicateDesign(d.id);
                      toast('Design duplicated', 'success');
                    }}
                  />
                  <IconButton
                    icon="trash"
                    label="Delete"
                    onClick={async () => {
                      if (window.confirm(`Delete “${d.name}”? This cannot be undone.`)) {
                        await deleteDesign(d.id);
                        toast('Design deleted');
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
