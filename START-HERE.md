# BrickForge complete site export

This archive includes the application source, bundled parts/colors/set inventories, assets, dependency lockfile, database schema and migrations, tests, and the existing compiled Cloudflare Worker/site output in dist/.

Source revision: 3caa606976e9d876b4659df98048bbb1c927cceb
Includes staggered/interlocking packing and grayscale instructions.

## Start here

This is a React/TypeScript application with a Cloudflare Workers backend, not a single HTML file you can double-click.

1. Install Node.js 22.13 or newer and npm.
2. Open a terminal in this brickforge folder.
3. Run `npm ci` to install the locked dependencies.
4. Run `npm run dev` and open the local address it prints.
5. Run `npm run build` to regenerate compiled output after editing.

The clean checkout defaults to the portable execution profile. Local development uses the Cloudflare emulator. Persistent workspace and AI routes need the DB binding and schema initialized using the included migrations. See README.md, db/, drizzle/, and the generated dist/server/wrangler.json for the existing application configuration.

## Hosting elsewhere

The existing host provides Cloudflare D1, trusted sign-in identity, and secret environment variables. Configure equivalents before deploying independently. Set your own D1 database ID and apply the included migrations. The original .openai/hosting.json identifies the existing Sites project; do not use that project ID when creating a separate deployment.

The compiled output is included as a reference/build backup, not a preconfigured independent hosting account. Authentication depends on the host's trusted identity headers. A new host must replace or securely supply that authentication integration; never trust identity headers supplied directly by visitors.

AI requires an owner-managed provider key. Server settings are documented in README.md: APP_SECRET, OWNER_EMAIL, and optionally OPENAI_API_KEY / OPENAI_MODEL. Visitors do not need individual keys. Configure secrets on your host, never in browser code.

## Included and excluded

Included: complete tracked source, bundled catalog, third-party notices present in the project, test files, and compiled output.
Excluded: node_modules (restored by npm ci), Git history, local caches, private environment files, production secrets, and live visitor/database records. This is a code/site export, not a backup of users' saved projects or inventories.

No new portable-host deployment was tested as part of this export. Existing functionality and limits are documented in README.md.
