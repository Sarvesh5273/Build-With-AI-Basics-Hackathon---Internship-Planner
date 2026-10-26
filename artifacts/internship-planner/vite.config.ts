import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  css: { transformer: 'postcss' },
  server: { host: '0.0.0.0', allowedHosts: true, fs: {
    strict:true,
    allow:[fileURLToPath(new URL('.',import.meta.url)),fileURLToPath(new URL('../../node_modules',import.meta.url))],
    deny:['**/.env','**/.env.*','**/.git/**','**/private-runtime/**','**/generated-artifacts/**','**/devpost/learner-profile.md'],
  }},
  build: { outDir: 'dist/public', emptyOutDir: true, cssMinify: 'esbuild' },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
