import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/color-palette-creator/',
  plugins: [react()]
});
