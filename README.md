# Farsh – The Decor Hub

A premium showroom website for an interior materials store, with two visualizers:

- **3D Room Visualizer** (`/visualizer/3d`): an interactive three.js living room. Click any surface and apply real catalogue materials.
- **Photo Visualizer** (`/visualizer/photo`): upload a photo of your own room, outline surfaces and overlay materials with perspective and natural shading.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Framer Motion, three.js, React Three Fiber and Drei. Zustand holds the design state shared between the 3D canvas and the panels.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

> **Hosting:** this is a single-page app. Configure your host to rewrite unknown paths to `/index.html`
> (Netlify `_redirects`: `/* /index.html 200`; Vercel rewrites; nginx `try_files $uri /index.html`).

---

## Before launch: things to replace

| What | Where |
| --- | --- |
| Phone, WhatsApp number, email, address, hours, social links, Google Maps embed | `src/config/site.ts` (all marked PLACEHOLDER) |
| Form delivery endpoint (Formspree, a serverless function, CRM…) | `siteConfig.formEndpoint` |
| Brand story details (founding year, team, partners) | `src/pages/AboutPage.tsx` |
| Testimonials (currently labelled *sample*) | `src/pages/HomePage.tsx` → `testimonials` |
| Prices (currently “Price on request”) | `price` on each product in `src/data/products.ts` |
| Photography (Unsplash placeholders) | `public/images/` (keep the file names or update references) |

---

## Architecture

```
src/
  config/site.ts           Central business configuration (no details hard-coded elsewhere)
  data/categories.ts       6 categories
  data/products.ts         Single product catalogue (40 products) used by EVERY feature
  types/catalog.ts         Product / texture / material types
  lib/
    textures/              Seamless procedural texture engine
      noise.ts             Tileable value / fractal / Worley noise
      generators.ts        Wood, parquet, fluted panels, weaves, velvet, leather, bouclé,
                           marble, limewash, grasscloth, stone, stripes, florals,
                           foliage, art-deco, trellis, abstract, artificial grass
      texture.worker.ts    Runs generators off the main thread
      textureService.ts    Worker pool, priority queue, LRU cache, image textures, swatches
    whatsapp.ts            wa.me link + message builders (general/product/visit/design)
    designStorage.ts       Saved designs in IndexedDB (rename/duplicate/delete/reopen)
    shareCodec.ts          3D design ⇄ compact URL string (public share links)
    enquiryService.ts      Form submission (remote endpoint or local mode)
  store/
    designStore.ts         3D design state: per-surface material, scale, rotation, undo/redo
    toastStore.ts
  visualizer3d/
    surfaces.ts            Customisable surfaces + accepted categories
    Room.tsx               Procedural furnished living room (metre-based UVs)
    Scene.tsx              Canvas, lighting, environment, constrained orbit controls
    useSurfaceMaterial.ts  One material per surface; texture swap, fade, highlight
    textureCache.ts        Ref-counted three.js textures with delayed disposal
    ui/                    Material panel, summary panel, compare dialog
  photo/
    store.ts               Photo regions, tools, undo/redo
    PhotoUpload.tsx        Validation, framing (zoom/position/crop), working-resolution JPEG
    PhotoEditor.tsx        Polygon drawing/editing, perspective handles, zoom/pan/pinch, before/after
    compositor.ts          Overlay engine (masking, homography, mip-mapped sampling, shading transfer)
    homography.ts          Perspective maths
    magicWand.ts           Smart select (flood fill → contour → simplified polygon)
  pages/                   Routes
  components/              Layout, UI kit, catalogue cards, enquiry dialog, saved designs
```

### One catalogue, four consumers

`src/data/products.ts` is the only product source. The homepage, collection pages, product pages, the 3D visualizer and the photo visualizer all read from it.

### Adding a real showroom product

```ts
p({
  id: 'wp-real-001',
  name: 'Real Wallpaper',
  category: 'wallpaper',
  collection: 'Spring 2026',
  description: '…',
  longDescription: '…',
  thumbnail: '/images/products/wp-real-001.jpg',               // optional photo for cards
  texture: { kind: 'image', url: '/textures/wallpaper/wp-real-001.jpg', bumpUrl: '/textures/wallpaper/wp-real-001-bump.jpg' },
  textureScale: 0.53,                                            // metres covered by one tile of the texture
  colorFamily: 'Neutral',
  tags: ['…'],
})
```

Image textures must be **square and seamless** (tileable). They are resampled to a power of two automatically. If `bumpUrl` is omitted, a bump map is derived from luminance.

### How the 3D room keeps textures true to scale

All room geometry carries UVs **in metres**: walls are built from `Shape`s, and floors, boxes, cushions and curtains get metre-based UVs. A material's texture repeat is therefore simply `textureRepeat / (textureScale × userScale)`, so every surface tiles at real-world size without stretching. Curtain UVs account for fabric fullness.

### How the photo overlay looks natural

For each region, the compositor:

1. rasterises a feathered mask;
2. maps pixels through an optional four-point perspective homography;
3. samples a mip-mapped texture with trilinear filtering to avoid moiré;
4. multiplies the material by the photo's own relative luminance ("Natural" blend), keeping the room's light and shadow;
5. blends at the chosen opacity.

The original photo is never modified.

---

## Feature status

### Completed and tested

All items below were exercised in headless Chrome, including the WebGL path.

**Website**
- Routes: `/`, `/collections`, `/collections/:category`, `/product/:id`, `/visualizer`, `/visualizer/3d`, `/visualizer/photo`, `/about`, `/contact`, 404
- Sticky navigation that changes on scroll, mobile menu, footer, page transitions, scroll reveals, reduced-motion support
- Homepage: hero with image transitions, categories, featured collections with filter, visualizer promotion, about, why Farsh, inspiration, showroom, testimonials (clearly labelled samples), contact CTA
- Catalogue: search, tone filter, sorting, category filter; product page with zoom loupe, repeat preview, specs, enquiry, share
- Contact form with validation and success/error states; Google Maps placeholder
- Floating WhatsApp button; product, showroom-visit, design and quotation enquiries

**3D visualizer**
- Furnished room: 4 walls (window, glazed terrace door), floor, ceiling, curtains, sofa, cushions, accent chair, coffee table, rug, lamps, plant, pendant, art, sideboard, mirror, terrace with grass, garden outside
- 10 independently customisable surfaces, selected by raycasting, with hover and selection highlight
- Materials applied as real textures with bump maps, roughness, sheen and clearcoat; per-surface scale and 90° rotation
- Orbit, zoom and pan constrained inside the room; reset view; fullscreen (with an in-page fallback for iOS)
- Undo/redo (buttons and Ctrl+Z/Y), reset room, branded screenshot, compare up to 3 materials side by side, save/reopen, public share link, WhatsApp design enquiry including the share link, quotation request
- Lazy-loaded (three.js is only downloaded on this route), worker-generated textures, loading progress, texture disposal, DPR limits, WebGL fallback, error boundary
- Mobile layout: near-full-screen viewport with a collapsible bottom drawer

**Photo visualizer**
- Upload with JPG/PNG/WEBP type, size and minimum-dimension validation, plus a HEIC hint; replace/remove; zoom and position (crop); sample rooms
- Polygon tool: click to add points, close on the first point, double-click or Enter; drag vertices, add points at edge midpoints, Alt-click or Delete to remove points, drag to move a region; multiple regions with reorder, duplicate, hide and delete
- Smart select (beta): one-click surface detection with adjustable tolerance, no external API
- Materials from the same catalogue; scale, rotation, opacity, light & shadow retention, edge softness, blend mode; draggable four-point perspective guide
- Undo/redo, zoom/pan/pinch, before/after slider, branded JPEG export, Web Share (with a download fallback), WhatsApp enquiry, save/reopen

### Known limitations and future services

- **Form delivery** needs a backend or form service (`siteConfig.formEndpoint`). Until it is set, forms run in *local mode* and offer WhatsApp or email hand-off.
- **WhatsApp image attachments:** `wa.me` links can only pre-fill text. The app downloads the design image so the customer can attach it, and 3D designs include a public link.
- **Public sharing of photo designs** needs storage for the customer's photo (e.g. object storage + an API). Photo designs are saved privately on the device only, and the UI says so.
- **Saved designs** live in this browser (IndexedDB) and are not synced across devices. Accounts and a backend would enable this.
- **Smart select** is a colour-based assistant (beta). An AI segmentation service could be plugged into `photo/magicWand.ts` later.
- All materials are **procedural placeholders** until real showroom textures are added.
- The `THREE.Clock is deprecated` console warning comes from inside React Three Fiber with three r187. It is harmless and will go away with a future R3F update.
