// Onglet 📋 Profil — résumé éditable des réglages + journal d'évolution horodaté.
// Le journal ÉTEND le mécanisme existant S.answers.tests (déjà daté, déjà nourri par
// import FIT/Strava) : toute modification manuelle y est consignée {type, value,
// date, prev, source} — pas de nouvelle structure de données (brief onglets).
// Toute donnée utilisateur réaffichée passe par esc() avant innerHTML (anti-XSS).
import { SPORTS, VLAB } from "../config.js";
import { $, S, ebActivate, ebNewPlanEntry, ebSave, esc, todayISO } from "../state.js";
import { curSteps, renderStep, reset, ebParseT, stravaImport } from "./steps.js";
import { renderPlan } from "./plan-view.js";
import { retestPlannerHTML, bindRetestPlanner } from "./retest.js";
import { stravaConnect, stravaAccessToken, stravaDisconnect, stravaRelayUrl } from "../strava.js";
import { AVATAR_THEMES, avatarDataFor, avatarSVG } from "./avatar.js";
import { shareStory } from "../export.js";
import { evalRules, rulesGrouped } from "./steps.js";
import { ensurePlan, invalidatePlan } from "./tabs.js";

const _fmtSec = (s) => Math.floor(s / 60) + "'" + String(Math.round(s % 60)).padStart(2, "0");
const _fmtColon = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

// Le moteur V2 ne lit QUE les valeurs courantes (a.ftp/a.pace/a.css + *_known) — jamais
// le journal daté S.answers.tests. Sans ce pont, un import (FIT/Strava) écrirait le
// journal mais le plan généré ne changerait JAMAIS (bug corrigé : « chaque paramètre
// doit influencer le plan »). Applique le test le PLUS RÉCENT de chaque type ; renvoie
// le nombre de références effectivement mises à jour.
export function syncRefsFromTests() {
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

// ===== R5 — la gamification vit au Profil : avatar, niveau, XP, teaser du niveau
// suivant (et niveaux intermédiaires par discipline en triathlon), badges, efficience.
// L'XP reste 100% régularité (jamais un chrono, jamais décroissant) — inchangé.
function avatarSectionHTML(plan, todayISO) {
  if (!globalThis.EBV2 || !globalThis.EBV2.avatar) return "";
  let av, adh = null;
  try { av = globalThis.EBV2.avatar(plan, S.answers, todayISO); } catch (e) { return ""; }
  try { adh = globalThis.EBV2.adherence(plan, S.answers, todayISO); } catch (e) {}
  const visual = avatarDataFor(plan, todayISO);
  const themes = AVATAR_THEMES.map(([k, c]) =>
    '<button class="doneBtn" data-av-theme="' + k + '" type="button" title="' + (SPORTS[k] ? SPORTS[k].nom : k) + '" style="background:' + c + ";border-color:#16130e" + (S.answers.avatarTheme === k ? ";outline:3px solid #16130e;outline-offset:2px" : "") + '"> </button>').join(" ");
  let h = '<div class="load-card"><div style="display:flex;align-items:center;gap:16px">'
    + '<div id="avSvg">' + avatarSVG(visual, 96) + "</div>"
    + '<div style="flex:1"><div style="font-weight:800;font-size:16px">' + av.icon + " " + av.name + '</div>'
    + '<div style="font-size:11px;color:#777">Niveau ' + av.level + "/" + (av.levels ? av.levels.length : 16) + " · " + av.xp + " XP" + (av.xpToNext ? " (" + av.xpInLevel + "/" + av.xpToNext + " dans ce niveau)" : " · niveau maximum") + "</div>"
    + '<div style="background:var(--bg2,#e8e0cf);border:1.5px solid #16130e;border-radius:6px;height:12px;overflow:hidden;margin-top:6px"><div style="height:100%;width:' + av.progressPct + '%;background:linear-gradient(90deg,#00a376,#00b8d9)"></div></div>'
    + (av.nextName ? '<div style="font-size:11px;margin-top:4px">Prochain : <b>' + av.nextIcon + " " + av.nextName + "</b>" + (av.nextUnlock ? " — débloque <b>" + av.nextUnlock + "</b>" : "") + " (encore " + (av.xpToNext - av.xpInLevel) + " XP).</div>" : "")
    + "</div></div>";
  if (adh) {
    if (adh.frozenToday) h += '<div class="load-sub" style="margin-top:8px">❄️ Série <b>gelée</b> (douleur ou maladie) : ' + adh.days + " jour" + (adh.days > 1 ? "s" : "") + " au compteur, rien n’est perdu.</div>";
    else if (adh.days > 1) h += '<div style="margin-top:8px;font-size:13px">🔥 <b>Série : ' + adh.days + " jours</b> — repos validé compris.</div>";
    else h += '<div class="load-sub" style="margin-top:8px">Nouvelle série — la régularité sur toute la préparation compte plus qu’une série parfaite.</div>';
  }
  h += disciplineLevelsHTML(plan);
  if (av.levels) {
    h += '<details style="margin-top:8px"><summary class="load-sub" style="cursor:pointer">Les ' + av.levels.length + " niveaux et ce qu'ils débloquent</summary><div style=\"margin-top:6px\">";
    av.levels.forEach((l) => {
      const got = av.level >= l.level;
      h += '<div style="font-size:11px;margin:3px 0;' + (got ? "" : "opacity:0.55") + '">' + (got ? "✓" : "○") + " <b>" + l.icon + " " + l.name + "</b> (" + l.xp + " XP) — " + l.unlock + "</div>";
    });
    h += "</div></details>";
  }
  h += '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap"><span style="font-size:12px;font-weight:700">Couleur du maillot :</span>' + themes
    + '<button class="btn" id="avShare" type="button" style="margin-left:auto">📸 Partager</button></div>'
    + '<div class="load-sub" style="margin-top:8px">Tout est traçable : équipement et décor = ton niveau (régularité pure) · posture = tes 7 derniers jours · couleur de l’aura = ta série. Jamais un chrono, jamais décroissant.</div></div>';
  return h;
}
// Niveaux intermédiaires PAR DISCIPLINE (triathlon) : progression par nombre de séances
// validées dans chaque sport — pur affichage, entièrement traçable aux ✓.
const DISC_LEVELS = [[0, "Découverte"], [4, "Régulier"], [10, "Solide"], [20, "Affûté"], [35, "Machine"]];
function disciplineLevelsHTML(plan) {
  if (S.sport !== "tri") return "";
  const done = S.answers.done || {};
  const count = { sw: 0, bk: 0, rn: 0 };
  plan.weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s, si) => {
    const k = w.num + "|" + d.jour + "|" + si;
    if (done[k] && count[s.d] !== undefined) count[s.d]++;
    if (done[k] && s.d === "br") { count.bk++; count.rn++; } // le brick compte pour les deux
  })));
  const row = (ico, nom, n) => {
    let idx = 0;
    for (let i = 0; i < DISC_LEVELS.length; i++) if (n >= DISC_LEVELS[i][0]) idx = i;
    const next = DISC_LEVELS[idx + 1];
    const pct = next ? Math.min(100, Math.round(((n - DISC_LEVELS[idx][0]) / (next[0] - DISC_LEVELS[idx][0])) * 100)) : 100;
    return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px"><span style="width:20px">' + ico + '</span><span style="width:86px">' + nom + '</span><b style="width:76px">' + DISC_LEVELS[idx][1] + '</b>'
      + '<div style="flex:1;background:var(--bg2,#e8e0cf);border:1px solid #16130e;border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:#00a376"></div></div>'
      + '<span style="width:82px;text-align:right;color:#777">' + (next ? n + "/" + next[0] + " → " + next[1] : n + " séances") + "</span></div>";
  };
  return '<div style="margin-top:10px"><div style="font-size:12px;font-weight:700">Par discipline (séances validées)</div>'
    + row("🏊", "Natation", count.sw) + row("🚴", "Vélo", count.bk) + row("🏃", "Course", count.rn) + "</div>";
}
function badgesGalleryHTML(badges) {
  if (!badges.length) return "";
  const chips = badges.map((b) => '<span title="' + b.why.replace(/"/g, "&quot;") + '" style="border:1.5px solid #16130e;border-radius:14px;padding:3px 10px;font-size:11px;background:#fff">' + b.icon + " " + b.label + "</span>").join(" ");
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
    + '<div class="load-sub" style="margin-top:6px;color:#999">Comparé à charge égale uniquement (imports FIT) — jamais de récompense au volume.</div></div>';
}
// Échéance du plan : date de fin (course ou dernière semaine) + compte à rebours.
function planDeadlineHTML(plan) {
  const a = S.answers;
  let end = a.race_date || "";
  if (!end) {
    const lastW = plan.weeks[plan.weeks.length - 1];
    const lastD = lastW && lastW.days[lastW.days.length - 1];
    end = (lastD && lastD.date) || "";
  }
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
  const row = (id, lab, val, ph) => '<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:6px"><span style="width:150px">' + lab + '</span><input type="text" id="' + id + '" value="' + esc(val || "") + '" placeholder="' + ph + '" style="flex:1;min-width:0"></label>';
  const sel = (id, cur, opts) => '<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:6px"><span style="width:150px">' + opts.lab + '</span><select id="' + id + '" style="flex:1;min-width:0">'
    + opts.list.map((o) => '<option value="' + o[0] + '"' + ((cur || "") === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></label>";
  let h = '<div class="load-card"><div class="load-title">⛰ Ta course et ton terrain</div>';
  if (a.trailMigrated) h += '<div class="load-sub" style="margin-top:6px;color:#a33"><b>À vérifier :</b> ton plan trail a été repris depuis l’ancienne version, où le dénivelé n’était pas demandé. Renseigne la vraie distance et le vrai D+ de ta course : ce sont eux qui décident de la durée de préparation, du volume et du contenu des séances.</div>';
  else h += '<div class="load-sub" style="margin-top:4px">Le D+ compte autant que la distance : il décide de la catégorie d’effort, donc de tout le reste.</div>';
  h += row("pfTrailKm", "Distance (km)", a.race_distance_km, "62");
  h += row("pfTrailDplus", "D+ total (m)", a.race_dplus_m, "3200");
  h += row("pfTrailVam", "VAM (m D+/h)", a.vam_known === "oui" ? a.vam : "", "850 — test : 20-30min de montée à fond");
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
    const before = JSON.stringify([a.race_distance_km, a.race_dplus_m, a.vam, a.race_technicity, a.race_night, a.train_dplus_access, a.poles, a.race_cutoff_h]);
    const km = parseFloat(g("pfTrailKm") || ""), dp = parseFloat(g("pfTrailDplus") || ""), vam = parseFloat(g("pfTrailVam") || "");
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
    if (JSON.stringify([a.race_distance_km, a.race_dplus_m, a.vam, a.race_technicity, a.race_night, a.train_dplus_access, a.poles, a.race_cutoff_h]) === before) {
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

// R10 — courses intermédiaires RÉELLES (dates + priorité), pour TOUS les profils :
// branchées sur la mécanique moteur existante — la semaine de la course est allégée
// (mini-affûtage si B), la suivante est en récup, et le JOUR J porte une séance 🏁
// avec sa consigne de pacing. Avant, seul le questionnaire premium posait la question.
function raceInterHTML(a) {
  const prioSel = (id, cur) => '<select id="' + id + '" style="flex:1;min-width:0">'
    + '<option value="C"' + (cur !== "B" ? " selected" : "") + '>C — laboratoire (on s’entraîne à travers)</option>'
    + '<option value="B"' + (cur === "B" ? " selected" : "") + '>B — préparation (mini-affûtage)</option></select>';
  const rowR = (n, d, p) => '<div style="display:flex;gap:8px;align-items:center;font-size:13px;flex-wrap:wrap"><span style="width:70px">Course ' + n + '</span>'
    + '<input type="date" id="pfRace' + n + 'd" value="' + esc(d || "") + '" style="flex:1;min-width:130px">' + prioSel("pfRace" + n + "p", p) + "</div>";
  return '<div class="load-card"><div class="load-title">🏁 Courses intermédiaires</div>'
    + '<div class="load-sub" style="margin-top:4px">Une course AVANT ton objectif ? Le moteur allège la semaine, place la course à sa vraie date avec sa consigne de pacing, et met la semaine suivante en récupération.</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">' + rowR(1, a.race1_date, a.race1_prio) + rowR(2, a.race2_date, a.race2_prio) + "</div>"
    + '<div class="nav" style="margin-top:8px"><button class="btn" id="pfRaceSave" type="button">Enregistrer mes courses</button></div>'
    + '<div id="pfRaceMsg" class="load-sub" style="margin-top:6px"></div></div>';
}
function bindRaceInter() {
  const btn = $("pfRaceSave");
  if (!btn) return;
  btn.onclick = () => {
    const a = S.answers;
    const d1 = ($("pfRace1d") || {}).value || "", p1 = ($("pfRace1p") || {}).value || "C";
    const d2 = ($("pfRace2d") || {}).value || "", p2 = ($("pfRace2p") || {}).value || "C";
    const before = [a.race1_date || "", a.race1_prio || "", a.race2_date || "", a.race2_prio || "", a.races || ""].join("|");
    a.race1_date = d1; a.race1_prio = d1 ? p1 : "";
    a.race2_date = d2; a.race2_prio = d2 ? p2 : "";
    a.races = d1 || d2 ? "oui" : "non";
    const after = [a.race1_date, a.race1_prio, a.race2_date, a.race2_prio, a.races].join("|");
    const m = $("pfRaceMsg");
    if (after === before) { if (m) m.textContent = "Aucun changement détecté."; return; }
    let warn = "";
    for (const d of [d1, d2]) {
      if (d && a.race_date && d >= a.race_date) warn = " ⚠️ Une date est le jour de (ou après) ton objectif A — elle sera ignorée par le plan.";
      else if (d && a.plan_start && d < a.plan_start) warn = " ⚠️ Une date est avant le début du plan — elle sera ignorée.";
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

export function renderTabProfile(plan) {
  const a = S.answers, sp = S.sport;
  const tIso = todayISO();
  let html = '<div class="card"><div class="eyebrow">Profil — ' + SPORTS[sp].nom + "</div><h2>Toi, ton niveau, tes réglages</h2>";
  // R5 — l'identité d'abord : avatar, niveau, XP, teaser du niveau suivant
  html += avatarSectionHTML(plan, tIso);
  html += '<div class="why">Modifie une valeur : le plan est régénéré et le changement est consigné dans ton journal d’évolution.</div>';
  html += plansSelectorHTML();
  html += planDeadlineHTML(plan);
  if (sp === "trail") html += trailProfileHTML(a);
  html += raceInterHTML(a);
  html += '<div class="bp-cat">' + summaryRows(a) + "</div>";

  // — Références physiologiques éditables (celles que le moteur lit : a.ftp / a.pace / a.css)
  html += '<div class="load-card"><div class="load-title">⚙ Références d’entraînement</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">';
  const row = (id, lab, val, ph) => '<label style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:150px">' + lab + '</span><input type="text" id="' + id + '" value="' + esc(val || "") + '" placeholder="' + ph + '" style="flex:1;min-width:0"></label>';
  if (sp === "bike" || sp === "tri") html += row("pfFtp", "FTP (watts)", a.ftp_known === "oui" ? a.ftp : "", "ex. 220");
  if (sp === "run" || sp === "tri") html += row("pfPace", "Allure seuil (min:s /km)", a.pace_known === "oui" ? a.pace : "", "ex. 4:30");
  if (sp === "swim" || sp === "tri") html += row("pfCss", "CSS (min:s /100m)", a.css_known === "oui" ? a.css : "", "ex. 1:55");
  html += row("pfVol", "Volume max (h/sem)", a.vol_max, "ex. 8");
  // R10 — le POINT DE DÉPART : le plan démarre du volume réellement fait ces derniers mois
  html += row("pfVolRecent", "Volume récent (h/sem, 3-6 mois)", a.vol_recent, "ex. 4 — le plan part de là");
  html += row("pfSess", "Séances max /sem", a.sessions_max, "ex. 5");
  html += row("pfWeight", "Poids (kg, optionnel)", a.weight, "affine ravito + dépense");
  // Taille : réintroduite AVEC un effet réel (métabolisme de base Mifflin-St Jeor, carte
  // « Dépense estimée » de l'onglet Semaine) — règle d'influence des paramètres respectée.
  html += row("pfHeight", "Taille (cm, optionnel)", a.height, "affine la dépense de base");
  // R6 — profil du parcours visé : affine la PRÉDICTION (temps course à pied) sans
  // toucher au plan. Vallonné/montagneux → fourchette décalée et élargie, justifiée.
  const cpSel = (v, lab) => '<option value="' + v + '"' + ((a.course_profile || "") === v ? " selected" : "") + ">" + lab + "</option>";
  html += '<label style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:150px">Profil du parcours visé</span><select id="pfCourseProfile" style="flex:1;min-width:0">'
    + cpSel("", "Je ne sais pas encore") + cpSel("plat", "Plat") + cpSel("vallonne", "Vallonné") + cpSel("montagneux", "Montagneux") + "</select></label>";
  html += '<label style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:150px">Rappel quotidien</span><input type="time" id="pfNotif" value="' + esc(a.notifyTime || "") + '" style="flex:1;min-width:0"></label>';
  html += '</div><div class="nav" style="margin-top:10px"><button class="btn primary" id="pfSave" type="button">Enregistrer → régénérer le plan</button></div>'
    + '<div id="pfMsg" class="load-sub" style="margin-top:6px"></div></div>';

  // — Records personnels (R4-5, lecture seule) + badges + efficience (R5 : ici, pas
  // dans un onglet à part — le Profil raconte qui tu es et ce que tu as construit)
  html += recordsHTML(plan, a);
  let _badges = [];
  if (globalThis.EBV2 && globalThis.EBV2.badges) { try { _badges = globalThis.EBV2.badges(plan, a, tIso); } catch (e) {} }
  html += badgesGalleryHTML(_badges);
  html += efficiencyHTML();

  // — Retest « boss fight » (R4.4) : suggestion de date + planification
  html += retestSuggestionHTML();
  html += retestPlannerHTML();

  // — Sauvegarde : tout vit dans localStorage — un navigateur nettoyé = tout perdu.
  // Export/import JSON de l'état COMPLET (tous les plans + état partagé).
  html += '<div class="load-card"><div class="load-title">💾 Sauvegarde</div>'
    + '<div class="load-sub" style="margin-top:6px">Tes plans vivent dans ce navigateur uniquement. Exporte une sauvegarde de temps en temps — et importe-la sur un nouvel appareil ou après un nettoyage.</div>'
    + '<div class="nav" style="margin-top:8px;flex-wrap:wrap;gap:8px"><button class="btn" id="pfBackup" type="button">Exporter ma sauvegarde</button>'
    + '<label class="btn" style="cursor:pointer;margin:0">Importer une sauvegarde<input type="file" id="pfRestore" accept=".json,application/json" style="display:none"></label></div>'
    + '<div id="pfBackupMsg" class="load-sub" style="margin-top:6px"></div></div>';

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
  // Import Strava (lecture seule) — connexion OAuth via le relais serveur (server/README.md)
  // en chemin principal, jeton manuel conservé en repli. Même journal, même pont vers le plan.
  const sAuth = a.stravaAuth;
  html += '<div style="margin-top:10px"><div style="font-weight:700;font-size:12px">🔗 Strava</div>';
  if (sAuth && sAuth.access_token) {
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">'
      + '<span style="font-size:12px">✓ Connecté' + (sAuth.athlete && sAuth.athlete.firstname ? " (" + esc(sAuth.athlete.firstname) + ")" : "") + "</span>"
      + '<button class="btn" id="pfStravaBtn" type="button">Importer mes activités</button>'
      + '<button class="btn" id="pfStravaOut" type="button">Se déconnecter</button></div>';
  } else {
    // R6 — UX guidée : UN bouton. L'URL du relais vit en config (déployée pour tous)
    // ou dans les réglages avancés — l'utilisateur normal n'a rien à coller.
    html += '<div style="margin-top:4px"><button class="btn primary" id="pfStravaConnect" type="button" style="width:100%;font-size:15px;padding:12px 16px">🔗 Se connecter avec Strava</button></div>'
      + '<div class="load-sub" style="margin-top:4px">Un clic → autorisation sur Strava → retour ici. Lecture seule (jamais d’écriture), tes activités alimentent tes références (FTP/allure/CSS).</div>'
      + '<details style="margin-top:6px"><summary class="load-sub" style="cursor:pointer">Réglages avancés (relais)</summary>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">'
      + '<input type="text" id="pfStravaRelay" placeholder="URL du relais (voir server/README.md)" value="' + esc(a.stravaRelay || "") + '" style="flex:1;min-width:180px"></div>'
      + '<div class="load-sub" style="margin-top:4px">Le relais garde le secret Strava hors de l’app — déploiement pas-à-pas dans server/README.md.</div></details>';
  }
  html += (S._stravaError ? '<div class="load-sub" style="margin-top:4px;color:#b3261e">Connexion Strava refusée (' + esc(S._stravaError) + ") — réessaie ou utilise le jeton manuel.</div>" : "")
    + '<details style="margin-top:6px"><summary class="load-sub" style="cursor:pointer">Repli : jeton manuel (sans serveur)</summary>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">'
    + '<input type="text" id="pfStravaTok" placeholder="token d’accès Strava" style="flex:1;min-width:180px">'
    + (sAuth && sAuth.access_token ? "" : '<button class="btn" id="pfStravaBtnTok" type="button">Importer depuis Strava</button>')
    + '</div><div class="load-sub" style="margin-top:4px">Réglages Strava → « Mon API », scope <b>activity:read</b> — rien n’est écrit sur Strava.</div></details>'
    + '<div id="pfStravaMsg" class="load-sub" style="margin-top:4px"></div></div>';
  html += "</div>";

  // — Conseils personnalisés (evalRules) : chaque réponse du questionnaire sans effet
  // direct sur le plan reste VISIBLE ici (ferritine, cycle, garde-fous santé…).
  const _rules = evalRules(a, S.tier);
  if (_rules.length) {
    html += '<details class="load-card"><summary class="load-title">🧭 Conseils personnalisés (' + _rules.length + ")</summary>"
      + '<div style="margin-top:8px">' + rulesGrouped(_rules) + "</div></details>";
  }
  html += '<div class="nav" style="flex-wrap:wrap;gap:10px"><button class="btn" id="pfEdit" type="button">← Modifier mes réponses</button><button class="btn" id="pfReset" type="button">Changer de sport</button></div></div>';
  $("screen").innerHTML = html;

  // Avatar : thème (accents sport) + partage — mêmes mécanismes que l'ancien onglet Suivi.
  document.querySelectorAll("#screen [data-av-theme]").forEach((b) => {
    b.onclick = () => { S.answers.avatarTheme = b.dataset.avTheme; ebSave(); renderTabProfile(plan); };
  });
  const _avShare = $("avShare");
  if (_avShare) _avShare.onclick = async () => {
    _avShare.disabled = true; _avShare.textContent = "Génération…";
    let av2 = null, streak = 0;
    try { av2 = globalThis.EBV2.avatar(plan, S.answers, tIso); } catch (e) {}
    try { streak = globalThis.EBV2.adherence(plan, S.answers, tIso).days || 0; } catch (e) {}
    const visual = avatarDataFor(plan, tIso);
    try {
      await shareStory({ sessionName: av2 ? av2.icon + " " + av2.name + " · niveau " + av2.level : "Mon avatar", detail: "", sport: S.sport, streak, badge: null, avatarSVG: avatarSVG(visual, 520), accent: visual.accent });
    } catch (e) { console.warn(e); }
    _avShare.disabled = false; _avShare.textContent = "📸 Partager";
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
  $("pfEdit").onclick = () => { S.step = curSteps().length - 1; renderStep(); };
  $("pfReset").onclick = () => reset();
  bindRaceInter();
  bindTrailProfile();
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
      + (notes.length ? '<br><span style="color:#8a6d00">⚠ ' + notes.map(esc).join(" ") + "</span>" : "")
      + (errs.length ? '<br><span style="color:#c0392b">' + errs.join("<br>") + "</span>" : ""));
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
    if (m) m.innerHTML = statusHTML + (nRef ? '<br><span style="color:#00734f">✓ plan régénéré avec la référence la plus récente.</span>' : "");
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
  $("pfSave").onclick = () => {
    const today = todayISO();
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
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
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
    if (!changed) { const m = $("pfMsg"); if (m) m.textContent = "Aucun changement détecté."; return; }
    if (planChanged) invalidatePlan(); // le plan sera régénéré UNE fois, ici — pas au changement d'onglet
    ebSave();
    renderTabProfile(ensurePlan());
    const m = $("pfMsg");
    if (m) m.textContent = "✓ " + changed + " changement" + (changed > 1 ? "s" : "") + " enregistré" + (changed > 1 ? "s" : "") + (planChanged ? " — plan régénéré, journal mis à jour." : " — journal mis à jour (poids/taille n’affectent que ravitaillement et dépense estimée, pas le plan).");
  };
}
