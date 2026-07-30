// R4.4 — Retests en « boss fight ». Cycle complet sur les rails EXISTANTS (protocoles du
// registre de disciplines, journal answers.tests, syncRefsFromTests → régénération) :
//   J-7 → annonce (bannière dédiée) · J-7→J-1 → préparation (garder les jambes) ·
//   Jour J → écran scénarisé, protocole étape par étape · Résultat → RÉVÉLATION : delta
//   vs test précédent, zones mises à jour EN DIRECT (le plan se régénère réellement) ·
//   Partage → carte story « RETEST » distincte.
// RÉGRESSION : aucun langage d'échec — souvent la réponse n'est pas dans l'entraînement
// (sommeil, travail, stress). On recalibre, c'est tout (spec §5).
import { $, S, ebSave, esc, todayISO } from "../state.js";
import { syncRefsFromTests } from "./tab-profile.js";
import { invalidatePlan, ensurePlan, setTab } from "./tabs.js";
import { shareStory } from "../export.js";
import { avatarDataFor, avatarSVG } from "./avatar.js";
import { trapModal } from "./modal.js";

const TYPES = {
  ftp: { label: "FTP (vélo)", unit: "W", disc: "bike", parse: (v) => parseInt(v) || 0, fmt: (v) => Math.round(v) + " W", better: (nu, old) => nu > old },
  thrPace: { label: "Allure seuil (course)", unit: "min:s /km", disc: "run", parse: parseTime, fmt: fmtSec, better: (nu, old) => nu < old },
  css: { label: "CSS (natation)", unit: "min:s /100m", disc: "swim", parse: parseTime, fmt: (v) => fmtSec(v).replace("/km", "/100m"), better: (nu, old) => nu < old },
  // R12.2 — la VAM était la seule référence sans protocole écrit : `retestTypes` la déclarait
  // déjà pour le trail, mais l'UI la filtrait faute de test. Elle entre ici, et le cycle
  // « boss fight » existant fonctionne sans autre modification.
  vam: { label: "VAM (trail)", unit: "m/h", disc: "trail", parse: (v) => parseInt(v) || 0, fmt: (v) => Math.round(v) + " m/h", better: (nu, old) => nu > old },
};
function parseTime(v) { const m = String(v || "").split(":"); return m.length === 2 ? (+m[0]) * 60 + (+m[1]) : NaN; }
function fmtSec(s) { return Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0") + " /km"; }

export function typesForSport(sport) {
  // R10 phase 1 — la liste vient du REGISTRE DE SPORTS (EBV2.sports) : l'UI ne recopie plus
  // ce que chaque sport teste. Un sport ajouté au moteur est complet ici sans y toucher.
  // Les types affichables restent filtrés par TYPES (un protocole non écrit ne s'affiche pas).
  const reg = globalThis.EBV2 && EBV2.sports && EBV2.sports[sport];
  const known = reg ? reg.retestTypes.filter((t) => TYPES[t]) : [];
  return known.length ? known : ["thrPace"]; // repli : l'allure seuil se teste dans tous les sports
}
function protocolFor(type) {
  const reg = globalThis.EBV2 && globalThis.EBV2.disciplines;
  const d = reg && reg[TYPES[type].disc];
  if (!d) return "";
  // R12.2 — le trail a DEUX références : l'allure seuil sur plat (GAP) et la VAM (verticale).
  // Le protocole affiché doit être celui du test demandé, pas celui de la discipline.
  if (TYPES[type].unit === "m/h" && d.verticalSource) return d.verticalSource.protocol;
  return d.zonesSource.protocol;
}

// ---- Planification (carte Profil) ----
export function retestPlannerHTML() {
  const r = S.answers.retest;
  let h = '<div class="load-card"><div class="load-title">🥊 Retest — remets ton seuil sur le ring</div>';
  if (r && !r.done) {
    h += '<div class="load-sub" style="margin-top:6px">Retest <b>' + TYPES[r.type].label + "</b> planifié le <b>" + esc(r.date) + '</b>. L’annonce et le protocole arrivent dans 📅 Semaine à J-7.</div>'
      + '<div class="nav" style="margin-top:8px"><button class="btn" id="rtCancel" type="button">Annuler ce retest</button></div>';
  } else {
    const opts = typesForSport(S.sport).map((t) => '<option value="' + t + '">' + TYPES[t].label + "</option>").join("");
    h += '<div class="load-sub" style="margin-top:6px">Planifie un test de référence : le plan t’y prépare, le jour J est guidé pas à pas, et tes zones se recalent en direct sur le résultat.</div>'
      + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><select id="rtType" class="opt" style="padding:6px 10px">' + opts + "</select>"
      + '<input type="date" id="rtDate"><button class="btn primary" id="rtPlan" type="button">Planifier</button></div>';
  }
  return h + "</div>";
}
export function bindRetestPlanner(rerender) {
  const plan = $("rtPlan");
  if (plan) plan.onclick = () => {
    const date = ($("rtDate") || {}).value;
    if (!date || date < todayISO()) { alert("Choisis une date à venir."); return; }
    S.answers.retest = { type: $("rtType").value, date };
    ebSave(); rerender();
  };
  const cancel = $("rtCancel");
  if (cancel) cancel.onclick = () => { delete S.answers.retest; ebSave(); rerender(); };
}

// ---- Bannières + écran du jour J (onglet Semaine) ----
export function retestBannerHTML(todayISO) {
  const r = S.answers.retest;
  if (!r || r.done) return "";
  const days = Math.round((new Date(r.date + "T00:00:00Z") - new Date(todayISO + "T00:00:00Z")) / 864e5);
  const T = TYPES[r.type];
  if (days > 7 || days < 0) return "";
  if (days > 1) return '<div class="warn" style="background:#e9defc;font-weight:600">🥊 <b>Retest ' + T.label + " dans " + days + ' jours.</b> D’ici là : rien de nouveau, des jambes fraîches. Le protocole t’attendra le jour J.</div>';
  if (days === 1) return '<div class="warn" style="background:#fff3d6;font-weight:600">🥊 <b>Retest demain.</b> Aujourd’hui : facile ou repos, hydratation, sommeil. Le test se gagne la veille.</div>';
  // Jour J — écran scénarisé
  const steps = protocolFor(r.type).split(/(?<=\.)\s+/).map((s, i) => '<div style="margin:4px 0"><b>' + (i + 1) + ".</b> " + s + "</div>").join("");
  return '<div class="card" style="border-color:#9b72ff"><div class="eyebrow" style="background:#9b72ff">🥊 Jour de retest — ' + T.label + "</div>"
    + '<div class="why">Un test n’est ni réussi ni raté : il MESURE. Échauffe-toi sérieusement, exécute, note le résultat.</div>'
    + '<div style="font-size:13px;margin-top:6px">' + steps + "</div>"
    + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">'
    + '<input type="text" id="rtResult" placeholder="Résultat (' + T.unit + ')" style="flex:1;min-width:130px">'
    + '<button class="btn gold" id="rtSubmit" type="button">Valider le retest</button></div>'
    + '<div id="rtMsg" class="load-sub" style="margin-top:6px"></div></div>';
}

export function bindRetestBanner(todayISO, rerenderWeek) {
  const btn = $("rtSubmit");
  if (!btn) return;
  btn.onclick = () => {
    const r = S.answers.retest;
    const T = TYPES[r.type];
    const val = T.parse(($("rtResult") || {}).value);
    if (!val || !isFinite(val) || val <= 0) { $("rtMsg").textContent = "Résultat illisible — format attendu : " + T.unit + "."; return; }
    if (!Array.isArray(S.answers.tests)) S.answers.tests = [];
    // valeur précédente (la plus récente du même type) AVANT d'enregistrer
    const prev = S.answers.tests.filter((t) => t.type === r.type && isFinite(+t.value)).sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")))[0];
    S.answers.tests.push({ type: r.type, value: val, date: todayISO, source: "retest (protocole guidé)" });
    S.answers.retest = { ...r, done: true, result: val };
    syncRefsFromTests(); // zones recalées sur le résultat
    ebSave();
    invalidatePlan(); // le plan se régénère EN DIRECT avec les nouvelles zones
    const plan = ensurePlan();
    showReveal(plan, r.type, val, prev ? +prev.value : null, todayISO, rerenderWeek);
  };
}

// ---- Révélation (delta + zones à jour + partage story RETEST) ----
function showReveal(plan, type, val, prevVal, todayISO, rerenderWeek) {
  const T = TYPES[type];
  document.querySelectorAll(".eb-overlay").forEach((e) => e.remove());
  const av = avatarDataFor(plan, todayISO);
  let deltaHTML = "";
  let deltaTxt = "";
  if (prevVal != null) {
    const improved = T.better(val, prevVal);
    const d = type === "ftp" ? Math.abs(val - prevVal) + " W" : Math.abs(Math.round(val - prevVal)) + " s";
    if (improved) {
      deltaHTML = '<div style="text-align:center;margin-top:8px;font-weight:700;color:#00734f">' + T.fmt(prevVal) + " → " + T.fmt(val) + " (" + d + " de mieux)</div>"
        + '<div class="load-sub" style="text-align:center;margin-top:4px">Tes zones et toutes les allures du plan viennent d’être recalées sur cette nouvelle référence.</div>';
      deltaTxt = T.fmt(prevVal) + " → " + T.fmt(val);
    } else {
      // Régression : AUCUN langage d'échec (spec §5) — recalibrage proposé et déjà appliqué
      deltaHTML = '<div style="text-align:center;margin-top:8px;font-weight:700">' + T.fmt(prevVal) + " → " + T.fmt(val) + "</div>"
        + '<div class="load-sub" style="text-align:center;margin-top:4px">Ton seuil a bougé. Souvent, la réponse n’est pas dans l’entraînement : sommeil, travail, nutrition, stress. Le plan est recalibré sur ta valeur du jour — c’est exactement à ça que servent les retests.</div>';
      deltaTxt = "recalibré : " + T.fmt(val);
    }
  } else {
    deltaHTML = '<div style="text-align:center;margin-top:8px;font-weight:700">' + T.fmt(val) + "</div>"
      + '<div class="load-sub" style="text-align:center;margin-top:4px">Première référence mesurée — ton plan est maintenant calé sur du réel.</div>';
    deltaTxt = T.fmt(val);
  }
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  ov.innerHTML = '<div class="eb-modal" role="dialog" aria-label="Résultat du retest">'
    + '<div style="display:flex;justify-content:center">' + avatarSVG(av, 100) + "</div>"
    + '<h2 style="text-align:center;margin:8px 0 2px">🥊 Retest ' + T.label + "</h2>" + deltaHTML
    + '<div class="nav" style="justify-content:center;margin-top:14px;gap:10px;flex-wrap:wrap">'
    + '<button class="btn gold" id="rtShare" type="button">📸 Carte RETEST</button>'
    + '<button class="btn" id="rtClose" type="button">Fermer</button></div></div>';
  document.body.appendChild(ov);
  const untrap = trapModal(ov, () => { ov.remove(); rerenderWeek(); });
  const closeOv = () => { untrap(); ov.remove(); rerenderWeek(); };
  ov.querySelector("#rtClose").onclick = closeOv;
  ov.onclick = (e) => { if (e.target === ov) closeOv(); };
  ov.querySelector("#rtShare").onclick = async () => {
    const b = ov.querySelector("#rtShare");
    b.disabled = true; b.textContent = "Génération…";
    try {
      await shareStory({ title: "RETEST 🥊", sessionName: T.label, detail: deltaTxt, sport: S.sport, streak: 0, badge: null, avatarSVG: avatarSVG(av, 520), accent: "#9b72ff" });
    } catch (e) { console.warn(e); }
    b.disabled = false; b.textContent = "📸 Carte RETEST";
  };
}
