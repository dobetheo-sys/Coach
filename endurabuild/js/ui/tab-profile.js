// Onglet 📋 Profil — résumé éditable des réglages + journal d'évolution horodaté.
// Le journal ÉTEND le mécanisme existant S.answers.tests (déjà daté, déjà nourri par
// import FIT/Strava) : toute modification manuelle y est consignée {type, value,
// date, prev, source} — pas de nouvelle structure de données (brief onglets).
// Toute donnée utilisateur réaffichée passe par esc() avant innerHTML (anti-XSS).
import { SPORTS, VLAB } from "../config.js";
import { $, S, ebActivate, ebNewPlanEntry, ebSave, esc } from "../state.js";
import { curSteps, renderStep, reset, ebParseT, stravaImport } from "./steps.js";
import { renderPlan } from "./plan-view.js";
import { ensurePlan, invalidatePlan } from "./tabs.js";

const _fmtSec = (s) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");
const _fmtColon = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

// Le moteur V2 ne lit QUE les valeurs courantes (a.ftp/a.pace/a.css + *_known) — jamais
// le journal daté S.answers.tests. Sans ce pont, un import (FIT/Strava) écrirait le
// journal mais le plan généré ne changerait JAMAIS (bug corrigé : « chaque paramètre
// doit influencer le plan »). Applique le test le PLUS RÉCENT de chaque type ; renvoie
// le nombre de références effectivement mises à jour.
function syncRefsFromTests() {
  const tests = Array.isArray(S.answers.tests) ? S.answers.tests : [];
  const latest = (type) => tests.filter((t) => t.type === type && isFinite(t.value)).sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")))[0];
  let n = 0;
  const ftp = latest("ftp");
  if (ftp) { const v = String(Math.round(ftp.value)); if (S.answers.ftp_known !== "oui" || S.answers.ftp !== v) { S.answers.ftp = v; S.answers.ftp_known = "oui"; n++; } }
  const pace = latest("thrPace");
  if (pace) { const v = _fmtColon(pace.value); if (S.answers.pace_known !== "oui" || S.answers.pace !== v) { S.answers.pace = v; S.answers.pace_known = "oui"; n++; } }
  const css = latest("css");
  if (css) { const v = _fmtColon(css.value); if (S.answers.css_known !== "oui" || S.answers.css !== v) { S.answers.css = v; S.answers.css_known = "oui"; n++; } }
  return n;
}

// Libellé lisible d'une entrée du journal (types tests existants + types « profil: »).
function journalLabel(t) {
  const v = t.value;
  switch (t.type) {
    case "ftp": return "FTP " + esc(v) + "W";
    case "thrPace": return "Allure seuil " + esc(_fmtSec(+v)) + "/km";
    case "css": return "CSS " + esc(_fmtSec(+v)) + "/100m";
    case "cs": return "Vitesse critique " + esc(v);
    case "vma": return "VMA " + esc(v) + " km/h";
    case "profil:vol_max": return "Volume max " + esc(v) + "h/sem";
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
const DISC_LABEL = { rn: "🏃 Course", bk: "🚴 Vélo", sw: "🏊 Natation", br: "🔁 Brick" };
function recordsHTML(plan, a) {
  const rows = [];
  const tests = Array.isArray(a.tests) ? a.tests.filter((t) => isFinite(+t.value)) : [];
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
  let h = '<div class="load-card"><div class="load-title">🏅 Records personnels</div>';
  if (!rows.length) h += '<div class="load-sub" style="margin-top:6px">Encore vides — ils se rempliront avec tes tests (FTP/allure/CSS), tes imports FIT/Strava et tes séances cochées ✓.</div>';
  else rows.forEach((r) => { h += '<div style="display:flex;justify-content:space-between;gap:8px;margin:6px 0;font-size:13px;align-items:baseline"><span>' + r.lab + '</span><span style="text-align:right"><b>' + esc(r.val) + '</b>' + (r.date ? ' <span style="color:#777;font-size:11px">' + esc(r.date) + "</span>" : "") + "</span></div>"; });
  h += '<div class="load-sub" style="margin-top:4px">Un record se gagne, il ne se perd pas — on garde la meilleure valeur jamais atteinte, avec sa date.</div></div>';
  return h;
}

function summaryRows(a) {
  const L = (k, lab) => (a[k] ? '<div class="bp-decision"><div><div class="bp-what">' + lab + '</div><div class="bp-val">' + esc(String(a[k]).split(",").map((x) => VLAB[x] || x).join(", ")) + "</div></div></div>" : "");
  return L("intent", "Intention") + L("format", "Objectif") + L("history", "Historique") + L("level", "Niveau") + L("dispo", "Disponibilité") + L("injury", "Blessures");
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
    S.plans.push(e);
    ebActivate(e.id);
    ebSave();
    document.body.dataset.sport = "";
    document.body.dataset.intent = "";
    renderStep(); // nouveau questionnaire, à partir du choix du sport
  };
}

export function renderTabProfile(plan) {
  const a = S.answers, sp = S.sport;
  let html = '<div class="card"><div class="eyebrow">Profil — ' + SPORTS[sp].nom + "</div><h2>Tes réglages</h2>"
    + '<div class="why">Modifie une valeur : le plan est régénéré et le changement est consigné dans ton journal d’évolution.</div>';
  html += plansSelectorHTML();
  html += '<div class="bp-cat">' + summaryRows(a) + "</div>";

  // — Références physiologiques éditables (celles que le moteur lit : a.ftp / a.pace / a.css)
  html += '<div class="load-card"><div class="load-title">⚙ Références d’entraînement</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">';
  const row = (id, lab, val, ph) => '<label style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:150px">' + lab + '</span><input type="text" id="' + id + '" value="' + esc(val || "") + '" placeholder="' + ph + '" style="flex:1;min-width:0"></label>';
  if (sp === "bike" || sp === "tri") html += row("pfFtp", "FTP (watts)", a.ftp_known === "oui" ? a.ftp : "", "ex. 220");
  if (sp === "run" || sp === "tri") html += row("pfPace", "Allure seuil (min:s /km)", a.pace_known === "oui" ? a.pace : "", "ex. 4:30");
  if (sp === "swim" || sp === "tri") html += row("pfCss", "CSS (min:s /100m)", a.css_known === "oui" ? a.css : "", "ex. 1:55");
  html += row("pfVol", "Volume max (h/sem)", a.vol_max, "ex. 8");
  html += row("pfSess", "Séances max /sem", a.sessions_max, "ex. 5");
  html += row("pfWeight", "Poids (kg, optionnel)", a.weight, "affine le ravitaillement");
  html += '<label style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:150px">Rappel quotidien</span><input type="time" id="pfNotif" value="' + esc(a.notifyTime || "") + '" style="flex:1;min-width:0"></label>';
  html += '</div><div class="nav" style="margin-top:10px"><button class="btn primary" id="pfSave" type="button">Enregistrer → régénérer le plan</button></div>'
    + '<div id="pfMsg" class="load-sub" style="margin-top:6px"></div></div>';

  // — Records personnels (R4-5, lecture seule)
  html += recordsHTML(plan, a);

  // — Journal d'évolution (S.answers.tests, trié du plus récent au plus ancien)
  const tests = Array.isArray(a.tests) ? [...a.tests].sort((x, y) => String(y.date || "").localeCompare(String(x.date || ""))) : [];
  html += '<div class="load-card"><div class="load-title">📒 Journal d’évolution</div>';
  if (tests.length) {
    tests.forEach((t) => {
      html += '<div style="display:flex;gap:8px;margin:5px 0;font-size:12px;align-items:baseline"><span style="width:78px;color:#635b4a">' + esc(t.date || "—") + "</span><span><b>" + journalPrev(t) + journalLabel(t) + "</b>" + (t.source ? ' <span style="color:#777">(' + esc(t.source) + ")</span>" : "") + "</span></div>";
    });
  } else {
    html += '<div class="load-sub">Encore vide — il se remplira à chaque test (FTP, allure, CSS), import Strava/FIT, ou modification de profil ci-dessus.</div>';
  }
  // Import FIT (roadmap : source « upload fichier », sans compte ni réseau) — le fichier
  // d'activité de n'importe quelle montre nourrit le journal (références) ET la fatigue
  // de l'ajusteur (S.answers.fitSessions, même contrat que les ✓).
  if (globalThis.EBV2 && globalThis.EBV2.importFit) {
    html += '<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      + '<label class="btn" style="cursor:pointer;margin:0">📂 Importer un fichier .FIT<input type="file" id="pfFit" accept=".fit,.FIT" multiple style="display:none"></label>'
      + '<span class="load-sub" style="margin:0">export de ta montre — lu ici, jamais envoyé</span></div>'
      + '<div id="pfFitMsg" class="load-sub" style="margin-top:6px"></div>';
  }
  // Import Strava (lecture seule, jeton personnel) — même journal, même pont vers le plan.
  html += '<div style="margin-top:10px"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    + '<input type="text" id="pfStravaTok" placeholder="token d’accès Strava" style="flex:1;min-width:180px">'
    + '<button class="btn" id="pfStravaBtn" type="button">Importer depuis Strava</button></div>'
    + '<div class="load-sub" style="margin-top:4px">Réglages Strava → « Mon API », scope <b>activity:read</b> — rien n’est écrit sur Strava.</div>'
    + '<div id="pfStravaMsg" class="load-sub" style="margin-top:4px"></div></div>';
  html += "</div>";

  html += '<div class="nav" style="flex-wrap:wrap;gap:10px"><button class="btn" id="pfEdit" type="button">← Modifier mes réponses</button><button class="btn" id="pfReset" type="button">Changer de sport</button></div></div>';
  $("screen").innerHTML = html;

  bindPlansSelector();
  $("pfEdit").onclick = () => { S.step = curSteps().length - 1; renderStep(); };
  $("pfReset").onclick = () => reset();
  const fitInput = $("pfFit");
  if (fitInput) fitInput.onchange = async () => {
    const msg = (t) => { const m = $("pfFitMsg"); if (m) m.innerHTML = t; };
    const files = [...(fitInput.files || [])];
    if (!files.length) return;
    let nT = 0, nS = 0; const errs = [], notes = [];
    if (!Array.isArray(S.answers.tests)) S.answers.tests = [];
    if (!Array.isArray(S.answers.fitSessions)) S.answers.fitSessions = [];
    for (const f of files) {
      try {
        const imp = globalThis.EBV2.importFit(await f.arrayBuffer());
        imp.tests.forEach((t) => { S.answers.tests.push(t); nT++; });
        imp.completed.forEach((c) => {
          if (!S.answers.fitSessions.some((x) => x.date === c.date && x.d === c.d && x.minutes === c.minutes)) { S.answers.fitSessions.push(c); nS++; }
        });
        notes.push(...imp.notes);
      } catch (e) { errs.push(esc(f.name) + " : " + esc(e && e.message || "illisible")); }
    }
    S.answers.fitSessions = S.answers.fitSessions.slice(-60); // borne : 60 dernières séances
    const nRef = syncRefsFromTests(); // pousse le test le plus récent vers a.ftp/pace/css — sinon le moteur ne le voit jamais
    ebSave();
    if (nRef) { invalidatePlan(); renderTabProfile(ensurePlan()); } // référence(s) mise(s) à jour → régénération (une fois)
    msg((nS || nT ? "✓ " + nS + " séance" + (nS > 1 ? "s" : "") + " importée" + (nS > 1 ? "s" : "") + " (nourrit la fatigue de « Forme du jour »)" + (nT ? " · " + nT + " référence" + (nT > 1 ? "s" : "") + " ajoutée" + (nT > 1 ? "s" : "") + " au journal" : "") + (nRef ? " · plan régénéré avec la référence la plus récente" : "") + "." : "Aucune donnée exploitable.")
      + (notes.length ? '<br><span style="color:#8a6d00">⚠ ' + notes.map(esc).join(" ") + "</span>" : "")
      + (errs.length ? '<br><span style="color:#c0392b">' + errs.join("<br>") + "</span>" : ""));
  };
  const stravaBtn = $("pfStravaBtn");
  if (stravaBtn) stravaBtn.onclick = async () => {
    stravaBtn.disabled = true;
    const before = Array.isArray(S.answers.tests) ? S.answers.tests.length : 0;
    await stravaImport(); // écrit S.answers.tests + #pfStravaMsg
    stravaBtn.disabled = false;
    const added = (Array.isArray(S.answers.tests) ? S.answers.tests.length : 0) - before;
    if (!added) return; // rien de nouveau (token invalide/aucune donnée) : le message de stravaImport suffit, pas de re-rendu
    const statusHTML = ($("pfStravaMsg") || {}).innerHTML || "";
    const nRef = syncRefsFromTests();
    ebSave();
    if (nRef) invalidatePlan(); // référence(s) à jour → régénération (une fois)
    renderTabProfile(ensurePlan());
    const m = $("pfStravaMsg");
    if (m) m.innerHTML = statusHTML + (nRef ? '<br><span style="color:#00734f">✓ plan régénéré avec la référence la plus récente.</span>' : "");
  };
  $("pfSave").onclick = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!Array.isArray(S.answers.tests)) S.answers.tests = [];
    const log = (type, value, prev, apply) => {
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
    const sess = g("pfSess");
    if (sess !== null && sess !== "" && parseInt(sess) > 0 && sess !== String(a.sessions_max || "")) {
      log("profil:sessions_max", parseInt(sess), a.sessions_max != null ? parseInt(a.sessions_max) : null, () => { S.answers.sessions_max = sess; }); changed++;
    }
    planChanged = changed;
    const nt = g("pfNotif");
    if (nt !== null && nt !== "" && nt !== String(a.notifyTime || "")) {
      S.answers.notifyTime = nt; changed++; // rappel quotidien : réglage pur, pas de régénération
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    }
    const wgt = g("pfWeight");
    if (wgt !== null && wgt !== "" && parseFloat(wgt) > 0 && wgt !== String(a.weight || "")) {
      log("profil:weight", parseFloat(wgt), a.weight != null && a.weight !== "" ? parseFloat(a.weight) : null, () => { S.answers.weight = wgt; }); changed++;
    }
    if (!changed) { const m = $("pfMsg"); if (m) m.textContent = "Aucun changement détecté."; return; }
    if (planChanged) invalidatePlan(); // le plan sera régénéré UNE fois, ici — pas au changement d'onglet
    ebSave();
    renderTabProfile(ensurePlan());
    const m = $("pfMsg");
    if (m) m.textContent = "✓ " + changed + " changement" + (changed > 1 ? "s" : "") + " enregistré" + (changed > 1 ? "s" : "") + (planChanged ? " — plan régénéré, journal mis à jour." : " — journal mis à jour (le poids n’affecte que le ravitaillement, pas le plan).");
  };
}
