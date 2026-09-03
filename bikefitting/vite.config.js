import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base RELATIVE : ce build est copié tel quel sous endurabuild/bikefitting/ par
// `npm run build:bikefitting` (racine du dépôt Zenna), et endurabuild/ lui-même est
// déployé tantôt à la racine du domaine, tantôt sous /Coach/ (GitHub Pages sans domaine
// personnalisé) — voir endurabuild/manifest.json, qui utilise les mêmes chemins relatifs
// pour la même raison. Un chemin absolu casserait selon l'endroit où le site est servi.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
