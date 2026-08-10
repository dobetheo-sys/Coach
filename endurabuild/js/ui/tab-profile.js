// Onglet 📋 Profil — résumé éditable des réglages + journal d'évolution horodaté.
// Le journal ÉTEND le mécanisme existant S.answers.tests (déjà daté, déjà nourri par
// import FIT/Strava) : toute modification manuelle y est consignée {type, value,
// date, prev, source} — pas de nouvelle structure de données (brief onglets).
// Toute donnée utilisateur réaffichée passe par esc() avant innerHTML (anti-XSS).
import { SPORTS, VLAB, VLAB_Q } from "../config.js";
import { previewMeasured, measuredHours, refreshMeasured, clearMeasured } from "../measured.js";
import { $, S, ebActivate, ebNewPlanEntry, ebSave, esc, todayISO } from "../state.js";
import { curSteps, renderStep, reset, ebParseT, stravaImport } from "./steps.js";
import { renderPlan } from "./plan-view.js";
import { retestPlannerHTML, bindRetestPlanner } from "./retest.js";
import { aide } from "./help.js";
import { stravaConnect, stravaAccessToken, stravaDisconnect, stravaRelayUrl } from "../strava.js";
import { requestNotifyPermission } from "../notifications.js";
import { avatarTriDataFor } from "./avatar.js";
import { planEndDate } from "./session-life.js";
// R25 étape 4 — le COMPOSITE remplace l'ancien rendu 16 niveaux sur la carte (l'ancien
// module reste exporté et gardé par smoke-avatar : c'est le moteur de boucles qui prend
// le relais côté écran, pas une suppression).
import { avatarTriSVG, avatarTriStorySVG, avatarTriUnlock, avatarTriAccent } from "./avatar-tri.js";
import { shareStory, storyBlob, _dl } from "../export.js";
import { trapModal } from "./modal.js";
import { evalRules } from "./steps.js";
import { ensurePlan, invalidatePlan } from "./tabs.js";
import { DISC } from "./icons.js";

const _fmtSec = (s) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");
const _fmtColon = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

// Le moteur V2 ne lit QUE les valeurs courantes (a.ftp/a.pace/a.css + *_known) — jamais
// le journal daté S.answers.tests. Sans ce pont, un import (FIT/Strava) écrirait le
// journal mais le plan généré ne changerait JAMAIS (bug corrigé : « chaque paramètre
// doit influencer le plan »). Applique le test le PLUS RÉCENT de chaque type ; renvoie
// le nombre de références effectivement mises à jour.
export function syncRefsFromTests() {
  const tests = Array.isArray(S.answers.tests) ? S.answers.tests : [];
  // O-23 — « LATEST » RENDAIT LE PLUS ANCIEN QUAND DEUX TESTS PARTAGENT UNE DATE.
  //
  // Le tri ne portait que sur la DATE, et `Array.prototype.sort` est STABLE depuis ES2019 :
  // à date égale, l'ordre d'insertion est conservé, donc `[0]` est le PREMIER inséré —
  // c'est-à-dire le plus VIEUX. Une fonction nommée `latest` qui rend le plus ancien.
  //
  // Ce n'est pas un cas de bord : plusieurs tests le même jour, c'est la normale. Le
  // fondateur a lancé trois imports Strava d'affilée en branchant son compte ; mesuré sur
  // son journal, un quatrième import corrigé (FTP 230 W) n'aurait RIEN changé — `latest`
  // aurait continué de rendre le 188 W du premier. Le correctif d'O-22 serait resté
  // invisible, et on aurait cherché le défaut dans l'import.
  //
  // Le moteur, lui, était juste : `measuredRate` (projection.ts) trie en ordre CROISSANT et
  // prend le dernier élément, donc à date égale il obtient bien le plus récent. Les deux
  // chemins disaient déjà deux choses différentes du même journal.
  //
  // À date égale, on départage par POSITION : le journal est append-only, l'ordre du tableau
  // est donc l'ordre chronologique à l'intérieur d'une journée.
  //
  // O-25 — SAUF QUE LA POSITION SEULE DÉFAISAIT LA CORRECTION DE L'ATHLÈTE.
  //
  // Le message de l'import promet depuis son écriture : « la saisie manuelle prime TOUJOURS sur
  // l'import ». Elle ne primait pas. La saisie et l'import atterrissent dans le MÊME journal, à
  // la MÊME date, et le départage par position fait gagner le dernier inséré — c'est-à-dire
  // l'import, puisque l'ordre naturel est de corriger d'abord et de réimporter ensuite. Mesuré
  // sur le compte du fondateur : allure seuil corrigée à 4'42, réimport, retour à 5'37, sans
  // qu'aucun message ne le signale.
  //
  // La règle devient celle que le produit promettait déjà : **une valeur SAISIE bat tout import
  // du même jour**. Au-delà, la date reprend la main — un import postérieur dit quelque chose de
  // neuf (une course courue trois semaines plus tard), et geler la valeur à vie serait le défaut
  // symétrique de celui qu'on corrige.
  //
  // Le retest guidé compte comme une saisie : c'est un protocole exécuté volontairement, pas une
  // déduction faite à la place de l'athlète.
  const DELIBERE = (t) => /^(profil|retest)/.test(String(t.source || ""));
  const latest = (type) => {
    const c = tests.map((t, i) => ({ t, i })).filter(({ t }) => t.type === type && isFinite(t.value));
    c.sort((x, y) =>
      String(y.t.date || "").localeCompare(String(x.t.date || ""))
      || (DELIBERE(y.t) ? 1 : 0) - (DELIBERE(x.t) ? 1 : 0)
      || (y.i - x.i));
    return c.length ? c[0].t : undefined;
  };
  let n = 0;
  const ftp = latest("ftp");
  if (ftp) { const v = String(Math.round(ftp.value)); if (S.answers.ftp_known !== "oui" || S.answers.ftp !== v) { S.answers.ftp = v; S.answers.ftp_known = "oui"; n++; } }
  const pace = latest("thrPace");
  if (pace) { const v = _fmtColon(pace.value); if (S.answers.pace_known !== "oui" || S.answers.pace !== v) { S.answers.pace = v; S.answers.pace_known = "oui"; n++; } }
  const css = latest("css");
  if (css) { const v = _fmtColon(css.value); if (S.answers.css_known !== "oui" || S.answers.css !== v) { S.answers.css = v; S.answers.css_known = "oui"; n++; } }
  // R12.2/R12.3 — la VAM suit le même pont que les trois autres références : sans lui, un test
  // ou un import écrirait le journal sans que le plan change JAMAIS (bug déjà corrigé une fois).
  const vam = latest("vam");
  if (vam) { const v = String(Math.round(vam.value)); if (S.answers.vam_known !== "oui" || S.answers.vam !== v) { S.answers.vam = v; S.answers.vam_known = "oui"; n++; } }
  return n;
}

// Libellé lisible d'une entrée du journal (types tests existants + types « profil: »).
function journalLabel(t) {
  const v = t.value;
  switch (t.type) {
    case "ftp": return "FTP " + esc(v) + "W";
    case "thrPace": return "Allure seuil " + esc(_fmtSec(+v)) + "/km";
    case "css": return "CSS " + esc(_fmtSec(+v)) + "/100m";
    case "vam": return "VAM " + esc(Math.round(+v)) + " m/h";
    case "cs": return "Vitesse critique " + esc(v);
    case "vma": return "VMA " + esc(v) + " km/h";
    case "profil:vol_max": return "Volume max " + esc(v) + "h/sem";
    case "profil:vol_recent": return "Volume récent " + esc(v) + "h/sem (point de départ)";
    case "profil:race_inter": return "Courses intermédiaires : " + esc(v);
    case "profil:weight": return "Poids " + esc(v) + " kg";
    case "profil:sessions_max": return esc(v) + " séances/sem max";
    default: return esc(t.type) + " = " + esc(v);
  }
}
function journalPrev(t) {
  if (t.prev == null) return "";
  const f = t.type === "thrPace" || t.type === "css" ? _fmtSec(+t.prev) : String(t.prev) + (t.type === "ftp" ? "W" : "");
  return esc(f) + " → ";
}

// R4-5 — Records personnels : PURE lecture/agrégation de l'existant (aucune nouvelle
// structure de données). Deux sources : le journal d'évolution S.answers.tests (références
// physiologiques datées — on garde la MEILLEURE, pas la dernière) et les séances réellement
// faites (✓ du plan + imports FIT) pour les records empiriques (plus longue séance).
// R11.1 — dérivé de DISC (./icons.js), plus une copie parallèle du même libellé.
const DISC_LABEL = Object.fromEntries(["rn", "bk", "sw", "br"].map((k) => [k, DISC[k].ic + " " + DISC[k].label]));
/**
 * R16.7 — REPLIER LES BLOCS SECONDAIRES DU PROFIL.
 *
 * La page défilait d'un seul tenant sur quinze sections : éditer sa FTP demandait de traverser
 * tout le reste. Ce qui reste OUVERT est ce qu'on vient consulter ou modifier (avatar, plans,
 * échéance, résumé, références, retest) ; ce qui se replie est ce qu'on vient CHERCHER quand on
 * le veut (records, badges, efficience, sauvegarde, journal).
 *
 * Le mécanisme est celui qui existe déjà pour « Conseils personnalisés » : `<details>`, donc
 * accessible au clavier et lisible par un lecteur d'écran sans rien de spécifique à écrire.
 * On transforme la carte plutôt que de dupliquer son rendu — un second chemin de rendu serait
 * un second endroit à corriger.
 */
function repliable(h, ouvert) {
  if (!h) return h;
  h = h.replace('<div class="load-card">', '<details class="load-card"' + (ouvert ? " open" : "") + ">");
  // R24.1 — LA CAUSE RÉELLE DE « record personnel sort du cadre » (retour fondateur, 06/08).
  // L'ancienne regex NON-GOURMANDE fermait le <summary> au PREMIER </div> rencontré — or un
  // titre qui porte une infobulle aide() contient les <div> de l'infobulle : le summary se
  // fermait au milieu, le parseur HTML recollait les morceaux, et TOUT le corps de la carte
  // (les lignes de records) était expulsé HORS du <details> — littéralement hors du cadre.
  // On cherche donc le </div> qui ferme VRAIMENT le titre, en comptant la profondeur.
  const OUV = '<div class="load-title">';
  const deb = h.indexOf(OUV);
  if (deb >= 0) {
    const re = /<div\b|<\/div>/g;
    re.lastIndex = deb + OUV.length;
    let depth = 1, m, fin = -1;
    while ((m = re.exec(h))) {
      depth += m[0] === "</div>" ? -1 : 1;
      if (depth === 0) { fin = m.index; break; }
    }
    if (fin > 0) {
      h = h.slice(0, deb) + '<summary class="load-title" style="cursor:pointer">'
        + h.slice(deb + OUV.length, fin) + "</summary>" + h.slice(fin + "</div>".length);
    }
  }
  return h.replace(/<\/div>\s*$/, "</details>");
}

function recordsHTML(plan, a) {
  const rows = [];
  // R23.1 — LE JOURNAL EXISTANT PORTE DÉJÀ DES ARTEFACTS, et c'est le symptôme qu'on m'a
  // remonté : « un seuil à moins d'une minute au kilomètre ». Borner les ÉCRITURES protège les
  // imports à venir ; ça ne nettoie pas ce qui est déjà écrit chez les gens. On filtre donc
  // aussi à la LECTURE — un record est ce qu'on a fait de mieux, pas ce qu'une trace a cru voir.
  const _borne = globalThis.EBV2 && globalThis.EBV2.testDansBornes;
  const tests = Array.isArray(a.tests)
    ? a.tests.filter((t) => isFinite(+t.value) && (!_borne || _borne(t.type, +t.value) != null))
    : [];
  const best = (type, cmp) => tests.filter((t) => t.type === type).sort(cmp)[0];
  const ftp = best("ftp", (x, y) => y.value - x.value);
  if (ftp) rows.push({ lab: "⚡ Meilleure FTP", val: Math.round(ftp.value) + " W", date: ftp.date });
  const pace = best("thrPace", (x, y) => x.value - y.value);
  if (pace) rows.push({ lab: "⏱ Meilleure allure seuil", val: _fmtSec(+pace.value) + " /km", date: pace.date });
  const css = best("css", (x, y) => x.value - y.value);
  if (css) rows.push({ lab: "🏊 Meilleur CSS", val: _fmtSec(+css.value) + " /100m", date: css.date });
  const vma = best("vma", (x, y) => y.value - x.value);
  if (vma) rows.push({ lab: "💨 Meilleure VMA", val: vma.value + " km/h", date: vma.date });
  // Records empiriques — plus longue séance FAITE par discipline (✓ datés + FIT importés)
  const longest = {};
  const seen = (d, minutes, date) => {
    if (!minutes || !DISC_LABEL[d]) return;
    if (!longest[d] || minutes > longest[d].minutes) longest[d] = { minutes, date };
  };
  const done = a.done || {};
  if (plan) for (const w of plan.weeks) for (const dd of w.days) dd.sessions.forEach((s, si) => {
    if (s.d !== "rs" && done[w.num + "|" + dd.jour + "|" + si]) seen(s.d, Math.round(s.min || 0), dd.date);
  });
  (Array.isArray(a.fitSessions) ? a.fitSessions : []).forEach((c) => seen(c.d, c.minutes, c.date));
  Object.keys(longest).forEach((d) => rows.push({ lab: DISC_LABEL[d] + " — plus longue séance", val: Math.floor(longest[d].minutes / 60) + "h" + String(longest[d].minutes % 60).padStart(2, "0"), date: longest[d].date }));
  let h = '<div class="load-card"><div class="load-title">🏅 Records personnels' + aide('Un record se gagne, il ne se perd pas — on garde la meilleure valeur jamais atteinte, avec sa date.', { label: 'les records personnels' }) + '</div>';
  if (!rows.length) h += '<div class="load-sub" style="margin-top:6px">Encore vides — ils se rempliront avec tes tests (FTP/allure/CSS), tes imports FIT/Strava et tes séances cochées ✓.</div>';
  // R24.1 — « record personnel sort du cadre » (retour fondateur, 06/08) : la ligne était un
  // flex SANS retour à la ligne — un libellé long (« 🏃 Course à pied — plus longue séance »)
  // plus une valeur datée dépassaient du cadre sur mobile. `flex-wrap` + `min-width:0` : la
  // valeur passe à la ligne sous le libellé au lieu de percer la carte.
  else rows.forEach((r) => { h += '<div style="display:flex;justify-content:space-between;gap:4px 8px;margin:6px 0;font-size:var(--fs-md);align-items:baseline;flex-wrap:wrap"><span style="min-width:0;overflow-wrap:anywhere">' + r.lab + '</span><span style="text-align:right;min-width:0;margin-left:auto"><b>' + esc(r.val) + '</b>' + (r.date ? ' <span style="color:var(--muted);font-size:var(--fs-xs)">' + esc(r.date) + "</span>" : "") + "</span></div>"; });
  h += '</div>';
  return h;
}

// Retour utilisateur (08/08/2026) : ce résumé (« intention de… » et le reste du groupe) « n'a
// que peu d'intérêt » — six blocs `.bp-decision` (le style des DÉCISIONS DU MOTEUR, dashed
// border + surlignage) pour re-dire ce que l'athlète vient de répondre au questionnaire.
// Compacté en une ligne discrète : la vérification reste possible d'un coup d'œil, elle ne
// pèse plus comme six décisions à lire.
function summaryRows(a) {
  // R5.6b — la table PAR QUESTION passe avant la table plate : « partielle » ne veut pas dire la
  // même chose pour la disponibilité et pour une course de nuit.
  const L = (k, lab) => (a[k] ? lab + " : " + esc(String(a[k]).split(",").map((x) => (VLAB_Q[k] && VLAB_Q[k][x]) || VLAB[x] || x).join(", ")) : "");
  const parts = [L("intent", "Intention"), L("format", "Objectif"), L("history", "Historique"), L("level", "Niveau"), L("dispo", "Disponibilité"), L("injury", "Blessures")].filter(Boolean);
  return parts.length ? '<div class="load-sub" style="margin:2px 0 8px">' + parts.join(" · ") + "</div>" : "";
}

// R4-4 — sélecteur de plans : plusieurs plans sous un même profil (tri A + 10k d'un ami,
// cyclosportive isolée…). Chaque plan garde ses réponses, son journal, ses ✓ et ses
// records (tout vit dans answers, par plan). Le sélecteur vit ICI, pas dans la barre de
// navigation (tabs.js reste « navigation seule », brief onglets).
function planLabel(p) {
  if (p.label) return esc(p.label);
  if (p.sport && SPORTS[p.sport]) return SPORTS[p.sport].ico + " " + SPORTS[p.sport].nom + (p.answers && p.answers.format ? " · " + esc(p.answers.format) : "");
  return "Plan sans sport (questionnaire en cours)";
}
function plansSelectorHTML() {
  let h = '<div class="load-card"><div class="load-title">🗂 Mes plans (' + Math.max(1, S.plans.length) + ")</div>";
  const plans = S.plans.length ? S.plans : [];
  plans.forEach((p) => {
    const active = p.id === S.activePlanId;
    h += '<div style="display:flex;align-items:center;gap:8px;margin:6px 0">'
      + '<button class="btn' + (active ? " primary" : "") + '" data-plan="' + p.id + '" type="button" style="flex:1;text-align:left">' + planLabel(p) + (active ? " ✓" : "") + "</button>"
      + '<button class="btn" data-plan-ren="' + p.id + '" type="button" title="Renommer" style="padding:6px 10px">✏️</button>'
      + (!active && plans.length > 1 ? '<button class="btn" data-plan-del="' + p.id + '" type="button" title="Supprimer" style="padding:6px 10px">🗑</button>' : "")
      + "</div>";
  });
  h += '<div class="nav" style="margin-top:8px"><button class="btn gold" id="pfNewPlan" type="button">＋ Nouveau plan</button></div>'
    + '<div class="load-sub" style="margin-top:4px">Chaque plan a son questionnaire, son journal et ses records — passe de l’un à l’autre sans rien perdre.</div></div>';
  return h;
}
function bindPlansSelector() {
  document.querySelectorAll("#screen [data-plan]").forEach((b) => {
    b.onclick = () => {
      if (b.dataset.plan === S.activePlanId) return;
      ebSave(); // fige le plan courant avant de basculer
      ebActivate(b.dataset.plan);
      ebSave();
      if (S.onPlan && S.sport) renderPlan(); // régénère UNE fois via ensurePlan, réaffiche les onglets
      else renderStep(); // questionnaire (plan pas terminé)
      if (S.sport) document.body.dataset.sport = S.sport;
      if (S.answers.intent) document.body.dataset.intent = S.answers.intent;
    };
  });
  document.querySelectorAll("#screen [data-plan-ren]").forEach((b) => {
    b.onclick = () => {
      const p = S.plans.find((x) => x.id === b.dataset.planRen);
      if (!p) return;
      const nv = prompt("Nom du plan :", p.label || "");
      if (nv !== null) { p.label = nv.trim(); ebSave(); renderTabProfile(ensurePlan()); }
    };
  });
  document.querySelectorAll("#screen [data-plan-del]").forEach((b) => {
    b.onclick = () => {
      const p = S.plans.find((x) => x.id === b.dataset.planDel);
      if (!p || p.id === S.activePlanId) return;
      if (!confirm("Supprimer définitivement « " + (p.label || planLabel(p).replace(/<[^>]*>/g, "")) + " » ? Ses réponses, journal et records seront perdus.")) return;
      S.plans = S.plans.filter((x) => x.id !== p.id);
      ebSave();
      renderTabProfile(ensurePlan());
    };
  });
  const np = $("pfNewPlan");
  if (np) np.onclick = () => {
    ebSave(); // fige l'actuel
    const e = ebNewPlanEntry("");
    // R6 — pré-remplir les données de la PERSONNE (elles ne changent pas d'un plan à
    // l'autre) : le questionnaire les propose pré-cochées au lieu de tout redemander.
    const PERSONAL = ["age", "sex", "weight", "height", "ftp", "ftp_known", "pace", "pace_known", "css", "css_known", "course_profile", "med_pain", "med_dizzy", "med_treat"];
    PERSONAL.forEach((k) => { if (S.answers[k] !== undefined && S.answers[k] !== "") e.answers[k] = S.answers[k]; });
    e.prevPlanId = S.activePlanId; // pour le bouton « revenir à mon plan » du questionnaire
    S.plans.push(e);
    ebActivate(e.id);
    ebSave();
    document.body.dataset.sport = "";
    document.body.dataset.intent = "";
    renderStep(); // nouveau questionnaire, à partir du choix du sport
  };
}

// ===== R25 étape 4 — la gamification vit au Profil : l'AVATAR COMPOSITE (3 jauges 0-30,
// une par discipline), badges, efficience. L'XP reste 100% régularité (jamais un chrono,
// jamais décroissant) — inchangé ; seul le COMPTE est désormais par discipline. Les anciens
// « niveaux intermédiaires tri » (Découverte→Machine) sont REMPLACÉS par les jauges : ils
// comptaient la même chose (les ✓ par discipline) avec une deuxième échelle — deux échelles
// pour une idée, c'est la forme que R11.1 interdit.
// R25.8 — chaque jauge porte SA couleur de discipline (maquette : natation `--swim`, vélo
// `--orange`, course `--run`/or). Les trois barres étaient peintes en `--z2`, la même teinte
// pour les trois : la couleur ne portait aucune information alors que le reste de l'app
// code déjà les disciplines par la couleur (anneaux de Semaine, ligne de distances).
// Les jetons sont ceux du thème, identiques à ceux de la maquette (styles.css:45).
const JAUGES = [["natation", "🏊", "Natation", "var(--swim)"], ["velo", "🚴", "Vélo", "var(--bike)"], ["course", "🏃", "Course", "var(--run)"]];
function avatarSectionHTML(plan, todayISO) {
  // Un seul calcul (R11.1) : `avatarTriDataFor` porte déjà l'état complet dans `.tri`
  // (agrégé sur tous les plans de l'athlète depuis le correctif « XP non conservé au
  // changement de plan », 08/08/2026) — appeler `EBV2.avatarTri` séparément ici recalculait
  // la même chose une seconde fois, sur le seul plan actif.
  const visual = avatarTriDataFor(plan, todayISO);
  const tri = visual.tri;
  if (!tri) return "";
  let adh = null;
  try { adh = globalThis.EBV2.adherence(plan, S.answers, todayISO); } catch (e) {}
  const titre = tri.legende ? "🏆 LÉGENDE du triathlon"
    : (JAUGES.find(([k]) => k === tri.meneuse) || JAUGES[2])[1] + " Meneuse : " + (JAUGES.find(([k]) => k === tri.meneuse) || JAUGES[2])[2].toLowerCase();
  // R25.8 — `jf` porte `grow-x` : la barre se remplit de 0 à sa largeur, décalée de 80 ms
  // d'une discipline à l'autre (valeur de la maquette, `animation-delay:80ms/160ms`) pour
  // qu'on lise trois jauges et non un bloc qui apparaît. Le remplissage est une TRANSFORMÉE
  // (`scaleX`), pas la largeur : la largeur reste le chiffre réel, lisible sans animation
  // et intacte sous `prefers-reduced-motion`.
  const jauge = ([k, ico, nom, col], i) => {
    const d = tri[k];
    const next = d.level < 30 ? avatarTriUnlock(k, d.level + 1) : null;
    return '<div class="jauge">'
      + '<span class="ji">' + ico + '</span><span class="jn">' + nom + '</span>'
      + '<b class="jl" style="color:' + col + '">niv ' + d.level + "/30</b>"
      + '<div class="jt"><div class="jf grow-x" style="width:' + d.progressPct + "%;background:" + col + ";animation-delay:" + (i * 80) + 'ms"></div></div></div>'
      + (next ? '<div class="jauge-next">prochain : <b>' + next.libelle + "</b> (encore " + (d.xpToNext - d.xpInLevel) + " XP)</div>" : "");
  };
  // Audit 07/08/2026 : le tout premier avatar (les 3 jauges à 0) est une silhouette nue sans
  // texture ni couleur — rien ne contextualisait ce vide AU NIVEAU DU REGARD (l'explication
  // vivait plus bas dans le texte, hors du premier coup d'œil). Une ligne courte juste sous le
  // dessin, visible seulement à ce premier niveau.
  const vierge = JAUGES.every(([k]) => tri[k].level === 0);
  // R25.8 — plus de `.load-card` ici : ce bloc est DANS la carte d'identité (bloc 1 de la
  // spec), et `.card`/`.load-card` portent le même fond, la même bordure et le même rayon —
  // les imbriquer dessinait deux cadres concentriques que la maquette n'a nulle part.
  let h = '<div class="av-block"><div style="display:flex;align-items:center;gap:14px">'
    + '<div style="text-align:center">'
    + '<button id="avSvg" type="button" aria-label="Voir mon avatar en grand" style="background:none;border:none;padding:0;cursor:pointer">' + avatarTriSVG(visual, 96) + "</button>"
    + (vierge ? '<div class="load-sub" style="max-width:96px;margin-top:2px">Il évoluera avec ta régularité</div>' : "")
    + "</div>"
    + '<div style="flex:1"><div style="font-weight:800;font-size:var(--fs-lg)">' + titre + "</div>"
    + JAUGES.map(jauge).join("")
    + "</div></div>"
;
  if (adh) {
    if (adh.frozenToday) h += '<div class="load-sub" style="margin-top:8px">❄️ Série <b>gelée</b> (douleur ou maladie) : ' + adh.days + " jour" + (adh.days > 1 ? "s" : "") + " au compteur, rien n’est perdu.</div>";
    else if (adh.days > 1) h += '<div style="margin-top:8px;font-size:var(--fs-md)">🔥 <b>Série : ' + adh.days + " jours</b> — repos validé compris.</div>";
    else h += '<div class="load-sub" style="margin-top:8px">Nouvelle série — la régularité sur toute la préparation compte plus qu’une série parfaite.</div>';
  }
  // Les 30 niveaux de chaque discipline, DÉRIVÉS du roulement (jamais une seconde table).
  // UN seul <details> pour les trois : le Profil doit tenir sous 4 écrans (U18b).
  h += '<details style="margin-top:8px"><summary class="load-sub" style="cursor:pointer">Les 30 niveaux de chaque discipline</summary><div style="margin-top:6px">'
    + JAUGES.map(([k, ico, nom]) => {
      const d = tri[k];
      let liste = "";
      for (let L = 1; L <= 30; L++) {
        const u = avatarTriUnlock(k, L);
        const got = d.level >= L;
        liste += '<div style="font-size:var(--fs-xs);margin:3px 0;' + (got ? "" : "opacity:0.55") + '">' + (got ? "✓" : "○") + " <b>niv " + L + "</b> — " + u.libelle + "</div>";
      }
      return '<div style="font-weight:700;font-size:var(--fs-sm);margin-top:8px">' + ico + " " + nom + "</div>" + liste;
    }).join("") + "</div></details>";
  // Retour utilisateur (08/08/2026) : le sélecteur « couleur d'accent » retiré (voir
  // avatarTriAccent en note dans avatar-tri.js — il ne changeait que le PNG partagé, jamais
  // l'avatar affiché) ; le paragraphe d'explication raccourci (il détaillait la mécanique de
  // jauges/niveaux, déjà lisible sur les jauges elles-mêmes) ; « ⬇ Télécharger » ajouté à côté
  // de « 📸 Partager » — jusqu'ici, sans Web Share API, le téléchargement n'existait qu'en
  // repli invisible (aucun bouton dédié).
  h += '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">'
    + '<button class="btn" id="avShare" type="button">📸 Partager</button>'
    + '<button class="btn" id="avDownload" type="button">⬇ Télécharger</button></div>'
    + '<div class="load-sub" style="margin-top:8px">Touche l’avatar pour le voir en grand.</div></div>';
  return h;
}
function badgesGalleryHTML(badges) {
  if (!badges.length) return "";
  const chips = badges.map((b) => '<span title="' + b.why.replace(/"/g, "&quot;") + '" style="border:1px solid var(--border);border-radius:14px;padding:3px 10px;font-size:var(--fs-xs);background:var(--bg3)">' + b.icon + " " + b.label + "</span>").join(" ");
  return '<div class="load-card"><div class="load-title">🏅 Badges gagnés (' + badges.length + ')</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + chips + "</div></div>";
}
// R4.8 — efficience : uniquement les progrès à charge égale (imports FIT), jamais le volume.
function efficiencyHTML() {
  const rich = Array.isArray(S.answers.fitRich) ? S.answers.fitRich : [];
  if (rich.length < 2) return "";
  const found = [];
  const sorted = [...rich].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (let i = sorted.length - 1; i > 0 && found.length < 2; i--) {
    const nu = sorted[i];
    if (nu.avgHr == null) continue;
    for (let j = i - 1; j >= 0; j--) {
      const old = sorted[j];
      if (old.sport !== nu.sport || old.avgHr == null) continue;
      if (Math.abs(nu.minutes - old.minutes) > old.minutes * 0.15) continue;
      const spdComparable = nu.avgSpeedMs != null && old.avgSpeedMs != null;
      if (spdComparable && Math.abs(nu.avgSpeedMs - old.avgSpeedMs) <= old.avgSpeedMs * 0.02 && nu.avgHr <= old.avgHr - 3) {
        found.push("Sortie comparable (" + Math.round(nu.minutes) + "min, même allure) : <b>−" + Math.round(old.avgHr - nu.avgHr) + " bpm</b> entre le " + old.date + " et le " + nu.date + ". Ton moteur devient plus économe.");
        break;
      }
      if (spdComparable && Math.abs(nu.avgHr - old.avgHr) <= 3 && nu.avgSpeedMs >= old.avgSpeedMs * 1.02) {
        found.push("Même durée, même FC (" + Math.round(nu.avgHr) + " bpm) : <b>+" + Math.round((nu.avgSpeedMs / old.avgSpeedMs - 1) * 100) + "% de vitesse</b> depuis le " + old.date + ". Efficience pure.");
        break;
      }
    }
  }
  if (!found.length) return "";
  return '<div class="load-card"><div class="load-title">📉 Efficience — les progrès qui comptent</div>'
    + found.map((f) => '<div class="load-sub" style="margin-top:6px">' + f + "</div>").join("")
    + '<div class="load-sub" style="margin-top:6px;color:var(--muted)">Comparé à charge égale uniquement (imports FIT) — jamais de récompense au volume.</div></div>';
}
// Échéance du plan : date de fin (course ou dernière semaine) + compte à rebours.
function planDeadlineHTML(plan) {
  const a = S.answers;
  const end = planEndDate(plan, a);
  if (!end) return "";
  const days = Math.ceil((new Date(end + "T00:00:00Z").getTime() - Date.now()) / 864e5);
  return '<div class="load-sub" style="margin-top:6px">📆 Plan généré le <b>' + (a.plan_start || "?") + "</b> · échéance " + (a.race_date ? "🏁 course" : "fin de plan") + " le <b>" + end + "</b>" + (days >= 0 ? " — dans <b>" + days + " jour" + (days > 1 ? "s" : "") + "</b>." : " (passée).") + "</div>";
}
// Date de retest suggérée : dernière référence mesurée + 6 semaines (42 j) — jamais
// imposée, c'est une suggestion à planifier dans la carte retest ci-dessous.
function retestSuggestionHTML() {
  const tests = Array.isArray(S.answers.tests) ? S.answers.tests.filter((t) => ["ftp", "thrPace", "css"].includes(t.type)) : [];
  if (!tests.length) return '<div class="load-sub" style="margin-top:4px">💡 Suggestion : pas encore de référence mesurée — un premier test peut se planifier dès maintenant.</div>';
  const last = tests.map((t) => String(t.date || "")).sort().pop();
  if (!last) return "";
  const sug = new Date(new Date(last + "T00:00:00Z").getTime() + 42 * 864e5).toISOString().slice(0, 10);
  const overdue = sug <= todayISO();
  return '<div class="load-sub" style="margin-top:4px">💡 Dernière référence mesurée le <b>' + last + "</b> → retest suggéré autour du <b>" + sug + "</b>" + (overdue ? " (c’est le moment !)" : "") + ".</div>";
}

// R7 TRAIL — les données qui structurent la prépa, éditables : distance, D+, technicité,
// VAM. Elles changent la CATÉGORIE d'effort, donc la durée du plan, les plafonds et le
// contenu — chaque modification régénère le plan.
function trailProfileHTML(a) {
  const row = (id, lab, val, ph) => '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md);margin-top:6px"><span style="width:150px">' + lab + '</span><input type="text" id="' + id + '" value="' + esc(val || "") + '" placeholder="' + ph + '" style="flex:1;min-width:0"></label>';
  const sel = (id, cur, opts) => '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md);margin-top:6px"><span style="width:150px">' + opts.lab + '</span><select id="' + id + '" style="flex:1;min-width:0">'
    + opts.list.map((o) => '<option value="' + o[0] + '"' + ((cur || "") === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></label>";
  let h = '<div class="load-card"><div class="load-title">⛰ Ta course et ton terrain' + aide('Le D+ compte autant que la distance : il décide de la catégorie d’effort, donc de tout le reste.', { label: 'la course et le terrain' }) + '</div>';
  if (a.trailMigrated) h += '<div class="load-sub" style="margin-top:6px;color:#a33"><b>À vérifier :</b> ton plan trail a été repris depuis l’ancienne version, où le dénivelé n’était pas demandé. Renseigne la vraie distance et le vrai D+ de ta course : ce sont eux qui décident de la durée de préparation, du volume et du contenu des séances.</div>';
  h += row("pfTrailKm", "Distance (km)", a.race_distance_km, "62");
  h += row("pfTrailDplus", "D+ total (m)", a.race_dplus_m, "3200");
  // R12.1 — la montée VÉCUE d'abord : c'est la question à laquelle tout le monde sait répondre.
  // La VAM directe reste possible pour qui l'a mesurée, mais elle n'est plus le chemin principal.
  h += '<div class="load-sub" style="margin-top:8px"><b>⛰ Ta dernière grosse montée</b> — d\'au moins 5 minutes, sans t\'arrêter. C\'est de là que le plan déduit ta vitesse ascensionnelle.</div>';
  h += row("pfClimbDplus", "D+ de cette montée (m)", a.climb_dplus_m, "450");
  h += row("pfClimbMin", "Durée de cette montée (min)", a.climb_min, "40");
  h += row("pfTrailVam", "VAM déjà mesurée (m D+/h)", a.vam_known === "oui" ? a.vam : "", "facultatif — sinon déduite ci-dessus");
  h += sel("pfTrailTech", a.race_technicity, { lab: "Terrain de la course", list: [["roulant", "Roulant"], ["mixte", "Mixte"], ["technique", "Technique"], ["alpin", "Alpin"]] });
  h += sel("pfTrailNight", a.race_night, { lab: "Course de nuit", list: [["non", "Non"], ["partielle", "En partie"], ["majoritaire", "Majoritairement"]] });
  h += sel("pfTrailAccess", a.train_dplus_access, { lab: "Dénivelé accessible", list: [["montagne", "Montagne (+800m)"], ["collines", "Collines (200-800m)"], ["plat", "Plat (<200m)"]] });
  h += sel("pfTrailPoles", a.poles, { lab: "Bâtons", list: [["oui", "Oui"], ["a_decider", "À décider"], ["non", "Non"]] });
  h += row("pfTrailCutoff", "Barrière horaire (h)", a.race_cutoff_h, "optionnel");
  h += '<div class="nav" style="margin-top:10px"><button class="btn" id="pfTrailSave" type="button">Enregistrer → régénérer le plan</button></div><div id="pfTrailMsg" class="load-sub" style="margin-top:6px"></div></div>';
  return h;
}
function bindTrailProfile() {
  const btn = $("pfTrailSave");
  if (!btn) return;
  btn.onclick = () => {
    const a = S.answers;
    const g = (id) => { const el = $(id); return el ? String(el.value || "").trim() : null; };
    const before = JSON.stringify([a.race_distance_km, a.race_dplus_m, a.vam, a.climb_dplus_m, a.climb_min, a.race_technicity, a.race_night, a.train_dplus_access, a.poles, a.race_cutoff_h]);
    const km = parseFloat(g("pfTrailKm") || ""), dp = parseFloat(g("pfTrailDplus") || ""), vam = parseFloat(g("pfTrailVam") || "");
    const cdp = parseFloat(g("pfClimbDplus") || ""), cmin = parseFloat(g("pfClimbMin") || "");
    a.climb_dplus_m = cdp >= 50 && cdp <= 3000 ? String(cdp) : "";
    a.climb_min = cmin >= 5 && cmin <= 300 ? String(cmin) : "";
    if (km > 0) a.race_distance_km = String(km);
    if (dp >= 0) a.race_dplus_m = String(dp);
    if (vam >= 200 && vam <= 2500) { a.vam = String(vam); a.vam_known = "oui"; } else if (!g("pfTrailVam")) a.vam_known = "non";
    for (const [id, key] of [["pfTrailTech", "race_technicity"], ["pfTrailNight", "race_night"], ["pfTrailAccess", "train_dplus_access"], ["pfTrailPoles", "poles"]]) {
      const el = $(id);
      if (el) a[key] = el.value;
    }
    const co = parseFloat(g("pfTrailCutoff") || "");
    a.race_cutoff_h = co > 0 ? String(co) : "";
    const m = $("pfTrailMsg");
    if (JSON.stringify([a.race_distance_km, a.race_dplus_m, a.vam, a.climb_dplus_m, a.climb_min, a.race_technicity, a.race_night, a.train_dplus_access, a.poles, a.race_cutoff_h]) === before) {
      if (m) m.textContent = "Aucun changement détecté.";
      return;
    }
    delete a.trailMigrated;
    invalidatePlan();
    ebSave();
    renderTabProfile(ensurePlan());
    const m2 = $("pfTrailMsg");
    if (m2) m2.textContent = "✓ Enregistré — plan régénéré : la catégorie d’effort, la durée et les plafonds sont recalculés.";
  };
}

// R24.3 — LA CARTE DE LA COURSE (retour fondateur, 06/08 : « je voulais séparer les données
// athlète — FTP, CSS, seuil — et les paramètres de course, à mettre sur le profil dédié à la
// course »). Ces champs vivaient au milieu des références physiologiques : le profil du
// parcours, l'eau de la course et les profils par discipline décrivent l'ÉPREUVE, pas le
// corps. Mêmes ids qu'avant (pfCourseProfile, pfWaterTemp, pfLeg*) : le gestionnaire
// d'enregistrement les lit par id, il ne sait pas dans quelle carte ils vivent.
// Le trail garde SA carte (⛰ trailProfileHTML) — distance, D+, technicité y sont déjà.
// R24.2 — le bloc Strava, extrait du journal pour vivre en premier écran. Contenu inchangé
// (mêmes ids, mêmes gestionnaires) : seule sa PLACE change. Connecté : ligne compacte +
// import. Pas connecté : le CTA à un bouton de R6, enfin visible sans dérouler quoi que ce soit.
function stravaCardHTML(a) {
  const sAuth = a.stravaAuth;
  // R25.8 — l'état passe à DROITE du titre (`.card-title` de la maquette : « 🔗 STRAVA /
  // CONNECTÉ »). Avant, « ✓ Connecté » vivait dans le corps, sur la même ligne que le bouton
  // d'import : il fallait lire la carte pour savoir si le compte était lié.
  let h = '<div class="load-card"><div class="load-title">🔗 Strava'
    + '<span class="eb-r' + (sAuth && sAuth.access_token ? " on" : "") + '">' + (sAuth && sAuth.access_token ? "connecté" : "non connecté") + "</span></div>";
  if (sAuth && sAuth.access_token) {
    // Retour utilisateur (08/08/2026) : « déconnexion trop grosse, moins essentielle,
    // l'utilisateur n'a normalement pas besoin de s'en servir ». Le bouton d'IMPORT reste un
    // `.btn` normal (c'est le geste qu'on répète) ; la déconnexion passe en lien discret.
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">'
      // R25.8 — plus de « ✓ Connecté » ici : l'état est dans l'en-tête. Le prénom reste, lui,
      // parce qu'il dit QUEL compte est lié — ce que l'en-tête ne dit pas.
      + (sAuth.athlete && sAuth.athlete.firstname ? '<span style="font-size:var(--fs-sm)">' + esc(sAuth.athlete.firstname) + "</span>" : "")
      + '<button class="btn" id="pfStravaBtn" type="button">Importer mes activités</button></div>'
      // U4 — même sous-dimensionné visuellement, la zone de TOUCHE reste ≥24×24 (WCAG 2.5.8) :
      // padding vertical généreux malgré le texte réduit, geste rare mais pas piégeux.
      + '<button type="button" id="pfStravaOut" style="background:none;border:none;padding:10px 2px;margin-top:2px;font-size:var(--fs-xs);color:var(--muted);text-decoration:underline;cursor:pointer">Se déconnecter</button>';
  } else {
    // R6 — UX guidée : UN bouton. L'URL du relais vit en config (déployée pour tous)
    // ou dans les réglages avancés — l'utilisateur normal n'a rien à coller.
    h += '<div style="margin-top:6px"><button class="btn primary" id="pfStravaConnect" type="button" style="width:100%;font-size:var(--fs-lg);padding:12px 16px">🔗 Se connecter avec Strava</button></div>'
      + '<div class="load-sub" style="margin-top:4px">Un clic → autorisation sur Strava → retour ici. Lecture seule (jamais d’écriture), tes activités alimentent tes références (FTP/allure/CSS).</div>'
      + '<details style="margin-top:6px"><summary class="load-sub" style="cursor:pointer">Réglages avancés (relais)</summary>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">'
      + '<input type="text" id="pfStravaRelay" placeholder="URL du relais (voir server/README.md)" value="' + esc(a.stravaRelay || "") + '" style="flex:1;min-width:180px"></div>'
      + '<div class="load-sub" style="margin-top:4px">Le relais garde le secret Strava hors de l’app — déploiement pas-à-pas dans server/README.md.</div></details>';
  }
  h += (S._stravaError ? '<div class="load-sub" style="margin-top:4px;color:#b3261e">Connexion Strava refusée (' + esc(S._stravaError) + ") — réessaie ou utilise le jeton manuel.</div>" : "")
    + '<details style="margin-top:6px"><summary class="load-sub" style="cursor:pointer">Repli : jeton manuel (sans serveur)</summary>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">'
    + '<input type="text" id="pfStravaTok" placeholder="token d’accès Strava" style="flex:1;min-width:180px">'
    + (sAuth && sAuth.access_token ? "" : '<button class="btn" id="pfStravaBtnTok" type="button">Importer depuis Strava</button>')
    + '</div><div class="load-sub" style="margin-top:4px">Réglages Strava → « Mon API », scope <b>activity:read</b> — rien n’est écrit sur Strava.</div></details>'
    + '<div id="pfStravaMsg" class="load-sub" style="margin-top:4px"></div></div>';
  return h;
}

// Retour utilisateur (08/08/2026) : « toujours pas de référence D+ dans Ta course ». Le trail a
// déjà son D+ précis (`trailProfileHTML`) ; les autres sports n'avaient qu'un choix qualitatif
// plat/vallonné/montagneux. Un D+ (m) saisi ici est une CALCULATRICE (hors ANSWER_SCHEMA, comme
// `target_time`) : elle affiche un repère m/km et, côté VÉLO seulement, suggère la catégorie via
// `EBV2.bikeReliefFromDplus` (ancré sur des fiches d'épreuves réelles) — jamais côté course à
// pied, où aucune calibration équivalente n'existe dans ce dépôt (voir sa définition, bridge.ts).
// La catégorie qualitative reste le SEUL champ que le moteur lit (R14.3-a) : le D+ aide à la
// choisir, il ne la remplace pas.
function dplusHintFor(leg, dplusM) {
  if (!globalThis.EBV2 || !globalThis.EBV2.raceDistanceKm || dplusM == null || isNaN(dplusM) || dplusM <= 0) return "";
  const km = globalThis.EBV2.raceDistanceKm(S.sport, S.answers.format, leg);
  if (km == null) return "Distance de l’épreuve inconnue pour ce format — repère-toi à l’œil.";
  const per100 = (dplusM / km) * 100;
  let txt = "≈ " + (Math.round(per100 / 10) / 10) + " m/km sur " + km + " km";
  if (leg === "bike" && globalThis.EBV2.bikeReliefFromDplus) {
    const cat = globalThis.EBV2.bikeReliefFromDplus(dplusM, km);
    const lab = { plat: "Plat", vallonne: "Vallonné", montagne: "Montagneux" }[cat];
    if (lab) txt += " → suggère « " + lab + " » ci-dessus";
  } else {
    txt += " — repère informatif : aucun seuil fiable en course à pied, le choix reste le tien";
  }
  return txt;
}
function raceCardHTML(a) {
  // Retour du fondateur (08/08/2026) : ces selects (et le champ eau) partageaient leur ligne
  // avec un label à largeur fixe de 150px — sur 390px de large, il ne restait qu'une centaine
  // de px pour l'option choisie ; « Je ne sais pas encore » s'affichait « Je ne sais pas e… ».
  // Même correctif que « Courses intermédiaires » (R26) : le label passe sur sa propre ligne,
  // le champ prend toute la largeur en dessous — ici le label N'EST PAS une légende redondante
  // (rien d'autre ne dit « Profil du parcours »), il reste donc affiché, juste plus haut.
  const row = (id, lab, val, ph) => '<label style="display:block;font-size:var(--fs-md);margin-top:8px"><span>' + lab + '</span><input type="text" id="' + id + '" value="' + esc(val || "") + '" placeholder="' + ph + '" style="display:block;width:100%;margin-top:4px"></label>';
  const dplusRow = (id, hintId, lab, val, leg) => '<label style="display:block;font-size:var(--fs-md);margin-top:6px"><span>' + lab + '</span>'
    + '<input type="number" id="' + id + '" min="0" max="20000" value="' + esc(val || "") + '" placeholder="ex. 450" style="display:block;width:100%;margin-top:4px"></label>'
    + '<div class="load-sub" id="' + hintId + '" style="margin-top:2px">' + esc(dplusHintFor(leg, val ? parseFloat(val) : null)) + "</div>";
  let h = '<div class="load-card"><div class="load-title">🏁 Ta course' + aide('Ces réglages décrivent l’ÉPREUVE (relief, eau, milieu) — ils affinent la prédiction et le pacing du jour J. Tes références physiologiques, elles, vivent dans « ⚙ Références d’entraînement ».', { label: 'les paramètres de la course' }) + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">';
  // R6 — profil du parcours visé : affine la PRÉDICTION (temps course à pied) sans toucher au plan.
  const cpSel = (v, lab) => '<option value="' + v + '"' + ((a.course_profile || "") === v ? " selected" : "") + ">" + lab + "</option>";
  h += '<label style="display:block;font-size:var(--fs-md)"><span>Profil du parcours</span>'
    + aide('Plat : sans relief notable, c’est la référence. Vallonné : quelques côtes, tu relances régulièrement — ça ajoute environ 3 à 6 % de temps par rapport à un parcours plat. Montagneux : dénivelé marqué, des portions soutenues en montée — ça en ajoute 8 à 15 %. Dans le doute entre deux, choisis le plus dur : la prédiction reste honnête, jamais optimiste.', { label: 'plat, vallonné, montagneux' })
    + '<select id="pfCourseProfile" style="display:block;width:100%;margin-top:4px">'
    + cpSel("", "Je ne sais pas encore") + cpSel("plat", "Plat") + cpSel("vallonne", "Vallonné") + cpSel("montagneux", "Montagneux") + "</select></label>";
  // Le trail a déjà son D+ précis (carte dédiée, D+/D− et technicité) : pas de doublon ici.
  if (S.sport !== "trail") h += dplusRow("pfCourseDplus", "pfCourseDplusHint", "D+ de la course (m, optionnel)", a.road_dplus_m, S.sport === "bike" ? "bike" : null);
  // R18.2 — DISCIPLINE PAR DISCIPLINE pour les épreuves multisport : un triathlon n'est
  // jamais homogène. « Comme au-dessus » retombe sur la réponse globale, puis sur le
  // terrain : un seul chemin (`legProfileOf`), trois niveaux de précision.
  if (S.sport === "tri" || S.sport === "duathlon" || S.sport === "swimrun") {
    const legSel = (id, cle, lab, opts) => {
      const cur = String(a[cle] || "");
      return '<label style="display:block;font-size:var(--fs-md);margin-top:8px"><span>' + lab + '</span><select id="' + id + '" style="display:block;width:100%;margin-top:4px">'
        + opts.map(([v, l]) => '<option value="' + v + '"' + (cur === v ? " selected" : "") + ">" + l + "</option>").join("")
        + "</select></label>";
    };
    const RELIEF_OPTS = [["", "Comme au-dessus"], ["plat", "Plat"], ["vallonne", "Vallonné"], ["montagne", "Montagneux"]];
    // R19.2 — la température de l'eau décide de la combinaison.
    if (S.sport === "tri") h += row("pfWaterTemp", "🌡 Eau de la course (°C)", a.water_temp_c, "combinaison : interdite au-dessus de 24,5 °C");
    if (S.sport === "tri" || S.sport === "swimrun")
      h += legSel("pfLegSwim", "leg_swim_env", "🏊 Milieu de nage", [["", "Comme au-dessus"], ["bassin", "Bassin"], ["lac", "Lac / eau libre calme"], ["mer_calme", "Mer calme"], ["mer_agitee", "Mer agitée"], ["eau_vive", "Eau vive (courant)"]]);
    if (S.sport === "tri" || S.sport === "duathlon") {
      h += legSel("pfLegBike", "leg_bike_prof", "🚴 Parcours vélo", RELIEF_OPTS);
      h += dplusRow("pfLegBikeDplus", "pfLegBikeDplusHint", "D+ du segment vélo (m, optionnel)", a.leg_bike_dplus_m, "bike");
    }
    h += legSel("pfLegRun", "leg_run_prof", "🏃 Parcours à pied", RELIEF_OPTS);
    h += dplusRow("pfLegRunDplus", "pfLegRunDplusHint", "D+ du segment course (m, optionnel)", a.leg_run_dplus_m, "run");
    h += '<div class="load-sub" style="margin:2px 0 0;color:var(--muted)">Ton épreuve n’est pas d’un seul bloc : on peut nager en eau vive, rouler en montagne et courir à plat. « Comme au-dessus » est un choix parfaitement valable.</div>';
  }
  h += '</div><div class="nav" style="margin-top:10px"><button class="btn" id="pfSaveRace" type="button">Enregistrer</button></div>'
    + '<div id="pfMsgRace" class="load-sub" style="margin-top:6px"></div></div>';
  return h;
}
/** Écoute les 3 champs D+ : met à jour leur repère au fil de la saisie, et suggère la
 *  catégorie vélo (seule calibrée, voir `dplusHintFor`) sans jamais l'imposer — l'athlète
 *  garde la main sur le select juste au-dessus. */
function bindRaceDplus() {
  const wire = (id, hintId, leg, targetSelectId) => {
    const el = $(id);
    if (!el) return;
    el.oninput = () => {
      const dplusM = el.value ? parseFloat(el.value) : null;
      const hint = $(hintId);
      if (hint) hint.textContent = dplusHintFor(leg, dplusM);
      if (leg !== "bike" || dplusM == null || isNaN(dplusM) || !globalThis.EBV2 || !globalThis.EBV2.raceDistanceKm || !globalThis.EBV2.bikeReliefFromDplus) return;
      const km = globalThis.EBV2.raceDistanceKm(S.sport, S.answers.format, "bike");
      const cat = km != null ? globalThis.EBV2.bikeReliefFromDplus(dplusM, km) : null;
      const target = $(targetSelectId);
      if (cat && target) target.value = cat;
    };
  };
  wire("pfCourseDplus", "pfCourseDplusHint", S.sport === "bike" ? "bike" : null, "pfCourseProfile");
  wire("pfLegBikeDplus", "pfLegBikeDplusHint", "bike", "pfLegBike");
  wire("pfLegRunDplus", "pfLegRunDplusHint", "run", "pfLegRun");
}

// R10 — courses intermédiaires RÉELLES (dates + priorité), pour TOUS les profils :
// branchées sur la mécanique moteur existante — la semaine de la course est allégée
// (mini-affûtage si B), la suivante est en récup, et le JOUR J porte une séance 🏁
// avec sa consigne de pacing. Avant, seul le questionnaire premium posait la question.
function raceInterHTML(a) {
  // R23.18 — la priorité A− existe : un OBJECTIF secondaire, couru pour de vrai (mini-affûtage
  // −40 %, vraie récupération derrière). Le moteur exige ≥ 4 semaines avant la course A
  // (décision du fondateur) — en dessous, il la traite en B et le dit dans les décisions.
  //
  // Retour du fondateur (07/08/2026) : « illisible ». Mesuré sur 390px : date + 2 selects sur
  // UNE ligne (`flex:1;min-width:0`) se comprimaient jusqu'à afficher un « C » et un « F » seuls
  // — la lettre qui reste quand le navigateur n'a plus la place pour le mot. La carte devient
  // deux lignes par course (date pleine largeur, puis priorité/format CÔTE À CÔTE avec un vrai
  // plancher de largeur — 3 champs ne tiennent pas sur une ligne de 350px, 2 oui). Pas de
  // légende visible au-dessus des selects (une première écriture en ajoutait une par champ —
  // mesuré, elle a fait passer le Profil de 4,0 à 4,3 écrans, le plancher posé par U18b) : le
  // texte de l'option elle-même se suffit une fois qu'il a la place de s'afficher
  // (« C — laboratoire… » dit ce que « C » seul ne disait pas), `aria-label` porte le rôle
  // pour qui n'a pas la vue.
  const prioSel = (id, cur) => '<select id="' + id + '" aria-label="Priorité de la course" style="width:100%">'
    + '<option value="C"' + (cur !== "B" && cur !== "A-" ? " selected" : "") + '>C — laboratoire (on s’entraîne à travers)</option>'
    + '<option value="B"' + (cur === "B" ? " selected" : "") + '>B — préparation (mini-affûtage)</option>'
    + '<option value="A-"' + (cur === "A-" ? " selected" : "") + '>A− — objectif secondaire (≥ 4 sem avant l’A)</option></select>';
  // Le FORMAT de la course intermédiaire : c'est lui qui permet au moteur de dimensionner la
  // récupération (une A− plus longue que l'A coûte un jour de plus). Optionnel — sans réponse,
  // le moteur suppose un format comparable et l'écrit dans ses décisions.
  const fmtSel = (id, cur) => {
    const list = (SPORTS[S.sport] && SPORTS[S.sport].formats) || [];
    if (!list.length) return "";
    return '<select id="' + id + '" aria-label="Format de la course" style="width:100%"><option value="">Format ? (optionnel)</option>'
      + list.map(([v, l]) => '<option value="' + v + '"' + ((cur || "") === v ? " selected" : "") + ">" + l + "</option>").join("") + "</select>";
  };
  const rowR = (n, d, p, f) => {
    const fmtField = fmtSel("pfRace" + n + "f", f);
    return '<div style="display:flex;gap:8px;align-items:center"><span style="font-weight:700;font-size:var(--fs-md);min-width:64px">Course ' + n + '</span>'
      + '<input type="date" id="pfRace' + n + 'd" value="' + esc(d || "") + '" style="flex:1;min-width:0"></div>'
      + '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">'
      + '<div style="flex:2;min-width:150px">' + prioSel("pfRace" + n + "p", p) + '</div>'
      + (fmtField ? '<div style="flex:1;min-width:110px">' + fmtField + '</div>' : "")
      + '</div>';
  };
  // Deux courses affichées d'office, c'est deux fois le coût vertical qu'une seule pèse déjà —
  // mesuré : le Profil passait à 4,2 écrans (plafond U18b : 4,0) sur un profil qui ne déclare
  // AUCUNE deuxième course. La très grande majorité des plans n'en ont qu'une (voire aucune) ;
  // la Course 2 se replie donc derrière un geste, SAUF si elle porte déjà une date — une donnée
  // existante ne se cache jamais derrière un tiroir fermé par défaut (même règle que U18b pour
  // la carte de références).
  const course2 = a.race2_date
    ? '<div style="margin-top:10px">' + rowR(2, a.race2_date, a.race2_prio, a.race2_format) + "</div>"
    : '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:var(--fs-sm);color:var(--muted)">+ Ajouter une deuxième course intermédiaire</summary><div style="margin-top:8px">' + rowR(2, a.race2_date, a.race2_prio, a.race2_format) + "</div></details>";
  return '<div class="load-card"><div class="load-title">🏁 Courses intermédiaires' + aide('Une course AVANT ton objectif ? C = on s’entraîne à travers. B = semaine allégée. A− = un VRAI objectif secondaire : mini-affûtage, tu la cours à fond, récupération réelle derrière — à 4 semaines minimum de ta course A.', { label: 'les courses intermédiaires' }) + '</div>'
    + '<div style="margin-top:8px">' + rowR(1, a.race1_date, a.race1_prio, a.race1_format) + course2 + "</div>"
    + '<div class="nav" style="margin-top:10px"><button class="btn" id="pfRaceSave" type="button">Enregistrer mes courses</button></div>'
    + '<div id="pfRaceMsg" class="load-sub" style="margin-top:6px"></div></div>';
}
function bindRaceInter() {
  const btn = $("pfRaceSave");
  if (!btn) return;
  btn.onclick = () => {
    const a = S.answers;
    const d1 = ($("pfRace1d") || {}).value || "", p1 = ($("pfRace1p") || {}).value || "C";
    const d2 = ($("pfRace2d") || {}).value || "", p2 = ($("pfRace2p") || {}).value || "C";
    const f1 = ($("pfRace1f") || {}).value || "", f2 = ($("pfRace2f") || {}).value || "";
    const before = [a.race1_date || "", a.race1_prio || "", a.race1_format || "", a.race2_date || "", a.race2_prio || "", a.race2_format || "", a.races || ""].join("|");
    a.race1_date = d1; a.race1_prio = d1 ? p1 : ""; a.race1_format = d1 ? f1 : "";
    a.race2_date = d2; a.race2_prio = d2 ? p2 : ""; a.race2_format = d2 ? f2 : "";
    a.races = d1 || d2 ? "oui" : "non";
    const after = [a.race1_date, a.race1_prio, a.race1_format, a.race2_date, a.race2_prio, a.race2_format, a.races].join("|");
    const m = $("pfRaceMsg");
    if (after === before) { if (m) m.textContent = "Aucun changement détecté."; return; }
    let warn = "";
    for (const d of [d1, d2]) {
      if (d && a.race_date && d >= a.race_date) warn = " ⚠️ Une date est le jour de (ou après) ton objectif A — elle sera ignorée par le plan.";
      else if (d && a.plan_start && d < a.plan_start) warn = " ⚠️ Une date est avant le début du plan — elle sera ignorée.";
    }
    // R23.18 — prévenir AU MOMENT DE LA SAISIE, pas seulement dans les décisions du plan :
    // une A− à moins de 4 semaines de l'A sera traitée en B, autant le dire tout de suite.
    for (const [d, p2b] of [[d1, p1], [d2, p2]]) {
      if (d && p2b === "A-" && a.race_date && (Date.parse(a.race_date) - Date.parse(d)) / 864e5 < 28)
        warn += " ⚠️ A− à moins de 4 semaines de ta course A : le moteur la traitera comme une course B (l'affûtage de l'A passe d'abord).";
    }
    const desc = [d1 ? d1 + " (" + (d1 ? p1 : "") + ")" : "", d2 ? d2 + " (" + p2 + ")" : ""].filter(Boolean).join(" · ") || "aucune";
    if (!Array.isArray(a.tests)) a.tests = [];
    a.tests.push({ type: "profil:race_inter", value: desc, date: todayISO(), source: "profil (courses intermédiaires)" });
    invalidatePlan();
    ebSave();
    renderTabProfile(ensurePlan());
    const m2 = $("pfRaceMsg");
    if (m2) m2.textContent = "✓ Courses enregistrées — plan régénéré autour de tes dates." + warn;
  };
}


// ── R6 §2-§3 — CE QUE TU AS RÉELLEMENT FAIT ──────────────────────────────────────────
// La carte ne montre QU'UN champ mesurable : le volume récent, point de départ de la rampe.
// Tous les autres champs restent déclarés — une observation ne remplace jamais une contrainte,
// et c'est ce qui nous distingue d'un agrégateur d'activités. L'athlète voit la mesure, la
// comparaison avec sa déclaration, et l'arbitrage QUE LE MOTEUR VA FAIRE, avant qu'il le fasse.
function measuredCardHTML() {
  const a = S.answers;
  const snap = previewMeasured();
  if (!snap) return "";
  const arb = globalThis.EBV2 && globalThis.EBV2.arbitrateVolRecent
    ? globalThis.EBV2.arbitrateVolRecent(a.vol_recent, snap) : null;
  const h = measuredHours(snap);
  const applied = !!a.measured;
  let out = '<div style="margin-top:12px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg2)">'
    + '<div style="font-weight:700;font-size:var(--fs-sm)">\u{1F4E5} Ce que tu as réellement fait</div>'
    + '<div class="load-sub" style="margin-top:4px">Sur tes <b>' + snap.window_days + ' derniers jours</b> : '
    + '<b>' + Math.round(snap.vol_min / 60) + 'h</b> en <b>' + snap.sessions + '</b> séance' + (snap.sessions > 1 ? 's' : '')
    + ' \u2014 soit <b>' + h + 'h/sem</b>'
    + (snap.confidence === 'partial' ? ' <span style="color:#a33">(fenêtre incomplète : la mesure sous-compte)</span>' : '')
    + '.</div>';
  if (arb && arb.why) out += '<div class="load-sub" style="margin-top:6px">' + esc(arb.why) + '</div>';
  else if (arb && arb.source === 'mesure') out += '<div class="load-sub" style="margin-top:6px">Ta déclaration et la mesure disent la même chose : rien à ajuster.</div>';
  out += '<div class="load-sub" style="margin-top:6px">Seul le <b>point de départ</b> se mesure. Ton volume max, tes séances par semaine, tes jours dispos et tes blessures restent DÉCLARÉS : ce que tu as fait le mois dernier ne dit pas ce que tu peux soutenir.</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
    + '<button type="button" class="btn' + (applied ? '' : ' primary') + '" id="pfMeasApply">' + (applied ? 'Actualiser la mesure' : 'Utiliser mes données mesurées') + '</button>'
    + (applied ? '<button type="button" class="btn" id="pfMeasClear">Revenir à ma déclaration</button>' : '')
    + '</div>';
  if (applied) out += '<div class="load-sub" style="margin-top:6px">Instantané du ' + esc(String(a.measured.updated_at)) + ' \u2014 il se rafraîchit tout seul à ta prochaine semaine de décharge, pas tous les matins.</div>';
  return out + '</div>';
}

export function renderTabProfile(plan) {
  const a = S.answers, sp = S.sport;
  // Retour utilisateur (08/08/2026) : le sélecteur de format de « Courses intermédiaires »
  // restait bloqué sur un ancien sport. Piste trouvée en creusant : `SPORTS[sp].nom` n'était
  // pas gardé — un `S.sport` faux (entrée `S.plans` corrompue par une migration/restauration
  // partielle : `onPlan` vrai mais `sport` resté `null`) levait une exception NON rattrapée
  // ICI, qui interrompait le rendu et laissait l'écran figé sur le PRÉCÉDENT plan affiché —
  // ses anciens sélecteurs, ses anciennes options. Non reproduit sur le parcours normal
  // (le sélecteur de plans se protège déjà, `bindPlansSelector`), mais renommer/supprimer un
  // plan rappelle cette fonction sans passer par cette garde — un chemin de moins à corrompre.
  // Le repli est celui déjà utilisé ailleurs pour un plan sans sport : le questionnaire.
  if (!sp || !SPORTS[sp]) { renderStep(); return; }
  const tIso = todayISO();
  // R25.8 — LA SPEC DEMANDE UN LIEN « MODIFIER » ICI, ET IL N'Y EST PAS. C'EST DÉLIBÉRÉ.
  //
  // Le bloc 1 de la spec par onglet décrit « PROFIL — TRIATHLON / MODIFIER » dans la fente
  // droite de l'en-tête. Je l'ai posé, et la garde `smoke-usage` est passée ROUGE sur son
  // critère R23.12b — à raison : le fondateur a explicitement demandé (08/08/2026, second
  // passage) que « modifier mes réponses » et « changer de sport » quittent le Profil, parce
  // que les garder ici en plus de 🗓 Plan faisait « deux chemins vers le même geste, dans
  // deux onglets ». Un lien « modifier » dans cet en-tête EST ce second chemin, quel que
  // soit son habillage.
  // La maquette ne connaît pas cet arbitrage : elle décrit une mise en page, pas l'histoire
  // des décisions produit. Entre une étiquette de maquette et une décision datée et motivée,
  // c'est la décision qui gagne — et elle est écrite ici plutôt que tue, pour que le point
  // revienne au fondateur s'il veut le rouvrir. La MÉCANIQUE de la fente droite reste, elle
  // (`.eb-r`) : elle sert Strava, le rappel, le volume, la semaine, la nutrition, la charge.
  let html = '<div class="card"><div class="eyebrow">Profil — ' + SPORTS[sp].nom + "</div><h2>Toi, ton niveau, tes réglages</h2>";
  // R5 — l'identité d'abord : avatar, niveau, XP, teaser du niveau suivant
  html += avatarSectionHTML(plan, tIso);
  html += '<div class="why">Modifie une valeur : le plan est régénéré et le changement est consigné dans ton journal d’évolution.</div>';
  // R25.8 — FIN DE LA CARTE D'IDENTITÉ, ET FIN DE LA CARTE DE PAGE.
  //
  // Mesuré sur le DOM rendu avant ce lot : `#screen` n'avait **UN SEUL enfant direct** sur
  // Profil (17 blocs à l'intérieur), Plan (21) et Semaine (7). Deux conséquences, l'une
  // visuelle et l'autre motion, la même cause.
  //   · `.card` et `.load-card` portent le MÊME fond, la MÊME bordure et le MÊME rayon
  //     (styles.css:183 et :398) : les emboîter dessine deux cadres concentriques. La
  //     maquette n'a qu'un niveau de carte — la spec par onglet décrit d'ailleurs Profil
  //     comme HUIT blocs (« carte identité », « carte Strava », « repliable … »), pas comme
  //     une carte qui en contient huit.
  //   · L'échelle de délais du stagger compte les enfants, animés ou non : `.eyebrow`, `h2`
  //     et `.why` consommaient trois rangs, et l'échelle saturait au 4e — les 13 blocs qui
  //     suivaient l'avatar partageaient tous le MÊME délai. 17 blocs, 2 délais distincts.
  // Les blocs redeviennent donc des frères de premier niveau : l'ordre affiché ne change pas
  // d'une ligne, `#screen > *` devient l'ensemble animé, et `nth-child` EST le `rN` de la spec.
  html += "</div>";
  // R24.2 — STRAVA EN PREMIER ÉCRAN (retour fondateur, 06/08 : « onglet de connexion Strava en
  // fin de page, je le veux dans le premier écran »). Le bloc de connexion vivait replié au
  // fond du Profil, dans le journal — un CTA qu'on ne voit qu'en cherchant. Il monte ici, en
  // carte propre ; le journal (en bas) garde l'historique et les imports FIT. Un seul bloc
  // Strava dans l'onglet : le déplacer, pas le dupliquer (R23.12b — deux chemins vers le même
  // geste dans deux endroits, c'est ce qu'on vient de retirer).
  html += stravaCardHTML(a);
  html += plansSelectorHTML();
  html += planDeadlineHTML(plan);
  if (sp === "trail") html += trailProfileHTML(a);
  // R24.3 — les paramètres de l'épreuve, dans la carte dédiée à la course.
  // Repliée par défaut (08/08/2026) : le correctif de lisibilité qui donne à chaque select sa
  // propre ligne (au lieu de tronquer son texte, voir plus haut) a fait passer le Profil d'un
  // triathlète de 4,0 à 4,1 écrans — le plafond posé par U18b. Même geste que « Références
  // d'entraînement » juste en dessous : c'est un réglage qu'on pose une fois et qu'on vient
  // CHERCHER, pas de la prose qu'on lit à chaque ouverture de l'onglet.
  html += repliable(raceCardHTML(a), false);
  // Retour utilisateur (08/08/2026) : « déroulable, pareil pour course intermédiaire » — même
  // geste que « Ta course » juste au-dessus, pour la même raison (un réglage qu'on pose une
  // fois par course et qu'on vient CHERCHER, pas de la prose permanente). Course 2 garde SON
  // propre repli interne (elle existe si aucune deuxième course n'est encore déclarée) —
  // repliable() replie la carte ENTIÈRE par-dessus, les deux se combinent sans conflit.
  html += repliable(raceInterHTML(a), false);
  html += summaryRows(a);

  // — Références physiologiques éditables (celles que le moteur lit : a.ftp / a.pace / a.css)
  //
  // U18b — LA CARTE EST REPLIÉE, et c'est le geste du lot qui pèse vraiment. Ce n'est pas de la
  // prose : ce sont 14 à 17 LIGNES DE FORMULAIRE (1 081 px mesurés sur 3 908) ouvertes en
  // permanence sur un onglet qu'on ouvre pour regarder sa progression, pas pour ressaisir sa
  // FTP. Des sous-titres n'y auraient rien changé — la règle sortie de la passe RETIRÉE (« le
  // "?" ne paie que dans un titre ») dit qu'un bouton de plus, posé au milieu d'une carte, coûte
  // à peu près ce qu'il rend. Ici le titre existe déjà et le repli porte sur le bloc ENTIER :
  // c'est le mécanisme `repliable` que le Profil applique depuis R5 à tout ce qu'on vient
  // CHERCHER quand on le veut. Rien n'est retiré ni déplacé, et « Enregistrer → régénérer le
  // plan » reste DANS la carte, donc à un geste de la modification qu'il valide.
  let ref = "";
  // Retour utilisateur (08/08/2026) : cette carte « mérite d'être mise plus en valeur » — c'est
  // elle qui pilote directement l'intensité de tout le plan (FTP/allure/CSS). U18b l'a repliée
  // à raison (14-17 lignes de formulaire, 1 081 px) : la distinction se joue donc sur le bandeau
  // FERMÉ (le titre), pas sur l'espace occupé une fois ouverte.
  ref += '<div class="load-card"><div class="load-title">⚙ Références d’entraînement <span style="background:var(--acc);color:#0a0a0a;font-size:var(--fs-xs);padding:2px 8px;border-radius:9px;font-weight:700;vertical-align:middle">pilote ton plan</span></div><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">';
  const row = (id, lab, val, ph) => '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md)"><span style="width:150px">' + lab + '</span><input type="text" id="' + id + '" value="' + esc(val || "") + '" placeholder="' + ph + '" style="flex:1;min-width:0"></label>';
  if (sp === "bike" || sp === "tri") ref += row("pfFtp", "FTP (watts)", a.ftp_known === "oui" ? a.ftp : "", "ex. 220");
  if (sp === "run" || sp === "tri") ref += row("pfPace", "Allure seuil (min:s /km)", a.pace_known === "oui" ? a.pace : "", "ex. 4:30");
  if (sp === "swim" || sp === "tri") ref += row("pfCss", "CSS (min:s /100m)", a.css_known === "oui" ? a.css : "", "ex. 1:55");
  ref += row("pfVol", "Volume max (h/sem)", a.vol_max, "ex. 8");
  // R10 — le POINT DE DÉPART : le plan démarre du volume réellement fait ces derniers mois
  ref += row("pfVolRecent", "Volume récent (h/sem, 3-6 mois)", a.vol_recent, "ex. 4 — le plan part de là");
  ref += row("pfSess", "Séances max /sem", a.sessions_max, "ex. 5");
  ref += row("pfWeight", "Poids (kg, optionnel)", a.weight, "affine ravito + dépense");
  // Taille : réintroduite AVEC un effet réel (métabolisme de base Mifflin-St Jeor, carte
  // « Dépense estimée » de l'onglet Semaine) — règle d'influence des paramètres respectée.
  ref += row("pfHeight", "Taille (cm, optionnel)", a.height, "affine la dépense de base");
  // R24.3 — les paramètres DE LA COURSE ne vivent plus ici (retour fondateur, 06/08 :
  // « séparer les données athlète des paramètres de course »). Le profil du parcours, la
  // température de l'eau et les profils par discipline sont partis dans la carte « 🏁 Ta
  // course » (raceCardHTML), rendue à côté de l'échéance et des courses intermédiaires.
  // Ici ne restent que les références DU CORPS : FTP, allures, volumes, poids, structure.
  // R14.1 §1-c — LA QUESTION QUI REMPLACE L'ANCIENNETÉ dans le calcul de la marge de
  // progression. Elle est ici (Profil) et pas dans le questionnaire d'entrée, pour ne pas
  // alourdir le tunnel. Ce qu'elle mesure : le STIMULUS DE LA STRUCTURE. Quelqu'un qui court
  // depuis quinze ans au feeling a encore devant lui tout ce qu'un plan apporte ; quelqu'un
  // qui suit un plan depuis trois ans en a déjà consommé la plus grande part.
  const tsSel = (v, lab) => '<option value="' + v + '"' + ((a.training_structure || "") === v ? " selected" : "") + ">" + lab + "</option>";
  ref += '<label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-md)"><span style="width:150px">Tes 12 derniers mois</span><select id="pfTrainingStructure" style="flex:1;min-width:0">'
    + tsSel("", "Je préfère ne pas dire") + tsSel("feeling", "Au feeling, sans plan")
    + tsSel("intermittent", "Un plan, par périodes") + tsSel("suivi", "Un plan structuré, suivi") + "</select></label>";
  ref += '<div class="load-sub" style="margin:2px 0 6px;color:var(--muted)">Sert à estimer ta marge de progression d’ici la course — pas à juger. Sans réponse, on reste prudent.</div>';
  // R14.1 §5 — le poids cible n'apparaît QUE si l'athlète a demandé ce levier. Jamais proposé,
  // jamais suggéré : c'est la frontière du manifeste, et elle ne bouge pas.
  if (a.weight_lever === "oui") {
    ref += row("pfWeightTarget", "Poids cible (optionnel)", a.weight_target, "affiche une sensibilité, jamais un objectif");
    ref += '<div class="load-sub" style="margin:2px 0 6px;color:var(--muted)">Tu as demandé ce levier. L’app montre ce que la balance changerait sur tes chronos — elle ne propose ni rythme, ni alimentation : ces questions se traitent avec un professionnel de santé.</div>';
  }

  ref += '</div><div class="nav" style="margin-top:10px"><button class="btn primary" id="pfSave" type="button">Enregistrer → régénérer le plan</button></div>'
    + '<div id="pfMsg" class="load-sub" style="margin-top:6px"></div></div>';
  html += repliable(ref, false);
  // R23.11 — LE RAPPEL QUOTIDIEN PREND SA PROPRE CARTE.
  //
  // Il vivait au milieu des références physiologiques, entre le CSS et le poids cible — ce n'est
  // ni une mesure ni un paramètre de course, c'est un réglage de l'app. Et depuis U18b la carte
  // des références est REPLIÉE : y laisser le rappel l'aurait rendu invisible pour qui ne
  // l'ouvre pas. Une carte à part, courte, avec son propre bouton d'enregistrement.
  html += '<div class="load-card"><div class="load-title">🔔 Rappel quotidien'
    + '<span class="eb-r' + (a.notifyTime ? " on" : "") + '">' + (a.notifyTime ? esc(a.notifyTime) + " · actif" : "aucun") + "</span></div>"
    + '<div class="load-sub" style="margin-top:6px">Une notification à l\'heure que tu choisis, tant que l\'app est ouverte ou en arrière-plan. Vide = aucun rappel.</div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:var(--fs-md)"><span style="width:150px">Heure</span>'
    + '<input type="time" id="pfNotif" value="' + esc(a.notifyTime || "") + '" style="flex:1;min-width:0"></label></div>';

  // — Records personnels (R4-5, lecture seule) + badges + efficience (R5 : ici, pas
  // dans un onglet à part — le Profil raconte qui tu es et ce que tu as construit)
  html += repliable(recordsHTML(plan, a), false);
  let _badges = [];
  if (globalThis.EBV2 && globalThis.EBV2.badges) { try { _badges = globalThis.EBV2.badges(plan, a, tIso); } catch (e) {} }
  html += repliable(badgesGalleryHTML(_badges), false);
  html += repliable(efficiencyHTML(), false);

  // — Retest « boss fight » (R4.4) : suggestion de date + planification
  html += retestSuggestionHTML();
  html += retestPlannerHTML();

  // — Sauvegarde : tout vit dans localStorage — un navigateur nettoyé = tout perdu.
  // Export/import JSON de l'état COMPLET (tous les plans + état partagé).
  html += '<details class="load-card"><summary class="load-title" style="cursor:pointer">💾 Sauvegarde</summary>'
    + '<div class="load-sub" style="margin-top:6px">Tes plans vivent dans ce navigateur uniquement. Exporte une sauvegarde de temps en temps — et importe-la sur un nouvel appareil ou après un nettoyage.</div>'
    + '<div class="nav" style="margin-top:8px;flex-wrap:wrap;gap:8px"><button class="btn" id="pfBackup" type="button">Exporter ma sauvegarde</button>'
    + '<label class="btn" style="cursor:pointer;margin:0">Importer une sauvegarde<input type="file" id="pfRestore" accept=".json,application/json" style="display:none"></label></div>'
    + '<div id="pfBackupMsg" class="load-sub" style="margin-top:6px"></div></details>';

  // — Journal d'évolution (S.answers.tests, trié du plus récent au plus ancien)
  const tests = Array.isArray(a.tests) ? [...a.tests].sort((x, y) => String(y.date || "").localeCompare(String(x.date || ""))) : [];
  // R24.2 — le bloc Strava est parti en premier écran (stravaCardHTML) : le journal n'a plus
  // de CTA à porter, il redevient une archive repliée.
  html += '<details class="load-card"><summary class="load-title" style="cursor:pointer">📒 Journal d’évolution et imports</summary>';
  if (tests.length) {
    tests.forEach((t) => {
      html += '<div style="display:flex;gap:8px;margin:5px 0;font-size:var(--fs-sm);align-items:baseline"><span style="width:78px;color:var(--muted)">' + esc(t.date || "—") + "</span><span><b>" + journalPrev(t) + journalLabel(t) + "</b>" + (t.source ? ' <span style="color:var(--muted)">(' + esc(t.source) + ")</span>" : "") + "</span></div>";
    });
  } else {
    html += '<div class="load-sub">Encore vide — il se remplira à chaque test (FTP, allure, CSS), import Strava/FIT, ou modification de profil ci-dessus.</div>';
  }
  html += measuredCardHTML();
  // Import FIT (roadmap : source « upload fichier », sans compte ni réseau) — le fichier
  // d'activité de n'importe quelle montre nourrit le journal (références) ET la fatigue
  // de l'ajusteur (S.answers.fitSessions, même contrat que les ✓).
  if (globalThis.EBV2 && globalThis.EBV2.importFit) {
    html += '<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      + '<label class="btn" style="cursor:pointer;margin:0">📂 Importer mes fichiers .FIT <span class="q-sub">(plusieurs à la fois)</span><input type="file" id="pfFit" accept=".fit,.FIT" multiple style="display:none"></label>'
      + '<span class="load-sub" style="margin:0">export de ta montre — lu ici, jamais envoyé</span></div>'
      + '<div id="pfFitMsg" class="load-sub" style="margin-top:6px"></div>';
  }
  // R24.2 — l'import Strava (connexion, jeton, réglages relais) vit désormais dans la carte
  // « 🔗 Strava » du premier écran (stravaCardHTML). Ici : journal, mesure, FIT.
  html += "</details>";

  // R23.10 — LES CONSEILS PERSONNALISÉS SONT PARTIS DANS 🗓 PLAN.
  //
  // Décision du fondateur (06/08/2026) : « conseil personnalisé : apparition plutôt à l'onglet
  // plan ». C'est juste — ce sont des conseils SUR LA PRÉPARATION (ferritine, cycle, garde-fous
  // santé), pas des données d'identité. Le Profil raconte qui tu es ; le Plan dit ce qu'on en
  // fait. Ils sont RENDUS là-bas, par le même `evalRules` : pas de second chemin (R11.1).
  //
  // R23.12b — ET LES DEUX BOUTONS DE PIED DE PAGE PARTENT AUSSI : « modifier mes réponses » et
  // « changer de sport » (« n'a pas sa place ici »). Ils ne disparaissent pas du produit —
  // 🗓 Plan porte déjà « ← Modifier » et « Changer de sport », au même endroit que les exports.
  // Les garder ici, c'était deux chemins vers le même geste, dans deux onglets.
  // R25.8 — la carte de page est fermée juste après le bloc d'identité : plus rien à fermer ici.
  $("screen").innerHTML = html;
  // Avatar : partage + téléchargement — mêmes options de rendu pour les deux (R11.1), l'accent
  // suit désormais la discipline meneuse plutôt qu'un thème choisi à la main (avatarTriAccent).
  const avatarStoryOpts = () => {
    let streak = 0;
    try { streak = globalThis.EBV2.adherence(plan, S.answers, tIso).days || 0; } catch (e) {}
    const v = avatarTriDataFor(plan, tIso);
    const nom = v.legende ? "🏆 LÉGENDE du triathlon" : "🏊 " + v.natation + " · 🚴 " + v.velo + " · 🏃 " + v.course;
    // R25 — le PARTAGE, c'est le TRIPTYQUE : les trois mondes empilés, format story.
    return { sessionName: nom, detail: "", sport: S.sport, streak, badge: null, avatarSVG: avatarTriStorySVG(v, 520), avatarAspect: 1.78, accent: avatarTriAccent(v) };
  };
  const _avShare = $("avShare");
  if (_avShare) _avShare.onclick = async () => {
    _avShare.disabled = true; _avShare.textContent = "Génération…";
    try { await shareStory(avatarStoryOpts()); } catch (e) { console.warn(e); }
    _avShare.disabled = false; _avShare.textContent = "📸 Partager";
  };
  // Retour utilisateur (08/08/2026) : « je ne peux pas juste télécharger le rendu » — sans
  // Web Share API, `shareStory` retombait bien sur un téléchargement, mais en repli SILENCIEUX
  // (aucun bouton ne le proposait explicitement). `_dl` est le même point de téléchargement que
  // la sauvegarde JSON du Profil et l'export du plan — un seul mécanisme, trois usages.
  const _avDownload = $("avDownload");
  if (_avDownload) _avDownload.onclick = async () => {
    _avDownload.disabled = true; _avDownload.textContent = "Génération…";
    try {
      const blob = await storyBlob(avatarStoryOpts(), "story");
      if (blob) _dl("endurabuild-avatar.png", "image/png", blob);
    } catch (e) { console.warn(e); }
    _avDownload.disabled = false; _avDownload.textContent = "⬇ Télécharger";
  };
  // R25 — toucher l'avatar = le voir EN GRAND (le triptyque plein écran). C'est ce qui rend
  // le détail dessiné visible ailleurs qu'au partage — la réponse à la preuve d'échelle.
  const _avBig = $("avSvg");
  if (_avBig) _avBig.onclick = () => {
    document.querySelectorAll(".eb-overlay").forEach((e) => e.remove());
    const v = avatarTriDataFor(plan, tIso);
    const ov = document.createElement("div");
    ov.className = "eb-overlay";
    const hMax = Math.min(Math.round(window.innerHeight * 0.82), 640);
    ov.innerHTML = '<div class="eb-modal" role="dialog" aria-label="Mon avatar en grand" style="display:flex;justify-content:center;max-height:92vh;overflow:auto">'
      + avatarTriStorySVG(v, Math.round(hMax / 1.78)) + "</div>";
    document.body.appendChild(ov);
    trapModal(ov, () => ov.remove());
  };

  bindPlansSelector();
  bindRetestPlanner(() => renderTabProfile(ensurePlan()));
  // — Sauvegarde : export = l'état v2 complet tel quel ; import = validation minimale puis
  // remplacement TOTAL (confirmé) et rechargement — le chemin le plus sûr, zéro fusion hasardeuse.
  const bk = $("pfBackup");
  if (bk) bk.onclick = () => {
    ebSave();
    const raw = localStorage.getItem("eb_state_v2") || "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const l = document.createElement("a");
    l.href = u; l.download = "endurabuild-sauvegarde-" + todayISO() + ".json";
    document.body.appendChild(l); l.click();
    setTimeout(() => { document.body.removeChild(l); URL.revokeObjectURL(u); }, 200);
    const m = $("pfBackupMsg"); if (m) m.textContent = "✓ Sauvegarde téléchargée (" + Math.round(raw.length / 1024) + " Ko).";
  };
  const rs = $("pfRestore");
  if (rs) rs.onchange = async () => {
    const f = rs.files && rs.files[0];
    if (!f) return;
    const m = $("pfBackupMsg");
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.plans) || !data.plans.length) { if (m) m.textContent = "⚠ Fichier invalide (pas une sauvegarde EnduraBuild)."; return; }
      if (!confirm("Remplacer TOUTES les données actuelles (" + Math.max(1, S.plans.length) + " plan(s)) par cette sauvegarde (" + data.plans.length + " plan(s)) ?")) return;
      localStorage.setItem("eb_state_v2", JSON.stringify(data));
      location.reload();
    } catch (e) { if (m) m.textContent = "⚠ Fichier illisible."; }
  };
  // R23.12b — « modifier mes réponses » et « changer de sport » ont quitté le Profil : leurs
  // gestionnaires partent avec eux. Les laisser aurait levé sur un élément absent — un `null` à
  // chaque rendu de l'onglet, c'est-à-dire une erreur console à chaque visite.
  bindRaceInter();
  bindRaceDplus();
  bindTrailProfile();
  // R6 §3 — l'athlète arbitre : il voit la mesure, il décide de la brancher ou de la retirer.
  // Aucun écrasement silencieux d'une donnée qu'il a saisie.
  const measApply = $("pfMeasApply");
  if (measApply) measApply.onclick = () => {
    delete S.answers.measured;              // force le premier calcul, hors cadence
    refreshMeasured(S.currentPlan);
    invalidatePlan();
    renderTabProfile(ensurePlan());
  };
  const measClear = $("pfMeasClear");
  if (measClear) measClear.onclick = () => {
    if (clearMeasured()) { invalidatePlan(); renderTabProfile(ensurePlan()); }
  };
  const fitInput = $("pfFit");
  if (fitInput) fitInput.onchange = async () => {
    const msg = (t) => { const m = $("pfFitMsg"); if (m) m.innerHTML = t; };
    const files = [...(fitInput.files || [])];
    if (!files.length) return;
    let nT = 0, nS = 0; const errs = [], notes = [];
    if (!Array.isArray(S.answers.tests)) S.answers.tests = [];
    if (!Array.isArray(S.answers.fitSessions)) S.answers.fitSessions = [];
    if (!Array.isArray(S.answers.fitRich)) S.answers.fitRich = [];
    for (const f of files) {
      try {
        // S-8 — la taille est contrôlée AVANT `arrayBuffer()` : lire 500 Mo en mémoire pour
        // découvrir ensuite que c'est trop gros, c'est avoir déjà payé le coût qu'on refuse.
        globalThis.EBV2.assertImportSize(f.name, f.size);
        const imp = globalThis.EBV2.importFit(await f.arrayBuffer());
        imp.tests.forEach((t) => { S.answers.tests.push(t); nT++; });
        imp.completed.forEach((c) => {
          if (!S.answers.fitSessions.some((x) => x.date === c.date && x.d === c.d && x.minutes === c.minutes)) { S.answers.fitSessions.push(c); nS++; }
        });
        // R4.8 — métriques riches (FC/vitesse/puissance) conservées pour les récompenses
        // d'EFFICIENCE (progrès à charge égale) : sans ces données, pas de récompense —
        // plutôt rien qu'une récompense fausse.
        (imp.sessions || []).forEach((s) => {
          if (!s.date || s.avgHr == null) return;
          if (!S.answers.fitRich.some((x) => x.date === s.date && x.sport === s.sport && x.minutes === s.minutes))
            S.answers.fitRich.push({ date: s.date, sport: s.sport, minutes: s.minutes, avgHr: s.avgHr, avgSpeedMs: s.avgSpeedMs ?? null, avgPowerW: s.avgPowerW ?? null });
        });
        notes.push(...imp.notes);
      } catch (e) { errs.push(esc(f.name) + " : " + esc(e && e.message || "illisible")); }
    }
    S.answers.fitSessions = S.answers.fitSessions.slice(-60); // borne : 60 dernières séances
    S.answers.fitRich = S.answers.fitRich.slice(-60);
    // Auto-✓ : une séance importée qui correspond à une séance PLANIFIÉE (même jour, même
    // sport, durée comparable) coche la séance du plan — la boucle prévu/réel se ferme
    // sans double saisie. Correspondance prudente : jamais de ✓ sur un simple « même jour ».
    let nA = 0;
    if (!S.answers.done) S.answers.done = {};
    for (const c of S.answers.fitSessions) {
      for (const w of plan.weeks) for (const d of w.days) {
        if (d.date !== c.date) continue;
        d.sessions.forEach((s, si) => {
          const k = w.num + "|" + d.jour + "|" + si;
          if (s.d !== c.d || S.answers.done[k]) return;
          const tol = Math.max(15, (s.min || 0) * 0.3);
          if (Math.abs((s.min || 0) - c.minutes) <= tol) { S.answers.done[k] = true; nA++; }
        });
      }
    }
    const nRef = syncRefsFromTests(); // pousse le test le plus récent vers a.ftp/pace/css — sinon le moteur ne le voit jamais
    ebSave();
    if (nRef) { invalidatePlan(); renderTabProfile(ensurePlan()); } // référence(s) mise(s) à jour → régénération (une fois)
    msg((nS || nT ? "✓ " + nS + " séance" + (nS > 1 ? "s" : "") + " importée" + (nS > 1 ? "s" : "") + " (nourrit la fatigue de « Forme du jour »)" + (nA ? " · " + nA + " séance" + (nA > 1 ? "s" : "") + " du plan validée" + (nA > 1 ? "s" : "") + " automatiquement ✓" : "") + (nT ? " · " + nT + " référence" + (nT > 1 ? "s" : "") + " ajoutée" + (nT > 1 ? "s" : "") + " au journal" : "") + (nRef ? " · plan régénéré avec la référence la plus récente" : "") + "." : "Aucune donnée exploitable.")
      + (notes.length ? '<br><span style="color:var(--gold)">⚠ ' + notes.map(esc).join(" ") + "</span>" : "")
      + (errs.length ? '<br><span style="color:var(--z5)">' + errs.join("<br>") + "</span>" : ""));
  };
  // — Import Strava : même post-traitement (pont vers les références vivantes) que le
  // token vienne de l'OAuth (relais) ou du champ manuel.
  const runStravaImport = async (btn, tok) => {
    btn.disabled = true;
    const before = Array.isArray(S.answers.tests) ? S.answers.tests.length : 0;
    await stravaImport(tok); // écrit S.answers.tests + #pfStravaMsg
    btn.disabled = false;
    const added = (Array.isArray(S.answers.tests) ? S.answers.tests.length : 0) - before;
    if (!added) return; // rien de nouveau (token invalide/aucune donnée) : le message de stravaImport suffit, pas de re-rendu
    const statusHTML = ($("pfStravaMsg") || {}).innerHTML || "";
    const nRef = syncRefsFromTests();
    ebSave();
    if (nRef) invalidatePlan(); // référence(s) à jour → régénération (une fois)
    renderTabProfile(ensurePlan());
    const m = $("pfStravaMsg");
    if (m) m.innerHTML = statusHTML + (nRef ? '<br><span style="color:var(--cyan)">✓ plan régénéré avec la référence la plus récente.</span>' : "");
  };
  const stravaConnBtn = $("pfStravaConnect");
  if (stravaConnBtn) stravaConnBtn.onclick = () => {
    const typed = (($("pfStravaRelay") || {}).value || "").trim();
    if (typed) { S.answers.stravaRelay = typed; ebSave(); }
    const m = $("pfStravaMsg");
    if (!stravaRelayUrl()) {
      if (m) m.innerHTML = "La connexion en 1 clic sera active quand le relais sera en ligne (15 min, <b>server/README.md</b>). En attendant : « Réglages avancés » pour coller l’URL d’un relais, ou le jeton manuel ci-dessous — les deux marchent.";
      return;
    }
    S._stravaError = null;
    ebSave();
    if (m) m.textContent = "Redirection vers Strava…";
    stravaConnect(); // quitte la page — retour géré par stravaAuthFromHash() au chargement
  };
  const stravaBtn = $("pfStravaBtn");
  if (stravaBtn) stravaBtn.onclick = async () => {
    const tok = await stravaAccessToken(); // renouvelé via le relais si expiré
    if (!tok) {
      const m = $("pfStravaMsg");
      if (m) m.textContent = "Session Strava expirée — reconnecte-toi.";
      stravaDisconnect();
      renderTabProfile(plan);
      return;
    }
    await runStravaImport(stravaBtn, tok);
  };
  const stravaOut = $("pfStravaOut");
  if (stravaOut) stravaOut.onclick = () => { stravaDisconnect(); renderTabProfile(plan); };
  const stravaTokBtn = $("pfStravaBtnTok");
  if (stravaTokBtn) stravaTokBtn.onclick = () => runStravaImport(stravaTokBtn);
  // R24.3 — le même enregistrement sert les DEUX cartes (⚙ références et 🏁 course) : le
  // gestionnaire lit chaque champ par id, où qu'il vive, et le message s'affiche dans la
  // carte d'où le geste est parti. Deux boutons, UNE règle (R11.1).
  const doSave = () => {
    const today = todayISO();
    if (!Array.isArray(S.answers.tests)) S.answers.tests = [];
    // R23.1 — quatrième et dernière écriture du journal de tests. Elle passe par la même borne
    // que les trois autres : une valeur hors bornes physiologiques n'entre pas, et le dit.
    const horsBornes = [];
    const log = (type, value, prev, apply) => {
      const f = globalThis.EBV2 && globalThis.EBV2.testDansBornes;
      if (f && typeof value === "number" && f(type, value) == null) { horsBornes.push(type); return; }
      S.answers.tests.push({ type, value, prev: prev != null && prev !== "" ? prev : undefined, date: today, source: "profil (modification manuelle)" });
      apply();
    };
    let changed = 0, planChanged = 0; // le poids ne pilote PAS le plan (nutrition seulement) → pas de régénération pour lui
    const g = (id) => { const el = $(id); return el ? el.value.trim() : null; };
    const ftp = g("pfFtp");
    if (ftp !== null && ftp !== "" && parseInt(ftp) > 0 && ftp !== String(a.ftp_known === "oui" ? a.ftp : "")) {
      log("ftp", parseInt(ftp), a.ftp_known === "oui" ? parseInt(a.ftp) : null, () => { S.answers.ftp = ftp; S.answers.ftp_known = "oui"; }); changed++;
    }
    const pace = g("pfPace");
    if (pace !== null && pace !== "" && isFinite(ebParseT(pace)) && pace !== String(a.pace_known === "oui" ? a.pace : "")) {
      log("thrPace", Math.round(ebParseT(pace)), a.pace_known === "oui" ? Math.round(ebParseT(a.pace)) : null, () => { S.answers.pace = pace; S.answers.pace_known = "oui"; }); changed++;
    }
    const css = g("pfCss");
    if (css !== null && css !== "" && isFinite(ebParseT(css)) && css !== String(a.css_known === "oui" ? a.css : "")) {
      log("css", Math.round(ebParseT(css)), a.css_known === "oui" ? Math.round(ebParseT(a.css)) : null, () => { S.answers.css = css; S.answers.css_known = "oui"; }); changed++;
    }
    const vol = g("pfVol");
    if (vol !== null && vol !== "" && parseFloat(vol) > 0 && vol !== String(a.vol_max || "")) {
      // R4.7 (spec §8) — garde-fou : +20% de volume d'un coup mérite un avertissement
      // explicite. Un utilisateur sur-engagé qui déborde se blesse et désinstalle.
      const prev = parseFloat(a.vol_max || 0);
      if (prev > 0 && parseFloat(vol) > prev * 1.2 && !confirm("Tu passes de " + prev + "h à " + vol + "h (+" + Math.round((parseFloat(vol) / prev - 1) * 100) + "%). Une montée aussi rapide augmente le risque de blessure — le moteur lissera, mais es-tu sûr·e ?")) {
        const el = $("pfVol"); if (el) el.value = a.vol_max || "";
      } else {
        log("profil:vol_max", parseFloat(vol), a.vol_max != null ? parseFloat(a.vol_max) : null, () => { S.answers.vol_max = vol; }); changed++;
      }
    }
    const vr = g("pfVolRecent");
    if (vr !== null && vr !== "" && parseFloat(vr) > 0 && vr !== String(a.vol_recent || "")) {
      log("profil:vol_recent", parseFloat(vr), a.vol_recent != null && a.vol_recent !== "" ? parseFloat(a.vol_recent) : null, () => { S.answers.vol_recent = vr; }); changed++;
    }
    const sess = g("pfSess");
    if (sess !== null && sess !== "" && parseInt(sess) > 0 && sess !== String(a.sessions_max || "")) {
      log("profil:sessions_max", parseInt(sess), a.sessions_max != null ? parseInt(a.sessions_max) : null, () => { S.answers.sessions_max = sess; }); changed++;
    }
    planChanged = changed;
    const nt = g("pfNotif");
    if (nt !== null && nt !== "" && nt !== String(a.notifyTime || "")) {
      S.answers.notifyTime = nt; changed++; // rappel quotidien : réglage pur, pas de régénération
      requestNotifyPermission(); // point unique de la demande de permission (notifications.js)
    }
    const wgt = g("pfWeight");
    if (wgt !== null && wgt !== "" && parseFloat(wgt) > 0 && wgt !== String(a.weight || "")) {
      log("profil:weight", parseFloat(wgt), a.weight != null && a.weight !== "" ? parseFloat(a.weight) : null, () => { S.answers.weight = wgt; }); changed++;
    }
    const hgt = g("pfHeight");
    if (hgt !== null && hgt !== "" && parseFloat(hgt) > 0 && hgt !== String(a.height || "")) {
      S.answers.height = hgt; changed++; // n'affecte que l'estimation de dépense, pas le plan
    }
    const cp = ($("pfCourseProfile") || {}).value;
    if (cp !== undefined && cp !== String(a.course_profile || "")) {
      S.answers.course_profile = cp; changed++; // n'affecte que la prédiction, pas le plan
    }
    // D+ (retour utilisateur, 08/08/2026) — hors ANSWER_SCHEMA (calculatrice, voir sa
    // définition) : mémorisé pour ne pas le resaisir, sans jamais toucher le plan.
    for (const [id, cle] of [["pfCourseDplus", "road_dplus_m"], ["pfLegBikeDplus", "leg_bike_dplus_m"], ["pfLegRunDplus", "leg_run_dplus_m"]]) {
      const el = $(id);
      if (!el) continue;
      const v = el.value;
      if (v !== String(a[cle] || "")) { S.answers[cle] = v; changed++; }
    }
    // R18.2 — les trois profils par discipline. Ils touchent la prédiction ET le pacing du
    // jour J (le jour J est une séance du plan), d'où `changed++` : le plan est régénéré.
    const wTemp = g("pfWaterTemp");
    if (wTemp !== null && wTemp !== String(a.water_temp_c || "")) { S.answers.water_temp_c = wTemp; changed++; }
    for (const [id, cle] of [["pfLegSwim", "leg_swim_env"], ["pfLegBike", "leg_bike_prof"], ["pfLegRun", "leg_run_prof"]]) {
      const el = $(id);
      if (!el) continue;
      if (el.value !== String(a[cle] || "")) { S.answers[cle] = el.value; changed++; }
    }
    // R14.1 — les deux entrées de la PROJECTION : elles ne régénèrent pas le plan (elles ne
    // changent pas une seule séance), elles changent ce qu'on annonce pour le jour J.
    const ts = ($("pfTrainingStructure") || {}).value;
    if (ts !== undefined && ts !== String(a.training_structure || "")) {
      S.answers.training_structure = ts; changed++;
    }
    const wt = g("pfWeightTarget");
    if (wt !== null && wt !== String(a.weight_target || "")) {
      S.answers.weight_target = wt; changed++;
    }
    // R23.1 — une valeur refusée n'est pas un silence. Le libellé nomme la mesure et la borne,
    // pour que l'athlète voie si c'est une faute de frappe (« 45 » pour 4:50) ou une unité.
    const LAB_BORNE = { ftp: "la FTP", thrPace: "l'allure seuil", css: "le CSS", vma: "la VMA" };
    const refus = horsBornes.length
      ? " ⚠ Hors bornes physiologiques, donc non enregistré : " + horsBornes.map((t) => LAB_BORNE[t] || t).join(", ") + " — vérifie l'unité et la saisie."
      : "";
    // Le verdict s'écrit dans les DEUX cartes : celle d'où le geste est parti est forcément l'une des deux.
    const dire = (txt) => { for (const id of ["pfMsg", "pfMsgRace"]) { const m = $(id); if (m) m.textContent = txt; } };
    if (!changed) { dire(horsBornes.length ? "Rien d'enregistré." + refus : "Aucun changement détecté."); return; }
    if (planChanged) invalidatePlan(); // le plan sera régénéré UNE fois, ici — pas au changement d'onglet
    ebSave();
    renderTabProfile(ensurePlan());
    const done = "✓ " + changed + " changement" + (changed > 1 ? "s" : "") + " enregistré" + (changed > 1 ? "s" : "") + (planChanged ? " — plan régénéré, journal mis à jour." : " — journal mis à jour (poids/taille n’affectent que ravitaillement et dépense estimée, pas le plan).") + refus;
    for (const id of ["pfMsg", "pfMsgRace"]) { const m = $(id); if (m) m.textContent = done; }
  };
  $("pfSave").onclick = doSave;
  const btnRace = $("pfSaveRace");
  if (btnRace) btnRace.onclick = doSave;
}
