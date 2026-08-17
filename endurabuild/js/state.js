// État global de la PWA. R4-4 (multi-plans) : plusieurs plans sous un même profil.
// S.plans = [{id, label, sport, answers, tier, step, started, onPlan}] + S.activePlanId ;
// S.sport / S.answers / S.tier / S.step / S.started / S.onPlan restent l'ÉTAT DE TRAVAIL
// du plan actif (tout le code existant continue de les lire/écrire tel quel) — ebSave()
// recopie cet état dans l'entrée active avant de persister, ebActivate() fait l'inverse.
// currentPlan : le plan généré UNE fois (refonte onglets) — jamais persisté (recalculé au
// chargement/changement de plan), jamais recalculé au changement d'onglet (ui/tabs.js).
const S = { sport:null, answers:{}, rules:[], step:0, tier:"free", started:false, prevRuleIds:new Set(), showAllWeeks:false, currentPlan:null, onPlan:false, plans:[], activePlanId:null, shared:{}, toolsSubTab:null };
// État PAR PERSONNE (pas par plan) : le sommeil, la VFC, la douleur, la maladie, le poids
// et les réglages de notification appartiennent au corps/à l'appareil — ils suivent
// l'utilisateur d'un plan à l'autre (fini le re-check-in après un changement de plan).
// Mécanique : recopiés answers → shared à chaque ebSave, shared → answers à ebActivate.
// R26 — "educatifs" (progression Éducatifs par discipline) rejoint ce groupe : savoir nager,
// connaître sa cadence, décrire l'ATHLÈTE, pas un plan d'entraînement particulier. Ça diffère
// du précédent XP/badges/streak (resté per-plan, `answers.done`) — mais ce précédent n'a
// jamais eu de raison documentée, juste un effet de bord de `ebActivate()` qui échange
// `S.answers` en bloc ; ça n'en fait pas la référence à suivre ici.
const SHARED_KEYS=["readiness","painFlag","sickDates","weight","height","notifyTime","notifyDismissed","lastDailyNotif","lastWeeklyNotif","relanceSent","stravaRelay","stravaAuth","hrRestLog","educatifs"];
function liftShared(){for(const k of SHARED_KEYS)if(S.answers[k]!==undefined)S.shared[k]=S.answers[k];}
function overlayShared(){for(const k of SHARED_KEYS)if(S.shared[k]!==undefined)S.answers[k]=S.shared[k];}
// Échappement HTML pour toute valeur saisie réinjectée via innerHTML (anti-XSS, avant tout partage).
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function ebNewPlanEntry(label){
  return {id:"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), label:label||"", sport:null, answers:{}, tier:"free", step:0, started:false, onPlan:false};
}
// Recopie l'état de travail dans l'entrée active (créée paresseusement au premier save).
function ebSyncActive(){
  let e=S.plans.find(p=>p.id===S.activePlanId);
  if(!e){e=ebNewPlanEntry("");S.plans.push(e);S.activePlanId=e.id;}
  e.sport=S.sport;e.answers=S.answers;e.tier=S.tier;e.step=S.step;e.started=S.started;e.onPlan=!!S.onPlan;
  return e;
}
// Charge une entrée dans l'état de travail. Le plan généré est invalidé : il sera
// reconstruit UNE fois au prochain ensurePlan() — chaque plan garde ses réponses,
// son journal (answers.tests), ses ✓ (answers.done), ses records.
function ebActivate(id){
  const e=S.plans.find(p=>p.id===id);if(!e)return false;
  S.activePlanId=id;S.sport=e.sport;S.answers=e.answers||{};S.tier=e.tier||"free";
  S.step=e.step||0;S.started=!!e.started;S.onPlan=!!e.onPlan;S.currentPlan=null;S.showAllWeeks=false;
  overlayShared(); // l'état corporel (forme du jour, douleur…) suit la personne, pas le plan
  return true;
}
/** Secondes → « m:ss ». Déplacé avec `syncRefsFromTests` : son seul consommateur. */
// arrondir AVANT de séparer (famille « 1'60 », 17/08/2026)
const _fmtColon = (s) => { const t = Math.round(s); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };

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

  // O-56 §2 — LA CONTINUITÉ DE NAGE VALIDÉE REMONTE JUSQU'À `longest_swim_m`, ET LE MOTEUR LA
  // LIT COMME AVANT.
  //
  // C'est la décision du fondateur (17/08/2026) et elle évite le geste que j'allais faire :
  // passer le plan précédent à `buildPlan` pour qu'il lise les ✓. Ç'aurait été une quatrième
  // entrée au moteur, de l'état entre deux builds, et un couplage aux coordonnées d'un plan.
  // **Une nage continue validée EST une référence mesurée** — elle démontre une capacité, elle a
  // une date, elle vient de l'athlète — donc elle passe par le même pont que la FTP, l'allure
  // seuil, le CSS et la VAM. Rien de nouveau : une PROMOTION, pas un changement de moteur.
  // R20.1 est satisfaite d'office, puisque `longest_swim_m` agit déjà sur le plan.
  //
  // ⚠ LA POLITIQUE DE SÉLECTION DIVERGE, ET C'EST VOULU. `latest()` rend le PLUS RÉCENT — juste
  // pour une FTP, qui monte et descend. Un cliquet de capacité veut le PLUS HAUT : une séance
  // sautée n'est pas une capacité perdue, qui a nagé 800 m d'affilée les sait toujours nager.
  // La borne « depuis le début du plan » n'invente aucune fenêtre : c'est la durée de la
  // préparation, elle est connue, et une nage de 2 000 m faite il y a trois ans n'a pas à porter
  // le plan d'aujourd'hui. Variante de politique PAR CLÉ, écrite ici parce que celle du journal
  // est explicite et sourcée (O-23, O-25).
  const debutPlan = String(S.answers.plan_start || "");
  const conts = tests.filter((t) => t.type === "swimContinuity" && isFinite(t.value)
    && (!debutPlan || String(t.date || "") >= debutPlan));
  if (conts.length) {
    const haut = Math.max(...conts.map((t) => t.value));
    // MONOTONE aussi contre la DÉCLARATION : le cliquet ne peut que monter, jamais effacer une
    // capacité que l'athlète avait déclarée plus haute et qu'il n'a simplement pas re-testée.
    const declare = parseFloat(String(S.answers.longest_swim_m ?? "")) || 0;
    const v = String(Math.round(Math.max(haut, declare)));
    if (S.answers.longest_swim_known !== "oui" || S.answers.longest_swim_m !== v) {
      S.answers.longest_swim_m = v; S.answers.longest_swim_known = "oui"; n++;
    }
  }
  return n;
}

// Persistance : clé versionnée eb_state_v2 (tableau de plans). survit au rafraîchissement.
/** D2 — l'écriture peut ÉCHOUER (quota, Safari en navigation privée) et l'échec était muet :
 *  l'athlète cochait ses séances, voyait le ✓, et rien n'était persisté. On le DIT une fois. */
let ebSaveKO=false;
function ebSave(){
  try{
    ebSyncActive();liftShared();
    localStorage.setItem("eb_state_v2",JSON.stringify({plans:S.plans,activePlanId:S.activePlanId,shared:S.shared}));
    ebSaveKO=false;
  }catch(e){
    if(!ebSaveKO){
      ebSaveKO=true;
      try{console.warn("EB: sauvegarde impossible —",e&&e.name);}catch(_){}
      // Pas de modale : on ne bloque pas quelqu'un au milieu d'une séance. Un bandeau discret
      // que l'UI peut lire (`S.saveFailed`) suffit à ce que l'information existe quelque part.
      S.saveFailed=true;
    }
  }
}
// Chargement + MIGRATION automatique de l'ancien format mono-plan eb_state_v1 (on ne fait
// jamais perdre son plan à un utilisateur existant ; l'ancienne clé est laissée en place
// par prudence — elle ne sera plus lue dès que la v2 existe).
/** R7 TRAIL — migration des plans « sport=run, format=trail » : le trail est devenu un
 *  SPORT (§8.2). On ne casse jamais un plan existant : le sport bascule, la distance et le
 *  D+ sont pré-remplis à partir d'un ordre de grandeur, et un avertissement demande à
 *  l'athlète de renseigner les deux vraies valeurs — ce sont elles qui structurent tout. */
function migrateTrailPlans(state){
  if(!state||!Array.isArray(state.plans))return state;
  for(const p of state.plans){
    if(p.sport!=="run"||!p.answers||p.answers.format!=="trail")continue;
    p.sport="trail";
    p.answers.format="";
    if(!p.answers.race_distance_km)p.answers.race_distance_km="45";
    if(!p.answers.race_dplus_m)p.answers.race_dplus_m="2000";
    if(!p.answers.race_technicity)p.answers.race_technicity="mixte";
    if(!p.answers.race_night)p.answers.race_night="non";
    if(!p.answers.train_dplus_access)p.answers.train_dplus_access="collines";
    if(!p.answers.treadmill)p.answers.treadmill="non";
    if(!p.answers.poles)p.answers.poles="a_decider";
    if(!p.answers.vam_known)p.answers.vam_known="non";
    p.answers.trailMigrated=1; // l'UI affiche « vérifie ta distance et ton D+ »
  }
  return state;
}

/**
 * R11.5 — PURGE DES DATES DE COURSE PASSÉES à la reprise d'état. Une date restée en
 * `localStorage` après la course faisait générer un plan d'UNE semaine, sans un mot : l'app
 * calculait la préparation d'une échéance déjà vécue. La date part dans `race_done` (l'onglet
 * Aujourd'hui s'en sert pour proposer la saisie du chrono réel) et le plan repart proprement.
 * Fenêtre de grâce de 3 jours : le lendemain d'une course, on est encore dans la course.
 */
function purgePastRace(state){
  const t=todayISO();
  const grace=new Date(new Date(t+"T00:00:00Z").getTime()-3*864e5).toISOString().slice(0,10);
  for(const p of (state&&state.plans)||[]){
    const a=p.answers||{};
    if(a.race_date&&/^\d{4}-\d{2}-\d{2}$/.test(a.race_date)&&a.race_date<grace){
      a.race_done=a.race_date;
      delete a.race_date;
    }
  }
  return state;
}

/** LA BOUCLE DU 13/08 — un plan qu'on SUIT a forcément été DÉMARRÉ.
 *
 * Le boot exige `started && sport && onPlan` pour afficher le plan, mais `started` n'était posé
 * QUE par le clic sur une carte sport. Un état migré depuis `eb_state_v1` (l'app est déployée :
 * ces états existent) arrive avec `started:false` et un sport déjà choisi — la carte n'est
 * jamais recliquée, `started` reste faux À VIE. Vécu : on complète le questionnaire, on génère,
 * on voit son plan… et CHAQUE réouverture retombe sur « Ton plan est prêt 🎯 ». Reproduit pas à
 * pas au Playwright sur trois rechargements. `onPlan:true` + `started:false` est une
 * contradiction (être SUR un plan jamais démarré) : on la répare À LA LECTURE, parce que les
 * états cassés sont déjà dans des navigateurs — un correctif qui ne toucherait que la
 * génération laisserait chaque appareil atteint boucler pour toujours. */
function healContradictoryFlags(state){
  // §3.3 de la réponse au STOP de Phase 1 — LA RÉPARATION EST COMPTÉE, PAS SILENCIEUSE.
  // Une guérison muette et permanente devient un silencieux définitif pour toute une classe
  // de corruption : si quelque chose PRODUIT encore des états contradictoires, seul ce
  // compteur le verra (même famille que la note EB_STANDALONE sur les échecs avalés).
  // `shared` est la seule zone hors plans qu'`ebSave` persiste — le compteur y vit.
  let n=0;
  for(const p of state.plans||[])if(p.onPlan&&!p.started){p.started=true;n++;}
  if(n){state.shared=state.shared||{};state.shared.migRepairs=(state.shared.migRepairs||0)+n;state.shared.migRepairsLast=new Date().toISOString().slice(0,10);}
  return state;
}
function ebLoad(){
  try{
    const v2=JSON.parse(localStorage.getItem("eb_state_v2")||"null");
    if(v2&&Array.isArray(v2.plans)&&v2.plans.length)return healContradictoryFlags(purgePastRace(migrateTrailPlans(v2)));
    const v1=JSON.parse(localStorage.getItem("eb_state_v1")||"null");
    if(v1){
      const e=Object.assign(ebNewPlanEntry(""),{sport:v1.sport||null,answers:v1.answers||{},tier:v1.tier||"free",step:v1.step||0,started:!!v1.started,onPlan:!!v1.onPlan});
      return healContradictoryFlags(purgePastRace(migrateTrailPlans({plans:[e],activePlanId:e.id,shared:{}})));
    }
    return null;
  }catch(e){
    // D1 — UN ÉTAT ILLISIBLE NE S'EFFACE PAS EN SILENCE.
    //
    // Avant : `catch → return null`, l'app repartait du questionnaire d'accueil sans un mot, et
    // le PREMIER `ebSave` réécrivait par-dessus les octets d'origine. Testé en vrai : après un
    // rechargement, la copie corrompue avait disparu — un support à qui on dit « j'ai tout
    // perdu » n'a plus rien à réparer.
    //
    // Le chemin est atteignable : l'app expose une RESTAURATION JSON au Profil, donc un fichier
    // édité à la main est une entrée officiellement supportée — et c'est exactement d'où vient
    // du JSON malformé. On met la copie de côté sous une clé datée et on le signale ; elle ne
    // sert peut-être jamais, mais elle coûte quelques kilo-octets et elle est la seule chose qui
    // reste quand tout le reste a disparu.
    try{
      const brut=localStorage.getItem("eb_state_v2");
      if(brut) localStorage.setItem("eb_state_v2_corrompu_"+todayISO(),brut);
    }catch(_){}
    return null;
  }
}
// « Changer de sport » (reset) : n'efface QUE le plan actif — les autres plans du profil
// sont conservés. L'appelant (steps.js reset()) a déjà remis l'état de travail à zéro ;
// il suffit de persister cet état vidé dans l'entrée active.
function ebClear(){ebSave();}
const $ = id => document.getElementById(id);

// R7 — « aujourd'hui » en heure LOCALE. toISOString() donne la date UTC : entre 22h et
// minuit (heure d'été française), l'app vivait encore LA VEILLE — « encore un problème
// de jour réel et de jour du plan » (retour utilisateur). Toute comparaison avec les
// dates du plan (chaînes YYYY-MM-DD) passe par ce helper, jamais par toISOString.
function todayISO(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
/**
 * R23.2 — LA JOURNÉE D'ENTRAÎNEMENT NE COMMENCE PAS À MINUIT.
 *
 * Retour du fondateur (06/08/2026) : *« Blocage de l'onglet avec les questions "sommeil… etc"
 * alors que j'ai ouvert l'application hier à minuit donc avant même de dormir »*. Le portillon du
 * check-in compare `readiness.date` à la date CALENDAIRE : à 00 h 10, elle a changé, donc l'app
 * redemande « comment as-tu dormi ? » à quelqu'un qui n'est pas encore allé se coucher — et lui
 * cache sa séance tant qu'il n'a pas répondu.
 *
 * C'est le MIROIR exact du défaut que R7 a corrigé (« fini l'app qui vit hier entre 22 h et
 * minuit ») : là on lisait la date en UTC, ici on la lit à la bonne heure mais on coupe la
 * journée au mauvais endroit. Une journée d'entraînement se termine quand on dort, pas quand
 * l'horloge repasse à zéro.
 *
 * Frontière à 4 h du matin, locale. Ce n'est pas un réglage arbitraire : c'est l'heure après
 * laquelle un réveil est un vrai réveil (les départs de course les plus matinaux — Ironman,
 * ultra — sont à 5-6 h, et on se lève une à deux heures avant). Avant 4 h, on est encore la
 * veille : c'est ce que dit le corps, et c'est ce que dit le bon sens de quelqu'un qui consulte
 * son plan avant d'aller dormir.
 *
 * Portée VOLONTAIREMENT étroite : cette frontière ne sert QU'AU check-in du matin (le portillon
 * et l'horodatage de la réponse, un seul et même repère — R11.1). Elle ne touche NI le jour du
 * plan, NI la séance affichée, NI les séries : décaler ces notions-là changerait quelle séance
 * est « celle du jour », ce que personne n'a demandé et qui casserait des gardes existantes.
 */
const JOUR_ENTRAINEMENT_DEBUT_H = 4;
function jourEntrainementISO(){
  const d=new Date();
  if(d.getHours()<JOUR_ENTRAINEMENT_DEBUT_H)d.setDate(d.getDate()-1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
/** Date courte pour l'affichage calendrier des jours du plan : "29/07". */
function fmtDay(iso){return iso?iso.slice(8,10)+"/"+iso.slice(5,7):"";}
export { $, S, ebActivate, ebClear, ebLoad, ebNewPlanEntry, ebSave, esc, fmtDay, todayISO, jourEntrainementISO, JOUR_ENTRAINEMENT_DEBUT_H };
