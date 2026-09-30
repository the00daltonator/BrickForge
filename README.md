# BrickForge

A public browser-based brick studio for computers, tablets, and phones. Visitors do not provide credentials or install anything.

## Included without any API account

- Six starter sculptures in two sizes, photo-to-plate mosaics, closed OBJ/STL mesh voxelization, standard-part LDraw import, 3D orbit/picking/editing, undo.
- A bundled Rebrickable snapshot dated 2026-09-09: 64,620 parts, 275 color records, 76 categories, and 21,490 set inventories. Includes Technic, minifigs, wheels, slopes, Duplo and other specialty categories.
- Catalog search, color observations, set-number lookup, minifigure/subset expansion, spare-piece choice, set preview before importing. No Rebrickable API key is used.
- All catalog colors and shapes retained in inventory. Non-editor shapes are marked as inventory/external-CAD records.
- 71 editor-ready shapes: 57 rectangular brick/plate sizes, eight tiles, three slopes, and three round parts. Voxel packing selects rectangular bricks/plates, prefers observed part/color combinations, and flags unobserved combinations. Specialty pieces can be manually placed, recolored and exported. Tile finish replaces exposed plates where supported.
- Full-build and inventory-only workflows, limited-stock packing, color substitution, missing-parts lists, overlap/support checks and support columns.
- Server-persisted visitor workspaces in D1, isolated by unguessable HttpOnly guest cookies (or platform identity when signed in). Browser storage provides a fallback backup, not the only persistent store. Export/import backups are available for moving guest workspaces across devices.
- Portable build ZIP containing LDraw CAD, printable HTML instructions, parts CSV, shopping XML where mappings are known, and editable JSON. Colors without a verified BrickLink mapping retain exact IDs/RGB in CSV/CAD; XML export is explicitly blocked for such colors and the ZIP explains the omission.

## Owner setup for shared AI

Visit `/admin` and sign in as the verified owner. Add an OpenAI API key once. The key is encrypted with AES-GCM before storage in D1, using APP_SECRET from the deployment's secret environment. It is never returned to browsers. Only the trusted platform identity matching OWNER_EMAIL can manage settings.

AI text/photo sculptures and reading set numbers from box/booklet photos use the owner's service. Users are not asked for keys. OpenAI API usage is billed to the owner. The owner selects a model and a durable global daily request cap (default 30); a per-visitor cap of 10 also applies. These are request limits, not dollar guarantees. Provider billing limits remain useful. AI remains explicitly unavailable until activated; there is no simulated AI result.

Server environment:
- OWNER_EMAIL: verified owner's platform email (secret)
- APP_SECRET: random encryption secret (secret; preserve it to decrypt saved credentials)
- OPENAI_API_KEY / OPENAI_MODEL: optional deployment-level alternatives to the admin UI
- DB: Cloudflare D1 binding, declared in `.openai/hosting.json`

The Pause button also disables an environment-provided AI key. Re-enable through Save and activate. Visitors cannot choose provider keys or models. No provider URLs are client-configurable.

## Honest limits

The full inventory catalog is broader than automatic generation. Arbitrary Technic, hinge, wheel, minifig and specialty connection solving is not implemented. Standard System brick dimensions cannot be applied to Duplo or every specialty part. Those pieces are preserved as exact inventory records, not invented geometry.

Manual specialty previews are simplified surfaces (holes and fine molding details may be omitted). Exports use actual part IDs. LDraw import currently accepts supported parts in upright 0/90-degree orientation, not arbitrary Studio files or nested MPD projects. Meshes must be watertight and Y-up. AI sculptures are coarse editable approximations, not guaranteed faithful reconstructions.

Support checks are conservative occupied-volume / stud-footprint checks, not physical stability certification. A piece over a smooth tile is not counted as stud-supported. Support repair does not solve every specialty connection; inspect the model before ordering.

Part/color observations mean occurrence in a catalog set, not current retailer inventory. Prices are illustrative USD planning values. No orders are placed by the app. Review designs and supplier availability in dedicated CAD/marketplace tools before buying.

## Development and validation

React/TypeScript with Vinext on Cloudflare Workers; Sites owns hosting and D1 migrations. Secrets are never stored in repository files. The source can be hosted with a compatible Cloudflare Workers deployment and D1, or adapted to another server host with equivalent secret/database/authentication handling.

```bash
npx tsc --noEmit
node --import tsx tests/engine.test.ts
node scripts/test-server.mjs
```

Model tests cover brick packing, rotation, inventory limits, LDraw round trips, plate units, BOM/XML totals, mesh voxelization, escaped instructions, ZIP integrity and support repair. Server tests use an in-memory SQLite database and mock provider responses to verify owner authorization, encrypted key storage, origin checks, server-selected keys/models, persistent quotas, pause behavior and isolated guest workspaces. No live OpenAI generation has been tested without the owner's API key.

`python scripts/build-catalog.py /path/to/csv-archives` rebuilds the bundled Rebrickable data from colors, parts, part_categories, sets, inventories, inventory_parts, inventory_minifigs, inventory_sets, and minifigs CSV archives. The snapshot uses each set's latest inventory. Linked minifigure and nested-set inventories are expanded and any unresolved references are disclosed. Update the generated editor color-observation registry when updating the catalog.

## Sources

- Rebrickable downloadable catalog: https://rebrickable.com/downloads/
- Rebrickable public CSV archives: https://cdn.rebrickable.com/media/downloads/
- BrickLink color identities: https://www.bricklink.com/catalogColors.asp
- LDraw format: https://www.ldraw.org/article/218.html
- OpenAI API production guidance: https://developers.openai.com/api/docs/guides/production-best-practices

Catalog names and identities are attributed to Rebrickable and BrickLink. No paid MOC instructions are included. LEGO is a trademark of the LEGO Group. This independent project is not affiliated with or endorsed by the LEGO Group.

## Creative inventory and connection update

- `Use my bricks` now tries a resized sculpture, miniature, and upright front-view relief. It can substitute supported plate/brick sizes and available colors. Every returned variant is a single connected assembly with bottom-up support and exact part/color stock limits. Shape coverage is disclosed; it is not a recognizability score, and arbitrary inventories cannot represent every request.
- AI receives a bounded summary of supported inventory plus the subject/photo, purchase policy, and color preferences. It is asked to simplify identifying features creatively before deterministic fitting. Owner AI activation is still required for new natural-language subjects; local fitting works on existing models without AI.
- Budget mode caps illustrative missing-parts cost, not checkout totals. Per-lot unit estimates are editable and included in CSV exports. Shipping, tax, seller minimums, and live stock are not integrated. No purchases are placed.
- The connection graph uses actual stud locations for the 71 supported upright shapes: smooth tiles have no top studs; 45-degree slopes have only their raised row. Side contact is not a joint. Bounding volumes conservatively handle sloped/round body collisions. Large one-stud attachments and approximate balance risks are reported separately. This does not simulate clutch force, stress, hinges, axles, or physical stability.
- Build-pack, instructions, and shopping exports are blocked on collisions, missing bottom-up support, disconnected assemblies, an inventory-only shortfall, or a budget excess. Draft CAD/JSON and CSV remain exportable. Every pack includes `connection-report.json`. Full builds can add a crossed backing raft to join separate ground assemblies; strict inventory mode never silently adds support purchases.
- CAD correction: rectangular LDraw parts have their long axis in local X, unlike the editor's width/depth convention. Export/import now transform accordingly. Slopes have a 10-LDU origin offset at their top stud row. Previous exported LDraw files may have incorrect footprints; re-export saved BrickForge JSON projects using this version. Fixtures compare actual native stud coordinates, not only self-consistent round trips.
- Instruction diagrams now label front consistently and do not show studs on smooth tiles.

Validation: `node --import tsx tests/planner.test.ts`, `node --import tsx tests/engine.test.ts`, `node scripts/test-server.mjs`, `npx tsc --noEmit`, and the standard production build. Provider calls in server tests are mocked.

Coordinate references: https://wiki.ldraw.org/wiki/DAT and official LDraw part files mirrored at https://github.com/gkjohnson/ldraw-parts-library/tree/master/complete/ldraw/parts (3039, 3037, 3040b, 3009, 3020, 3032, 3036, 3030, 3027, 3069b, 87079). Only derived transform facts are incorporated; geometry files are not redistributed.

## Staggered packing and grayscale instructions

The default packer now scores pieces that span multiple lower bricks, offsets alternate courses at the footprint edges, and uses bounded standard brick sizes instead of preferring giant rectangular parts. Full-build generation and the initial starter run an interlocking rebuild plus support repair; disconnected ground assemblies receive a crossed raft. Older saved models retain their identity and can use **Rebuild with interlocking layers**. Inventory-only planning still enforces exact stock counts and never silently purchases supports.

The connection panel reports how many pieces span two or more lower bricks. This is a seam-bridging count, not a physical strength certification. Models with unrepairable geometry are not silently accepted as complete.

**Grayscale view** filters the model and exported HTML instructions, including instructions inside the ZIP. Part identities, original colors, inventory quantities, and CAD files remain unchanged. The guide explicitly invites color substitutions. The preference is saved with the workspace.

`node --import tsx tests/interlock.test.ts` verifies a multi-course wall is connected without a raft, every repaired starter has seam-spanning pieces, inventory limits remain enforced, and grayscale instructions do not mutate model data.

## Characters, photos, sets and inventory management (2026-09-30 update)

Everything below runs in the browser with no AI key. The site-provided AI remains an optional extra.

**Character designer (new Character tab).** 32 presets across people and jobs, fantasy characters, robots/aliens and animals, plus full control over skin/fur, hair style and color, headwear (18 kinds), outfit (8 styles), props, ears, cape, beard, glasses, tail and display base. Figures are brick-built in a chunky "big head" style, packed from bricks *and* plates, and pass the stud-connection, collision and bottom-up support checks. Only colors that exist as real bricks/plates are offered (`CHARACTER_PALETTE`, `SKIN_TONES` in `lib/color.ts`).

**Matching minifigure.** Each person/robot character can include a minifigure built from real, plain Rebrickable assemblies: head `3626c`, torso `973cXXhYY`, hips and legs `970cXX`, plus hair, hats, neckwear and handheld accessories. Every part/color is the closest combination observed in the bundled set inventories (`lib/minifig.ts`, data generated by `node scripts/build-minifig-data.mjs`). Minifigure parts are stored as `model.extras` and flow into the parts list, costs, CSV, BrickLink XML, instructions and the build pack. Printed faces/torsos are not included.

**Ideas without AI.** The Idea tab interprets descriptions offline (`lib/idea.ts`): subjects ("wizard", "firefighter", "orange cat"), color + garment pairs ("purple robe", "long white beard", "black leather jacket"), hats, props, glasses, capes and names ("named Redbeard"). It shows what it understood and can hand the result to the designer. Rockets, castles and dinosaurs still use the starter builds. If the owner enables AI, a switch lets visitors use the AI sculptor instead.

**Photos.** The Photo tab removes plain backgrounds (border flood fill in CIEDE2000 color space) and offers:
- *Character figure*: reads hair, skin, top, pants and shoes from a full-body photo (hair, skin and top from a portrait) and builds a character with a matching minifigure.
- *3D sculpture*: inflates the cut-out silhouette into a rounded, symmetric figure on a display base. A single photo has no depth, so thickness is estimated; overhanging arms may need support columns (disclosed in the notes).
- *Standing pixel figure* and an improved *flat mosaic* (optional dithering). Mosaic colors are limited to colors LEGO produced as 1 × 1 plates.

**Set packaging.** A new *Set box* tab shows generated box art (set number, age badge, piece count, minifigure), build facts, and downloads a PNG. Instruction booklets now have a cover, a "parts in this set" page with part icons, a minifigure page, and numbered steps (at most 10 pieces each) with a parts callout and a 3D render that outlines the new pieces. The exact placement map and coordinates remain under every step. Large models embed compressed step images to keep files small (a 1,579-piece model: about 6 MB instead of about 29 MB).

**Packing.** `packMixed` combines bricks and plates. Packing now handles overhangs (brims, ledges, the back of a head): cells farthest from support choose first, pieces may extend back over supported cells, and pieces that would strand a neighbor are penalized. Across all 32 presets this leaves 3 support pieces in total, compared with dozens per figure before.

**Inventory management.** Storage bins per lot (search, filter, sort and export them), filters for build-ready, minifigure and specialty parts, a color breakdown, pagination for large collections, CSV and BrickLink XML export, removing a set you added, and real part images (local drawings for grid parts, Rebrickable renders for everything else). *I built it* moves a finished model's pieces out of your available inventory; *Take apart* returns them. Saved builds show how much of each one your inventory covers.

Validation: `node --import tsx tests/character.test.ts` checks that every preset is connected and supported, uses real part/color combinations and real minifigure parts; it also covers the idea interpreter, photo background removal and color reading, photo sculptures, real-color mosaics, a CIEDE2000 reference value, booklet/box art/exports with minifigure parts, and inventory bins and round trips.

Part images for non-grid parts load from `cdn.rebrickable.com` in the visitor's browser. Part renders © Rebrickable. The minifigure matcher uses plain assemblies only, and colors follow set-inventory observations, not live seller stock.

## Moving parts: posable characters and vehicles

Builds can now have real joints. Each moving section (a leg, a door, a hood) is a separate rigid sub-assembly (`brick.group`) packed on its own, so no brick spans a joint. Sections are linked by joints made from real catalog parts (`model.joints`), and the current pose is saved as `model.pose`.

| Design | Basic | Deluxe |
|---|---|---|
| Characters (Design tab → Movement) | Hips and shoulders on Technic pin bricks `3700` with friction pins `2780`; head on a 2 × 2 turntable `3680`/`3679` | Ball-joint plates `14417`/`14704` at hips and shoulders (swing and spread), turning waist and head on turntables |
| Cars (Design tab → Vehicle) | Doors on 1 × 4 swivel hinge plates `2429`/`2430` | Doors on 1 × 4 hinge bricks `3831`/`3830`, plus hood and trunk on hinge bricks `3937`/`3938` |

All cars roll on wheel-holder plates `4600` with wheels `4624` and tires `3641`. Joint parts use colors observed in the catalog, and loose hardware (pins, wheels, tires) is listed in the parts list, CSV and BrickLink XML.

- **Checks** (`checks(bricks, joints)`) treat joint links as connections. Pieces in a hanging section need a stud connection above or below. Studs pressing into a different moving section are reported as a locked joint. Sections that rest on a small joint piece get a real spanning plate (for example a 6 × 6 under a head on a 2 × 2 turntable) so they hold together.
- **Ranges** (`jointRanges`) are each part's range, narrowed to where the moving section would first hit the rest of the model (tested every 3° from the rest pose). Each joint is tested with the other joints at rest, so posing two joints together can still collide.
- **Posing:** the Movement panel has sliders per joint axis, presets (wave, mid-stride, cheer, look around, open doors, open everything) and looping animations (walk, wave, dance, drive, open and close). The pose is used for box art and LDraw export. Instructions show the rest pose.
- **Instructions** build the fixed core first, then each moving section, followed by an "Attach" step showing the joint hardware.
- **Ideas:** "a posable knight", "an action figure with ball joints", "a red car with opening doors" and "a deluxe police car" pick the right build.
- **Using your own bricks:** a moving build is offered as designed when your bricks (or budget) cover it. Otherwise a static reinterpretation is fitted with its joints removed, and the notes say so.

Limits: ranges are geometry checks, not strength or friction tests; heavy parts may droop. Joint-part CAD positions are approximations of the real elements' origins; check hinges and turntables in Studio before ordering. Loose hardware is not placed in the `.ldr`. Knees, elbows and Technic-beam mechanisms are not generated.

Validation: `node --import tsx tests/joints.test.ts` covers:
- all 64 posable characters and all car presets connected with no locked joints and useful ranges
- real part/color combinations
- door and waist transforms
- presets and animations within limits
- save and reload
- posed LDraw with unit rotations
- one attach step per joint
- hardware in parts lists
- inventory fitting behavior
- idea parsing

## Static website version

`npx vite build --config vite.static.config.ts` writes `dist-static/`, a browser-only build you can put on any static host (GitHub Pages, Netlify, S3, Cloudflare Pages) with the `catalog/` folder beside the page. The static entry (`static/main.tsx`) sets `window.__BF_STATIC__`, which switches off the server routes (saved workspaces fall back to browser storage, and owner AI is unavailable). Catalog files load relative to the page, and third-party part images are skipped. Everything else runs the same: typed ideas, the character and vehicle designers, photos, moving parts, inventory, instructions and exports.

## Fewer supports and minifigure versions

**Fewer supports.** Rebuilding a model tries several packings (brick courses, plus plate-level packing at three course offsets) and keeps the one that needs the fewest added pieces.
- **Woven bases:** flat display bases become two crossed plate layers with staggered joints, one connected piece instead of loose bricks.
- **Minimal supports** (on by default; toggle in the inspector): small pieces may hang from the studs of a piece above them, the way builders attach overhangs. A hanging section must still lead back to the main build; a separate island gets strict supports.
- **Instructions:** hanging pieces are attached in "Attach underneath" steps right after what they clip under.
- **Repairs:** a short bracket plate out to a nearby stud comes first, before a column to the table. Separate sections are joined with small tie plates across a seam before a backing raft is considered.

Results:
- the large castle went from 1,579 pieces (1,396 raft plates) to 283
- the large rocket from 1,205 to 286
- the large dinosaur from 1,651 to 614
- photo figures need no supports at 24 studs wide
- the Astronaut, Robot and Cat starter buttons now use the character designs, which need almost no supports

**Minifigure versions.** In Design → Character, choose *Minifigure* to build the character as a real minifigure (plain head, torso assembly, hips and legs, hair or headwear, neckwear and a held accessory, in the closest real colors) on a 4 × 4 display plate. Its head, arms and legs pose in the Movement panel, including the walk and wave animations, and the 3D view, box art and instructions draw it. Statue characters also show their matching minifigure on the corner of the display base. Animal characters need special printed heads, so they stay brick figures. Typed ideas understand "minifigure" too.

Validation: `node --import tsx tests/supports.test.ts`.
