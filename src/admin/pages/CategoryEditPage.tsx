import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { removeStoredFiles, slugify, uniqueId, uploadImage, useAdminCatalog } from '../store';
import { preparePhoto } from '../images';
import { Alert, Badge, Card, ConfirmDialog, Field, ImagePicker, PageHeader, Toggle, confirmLeave, useUnsavedWarning, type PendingImage } from '../ui';
import { Button, LinkButton } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../store/toastStore';
import { PLACEMENTS, type Category, type Placement } from '../../types/catalog';

interface Form {
  name: string;
  slug: string;
  singular: string;
  tagline: string;
  description: string;
  visualizerLabel: string;
  placements: Placement[];
  published: boolean;
}

const empty: Form = { name: '', slug: '', singular: '', tagline: '', description: '', visualizerLabel: '', placements: [], published: true };

export default function CategoryEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { categories, products, saveCategory, deleteCategory } = useAdminCatalog();
  const existing = id ? categories.find((c) => c.id === id) : undefined;

  const initial: Form = useMemo(
    () =>
      existing
        ? {
            name: existing.name,
            slug: existing.slug,
            singular: existing.singular,
            tagline: existing.tagline,
            description: existing.description,
            visualizerLabel: existing.visualizerLabel,
            placements: [...existing.placements],
            published: existing.published ?? true,
          }
        : empty,
    [existing?.id, existing?.updatedAt], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [form, setForm] = useState<Form>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [image, setImage] = useState(existing?.image ?? '');
  const [pending, setPending] = useState<PendingImage | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(initial);
    setImage(existing?.image ?? '');
    setPending(null);
    setSlugTouched(!isNew);
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || !!pending || image !== (existing?.image ?? '');
  useUnsavedWarning(dirty && !saving);

  const productCount = existing ? products.filter((p) => p.category === existing.id).length : 0;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Please enter a name.';
    const slug = form.slug.trim();
    if (!slug) e.slug = 'Please enter a web address.';
    else if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) e.slug = 'Use only lowercase letters, numbers and dashes, e.g. wall-panels.';
    else if (categories.some((c) => c.slug === slug && c.id !== existing?.id)) e.slug = 'Another category already uses this web address.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    setSaveError(null);
    if (!validate()) return toast('Please check the highlighted fields', 'error');
    setSaving(true);
    try {
      const cid = existing?.id ?? uniqueId(form.slug.trim(), categories.map((c) => c.id));
      const img = pending ? await uploadImage(`categories/${cid}`, pending.prepared) : image;
      const cat: Category = {
        id: cid,
        slug: form.slug.trim(),
        name: form.name.trim(),
        singular: form.singular.trim() || form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        image: img,
        visualizerLabel: form.visualizerLabel.trim() || form.name.trim(),
        placements: PLACEMENTS.map((p) => p.id).filter((p) => form.placements.includes(p)),
        published: form.published,
        sortOrder: existing?.sortOrder,
      };
      const saved = await saveCategory(cat, isNew);
      if (existing && existing.image !== saved.image) await removeStoredFiles([existing.image]);
      setPending(null);
      toast(isNew ? `Category “${saved.name}” created` : 'Changes saved', 'success');
      if (isNew) navigate(`/admin/categories/${saved.id}`, { replace: true });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await deleteCategory(existing.id);
      toast(`Category “${existing.name}” deleted`, 'success');
      navigate('/admin/categories', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete', 'error');
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  if (id && !existing)
    return (
      <div className="space-y-4">
        <Alert>This category was not found. It may have been deleted.</Alert>
        <Link to="/admin/categories" className="text-sm underline">
          Back to categories
        </Link>
      </div>
    );

  return (
    <div className="pb-28">
      <Link to="/admin/categories" onClick={confirmLeave} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-charcoal">
        <Icon name="arrowLeft" size={16} /> All categories
      </Link>
      <PageHeader
        title={isNew ? 'New category' : existing!.name}
        subtitle={
          isNew ? (
            'Fields marked * are required. You can add products to the category after saving.'
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              {existing!.published ? <Badge tone="live">On website</Badge> : <Badge tone="hidden">Hidden</Badge>}
              <span>
                {productCount} product{productCount === 1 ? '' : 's'}
              </span>
              {existing!.published && (
                <a href={`/collections/${existing!.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
                  View on website <Icon name="arrowUpRight" size={14} />
                </a>
              )}
            </span>
          )
        }
        actions={
          !isNew && (
            <>
              <LinkButton to={`/admin/products/new?category=${existing!.id}`} variant="outline" iconLeft="plus">
                Add product
              </LinkButton>
              <Button variant="ghost" iconLeft="trash" className="!text-red-700" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          )
        }
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <Toggle
            checked={form.published}
            onChange={(v) => set('published', v)}
            label={form.published ? 'Visible on the website' : 'Hidden from the website'}
            description="When hidden, this category and all its products are not shown on the website."
          />
        </Card>

        <Card title="Basic information">
          <Field label="Name" required error={errors.name} hint="Shown in menus and headings, e.g. “Wall Panels & Cladding”.">
            {(p) => (
              <input
                {...p}
                value={form.name}
                maxLength={120}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
                  setErrors((er) => ({ ...er, name: '', slug: '' }));
                }}
              />
            )}
          </Field>
          <Field
            label="Web address"
            required
            error={errors.slug}
            hint={
              <>
                The page will be at <span className="font-mono text-charcoal">/collections/{form.slug || '…'}</span>
                {!isNew && ' · Changing this breaks links people have saved.'}
              </>
            }
          >
            {(p) => (
              <input
                {...p}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name for one item" hint="e.g. “Wall panel” for Wall Panels. Used in product details.">
              {(p) => <input {...p} value={form.singular} onChange={(e) => set('singular', e.target.value)} />}
            </Field>
            <Field label="Tagline" hint="A short line under the name, e.g. “Warmth underfoot”.">
              {(p) => <input {...p} value={form.tagline} maxLength={80} onChange={(e) => set('tagline', e.target.value)} />}
            </Field>
          </div>
          <Field label="Description" hint="One or two sentences shown on the category page and cards.">
            {(p) => <textarea {...p} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />}
          </Field>
        </Card>

        <Card title="Cover photo" description="A wide room photo showing these materials in use. Landscape photos work best.">
          <ImagePicker
            label="Category photo"
            value={image || undefined}
            pending={pending}
            prepare={(f) => preparePhoto(f, 1800)}
            onPick={setPending}
            onRemove={() => {
              setPending(null);
              setImage('');
            }}
            aspect="aspect-[16/10] sm:max-w-md"
          />
        </Card>

        <Card
          title="Room visualizers"
          description="Where can customers try these materials in the 3D room and photo visualizers? Leave all unticked if the visualizers don’t apply (e.g. accessories)."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {PLACEMENTS.map((pl) => {
              const on = form.placements.includes(pl.id);
              return (
                <label key={pl.id} className={`flex cursor-pointer gap-3 border p-3 ${on ? 'border-charcoal bg-ivory' : 'border-line'}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => set('placements', on ? form.placements.filter((x) => x !== pl.id) : [...form.placements, pl.id])}
                    className="mt-1 h-4 w-4 accent-charcoal"
                  />
                  <span>
                    <span className="block text-sm font-medium">{pl.label}</span>
                    <span className="block text-[13px] text-muted">{pl.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {form.placements.length > 0 && (
            <Field label="Label in the visualizer" hint="Short tab name in the 3D visualizer’s material panel.">
              {(p) => (
                <input {...p} value={form.visualizerLabel} placeholder={form.name} maxLength={30} onChange={(e) => set('visualizerLabel', e.target.value)} className={`${p.className} max-w-xs`} />
              )}
            </Field>
          )}
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1136px] flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-8">
          {saveError && <p className="mr-auto text-sm text-red-700">{saveError}</p>}
          {!saveError && dirty && <p className="mr-auto text-sm text-muted">You have unsaved changes</p>}
          <Button variant="ghost" onClick={() => navigate('/admin/categories')} disabled={saving}>
            {dirty ? 'Cancel' : 'Back'}
          </Button>
          <Button onClick={save} disabled={saving || (!dirty && !isNew)} iconLeft={saving ? undefined : 'check'}>
            {saving ? 'Saving…' : isNew ? 'Create category' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={productCount ? 'This category still has products' : 'Delete this category?'}
        confirmLabel={productCount ? 'Show its products' : 'Delete permanently'}
        danger={!productCount}
        busy={saving}
        onConfirm={() => (productCount ? navigate(`/admin/products?category=${existing!.id}`) : doDelete())}
        onClose={() => setConfirmDelete(false)}
      >
        {productCount ? (
          <p>
            <strong>{existing?.name}</strong> has {productCount} product{productCount === 1 ? '' : 's'}. Move them to another category or delete them
            first. If you just want it off the website, switch off “Visible on the website” instead.
          </p>
        ) : (
          <p>
            <strong>{existing?.name}</strong> will be removed from the website. <strong>This cannot be undone.</strong>
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
