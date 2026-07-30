/**
 * Sport TRAIL (registre R10). Le trail était DÉJÀ modulaire depuis R7 (`trailModel.ts` +
 * `trailLibrary.ts`) : c'est ce précédent que la phase 1 généralise. Son entrée dans le
 * registre ne déplace donc aucun code — elle DÉCLARE ce que le trail avait obtenu par des
 * `if` dispersés, dont le plafond de jours d'appui (D10-3) qui lui échappait justement parce
 * qu'il n'était déclaré nulle part.
 */
import type { V1Session } from "../../engine/types.ts";
import { buildTrailSessions, trailWeekSchema } from "../../generator/trailLibrary.ts";
import { registerSport, type SessionKit, type Slot } from "../registry.ts";

// Nom UNIQUE dans tout le projet : le bundle (`npm run build:app`) concatène les modules
// dans une seule portée, un `buildSessions` local écraserait le dispatch de sessionLibrary.
function buildTrailSessionsFromKit(kit: SessionKit): V1Session[] {
  // Le module trail lit le plan raisonné directement (objectif + axes verticaux) : il n'a
  // pas besoin de la boîte à outils commune, ses séances se décrivent en temps + D+ + D−.
  return buildTrailSessions(kit.r, kit.slot as Slot, kit.phase, kit.prog, kit.weekNum);
}

registerSport({
  id: "trail",
  mainDiscipline: "rn",
  // "facileR", PAS "facile2" : c'est ce que l'ancien code faisait (`sport === "run" ? … : …`
  // ne connaissait que la course). Le déclarer autrement changerait les plans trail — ce
  // serait une DÉCISION, pas une extraction. Candidate à réexaminer (voir R10_DEFECTS.md).
  easyFallbackSlot: "facileR",
  weekSchema: (phase, isRecup, r) => trailWeekSchema(phase, isRecup, r.trail!.category),
  buildSessions: buildTrailSessionsFromKit,
  retestTypes: ["thrPace", "vam"],
  // D10-3 — LE drapeau qui manquait : le trail cumule l'impact de la course et la charge
  // excentrique de la descente. Il est plafonné en jours d'appui comme la course.
  guards: { runImpactCap: true },
});
