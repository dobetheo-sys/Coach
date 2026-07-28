// Onglet 📋 Profil — résumé éditable des réglages + journal d'évolution horodaté.
// Le journal ÉTEND le mécanisme existant S.answers.tests (déjà daté, déjà nourri par
// ebAddTest/stravaImport) : toute modification manuelle y est consignée {type, value,
// date, prev, source} — pas de nouvelle structure de données (brief onglets).
// Toute donnée utilisateur réaffichée passe par esc() avant innerHTML (anti-XSS).
import { SPORTS, VLAB } from "../config.js";
import { $, S, ebSave, esc } from "../state.js";
import { curSteps, renderStep, reset, ebParseT } from "./steps.js";
import { ensurePlan, invalidatePlan } from "./tabs.js";

const _fmtSec = (s) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");
const _fmtColon = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

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

function summaryRows(a) {
  const L = (k, lab) => (a[k] ? '<div class="bp-decision"><div><div class="bp-what">' + lab + '</div><div class="bp-val">' + esc(String(a[k]).split(",").map((x) => VLAB[x] || x).join(", ")) + "</div></div></div>" : "");
  return L("intent", "Intention") + L("format", "Objectif") + L("history", "Historique") + L("level", "Niveau") + L("dispo", "Disponibilité") + L("injury", "Blessures");
}

export function renderTabProfile(plan) {
  const a = S.answers, sp = S.sport;
  let html = '<div class="card"><div class="eyebrow">Profil — ' + SPORTS[sp].nom + "</div><h2>Tes réglages</h2>"
    + '<div class="why">Modifie une valeur : le plan est régénéré et le changement est consigné dans ton journal d’évolution.</div>';
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
  html += '</div><div class="nav" style="margin-top:10px"><button class="btn primary" id="pfSave" type="button">Enregistrer → régénérer le plan</button></div>'
    + '<div id="pfMsg" class="load-sub" style="margin-top:6px"></div></div>';

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
  html += "</div>";

  html += '<div class="nav" style="flex-wrap:wrap;gap:10px"><button class="btn" id="pfEdit" type="button">← Modifier mes réponses</button><button class="btn" id="pfReset" type="button">Changer de sport</button></div></div>';
  $("screen").innerHTML = html;

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
    ebSave();
    if (nT) { invalidatePlan(); renderTabProfile(ensurePlan()); } // nouvelles réfs → régénération (une fois)
    msg((nS || nT ? "✓ " + nS + " séance" + (nS > 1 ? "s" : "") + " importée" + (nS > 1 ? "s" : "") + " (nourrit la fatigue de « Forme du jour »)" + (nT ? " · " + nT + " référence" + (nT > 1 ? "s" : "") + " ajoutée" + (nT > 1 ? "s" : "") + " au journal" : "") + "." : "Aucune donnée exploitable.")
      + (notes.length ? '<br><span style="color:#8a6d00">⚠ ' + notes.map(esc).join(" ") + "</span>" : "")
      + (errs.length ? '<br><span style="color:#c0392b">' + errs.join("<br>") + "</span>" : ""));
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
      log("profil:vol_max", parseFloat(vol), a.vol_max != null ? parseFloat(a.vol_max) : null, () => { S.answers.vol_max = vol; }); changed++;
    }
    const sess = g("pfSess");
    if (sess !== null && sess !== "" && parseInt(sess) > 0 && sess !== String(a.sessions_max || "")) {
      log("profil:sessions_max", parseInt(sess), a.sessions_max != null ? parseInt(a.sessions_max) : null, () => { S.answers.sessions_max = sess; }); changed++;
    }
    planChanged = changed;
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
