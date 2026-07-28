// Onglet 🎮 Suivi — monitoring du jour ET de la séance, gamification (avatar évolutif).
// Toute la donnée vient du moteur (EBV2.avatar/badges, mêmes métriques que l'onglet
// Avancement) : aucune nouvelle collecte, aucun jugement de performance brute (l'XP ne
// dépend que de la régularité, jamais d'un chrono/FTP — priorité n°3 du manifeste).
// La case à cocher « fait » existante (onglet Semaine) reste la SEULE source qui nourrit
// la fatigue de l'ajusteur ; le détail échauffement/corps/retour-au-calme ci-dessous est
// un suivi LOCAL, en temps réel, de la séance en cours — quand tout est coché, la case
// « fait » se coche automatiquement pour TOUTES les séances planifiées du jour (on ne
// tente pas de faire correspondre précisément séance adaptée ↔ séance d'origine : quand
// l'ajusteur remplace/réduit, une seule séance adaptée peut représenter plusieurs séances
// prévues — les deux mécanismes restent cohérents sans jamais mal cocher une séance).
import { $, S, ebSave } from "../state.js";
import { AVATAR_THEMES, avatarDataFor, avatarSVG } from "./avatar.js";
import { SPORTS } from "../config.js";
import { shareStory } from "../export.js";

const ROLE_LABEL = { warmup: "Échauffement", body: "Corps de séance", cooldown: "Retour au calme" };

function stepGroupsFor(session) {
  const steps = session.steps || [];
  const present = ["warmup", "body", "cooldown"].filter((r) => steps.some((s) => s.role === r));
  return present.length ? present : null;
}

function checklistStore(dateISO) {
  if (!S.answers.sessionChecklist || S.answers.sessionChecklist.date !== dateISO) {
    S.answers.sessionChecklist = { date: dateISO, items: {} };
  }
  return S.answers.sessionChecklist.items;
}

// R4-2 — avatar SVG personnalisable : silhouette dont chaque variable visuelle est
// traçable à une donnée réelle (posture = séances des 7 derniers jours, aura = streak,
// accessoires = badges gagnés, couleur = thème choisi parmi les accents sport).
// R4.2 — la série se raconte SANS culpabilisation : gelée = « rien n'est perdu »,
// cassée = message neutre tourné vers la reprise (jamais de rouge ni de compteur barré).
function avatarStreakLine(adh) {
  if (!adh) return "";
  if (adh.frozenToday) return '<div class="load-sub" style="margin-top:8px">❄️ Série <b>gelée</b> (douleur ou maladie) : ' + adh.days + " jour" + (adh.days > 1 ? "s" : "") + " au compteur, rien n’est perdu. La reprise attendra que tu sois prêt·e.</div>";
  if (adh.days > 1) return '<div style="margin-top:8px;font-size:13px">🔥 <b>Série : ' + adh.days + " jours</b> — chaque jour du plan validé compte, repos compris.</div>";
  return '<div class="load-sub" style="margin-top:8px">Nouvelle série — la régularité sur toute la préparation compte plus qu’une série parfaite.</div>';
}
function avatarCardHTML(av, visual, adh) {
  const themes = AVATAR_THEMES.map(([k, c]) =>
    '<button class="doneBtn" data-av-theme="' + k + '" type="button" title="' + (SPORTS[k] ? SPORTS[k].nom : k) + '" style="background:' + c + ";border-color:#16130e" + (S.answers.avatarTheme === k ? ";outline:3px solid #16130e;outline-offset:2px" : "") + '"> </button>').join(" ");
  return '<div class="card"><div class="eyebrow">Ton avatar</div>'
    + '<div style="display:flex;align-items:center;gap:16px;margin-top:6px">'
    + '<div id="avSvg">' + avatarSVG(visual, 96) + "</div>"
    + '<div style="flex:1"><div style="font-weight:800;font-size:16px">' + av.icon + " " + av.name + '</div>'
    + '<div style="font-size:11px;color:#777">Niveau ' + av.level + (av.xpToNext ? " · " + av.xpInLevel + "/" + av.xpToNext + " XP" : " · niveau maximum") + "</div>"
    + '<div style="background:var(--bg2,#e8e0cf);border:1.5px solid #16130e;border-radius:6px;height:12px;overflow:hidden;margin-top:6px"><div style="height:100%;width:' + av.progressPct + '%;background:linear-gradient(90deg,#00a376,#00b8d9)"></div></div>'
    + "</div></div>"
    + avatarStreakLine(adh)
    + '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap"><span style="font-size:12px;font-weight:700">Couleur du maillot :</span>' + themes
    + '<button class="btn" id="avShare" type="button" style="margin-left:auto">📸 Partager</button></div>'
    + '<div class="load-sub" style="margin-top:8px">Tout est traçable : posture = tes séances des 7 derniers jours · aura = ton streak · accessoires = tes badges. Jamais un chrono, jamais décroissant.</div>'
    + "</div>";
}

// R4.8 — récompenses d'EFFICIENCE : uniquement les progrès à charge égale ou inférieure
// (meilleure vitesse à FC égale, FC plus basse à vitesse égale, dérive réduite). JAMAIS
// pour du volume, des séances en plus ou des records hors plan. Sans données métriques
// (import FIT), dégradation propre : rien — plutôt rien qu'une récompense fausse.
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
      const durOK = Math.abs(nu.minutes - old.minutes) <= old.minutes * 0.15; // charge comparable
      if (!durOK) continue;
      const spdComparable = nu.avgSpeedMs != null && old.avgSpeedMs != null;
      // FC plus basse (≥3 bpm) à vitesse égale (±2%) — le cœur travaille moins pour pareil
      if (spdComparable && Math.abs(nu.avgSpeedMs - old.avgSpeedMs) <= old.avgSpeedMs * 0.02 && nu.avgHr <= old.avgHr - 3) {
        found.push("Sortie comparable (" + Math.round(nu.minutes) + "min, même allure) : <b>−" + Math.round(old.avgHr - nu.avgHr) + " bpm</b> entre le " + old.date + " et le " + nu.date + ". Ton moteur devient plus économe.");
        break;
      }
      // Plus vite (≥2%) à FC égale (±3 bpm)
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

function badgesGalleryHTML(badges) {
  if (!badges.length) return '<div class="load-card"><div class="load-title">\u{1F3C5} Badges</div><div class="load-sub" style="margin-top:6px">Coche tes séances (onglet 📅 Semaine) : ton premier badge n’est jamais loin.</div></div>';
  const chips = badges.map((b) => '<div style="border:2px solid var(--ink,#16130e);border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:8px;background:#fff"><span style="font-size:20px">' + b.icon + '</span><div><div style="font-weight:700;font-size:12px">' + b.label + '</div><div style="font-size:10px;color:#777">' + b.why + "</div></div></div>").join("");
  return '<div class="load-card"><div class="load-title">\u{1F3C5} Badges gagnés (' + badges.length + ")</div>"
    + '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">' + chips + "</div></div>";
}

function todayChecklistHTML(resSessions, todayISO) {
  if (!resSessions.length) return '<div class="card"><div class="eyebrow">Séance du jour</div><div class="why" style="margin-top:6px">\u{1F60C} Repos aujourd’hui — rien à cocher, profite.</div></div>';
  const state = checklistStore(todayISO);
  let h = '<div class="card"><div class="eyebrow">Séance du jour — en direct</div><div class="why" style="margin-top:6px">Coche au fil de la séance : une fois tout fait, elle passe automatiquement en « ✓ » dans ta semaine.</div>';
  resSessions.forEach((s, si) => {
    const groups = stepGroupsFor(s);
    h += '<div class="load-card" style="margin-top:10px"><div class="load-title">' + s.name + "</div>";
    if (!groups) {
      const k = si + "|all";
      h += '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px"><input type="checkbox" data-ck="' + k + '"' + (state[k] ? " checked" : "") + ' style="width:20px;height:20px"><span>Fait</span></label>';
    } else {
      groups.forEach((r) => {
        const k = si + "|" + r;
        h += '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px"><input type="checkbox" data-ck="' + k + '"' + (state[k] ? " checked" : "") + ' style="width:20px;height:20px"><span>' + ROLE_LABEL[r] + "</span></label>";
      });
    }
    h += "</div>";
  });
  h += "</div>";
  return h;
}

// Une fois TOUTES les cases de la séance (adaptée) du jour cochées, on répercute sur le
// mécanisme « fait » existant (S.answers.done) pour TOUTES les séances planifiées du jour
// — pas de correspondance index-à-index fragile entre séance adaptée et séances d'origine
// (un remplacement readiness peut fusionner plusieurs séances prévues en une seule).
function syncDoneFromChecklist(resSessions, plan, todayISO) {
  if (!resSessions.length) return;
  let w = null, d = null;
  plan.weeks.forEach((wk) => wk.days.forEach((dd) => { if (dd.date === todayISO) { w = wk; d = dd; } }));
  if (!w || !d) return;
  const state = checklistStore(todayISO);
  const allDone = resSessions.every((s, si) => {
    const groups = stepGroupsFor(s);
    const keys = groups ? groups.map((r) => si + "|" + r) : [si + "|all"];
    return keys.every((k) => state[k]);
  });
  if (!allDone) return;
  if (!S.answers.done) S.answers.done = {};
  d.sessions.forEach((s, si) => { if (s.d !== "rs") S.answers.done[w.num + "|" + d.jour + "|" + si] = true; });
}

export function renderTabMonitor(plan) {
  const todayISO = new Date().toISOString().slice(0, 10);
  let av = null, badges = [], resSessions = [];
  if (globalThis.EBV2 && globalThis.EBV2.avatar) av = globalThis.EBV2.avatar(plan, S.answers, todayISO);
  if (globalThis.EBV2 && globalThis.EBV2.badges) badges = globalThis.EBV2.badges(plan, S.answers, todayISO);
  if (globalThis.EBV2 && globalThis.EBV2.adjustToday) {
    try {
      const res = globalThis.EBV2.adjustToday(S.sport, S.answers, Object.assign({ date: todayISO }, S.answers.readiness || {}));
      resSessions = res.sessions || [];
    } catch (e) { console.warn(e); }
  }
  const visual = avatarDataFor(plan, todayISO);
  let adh = null;
  if (globalThis.EBV2 && globalThis.EBV2.adherence) { try { adh = globalThis.EBV2.adherence(plan, S.answers, todayISO); } catch (e) {} }

  let html = '<div class="card"><div class="eyebrow">Suivi</div><h2>Ta progression, en jeu</h2></div>';
  if (av) html += avatarCardHTML(av, visual, adh);
  html += todayChecklistHTML(resSessions, todayISO);
  html += efficiencyHTML(); // R4.8 — progrès à charge égale (rien sans données : jamais de récompense fausse)
  html += badgesGalleryHTML(badges);
  $("screen").innerHTML = html;

  // Thème de l'avatar (accents sport de config.js — pas un nouveau système de couleurs)
  document.querySelectorAll("#screen [data-av-theme]").forEach((b) => {
    b.onclick = () => { S.answers.avatarTheme = b.dataset.avTheme; ebSave(); renderTabMonitor(plan); };
  });
  const shareBtn = $("avShare");
  if (shareBtn) shareBtn.onclick = async () => {
    shareBtn.disabled = true; shareBtn.textContent = "Génération…";
    let streak = 0;
    try { streak = globalThis.EBV2.progress(plan, S.answers, todayISO).streakWeeks || 0; } catch (e) {}
    try {
      await shareStory({ sessionName: av ? av.icon + " " + av.name + " · niveau " + av.level : "Mon avatar", detail: "", sport: S.sport, streak, badge: null, avatarSVG: avatarSVG(visual, 520), accent: visual.accent });
    } catch (e) { console.warn(e); }
    shareBtn.disabled = false; shareBtn.textContent = "📸 Partager";
  };

  document.querySelectorAll("#screen [data-ck]").forEach((cb) => {
    cb.onchange = () => {
      const state = checklistStore(todayISO);
      state[cb.dataset.ck] = cb.checked;
      syncDoneFromChecklist(resSessions, plan, todayISO);
      ebSave();
    };
  });
}
