import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { removeStoredFiles, slugify, uniqueId, uploadImage, useAdminCatalog } from '../store';
import { preparePhoto, prepareTexture } from '../images';
import { Alert, Badge, Card, ConfirmDialog, Field, ImagePicker, PageHeader, Toggle, confirmLeave, useUnsavedWarning, type PendingImage } from '../ui';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ProductCard } from '../../components/catalog/ProductCard';
import { categoryDefaults } from '../../data/seedProducts';
import { availabilityLabel } from '../../data/products';
import { toast } from '../../store/toastStore';
import type { Availability, ColorFamily, MaterialProperties, Product, TextureSource } from '../../types/catalog';

type TextureMode = 'photo' | 'separate' | 'builtin';

interface Form {
  name: string;
  category: string;
  collection: string;
  description: string;
  longDescription: string;
  price: string;
  unit: string;
  availability: Availability;
  colorFamily: ColorFamily;
  tags: string;
  specs: { label: string; value: string }[];
  featured: boolean;
  published: boolean;
  textureCm: string;
  mat: MaterialProperties;
}

const COLOR_FAMILIES: { id: ColorFamily; hint: string }[] = [
  { id: 'Neutral', hint: 'beige, ivory, grey, white' },
  { id: 'Warm', hint: 'terracotta, rust, honey, wood tones' },
  { id: 'Cool', hint: 'blue, slate, silver' },
  { id: 'Green', hint: 'sage, olive, emerald' },
  { id: 'Dark', hint: 'charcoal, navy, espresso, black' },
  { id: 'Pattern', hint: 'florals, geometrics, multi-colour' },
];

const GENERIC_MAT: MaterialProperties = { roughness: 0.8, metalness: 0, bumpScale: 0.6 };

/** Sensible starting values for a new product in a category. */
function templateFor(category: string, products: Product[]) {
  const sample = products.find((p) => p.category === category);
  const def = categoryDefaults[category];
  return {
    unit: sample?.unit ?? def?.unit ?? 'per piece',
    mat: { ...(sample?.materialProperties ?? def?.mat ?? GENERIC_MAT) },
    textureScale: sample?.textureScale ?? 1,
    specLabels: Object.keys(sample?.specs ?? def?.specs ?? {}),
  };
}

function toForm(p: Product): Form {
  return {
    name: p.name,
    category: p.category,
    collection: p.collection,
    description: p.description,
    longDescription: p.longDescription,
    price: p.price != null ? String(p.price) : '',
    unit: p.unit,
    availability: p.availability,
    colorFamily: p.colorFamily,
    tags: p.tags.join(', '),
    specs: Object.entries(p.specs).map(([label, value]) => ({ label, value })),
    featured: !!p.featured,
    published: p.published ?? true,
    textureCm: String(Math.round(p.textureScale * 1000) / 10),
    mat: { ...p.materialProperties },
  };
}

function newForm(category: string, products: Product[]): Form {
  const t = templateFor(category, products);
  return {
    name: '',
    category,
    collection: '',
    description: '',
    longDescription: '',
    price: '',
    unit: t.unit,
    availability: 'in-stock',
    colorFamily: 'Neutral',
    tags: '',
    specs: t.specLabels.map((label) => ({ label, value: '' })),
    featured: false,
    published: true,
    textureCm: String(Math.round(t.textureScale * 1000) / 10),
    mat: t.mat,
  };
}

async function fileFromUrl(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('The saved product photo could not be downloaded to make a texture. Please choose the photo again.');
  const blob = await res.blob();
  return new File([blob], 'photo', { type: blob.type || 'image/jpeg' });
}

export default function ProductEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { products, categories, saveProduct, deleteProducts } = useAdminCatalog();
  const existing = id ? products.find((p) => p.id === id) : undefined;

  const initial = useMemo(() => {
    if (existing) return toForm(existing);
    const cat = params.get('category');
    return newForm(categories.find((c) => c.id === cat)?.id ?? categories[0]?.id ?? '', products);
  }, [existing?.id, existing?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const initialMode: TextureMode = existing
    ? existing.texture.kind === 'procedural'
      ? 'builtin'
      : existing.texture.fromPhoto
        ? 'photo'
        : 'separate'
    : 'photo';

  const [form, setForm] = useState<Form>(initial);
  const [mode, setMode] = useState<TextureMode>(initialMode);
  const [photo, setPhoto] = useState<string | undefined>(existing?.thumbnail);
  const [photoPending, setPhotoPending] = useState<PendingImage | null>(null);
  const [texPending, setTexPending] = useState<PendingImage | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // reset when switching between products
  useEffect(() => {
    setForm(initial);
    setMode(initialMode);
    setPhoto(existing?.thumbnail);
    setPhotoPending(null);
    setTexPending(null);
    setErrors({});
    setSaveError(null);
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) ||
    mode !== initialMode ||
    !!photoPending ||
    !!texPending ||
    photo !== existing?.thumbnail;
  useUnsavedWarning(dirty && !saving);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const setMat = (k: keyof MaterialProperties, v: number) => setForm((f) => ({ ...f, mat: { ...f.mat, [k]: v } }));

  const changeCategory = (category: string) => {
    if (!isNew) return set('category', category);
    // for a new product, refresh the starting values that depend on the category
    const t = templateFor(category, products);
    setForm((f) => ({
      ...f,
      category,
      unit: t.unit,
      mat: t.mat,
      textureCm: String(Math.round(t.textureScale * 1000) / 10),
      specs: f.specs.some((s) => s.value.trim()) ? f.specs : t.specLabels.map((label) => ({ label, value: '' })),
    }));
  };

  const collections = useMemo(() => [...new Set(products.map((p) => p.collection).filter(Boolean))].sort(), [products]);

  /* ------------------------------ derived product ----------------------------- */

  const currentTexture = (): TextureSource | null => {
    if (mode === 'builtin' && existing?.texture.kind === 'procedural') return existing.texture;
    if (mode === 'separate') {
      if (texPending) return { kind: 'image', url: texPending.previewUrl };
      if (existing?.texture.kind === 'image' && !existing.texture.fromPhoto) return existing.texture;
      return null;
    }
    // photo mode
    if (photoPending) return { kind: 'image', url: photoPending.previewUrl, fromPhoto: true };
    if (photo) return existing?.texture.kind === 'image' && existing.texture.fromPhoto && photo === existing.thumbnail ? existing.texture : { kind: 'image', url: photo, fromPhoto: true };
    return null;
  };

  const preview: Product = {
    id: existing?.id ?? 'preview',
    name: form.name || 'Product title',
    category: form.category,
    collection: form.collection || 'Collection',
    description: form.description || 'Short description appears here.',
    longDescription: form.longDescription,
    thumbnail: photoPending?.previewUrl ?? photo,
    texture: currentTexture() ?? { kind: 'procedural', generator: 'plaster', params: { base: '#e7e1d5', amount: 0.3 } },
    price: form.price.trim() ? Number(form.price) : undefined,
    unit: form.unit,
    availability: form.availability,
    textureScale: Math.max(0.01, Number(form.textureCm) / 100 || 1),
    textureRepeat: existing?.textureRepeat ?? [1, 1],
    materialProperties: form.mat,
    colorFamily: form.colorFamily,
    tags: [],
    specs: {},
  };

  /* --------------------------------- saving --------------------------------- */

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Please enter a title.';
    else if (form.name.trim().length > 160) e.name = 'Please keep the title under 160 characters.';
    if (!form.category) e.category = 'Please choose a category.';
    if (!form.description.trim()) e.description = 'Please write a short description (one sentence is enough).';
    if (form.price.trim() && !(Number(form.price) >= 0)) e.price = 'Enter a number, e.g. 1250, or leave empty for “Price on request”.';
    if (!(Number(form.textureCm) > 0)) e.textureCm = 'Enter a size in centimetres, e.g. 53.';
    if (mode === 'photo' && !photo && !photoPending) e.texture = 'Add a product photo, or choose a different texture option below.';
    if (mode === 'separate' && !currentTexture()) e.texture = 'Choose a texture image, or pick a different option.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setSaveError(null);
    if (!validate()) {
      toast('Please check the highlighted fields', 'error');
      setTimeout(() => document.querySelector('[aria-invalid="true"], .text-red-700')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setSaving(true);
    try {
      const pid = existing?.id ?? uniqueId(slugify(form.name), products.map((p) => p.id));

      // 1. upload new photos
      let thumbnail = photo;
      if (photoPending) thumbnail = await uploadImage(`products/${pid}`, photoPending.prepared);

      let texture: TextureSource;
      if (mode === 'builtin' && existing?.texture.kind === 'procedural') texture = existing.texture;
      else if (mode === 'separate') {
        texture = texPending
          ? { kind: 'image', url: await uploadImage(`textures/${pid}`, texPending.prepared) }
          : (existing!.texture as TextureSource);
      } else {
        const reuse = !photoPending && existing?.texture.kind === 'image' && existing.texture.fromPhoto && photo === existing.thumbnail;
        if (reuse) texture = existing!.texture;
        else {
          const file = photoPending?.file ?? (await fileFromUrl(thumbnail!));
          texture = { kind: 'image', url: await uploadImage(`textures/${pid}`, await prepareTexture(file)), fromPhoto: true };
        }
      }

      // 2. save the product
      const specs = Object.fromEntries(form.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => [s.label.trim(), s.value.trim()]));
      const product: Product = {
        id: pid,
        name: form.name.trim(),
        category: form.category,
        collection: form.collection.trim(),
        description: form.description.trim(),
        longDescription: form.longDescription.trim() || form.description.trim(),
        thumbnail: thumbnail || undefined,
        texture,
        price: form.price.trim() ? Number(form.price) : undefined,
        unit: form.unit.trim(),
        availability: form.availability,
        textureScale: Number(form.textureCm) / 100,
        textureRepeat: existing?.textureRepeat ?? [1, 1],
        materialProperties: form.mat,
        colorFamily: form.colorFamily,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        specs,
        featured: form.featured,
        published: form.published,
        sortOrder: existing?.sortOrder,
      };
      const saved = await saveProduct(product, isNew);

      // 3. tidy up replaced photos
      if (existing) {
        const oldTex = existing.texture.kind === 'image' ? existing.texture.url : undefined;
        await removeStoredFiles([
          existing.thumbnail !== saved.thumbnail ? existing.thumbnail : undefined,
          saved.texture.kind !== 'image' || saved.texture.url !== oldTex ? oldTex : undefined,
        ]);
      }

      toast(isNew ? `“${saved.name}” added${saved.published ? ' to the website' : ''}` : 'Changes saved', 'success');
      setPhotoPending(null);
      setTexPending(null);
      if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!window.confirm('Discard all unsaved changes?')) return;
    setForm(initial);
    setMode(initialMode);
    setPhoto(existing?.thumbnail);
    setPhotoPending(null);
    setTexPending(null);
    setErrors({});
    setSaveError(null);
  };

  const doDelete = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await deleteProducts([existing.id]);
      toast(`${existing.name} deleted`, 'success');
      navigate('/admin/products', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete', 'error');
      setSaving(false);
    }
  };

  if (id && !existing)
    return (
      <div className="space-y-4">
        <Alert>This product was not found. It may have been deleted.</Alert>
        <Link to="/admin/products" className="text-sm underline">
          Back to products
        </Link>
      </div>
    );

  if (!categories.length)
    return (
      <div className="space-y-4">
        <Alert tone="info">Create a category first. Every product belongs to a category.</Alert>
        <Link to="/admin/categories/new" className="text-sm underline">
          Create a category
        </Link>
      </div>
    );

  const textareaRows = (s: string, min: number) => Math.max(min, Math.ceil(s.length / 70) + 1);

  return (
    <div className="pb-28">
      <Link to="/admin/products" onClick={confirmLeave} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-charcoal">
        <Icon name="arrowLeft" size={16} /> All products
      </Link>
      <PageHeader
        title={isNew ? 'New product' : existing!.name}
        subtitle={
          isNew ? (
            'Fill in the details below and click Save. Fields marked * are required.'
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              {existing!.published ? <Badge tone="live">On website</Badge> : <Badge tone="hidden">Hidden</Badge>}
              {existing!.published && (
                <a href={`/product/${existing!.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
                  View on website <Icon name="arrowUpRight" size={14} />
                </a>
              )}
            </span>
          )
        }
        actions={
          !isNew && (
            <Button variant="ghost" iconLeft="trash" className="!text-red-700" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )
        }
      />

      <div className="grid items-start gap-8 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <Toggle
              checked={form.published}
              onChange={(v) => set('published', v)}
              label={form.published ? 'Visible on the website' : 'Hidden from the website'}
              description="Turn off to hide this product without deleting it."
            />
            <Toggle
              checked={form.featured}
              onChange={(v) => set('featured', v)}
              label="Feature on the homepage"
              description="Shows this product in the “Featured collections” section."
            />
          </Card>

          <Card title="Basic information">
            <Field label="Title" required error={errors.name} counter={`${form.name.length}/160`}>
              {(p) => <input {...p} value={form.name} maxLength={160} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ivory Grasscloth" />}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category" required error={errors.category}>
                {(p) => (
                  <select {...p} value={form.category} onChange={(e) => changeCategory(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.published ? '' : ' (hidden)'}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Collection" hint="A group name shown above the title, e.g. “Natural Fibres”.">
                {(p) => (
                  <>
                    <input {...p} list="collections" value={form.collection} onChange={(e) => set('collection', e.target.value)} placeholder="e.g. Natural Fibres" />
                    <datalist id="collections">
                      {collections.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
            </div>
            <Field
              label="Short description"
              required
              error={errors.description}
              hint="One sentence shown on product cards."
              counter={`${form.description.length}/200`}
            >
              {(p) => <textarea {...p} rows={2} maxLength={200} value={form.description} onChange={(e) => set('description', e.target.value)} />}
            </Field>
            <Field label="Full description" hint="Shown on the product page. Leave empty to reuse the short description.">
              {(p) => (
                <textarea {...p} rows={textareaRows(form.longDescription, 5)} value={form.longDescription} onChange={(e) => set('longDescription', e.target.value)} />
              )}
            </Field>
          </Card>

          <Card title="Photos" description="Photos are resized and compressed automatically before uploading.">
            <ImagePicker
              label="Product photo"
              hint="Shown on product cards and the product page. A clear, close-up photo in daylight works best."
              value={photo}
              pending={photoPending}
              prepare={preparePhoto}
              onPick={(img) => {
                setPhotoPending(img);
                setErrors((e) => ({ ...e, texture: '' }));
              }}
              onRemove={() => {
                setPhotoPending(null);
                setPhoto(undefined);
              }}
              aspect="aspect-square sm:max-w-sm"
            />

            <fieldset className="border-t border-line pt-5">
              <legend className="text-sm font-semibold">Material texture for the room visualizers</legend>
              <p className="mt-1 text-[13px] text-muted">
                The texture is repeated across walls, floors or furniture in the 3D room and photo visualizers.
              </p>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ['photo', 'Use the product photo', 'Easiest. Works well for close-up photos of fabric, wallpaper, wood or grass.'],
                    ['separate', 'Upload a separate texture image', 'Best quality. Use a square, seamless (tileable) texture image from your supplier.'],
                    ...(existing?.texture.kind === 'procedural'
                      ? [['builtin', 'Keep the built-in generated texture', 'The placeholder texture this product came with.']]
                      : []),
                  ] as [TextureMode, string, string][]
                ).map(([m, l, h]) => (
                  <label key={m} className={`flex cursor-pointer gap-3 border p-3 ${mode === m ? 'border-charcoal bg-ivory' : 'border-line'}`}>
                    <input
                      type="radio"
                      name="texmode"
                      checked={mode === m}
                      onChange={() => {
                        setMode(m);
                        setErrors((e) => ({ ...e, texture: '' }));
                      }}
                      className="mt-1 accent-charcoal"
                    />
                    <span>
                      <span className="block text-sm font-medium">{l}</span>
                      <span className="block text-[13px] text-muted">{h}</span>
                    </span>
                  </label>
                ))}
              </div>
              {mode === 'separate' && (
                <div className="mt-4">
                  <ImagePicker
                    label="Texture image"
                    hint="It will be cropped to a square from the centre."
                    value={existing?.texture.kind === 'image' && !existing.texture.fromPhoto ? existing.texture.url : undefined}
                    pending={texPending}
                    prepare={(f) => prepareTexture(f)}
                    onPick={(img) => {
                      setTexPending(img);
                      setErrors((e) => ({ ...e, texture: '' }));
                    }}
                    onRemove={() => setTexPending(null)}
                    removable={!!texPending}
                    aspect="aspect-square sm:max-w-xs"
                  />
                </div>
              )}
              {errors.texture && <p className="mt-3 text-[13px] text-red-700">{errors.texture}</p>}
            </fieldset>
          </Card>

          <Card title="Price & availability">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Price (₹)" error={errors.price} hint="Leave empty to show “Price on request”.">
                {(p) => (
                  <input {...p} inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 1250" />
                )}
              </Field>
              <Field label="Price unit" hint="e.g. per roll, per metre, per sq ft">
                {(p) => <input {...p} value={form.unit} onChange={(e) => set('unit', e.target.value)} />}
              </Field>
              <Field label="Availability" required>
                {(p) => (
                  <select {...p} value={form.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
                    {(Object.keys(availabilityLabel) as Availability[]).map((a) => (
                      <option key={a} value={a}>
                        {availabilityLabel[a]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </Card>

          <Card title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Colour family" required hint="Used by the colour filter on the website.">
                {(p) => (
                  <select {...p} value={form.colorFamily} onChange={(e) => set('colorFamily', e.target.value as ColorFamily)}>
                    {COLOR_FAMILIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.hint}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Search tags" hint="Separate with commas, e.g. beige, textured, bedroom">
                {(p) => <input {...p} value={form.tags} onChange={(e) => set('tags', e.target.value)} />}
              </Field>
            </div>
            <div>
              <p className="text-sm font-semibold">Specifications</p>
              <p className="mt-0.5 text-[13px] text-muted">Shown as a table on the product page. Rows with an empty value are not shown.</p>
              <div className="mt-3 space-y-2">
                {form.specs.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      aria-label="Specification name"
                      value={s.label}
                      placeholder="e.g. Width"
                      onChange={(e) => set('specs', form.specs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                      className="w-2/5 border border-line bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none"
                    />
                    <input
                      aria-label={`Value for ${s.label || 'specification'}`}
                      value={s.value}
                      placeholder="e.g. 140 cm"
                      onChange={(e) => set('specs', form.specs.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))}
                      className="min-w-0 flex-1 border border-line bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Remove row"
                      onClick={() => set('specs', form.specs.filter((_, k) => k !== i))}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-muted hover:text-red-700"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" iconLeft="plus" className="mt-2" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>
                Add row
              </Button>
            </div>
          </Card>

          <details className="group border border-line bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 sm:px-7">
              <span>
                <span className="block text-base font-semibold">Advanced: how it looks in the 3D room</span>
                <span className="block text-[13px] text-muted">Optional. Pre-filled with good values for this category.</span>
              </span>
              <Icon name="chevronDown" className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-6 border-t border-line p-5 sm:p-7">
              <Field
                label="Real size of the texture image (cm)"
                required
                error={errors.textureCm}
                hint="How much wall or floor one texture image covers in real life. Bigger number = larger pattern."
              >
                {(p) => <input {...p} inputMode="decimal" value={form.textureCm} onChange={(e) => set('textureCm', e.target.value.replace(/[^\d.]/g, ''))} className={`${p.className} max-w-[160px]`} />}
              </Field>
              {(
                [
                  ['roughness', 'Finish', 0.05, 1, 'Glossy', 'Matte'],
                  ['bumpScale', 'Texture depth', 0, 3, 'Flat', 'Deep'],
                  ['sheen', 'Fabric sheen (soft glow on fabrics)', 0, 1, 'None', 'Strong'],
                  ['clearcoat', 'Polished coat (lacquer / varnish)', 0, 1, 'None', 'High'],
                  ['opacity', 'See-through (sheer curtains)', 0.3, 1, 'Sheer', 'Solid'],
                ] as [keyof MaterialProperties, string, number, number, string, string][]
              ).map(([k, l, min, max, lo, hi]) => {
                const v = (form.mat[k] as number | undefined) ?? (k === 'opacity' ? 1 : 0);
                return (
                  <div key={k}>
                    <div className="flex justify-between text-sm">
                      <label htmlFor={`mat-${k}`} className="font-semibold">
                        {l}
                      </label>
                      <span className="text-muted">{v.toFixed(2)}</span>
                    </div>
                    <input
                      id={`mat-${k}`}
                      type="range"
                      min={min}
                      max={max}
                      step={0.05}
                      value={v}
                      onChange={(e) => setMat(k, Number(e.target.value))}
                      className="range-lux mt-3"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted">
                      <span>{lo}</span>
                      <span>{hi}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        <aside className="xl:sticky xl:top-8">
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted uppercase">Preview on the website</p>
          <div className="pointer-events-none max-w-[320px] select-none" aria-hidden>
            <ProductCard key={`${preview.thumbnail}|${JSON.stringify(preview.texture)}`} product={preview} />
          </div>
        </aside>
      </div>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1136px] flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-8">
          {saveError && <p className="mr-auto text-sm text-red-700">{saveError}</p>}
          {!saveError && dirty && <p className="mr-auto text-sm text-muted">You have unsaved changes</p>}
          <Button variant="ghost" onClick={() => (dirty ? discard() : navigate('/admin/products'))} disabled={saving}>
            {dirty ? 'Discard changes' : 'Back'}
          </Button>
          <Button onClick={save} disabled={saving || (!dirty && !isNew)} iconLeft={saving ? undefined : 'check'}>
            {saving ? 'Saving…' : isNew ? 'Save product' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete this product?" confirmLabel="Delete permanently" danger busy={saving} onConfirm={doDelete} onClose={() => setConfirmDelete(false)}>
        <p>
          <strong>{existing?.name}</strong> will be removed from the website and the database, together with its photos.{' '}
          <strong>This cannot be undone.</strong>
        </p>
        <p className="mt-3 text-muted">Tip: to take it off the website temporarily, switch off “Visible on the website” instead.</p>
      </ConfirmDialog>
    </div>
  );
}
