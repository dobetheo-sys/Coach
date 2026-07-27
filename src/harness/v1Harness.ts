/**
 * Harnais V1 — charge le moteur de endurabuild-3.html dans Node.
 *
 * Pièges connus (note.md), traités ici :
 * - extraction du <script> par regex, retrait du `renderStep();` final par REGEX
 * - eval INDIRECT `(0,eval)(code)` + ligne d'export ajoutée à la chaîne évaluée
 *   (les const/let top-level ne s'attachent pas à globalThis)
 * - stub DOM minimal (document/window/Blob/URL) posé AVANT l'eval
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface V1Session {
  d: "rn" | "bk" | "sw" | "br" | "rs";
  name: string;
  det: string;
}
export interface V1Day {
  week: number;
  jour: string;
  charge: "dur" | "facile" | "recup" | "off";
  slot: string;
  forced: boolean;
  isR: boolean;
  phaseId: string;
  prog: number;
  sessions: V1Session[];
}
export interface V1Week {
  num: number;
  phase: { id: string; nom: string };
  vol: number; // heures hebdo déclarées par le générateur
  days: V1Day[];
  isRecup: boolean;
  race?: string;
}
export interface V1Plan {
  weeks: V1Week[];
  volPeak: number;
  volBase: number;
  use10: boolean;
  totalWeeks: number;
}
export interface V1Engine {
  buildPlan: (a: Record<string, string>) => V1Plan;
  SPORTS: Record<string, { nom: string; formats: [string, string][]; minWeeks: Record<string, number> }>;
  S: { sport: string | null; answers: Record<string, string>; tier: string };
}

function domStub(): void {
  const el = () => ({
    innerHTML: "",
    value: "",
    style: {},
    dataset: {} as Record<string, string>,
    disabled: false,
    onclick: null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    appendChild() {},
    removeChild() {},
    querySelectorAll: () => [] as unknown[],
    click() {},
  });
  const g = globalThis as Record<string, unknown>;
  g.document = {
    getElementById: () => el(),
    createElement: () => el(),
    body: el(),
    addEventListener() {},
  };
  g.window = { scrollTo() {}, addEventListener() {} };
  if (!g.Blob) g.Blob = class { constructor(_p: unknown[], _o?: unknown) {} };
  const urlObj = g.URL as { createObjectURL?: unknown; revokeObjectURL?: unknown };
  if (!urlObj.createObjectURL) urlObj.createObjectURL = () => "blob:stub";
  if (!urlObj.revokeObjectURL) urlObj.revokeObjectURL = () => {};
}

export function loadV1(htmlPath?: string): V1Engine {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = htmlPath ?? join(here, "..", "..", "endurabuild-3.html");
  const html = readFileSync(path, "utf8");

  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("Aucun bloc <script> trouvé dans " + path);
  let code = m[1];

  // Retirer l'appel d'init final (par regex, pas par numéro de ligne)
  code = code.replace(/\n\s*renderStep\(\);\s*$/m, "\n");
  if (/^\s*renderStep\(\);\s*$/m.test(code)) {
    throw new Error("renderStep() top-level toujours présent après nettoyage");
  }

  domStub();
  // Export explicite dans la chaîne évaluée : const/let top-level restent
  // dans le scope de l'eval, ils ne s'attachent jamais à globalThis.
  const exported = code + "\nglobalThis.__V1 = { S, SPORTS, buildPlan, evalRules };\n";
  (0, eval)(exported); // eval indirect → scope global, pas le scope module

  const v1 = (globalThis as Record<string, unknown>).__V1 as V1Engine | undefined;
  if (!v1 || typeof v1.buildPlan !== "function") {
    throw new Error("Échec d'extraction du moteur V1 (buildPlan introuvable)");
  }
  return v1;
}
