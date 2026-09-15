/**
 * B1 — UNE DÉCISION RÉPÉTÉE SE DIT UNE FOIS, AVEC SON « QUAND ».
 *
 * MESURÉ AVANT D'ÊTRE ÉCRIT, sur les 1 066 plans du corpus : `RC1` compte **8 778
 * occurrences sur 501 plans pour UN SEUL couple (pourquoi + valeur)** — la même phrase de
 * 262 caractères, répétée une fois par semaine de charge. Sur le profil audité, 33 des
 * 48 lignes (69 %) portaient un `why` déjà écrit plus haut. Une liste où vingt-sept lignes
 * disent la même chose enseigne à ne plus la lire, et c'est là que vivent les décisions qui
 * comptent (ce qui borne le plan, les paliers de nage, le manque, la fréquence).
 *
 * L'agrégation vit ICI et pas à l'affichage : le moteur annoncerait 48 pendant que l'écran
 * en montrerait 18 — deux comptes pour une grandeur, sur la carte même où O-96 a déjà payé
 * ce défaut. Une seule source, et l'export comme le journal en profitent.
 *
 * **Le « quand » n'est pas perdu.** Une décision agrégée doit pouvoir répondre à « quand ? » :
 * les semaines sont conservées et compactées. Le champ de semaine est `wk`, celui que
 * `repairLoop` lit déjà sur les décisions `C30b` — on ne crée pas un second nom pour une
 * grandeur qui en a un (R11.1).
 */
import type { Decision } from "./types.ts";

/**
 * Compacte une liste de semaines. DEUX formes, toutes deux EXACTES, et on rend la PLUS
 * COURTE — de cette façon aucun seuil n'est à choisir (règle 19 : un test qu'une valeur
 * épinglée sur la borne satisfait est un test sous-spécifié ; ici il n'y a pas de borne à
 * épingler). « S3-S7, S9-S14 » quand les trous sont nombreux, « S3-S29 sauf S8, S15 »
 * quand ils sont rares — jamais un arrondi, jamais un « … ».
 */
export function compacterSemaines(ns: number[]): string {
  const u = [...new Set(ns.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  if (!u.length) return "";
  if (u.length === 1) return "S" + u[0];
  const plages: string[] = [];
  let deb = u[0], prec = u[0];
  for (let i = 1; i <= u.length; i++) {
    const v = u[i];
    if (v === prec + 1) { prec = v; continue; }
    plages.push(deb === prec ? "S" + deb : "S" + deb + "-S" + prec);
    deb = v; prec = v;
  }
  const formePlages = plages.join(", ");
  const presents = new Set(u);
  const trous: number[] = [];
  for (let v = u[0]; v <= u[u.length - 1]; v++) if (!presents.has(v)) trous.push(v);
  const formeTrous = trous.length
    ? "S" + u[0] + "-S" + u[u.length - 1] + " sauf " + trous.map((t) => "S" + t).join(", ")
    : "S" + u[0] + "-S" + u[u.length - 1];
  return formeTrous.length <= formePlages.length ? formeTrous : formePlages;
}

/**
 * Regroupe les décisions IDENTIQUES et leur attache leur « quand ».
 *
 * La clé est le QUADRUPLET `id + what + val + why` : deux doses qui ne déplacent pas la même
 * chose (`RN1` porte 5 valeurs distinctes sur le corpus) restent DEUX lignes, chacune avec
 * ses semaines. Agréger sur le seul `why` aurait effacé la valeur — un compte se publie avec
 * ce qu'il compte.
 *
 * `niveau` est STRUCTUREL, jamais une liste d'identifiants (une liste diverge, R11.1) : une
 * décision attachée à une semaine décrit une MÉCANIQUE qui se répète (niveau 2, journal
 * technique) ; une décision sans semaine est un choix de PLAN, celui que l'athlète est venu
 * lire (niveau 1).
 */
export function agregerDecisions(decisions: Decision[]): { decisions: Decision[]; repetitions: number } {
  const SEP = String.fromCharCode(0);
  const index = new Map<string, Decision>();
  const semaines = new Map<string, number[]>();
  const out: Decision[] = [];
  let repetitions = 0;
  for (const d of decisions) {
    const cle = d.id + SEP + d.what + SEP + String(d.val) + SEP + d.why;
    let vu = index.get(cle);
    if (!vu) {
      vu = { ...d };
      index.set(cle, vu);
      out.push(vu);
    } else {
      repetitions++;
    }
    if (d.wk != null && Number.isFinite(d.wk)) {
      const l = semaines.get(cle);
      if (l) l.push(d.wk); else semaines.set(cle, [d.wk]);
    }
  }
  for (const d of out) {
    const cle = d.id + SEP + d.what + SEP + String(d.val) + SEP + d.why;
    const ns = semaines.get(cle);
    if (ns && ns.length) {
      d.quand = compacterSemaines(ns);
      if (ns.length > 1) d.n = ns.length;
    }
    d.niveau = d.wk != null ? 2 : 1;
  }
  return { decisions: out, repetitions };
}
