/**
 * R21 — PARSEURS GPX ET TCX, zéro dépendance.
 *
 * ================================================================================
 * POURQUOI ILS N'EXISTAIENT PAS, ET POURQUOI ILS EXISTENT MAINTENANT
 * ================================================================================
 *
 * `measured.ts` annonce depuis son écriture que « l'athlète apporte ses fichiers
 * (FIT/GPX/TCX) ». Seul le FIT était livré. Les deux autres formats sont ceux que
 * rendent les exports Polar, Suunto, Zwift, TrainingPeaks et la plupart des
 * applications qui refusent le binaire Garmin — les ignorer revenait à réserver
 * l'import souverain aux possesseurs d'une montre Garmin.
 *
 * ================================================================================
 * CE QU'ILS LISENT, ET CE QU'ILS REFUSENT DE DEVINER
 * ================================================================================
 *
 * TCX est un format de RÉSUMÉ : chaque `<Lap>` porte `TotalTimeSeconds`,
 * `DistanceMeters`, éventuellement la FC et la puissance moyennes. On les somme.
 * C'est la lecture la plus fiable des trois formats.
 *
 * GPX n'a AUCUN résumé : il n'y a que des points. La durée vient de l'écart entre
 * le premier et le dernier `<time>`, la distance d'une somme de haversines. Deux
 * conséquences dites plutôt que cachées :
 *
 *   · un GPX sans horodatage (trace de parcours, pas d'activité) ne rend RIEN, et
 *     le dit — il décrit un itinéraire, pas une séance ;
 *   · la distance GPS est bruitée ; on ne l'utilise pas pour prétendre à une
 *     précision qu'elle n'a pas. Elle sert à une vitesse MOYENNE, la grandeur que
 *     le détecteur compare à une bande de plusieurs pour cent de large.
 *
 * **La puissance n'est jamais estimée.** Ni en GPX, ni en TCX quand le champ est
 * absent. O-22 a coûté 18 % d'erreur sur une FTP pour avoir dérivé une grandeur
 * d'une autre qui lui ressemblait ; on ne recommence pas avec un modèle de
 * puissance déduit d'une pente et d'une vitesse.
 *
 * ================================================================================
 * SUR L'ANALYSE PAR EXPRESSIONS RÉGULIÈRES
 * ================================================================================
 *
 * Il n'y a pas de DOM côté Node, et le dépôt s'interdit toute dépendance npm.
 * L'analyse est donc un balayage de motifs, ce qui est acceptable ICI et
 * seulement ici : les deux schémas sont figés depuis quinze ans, les champs lus
 * sont des feuilles sans attributs, et un fichier mal formé produit un refus
 * motivé plutôt qu'un chiffre faux. Ce n'est pas un analyseur XML général et il
 * ne doit jamais servir à autre chose.
 */
import type { IngestedSession } from "../coach/deviationDetector.ts";
import { assertImportSize } from "./importLimits.ts";

/** Rayon terrestre moyen (m) — WGS84, valeur usuelle. */
const R_TERRE = 6371000;

function haversine(la1: number, lo1: number, la2: number, lo2: number): number {
  const r = Math.PI / 180;
  const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** La date ISO (locale au fichier : les horodatages GPX/TCX sont en UTC). */
const jourDe = (iso: string): string => iso.slice(0, 10);

/**
 * Discipline déduite du libellé de sport du fichier. Un sport inconnu rend
 * « autre » — le détecteur ignore alors la séance au lieu de la ranger de force
 * dans une discipline, ce qui produirait une fausse correspondance.
 */
export function disciplineDe(sport: string | null | undefined): IngestedSession["d"] {
  const s = String(sport || "").toLowerCase();
  if (/run|cours|marche|walk|hik|trail/.test(s)) return "rn";
  if (/bik|cycl|ride|velo|vélo|virtual/.test(s)) return "bk";
  if (/swim|nage|nata/.test(s)) return "sw";
  return "autre";
}

const nombre = (x: string | undefined): number | undefined => {
  if (x == null) return undefined;
  const v = Number(x);
  return isFinite(v) ? v : undefined;
};

/** Toutes les valeurs d'une balise feuille, dans l'ordre du document. */
function feuilles(xml: string, tag: string): string[] {
  const re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([^<]*)</" + tag + ">", "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

// ================================================================================
// TCX
// ================================================================================

export function parseTcx(xml: string): IngestedSession[] {
  // S-8 — la borne est REJOUÉE ici : l'UI la vérifie déjà sur le fichier, mais un parseur
  // exporté peut être appelé par un autre chemin, et une garde qui dépend de son appelant
  // n'est pas une garde.
  assertImportSize("TCX", xml.length);
  if (!/<TrainingCenterDatabase/i.test(xml)) throw new Error("Ce fichier n'est pas un TCX (balise TrainingCenterDatabase absente)");
  const out: IngestedSession[] = [];
  const reAct = /<Activity\b([^>]*)>([\s\S]*?)<\/Activity>/gi;
  let m: RegExpExecArray | null;
  while ((m = reAct.exec(xml))) {
    const sport = (/Sport\s*=\s*"([^"]*)"/i.exec(m[1]) || [])[1];
    const corps = m[2];
    const id = feuilles(corps, "Id")[0];
    if (!id) continue; // un `<Id>` est l'horodatage de départ : sans lui, pas de date
    let sec = 0, dist = 0, hrSum = 0, hrN = 0, pwSum = 0, pwN = 0;
    const reLap = /<Lap\b[^>]*>([\s\S]*?)<\/Lap>/gi;
    let l: RegExpExecArray | null;
    while ((l = reLap.exec(corps))) {
      const lap = l[1];
      sec += nombre(feuilles(lap, "TotalTimeSeconds")[0]) || 0;
      dist += nombre(feuilles(lap, "DistanceMeters")[0]) || 0;
      // `<AverageHeartRateBpm><Value>…` : la feuille utile est `Value`, imbriquée.
      const hrBloc = /<AverageHeartRateBpm[^>]*>([\s\S]*?)<\/AverageHeartRateBpm>/i.exec(lap);
      const hr = hrBloc ? nombre(feuilles(hrBloc[1], "Value")[0]) : undefined;
      if (hr) { hrSum += hr; hrN++; }
      // La puissance vit dans les extensions Garmin ; absente, elle reste ABSENTE.
      const pw = nombre(feuilles(lap, "ns3:AvgWatts")[0]) ?? nombre(feuilles(lap, "AvgWatts")[0]);
      if (pw) { pwSum += pw; pwN++; }
    }
    if (sec <= 0) continue;
    out.push({
      date: jourDe(id),
      d: disciplineDe(sport),
      minutes: Math.round(sec / 60),
      distanceM: dist > 0 ? Math.round(dist) : undefined,
      avgSpeedMs: dist > 0 ? dist / sec : undefined,
      avgPowerW: pwN ? Math.round(pwSum / pwN) : undefined,
      source: "TCX",
    });
    void hrN; void hrSum; // lus pour valider le format, non utilisés par le détecteur
  }
  if (!out.length) throw new Error("Aucune activité exploitable dans ce TCX (ni durée, ni date de départ)");
  return out;
}

// ================================================================================
// GPX
// ================================================================================

export function parseGpx(xml: string): IngestedSession[] {
  assertImportSize("GPX", xml.length);
  if (!/<gpx/i.test(xml)) throw new Error("Ce fichier n'est pas un GPX (balise gpx absente)");
  const out: IngestedSession[] = [];
  const reTrk = /<trk>([\s\S]*?)<\/trk>/gi;
  let m: RegExpExecArray | null;
  while ((m = reTrk.exec(xml))) {
    const trk = m[1];
    const type = feuilles(trk, "type")[0];
    const pts: { lat: number; lon: number; t: number }[] = [];
    const rePt = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
    let p: RegExpExecArray | null;
    while ((p = rePt.exec(trk))) {
      const lat = nombre((/lat\s*=\s*"([^"]*)"/i.exec(p[1]) || [])[1]);
      const lon = nombre((/lon\s*=\s*"([^"]*)"/i.exec(p[1]) || [])[1]);
      const ts = feuilles(p[2], "time")[0];
      if (lat == null || lon == null || !ts) continue;
      const t = Date.parse(ts);
      if (!isFinite(t)) continue;
      pts.push({ lat, lon, t });
    }
    // Un GPX sans horodatage décrit un ITINÉRAIRE, pas une séance. On refuse, et on
    // le dit : en tirer une durée reviendrait à inventer le temps passé dessus.
    if (pts.length < 2) continue;
    const sec = (pts[pts.length - 1].t - pts[0].t) / 1000;
    if (sec <= 0) continue;
    let dist = 0;
    for (let i = 1; i < pts.length; i++) dist += haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
    out.push({
      date: new Date(pts[0].t).toISOString().slice(0, 10),
      d: disciplineDe(type),
      minutes: Math.round(sec / 60),
      distanceM: Math.round(dist),
      avgSpeedMs: dist > 0 ? dist / sec : undefined,
      // Pas de puissance en GPX standard, et on n'en DÉDUIT pas (leçon O-22).
      source: "GPX",
    });
  }
  if (!out.length) throw new Error("Aucune trace horodatée dans ce GPX — un itinéraire sans temps ne décrit pas une séance");
  return out;
}

/** Aiguillage sur l'extension, avec un refus lisible pour tout le reste. */
export function parseActivityText(nom: string, texte: string): IngestedSession[] {
  if (/\.tcx$/i.test(nom)) return parseTcx(texte);
  if (/\.gpx$/i.test(nom)) return parseGpx(texte);
  throw new Error("Format non reconnu : « " + nom +" » (attendus : .gpx, .tcx — le .fit passe par son propre parseur)");
}
