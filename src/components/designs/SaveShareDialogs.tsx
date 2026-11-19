import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { toast } from '../../store/toastStore';

export function SaveDialog({
  open,
  onClose,
  defaultName,
  preview,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  preview: string | null;
  existing: boolean;
  onSave: (name: string, asNew: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  const save = async (asNew: boolean) => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave(name.trim(), asNew);
      toast('Design saved to this device', 'success');
      onClose();
    } catch (e) {
      toast(`Could not save: ${(e as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Save design" eyebrow="Stored privately in this browser" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-5"
      >
        {preview && <img src={preview} alt="Design preview" className="aspect-[16/10] w-full object-cover" />}
        <div>
          <label className="label-lux" htmlFor="design-name">
            Design name
          </label>
          <input id="design-name" className="input-lux" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <p className="flex items-start gap-2 text-xs text-muted">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          Saved designs live on this device only. Reopen, rename, duplicate or delete them under Visualizer → My saved designs.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          {existing && (
            <Button variant="outline" onClick={() => save(true)} disabled={busy}>
              Save as new
            </Button>
          )}
          <Button type="submit" disabled={busy || !name.trim()} iconLeft="save">
            {existing ? 'Update design' : 'Save design'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ShareDialog({
  open,
  onClose,
  url,
  note,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  url: string | null;
  note: string;
  onDownload?: () => void;
}) {
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied', 'success');
    } catch {
      toast('Copy failed. Please select the link and copy it manually.', 'error');
    }
  };
  const nativeShare = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: 'My Farsh design', url });
    } catch {
      /* cancelled */
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Share design" eyebrow="Public link" size="md">
      <div className="space-y-5">
        {url ? (
          <>
            <div className="flex gap-2">
              <input readOnly value={url} className="input-lux font-mono !text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
              <Button onClick={copy} iconLeft="copy">
                Copy
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted">{note}</p>
            <div className="flex flex-wrap gap-3">
              {'share' in navigator && (
                <Button variant="outline" onClick={nativeShare} iconLeft="share">
                  Share…
                </Button>
              )}
              {onDownload && (
                <Button variant="outline" onClick={onDownload} iconLeft="download">
                  Download image
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">{note}</p>
            {onDownload && (
              <Button onClick={onDownload} iconLeft="download">
                Download image
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
