import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Static website build: `npx vite build --config vite.static.config.ts` writes dist-static/
// (page, assets and the bundled catalog) for any static host.
export default defineConfig({
  root:path.resolve(__dirname,'static'),
  base:'./',
  publicDir:path.resolve(__dirname,'public'),
  plugins:[react()],
  resolve:{alias:{'@':path.resolve(__dirname)}},
  build:{outDir:path.resolve(__dirname,'dist-static'),emptyOutDir:true,chunkSizeWarningLimit:4000},
});
