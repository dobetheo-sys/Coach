#!/usr/bin/env node
/**
 * Build de l'outil Bikefitting (bikefitting/, sa propre app React/Vite/MediaPipe — voir
 * INTEGRATION_HANDOFF.md) et copie du résultat dans endurabuild/bikefitting/, le sous-chemin
 * servi une fois la PWA déployée (endurabuild/ est l'artefact GitHub Pages, cf. pages.yml).
 *
 * DÉLIBÉRÉMENT hors du build zéro-dépendance du moteur (`build:app`/`build:sw`) : Bikefitting
 * a ses propres dépendances npm (React, MediaPipe), isolées dans bikefitting/ avec son propre
 * package.json. Rien de ce script ne touche src/ ni le moteur — l'engagement « zéro dépendance
 * pour le produit » (CLAUDE.md) porte sur le moteur de plans, pas sur un outil compagnon
 * autonome. `endurabuild/bikefitting/` est un artefact GÉNÉRÉ (gitignore), jamais commité —
 * comme bikefitting/dist/ et bikefitting/public/mediapipe-wasm/ dont il est la copie.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "bikefitting");
const DEST = join(ROOT, "endurabuild", "bikefitting");

if (!existsSync(join(SRC, "node_modules"))) {
  console.log("bikefitting/node_modules absent — npm ci");
  execFileSync("npm", ["ci"], { cwd: SRC, stdio: "inherit" });
}

console.log("bikefitting : npm run build");
execFileSync("npm", ["run", "build"], { cwd: SRC, stdio: "inherit" });

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(join(SRC, "dist"), DEST, { recursive: true });

console.log(`✓ bikefitting construit et copié dans ${DEST}`);
