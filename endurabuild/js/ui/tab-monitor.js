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

function avatarCardHTML(av) {
  return '<div class="card"><div class="eyebrow">Ton avatar</div>'
    + '<div style="display:flex;align-items:center;gap:16px;margin-top:6px">'
    + '<span style="font-size:52px;line-height:1">' + av.icon + "</span>"
    + '<div style="flex:1"><div style="font-weight:800;font-size:16px">' + av.name + '</div>'
    + '<div style="font-size:11px;color:#777">Niveau ' + av.level + (av.xpToNext ? " · " + av.xpInLevel + "/" + av.xpToNext + " XP" : " · niveau maximum") + "</div>"
    + '<div style="background:var(--bg2,#e8e0cf);border:1.5px solid #16130e;border-radius:6px;height:12px;overflow:hidden;margin-top:6px"><div style="height:100%;width:' + av.progressPct + '%;background:linear-gradient(90deg,#00a376,#00b8d9)"></div></div>'
    + "</div></div>"
    + '<div class="load-sub" style="margin-top:8px">L’avatar grandit avec ta RÉGULARITÉ (semaines tenues, charge accomplie, badges) — jamais avec un chrono. Il ne redescend jamais : une semaine ratée n’efface rien.</div>'
    + "</div>";
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

  let html = '<div class="card"><div class="eyebrow">Suivi</div><h2>Ta progression, en jeu</h2></div>';
  if (av) html += avatarCardHTML(av);
  html += todayChecklistHTML(resSessions, todayISO);
  html += badgesGalleryHTML(badges);
  $("screen").innerHTML = html;

  document.querySelectorAll("#screen [data-ck]").forEach((cb) => {
    cb.onchange = () => {
      const state = checklistStore(todayISO);
      state[cb.dataset.ck] = cb.checked;
      syncDoneFromChecklist(resSessions, plan, todayISO);
      ebSave();
    };
  });
}
