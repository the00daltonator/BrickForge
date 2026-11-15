# BrickForge

Turn ideas, photos and characters into real brick builds: a 3D model, step-by-step instructions, a parts list and a shopping list, all using real LEGO® part shapes and colors.

Type "a wizard with a purple robe and a staff", pick a starter like a rocket or castle, or upload a photo. BrickForge designs the build, checks that every piece is connected and supported, and shows you exactly which pieces you need. Everything runs in the browser; no AI key or account is needed.

## Features

- **Ideas without AI:** typed descriptions become characters and cars, entirely offline.
- **Character designer:** 32 presets (people, fantasy, robots, animals) built from real parts, each with a matching minifigure.
- **Photos:** outfit colors, 3D sculptures, standees and color mosaics, with background removal.
- **Real build checks:** stud connections, collisions, support, interlocking layers and minimal supports.
- **Moving parts:** posable characters (Technic pins or ball joints) and cars with opening doors and rolling wheels, plus poses and animations.
- **Instructions and box art:** LEGO-style step booklets and set box images.
- **Inventory:** a bundled catalog of 64,000+ parts and 21,000+ set inventories, storage bins, "use my bricks" builds, and CSV / BrickLink XML / LDraw export.

See [docs/FEATURES.md](docs/FEATURES.md) for the full feature list, design notes and known limits.

## Quick start

You need [Node.js](https://nodejs.org) 22.13 or newer and Git.

```bash
git clone https://github.com/the00daltonator/BrickForge.git
cd BrickForge
npm ci
npm run db:setup
npm run dev
```

Then open the address `npm run dev` prints (normally http://localhost:5173).

- `npm ci` installs the exact dependency versions from `package-lock.json`.
- `npm run db:setup` creates the local database used to save your workspace. It's safe to run again after pulling new changes. Without it, the app still works but saving to the server fails and falls back to browser storage.

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm test` | Run all test suites (engine, planner, interlock, character, idea, joints, supports, server) |
| `npm run typecheck` | Check types with TypeScript |
| `npm run db:setup` | Create or update the local database |
| `npm run build` | Build the full app (Cloudflare Worker + site) into `dist/` |
| `npx vite build --config vite.static.config.ts` | Build a browser-only version into `dist-static/` |
| `npm run lint` | Check the code with ESLint |

## Project layout

| Path | Contents |
|---|---|
| `app/` | Pages and API routes (workspace saving, sets, admin, AI) |
| `components/brickforge/` | The studio UI: 3D viewer, designers, inventory, movement panel |
| `lib/` | The brick engine: packing, build planning, supports, characters, minifigures, joints, exports |
| `public/catalog/` | Bundled parts, colors and set inventories (from Rebrickable) |
| `db/`, `drizzle/` | Database schema and migrations |
| `static/` | Entry point for the browser-only build |
| `tests/` | Test suites |
| `scripts/` | Dev, build, database and catalog-rebuild scripts |

## Hosting it

There are two ways to put BrickForge online:

**Static site (easiest).** Run `npx vite build --config vite.static.config.ts` and upload the `dist-static/` folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages or S3. Everything works except server-saved workspaces (it uses browser storage instead) and the optional AI features.

**Full app on Cloudflare Workers.** BrickForge runs on [Cloudflare Workers](https://developers.cloudflare.com/workers/) with a [D1](https://developers.cloudflare.com/d1/) database.
1. Create a D1 database: `npx wrangler d1 create brickforge`.
2. Put its ID into the `d1_databases` entry in `vite.config.ts`, replacing the placeholder ID.
3. Apply the schema: `npx wrangler d1 migrations apply DB --remote`.
4. Set any secrets you need with `npx wrangler secret put <NAME>`.
5. Run `npm run build`, then `npx wrangler deploy --config dist/server/wrangler.json`.

## AI features (optional)

BrickForge never needs AI. The optional AI sculptor and set-photo reader use the OpenAI API, billed to whoever owns the key. To turn them on, copy `.dev.vars.example` to `.dev.vars` for local use, or set these as host secrets:

| Setting | Purpose |
|---|---|
| `OPENAI_API_KEY` | Enables the AI features |
| `OPENAI_MODEL` | Model to use (optional) |
| `APP_SECRET` | Encrypts a key saved through the `/admin` page |
| `OWNER_EMAIL` | Owner allowed to open `/admin` |

The `/admin` page trusts a signed-in-user header from the hosting platform (`oai-authenticated-user-email`). Most hosts don't send one, so if yours doesn't, set `OPENAI_API_KEY` as a secret instead of using `/admin`. Never trust that header when visitors can set it themselves.

**Never commit API keys.** `.dev.vars` and `.env*` files are git-ignored.

## Rebuilding the parts catalog

The bundled catalog is a Rebrickable snapshot from 2026-09-09. To refresh it, download the CSV archives from https://rebrickable.com/downloads/ and run:

```bash
python scripts/build-catalog.py /absolute/path/to/csv-archives
node scripts/build-minifig-data.mjs
```

## Contributing

Issues and pull requests are welcome. Please run `npm test`, `npm run typecheck` and `npm run lint` before opening a pull request; the same checks run on GitHub Actions.

## License

BrickForge is free software under the [GNU Affero General Public License v3.0 or later](LICENSE). You may use, study, change and share it. If you distribute it, or run a modified version as a public website or service, you must also release your source code under the same license.

If you want to use BrickForge in a closed-source product, contact the author about a separate commercial license.

### Third-party data and code

- **Parts, colors and set inventories:** [Rebrickable](https://rebrickable.com/downloads/). Part images load from Rebrickable's CDN, © Rebrickable.
- **Color mappings:** [BrickLink](https://www.bricklink.com/catalogColors.asp).
- **CAD format:** [LDraw](https://www.ldraw.org).
- **UI styles:** shadcn/ui and Tailwind (`vendor/`), MIT. Build plugin (`build/sites-vite-plugin.ts`), MIT © OpenAI. See the license files next to each.

## Trademarks

LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this project. BrickForge is an independent fan project. "LEGO-compatible" describes part geometry only.
