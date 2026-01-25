import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig(({ command, mode }) => ({
  // Deploy to root domain (mmilanta.github.io/)
  base: '/',
  optimizeDeps: {
    exclude: ['algo.js', 'pyodide'], // Exclude both from optimization
  },
  build: {
    rollupOptions: {
      external: ['pyodide'], // Don't bundle pyodide
      input: {
        index: resolve(__dirname, 'index.html'),
        probabilityCalculator: resolve(__dirname, 'probability-calculator/index.html'),
        optimalTennisMatch: resolve(__dirname, 'optimal-tennis-match/index.html'),
      },
    }
  },
  plugins: [
    tailwindcss(),
  ],
}));