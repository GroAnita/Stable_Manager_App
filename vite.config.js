import { defineConfig } from 'vite'

export default defineConfig({
  // Capacitor's native builds serve the app from the WebView's own root, so
  // they need '/'. GitHub Pages serves this as a project page under
  // /Stable_Manager_App/, so the web build needs that prefix instead.
  base: process.env.GITHUB_PAGES ? '/Stable_Manager_App/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
