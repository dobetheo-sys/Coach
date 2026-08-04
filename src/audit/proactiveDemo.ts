/**
 * R21 — SPEC EXÉCUTABLE DU COACH PROACTIF (`npm run demo:proactif`).
 *
 * Le harnais de régression demandé par le handoff : **rejouer 5 séances tests,
 * dont une sans déviation, et vérifier qu'aucun recalcul ne se déclenche à tort.**
 *
 * Il asserte trois familles, et la troisième est celle qui compte :
 *
 *   1. LES SEUILS MORDENT — >10 % d'intensité, séance manquée après 24 h,
 *      >15 % de charge sur 7 jours.
 *   2. LE RECALCUL EST BORNÉ — 14 jours, jamais le plan entier, jamais le passé.
 *   3. **IL NE REMONTE JAMAIS LA CHARGE.** C'est la garantie du manifeste
 *      (« on ne rattrape jamais le volume manqué ») portée jusque dans le
 *      déclencheur automatique. Un test qui vérifierait seulement « ça réagit »
 *      serait satisfait par un module dangereux.
 *
 * Comme `demo:readiness` et `demo:repair`, il sort en 1 à la moindre violation.
 */
import { generatePlan } from "../generator/planGenerator.ts";
import { toProfile } from "../app/bridge.ts";
import type { AppAnswers } from "../app/bridge.ts";
import type { V1Plan } from "../engine/types.ts";
import {
  detectDeviations, sessionKey, sessionIntensity,
  type IngestedSession,
} from "../coach/deviationDetector.ts";
import { onSessionIngested, recalculerFenetre, formatLog, FENETRE_RECALC_J } from "../coach/proactiveCoach.ts";
import { InAppSink, assertDeuxLignes } from "../coach/notificationSink.ts";
import { parseGpx, parseTcx } from "../readiness/gpxTcxParser.ts";
import { dayMinutes } from "../readiness/dailyAdjuster.ts";

let echecs = 0, total = 0;
function ok(cond: boolean, label: string): void {
  total++;
  if (cond) { console.log("  ✔ " + label); return; }
  echecs++;
  console.log("  ✖ " + label);
}
const titre = (t: string) => console.log("\n" + t + "\n" + "─".repeat(Math.min(78, t.length + 2)));

// ---- Un plan réel, daté, reproductible --------------------------------------
// Ancré au lundi comme les bancs (A-6) : sans ça, le verdict dépendrait du jour où
// la commande tourne — la famille de défauts que R20.7 a mise au jour six fois.
function lundiCourant(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (base: Date, n: number) => iso(new Date(base.getTime() + n * 864e5));

const L0 = lundiCourant();
const ANSWERS: AppAnswers = {
  format: "marathon", history: "confirme", level: "inter", intent: "competition",
  vol_max: "10", sessions_max: "6", dispo: "partielle", vol_recent: "8",
  pace_known: "oui", pace: "4:30", ftp_known: "non", css_known: "non",
  race_date: plus(L0, 20 * 7 - 1), plan_start: iso(L0),
  med_pain: "non", med_dizzy: "non", med_treat: "non", injury: "aucune",
  age: "38", sex: "H", terrain: "plat", off_days: "non", doubles: "non",
} as unknown as AppAnswers;

function frais(): { plan: V1Plan; reasoned: ReturnType<typeof generatePlan>["reasoned"] } {
  const { plan, reasoned } = generatePlan(toProfile("run", ANSWERS));
  return { plan, reasoned };
}

/** La première séance de course PASSÉE d'une intensité donnée, avec sa cible. */
function trouveSeance(plan: V1Plan, today: string, dur: boolean) {
  for (const w of plan.weeks)
    for (const d of w.days as (import("../engine/types.ts").V1Day & { date?: string })[]) {
      if (!d.date || d.date >= today) continue;
      for (let i = 0; i < d.sessions.length; i++) {
        const s = d.sessions[i];
        if (s.d !== "rn") continue;
        const z = (s.steps || []).find((st) => st.role === "body" && typeof st.zone === "string");
        if (!z) continue;
        const q = /\.(thr|vo2|mara|ss)$/.test(String(z.zone));
        if (q === dur) return { w, d, i, s, id: sessionKey(w.num, d.jour, i) };
      }
    }
  return null;
}

const { plan: p0 } = frais();
// « Aujourd'hui » = un mercredi de la 3ᵉ semaine : il y a du passé à mesurer et
// deux semaines d'avenir dans la fenêtre.
const TODAY = plus(L0, 2 * 7 + 2);
const REFS = { ftp: 250, thrPace: 270, css: 130 }; // pace 4:30 = 270 s/km

console.log("R21 — le coach proactif, spec exécutable");
console.log("Plan : marathon 20 semaines · aujourd'hui = " + TODAY);

// ================================================================================
titre("§1 — Les cinq séances rejouées (dont UNE sans déviation)");
// ================================================================================

const dure = trouveSeance(p0, TODAY, true);
const facile = trouveSeance(p0, TODAY, false);
ok(!!dure && !!facile, "le plan fournit une séance de qualité et une séance facile passées");

/** Fabrique une séance ingérée à X % de la cible d'allure de la séance planifiée. */
function ingereA(sPlan: { d: { date?: string }; s: import("../engine/types.ts").V1Session }, facteurAllure: number): IngestedSession {
  const z = (sPlan.s.steps || []).find((st) => st.role === "body" && typeof st.zone === "string")!;
  const suf = String(z.zone).split(".")[1];
  const mult: Record<string, number> = { easy: 1.21, rec: 1.34, mara: 1.10, thr: 1.02, vo2: 0.94 };
  const cibleSecKm = REFS.thrPace * (mult[suf] ?? 1.2);
  const secKm = cibleSecKm * facteurAllure; // <1 = plus rapide = plus dur
  return { date: sPlan.d.date!, d: "rn", minutes: Math.round(sPlan.s.min || 40), avgSpeedMs: 1000 / secKm, source: "test" };
}

// T1 — séance CONFORME : dans sa bande, aucun signal attendu.
{
  const { plan, reasoned } = frais();
  const c = trouveSeance(plan, TODAY, false)!;
  const sink = new InAppSink();
  const avant = JSON.stringify(plan.weeks.map((w) => w.days.map(dayMinutes)));
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [ingereA(c, 1.0)],
    done: toutCoche(plan, TODAY), completed: completedTout(plan, TODAY), today: TODAY, sink,
  });
  const intens = r.signals.filter((s) => s.type === "allure" || s.type === "puissance");
  ok(intens.length === 0, "T1 séance CONFORME → aucun signal d'intensité (" + intens.length + ")");
  ok(r.log.length === 0, "T1 → AUCUN recalcul déclenché à tort");
  ok(JSON.stringify(plan.weeks.map((w) => w.days.map(dayMinutes))) === avant, "T1 → le plan est identique, minute par minute");
  ok(sink.inbox.length === 0, "T1 → aucune notification émise");
}

// T2 — séance 15 % TROP RAPIDE : signal, et recalcul à la baisse.
{
  const { plan, reasoned } = frais();
  const c = trouveSeance(plan, TODAY, true)!;
  const sink = new InAppSink();
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [ingereA(c, 0.85)],
    done: toutCoche(plan, TODAY), completed: completedTout(plan, TODAY), today: TODAY, sink,
  });
  const sig = r.signals.find((s) => s.type === "allure" && s.direction === "au-dessus");
  ok(!!sig, "T2 séance 15 % au-dessus de sa cible → DeviationSignal d'allure");
  ok(!!sig && sig.magnitude > 0.10, "T2 → magnitude au-delà du seuil de 10 % (" + (sig ? Math.round(sig.magnitude * 100) : 0) + " %)");
  ok(!!sig && sig.session_id === c.id, "T2 → le signal porte la bonne séance (" + (sig ? sig.session_id : "—") + ")");
  ok(r.log.length > 0, "T2 → un recalcul est déclenché (" + r.log.length + " jour(s))");
  ok(sink.inbox.length === 1, "T2 → exactement une notification");
}

// T3 — séance MANQUÉE il y a plus de 24 h.
{
  const { plan, reasoned } = frais();
  const c = trouveSeance(plan, TODAY, true)!;
  const done = toutCoche(plan, TODAY);
  delete done[c.id]; // ni cochée, ni importée
  const sink = new InAppSink();
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [], done,
    completed: completedTout(plan, TODAY, c.id), today: TODAY, sink,
  });
  const sig = r.signals.find((s) => s.type === "seance_manquee" && s.session_id === c.id);
  ok(!!sig, "T3 séance sans trace après 24 h → DeviationSignal « seance_manquee »");
  ok(!!sig && sig.direction === "en-dessous", "T3 → direction « en-dessous »");
}

// T4 — la séance d'HIER n'est PAS déclarée manquée (moins de 24 h).
{
  const { plan } = frais();
  const hier = plus(L0, 2 * 7 + 1);
  const sigs = detectDeviations({
    plan, refs: REFS, ingested: [], done: {}, completed: [], today: TODAY,
  });
  const surHier = sigs.filter((s) => s.type === "seance_manquee" && s.date >= hier);
  ok(surHier.length === 0, "T4 → une séance de moins de 24 h n'est JAMAIS déclarée manquée (" + surHier.length + ")");
}

// T5 — charge 7 jours à +40 % : signal de surcharge.
{
  const { plan, reasoned } = frais();
  const comp = completedTout(plan, TODAY).map((c) => ({ ...c, minutes: Math.round(c.minutes * 1.4) }));
  const sink = new InAppSink();
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [], done: toutCoche(plan, TODAY),
    completed: comp, today: TODAY, sink,
  });
  const sig = r.signals.find((s) => s.type === "charge_7j");
  ok(!!sig, "T5 charge 7 j à +40 % → DeviationSignal « charge_7j »");
  ok(!!sig && sig.direction === "au-dessus" && sig.magnitude > 0.15, "T5 → au-dessus, au-delà du seuil de 15 %");
}

// ================================================================================
titre("§2 — Le recalcul est BORNÉ : 14 jours, jamais le plan entier, jamais le passé");
// ================================================================================
{
  const { plan, reasoned } = frais();
  const c = trouveSeance(plan, TODAY, true)!;
  const avant = new Map<string, number>();
  for (const w of plan.weeks) for (const d of w.days as { date?: string }[]) if (d.date) avant.set(d.date, dayMinutes(d as never));
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [ingereA(c, 0.85)],
    done: toutCoche(plan, TODAY), completed: completedTout(plan, TODAY), today: TODAY, sink: new InAppSink(),
  });
  // 14 EN DUR, ET C'EST LE POINT. Ma première écriture calculait cette borne depuis
  // `FENETRE_RECALC_J` — le critère déplaçait donc son propre poteau : porter la
  // constante à 400 laissait le test VERT. Un critère qui lit la valeur qu'il est censé
  // épingler ne mesure rien (la forme des deux motifs de garde démasqués en A-5/O-19).
  const FENETRE_ATTENDUE = 14;
  ok(FENETRE_RECALC_J === FENETRE_ATTENDUE, "la fenêtre déclarée vaut bien " + FENETRE_ATTENDUE + " jours (" + FENETRE_RECALC_J + ")");
  const fin = plus(new Date(TODAY + "T00:00:00Z"), FENETRE_ATTENDUE);
  let horsFenetre = 0, passeTouche = 0, changes = 0;
  for (const w of plan.weeks) for (const d of w.days as { date?: string }[]) {
    if (!d.date) continue;
    const a = avant.get(d.date)!, b = dayMinutes(d as never);
    if (Math.abs(a - b) < 0.5) continue;
    changes++;
    if (d.date <= TODAY) passeTouche++;
    if (d.date > fin) horsFenetre++;
  }
  ok(passeTouche === 0, "aucun jour PASSÉ n'est modifié (" + passeTouche + ")");
  ok(horsFenetre === 0, "aucun jour au-delà de " + FENETRE_RECALC_J + " jours n'est modifié (" + horsFenetre + ")");
  ok(changes > 0 && changes <= 3, "et le recalcul reste chirurgical : " + changes + " jour(s) touché(s), pas la fenêtre entière");
  ok(r.log.length === changes, "le journal compte exactement les jours modifiés (" + r.log.length + " = " + changes + ")");
}

// ================================================================================
titre("§3 — LA GARANTIE : jamais de charge en plus, sur AUCUN scénario");
// ================================================================================
{
  // Le scénario le plus tentant pour un moteur naïf : trois séances ratées.
  // C'est exactement là qu'un « rattrapage » s'écrirait tout seul.
  const { plan, reasoned } = frais();
  const avant = new Map<string, number>();
  for (const w of plan.weeks) for (const d of w.days as { date?: string }[]) if (d.date) avant.set(d.date, dayMinutes(d as never));
  const totalAvant = [...avant.values()].reduce((a, b) => a + b, 0);
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [], done: {}, completed: [], today: TODAY, sink: new InAppSink(),
  });
  let hausses = 0;
  for (const w of plan.weeks) for (const d of w.days as { date?: string }[]) {
    if (!d.date) continue;
    if (dayMinutes(d as never) > avant.get(d.date)! + 0.5) hausses++;
  }
  let totalApres = 0;
  for (const w of plan.weeks) for (const d of w.days) totalApres += dayMinutes(d);
  ok(r.signals.some((s) => s.type === "seance_manquee"), "des séances manquées SONT détectées");
  ok(hausses === 0, "aucun jour ne gagne de minutes (" + hausses + ") — « on ne rattrape jamais le volume manqué »");
  ok(totalApres <= totalAvant + 0.5, "le volume total du plan ne monte pas (" + Math.round(totalAvant) + " → " + Math.round(totalApres) + " min)");

  // ── ET LA GARANTIE EST TESTÉE LÀ OÙ ELLE PEUT CASSER ──
  //
  // Les deux critères ci-dessus décrivent une PROPRIÉTÉ du résultat ; ils ne disent pas
  // si quoi que ce soit l'empêche. Mesuré en cassant exprès : porter le facteur de
  // réduction à 1,2 les laissait VERTS. `reduceDay` protège `durationMin` et `distanceM`
  // par un `Math.min`, mais PAS `reps` — un bloc passe de 5 à 6 répétitions. La
  // garantie n'est donc pas structurelle, elle tient à une seule ligne, et c'est cette
  // ligne qu'il faut épingler.
  let leve = "";
  try {
    const { plan: p2, reasoned: r2 } = frais();
    // Un jour de qualité dans la fenêtre, dont le corps est à répétitions : le seul
    // profil de séance que `reduceDay` peut faire GROSSIR.
    const cible = joursQualiteFenetre(p2, TODAY)[0];
    if (!cible) throw new Error("PAS-DE-CIBLE");
    for (const s of cible.sessions) for (const st of (s.steps || [])) if (st.role === "body") { st.reps = 5; st.durationMin = 4; delete st.distanceM; }
    // On appelle la fonction qui PORTE l'assertion, avec un facteur qui augmente.
    // Pas de trappe de test dans le point d'entrée : un paramètre caché qui n'existe
    // que pour la mesure finirait par exister aussi en production.
    recalculerFenetre(r2, p2, TODAY, 1.2, "cassure délibérée");
  } catch (e) { leve = String((e as Error).message); }
  ok(/Invariant R21 violé/.test(leve), "un recalcul à la HAUSSE lève, il ne passe pas en silence (« " + leve.slice(0, 48) + " »)");
}

/** Les jours de qualité de la fenêtre — même sélection que le recalcul. */
function joursQualiteFenetre(plan: V1Plan, today: string) {
  const fin = plus(new Date(today + "T00:00:00Z"), 14);
  const out: (import("../engine/types.ts").V1Day & { date?: string })[] = [];
  for (const w of plan.weeks)
    for (const d of w.days as (import("../engine/types.ts").V1Day & { date?: string })[]) {
      if (!d.date || d.date <= today || d.date > fin) continue;
      if (d.sessions.some((s) => { const i = sessionIntensity(s); return i === "difficile" || i === "moderee"; })) out.push(d);
    }
  return out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// ================================================================================
titre("§4 — La notification : deux lignes, sans jargon");
// ================================================================================
{
  const { plan, reasoned } = frais();
  const c = trouveSeance(plan, TODAY, true)!;
  const sink = new InAppSink();
  const r = onSessionIngested({
    reasoned, plan, refs: REFS, ingested: [ingereA(c, 0.85)],
    done: toutCoche(plan, TODAY), completed: completedTout(plan, TODAY), today: TODAY, sink,
  });
  const n = r.notification!;
  ok(!!n, "une notification est produite");
  ok(n.lines.length <= 2, "elle tient en " + n.lines.length + " ligne(s)");
  let leve = false;
  try { assertDeuxLignes([n.lines.join(" "), "b", "c"]); } catch { leve = true; }
  ok(leve, "et le contrôle de format MORD (trois lignes lèvent)");
  ok(/^Écart détecté : /.test(n.lines[0]), "ligne 1 au format « Écart détecté : … »");
  ok(/J'ai ajusté .+ → .+\. Raison : /.test(n.lines[1]), "ligne 2 au format « J'ai ajusté … → …. Raison : … »");
  const jargon = /VO2max|CTL|ATL|TSB|Bosquet|Riegel|polaris|seuil lactique|Coggan/i;
  ok(!jargon.test(n.lines.join(" ")), "aucun jargon ni citation de méthodologie");
  console.log("\n  « " + n.lines.join("\n    ") + " »");
  console.log("\n  Journal :\n" + formatLog(r.log).split("\n").map((l) => "  " + l).join("\n"));
}

// ================================================================================
titre("§5 — Les parseurs GPX / TCX (aucune dépendance ajoutée)");
// ================================================================================
{
  const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Running">
    <Id>2026-08-01T06:12:00Z</Id>
    <Lap><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>6000</DistanceMeters>
      <AverageHeartRateBpm><Value>151</Value></AverageHeartRateBpm></Lap>
    <Lap><TotalTimeSeconds>1200</TotalTimeSeconds><DistanceMeters>4500</DistanceMeters></Lap>
  </Activity></Activities></TrainingCenterDatabase>`;
  const a = parseTcx(tcx)[0];
  ok(a.date === "2026-08-01" && a.d === "rn", "TCX : date et discipline lues");
  ok(a.minutes === 50 && a.distanceM === 10500, "TCX : les laps sont SOMMÉS (50 min, 10 500 m)");
  ok(Math.abs(a.avgSpeedMs! - 10500 / 3000) < 1e-9, "TCX : vitesse moyenne = distance / temps");
  ok(a.avgPowerW === undefined, "TCX sans capteur : la puissance reste ABSENTE, jamais estimée");

  // 1 km plein est-ouest en 300 s → 3,33 m/s. La latitude 0 simplifie la vérification.
  const pts = [0, 100, 200, 300].map((s, i) =>
    `<trkpt lat="0.0" lon="${(i * 0.0029919).toFixed(7)}"><time>2026-08-02T07:0${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}Z</time></trkpt>`).join("");
  const g = parseGpx(`<gpx><trk><type>running</type><trkseg>${pts}</trkseg></trk></gpx>`)[0];
  ok(g.date === "2026-08-02" && g.d === "rn", "GPX : date et discipline lues");
  ok(Math.abs(g.distanceM! - 1000) < 20, "GPX : distance par haversine (" + g.distanceM + " m pour 1 000 attendus)");
  ok(Math.abs(g.avgSpeedMs! - 1000 / 300) < 0.1, "GPX : vitesse moyenne cohérente");

  let refus = "";
  try { parseGpx(`<gpx><trk><trkseg><trkpt lat="0" lon="0"/><trkpt lat="0" lon="1"/></trkseg></trk></gpx>`); }
  catch (e) { refus = String((e as Error).message); }
  ok(/itinéraire sans temps/.test(refus), "GPX SANS horodatage : refus motivé, pas une durée inventée");
}

// ---- Utilitaires de scénario -------------------------------------------------
function toutCoche(plan: V1Plan, avant: string, sauf?: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const w of plan.weeks)
    for (const d of w.days as { date?: string; jour: string; sessions: unknown[] }[]) {
      if (!d.date || d.date >= avant) continue;
      d.sessions.forEach((_s, i) => {
        const id = sessionKey(w.num, d.jour, i);
        if (id !== sauf) out[id] = true;
      });
    }
  return out;
}
function completedTout(plan: V1Plan, avant: string, sauf?: string) {
  const out: { date: string; d: "rn" | "bk" | "sw" | "br" | "rs"; minutes: number }[] = [];
  for (const w of plan.weeks)
    for (const d of w.days as (import("../engine/types.ts").V1Day & { date?: string })[]) {
      if (!d.date || d.date >= avant) continue;
      d.sessions.forEach((s, i) => {
        if (s.d === "rs" || sessionKey(w.num, d.jour, i) === sauf) return;
        out.push({ date: d.date!, d: s.d, minutes: Math.round(s.min || 0) });
      });
    }
  return out;
}

console.log("\n" + "═".repeat(70));
if (echecs) {
  console.log("✖ R21 — " + echecs + " échec(s) sur " + total + " critères");
  process.exit(1);
}
console.log("✓ R21 — " + total + " critères verts : les seuils mordent, le recalcul est borné,");
console.log("        et il ne remonte JAMAIS la charge.");
