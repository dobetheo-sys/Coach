// Onglet 📅 Plan de la semaine — l'écran du quotidien. Ordre imposé (demande produit) :
// 1) Forme du jour d'abord (sommeil/VFC/énergie/ressenti) — jamais de séance affichée
//    avant d'avoir répondu, une fois par jour (S.answers.readiness.date). 2) la séance
//    du jour (ou la prochaine si repos), déjà adaptée au verdict. 3) toute la semaine.
import { S, $, ebSave, esc } from "../state.js";
import { readinessCardHTML } from "./plan-view.js";
import { applyReadiness, fetchWeather, readinessDoneToday } from "./readiness.js";
import { nutritionJournalHTML, bindNutritionJournal } from "./nutrition-journal.js";
import { avatarDataFor, avatarSVG } from "./avatar.js";
import { celebrationMessage } from "./celebrations.js";
import { missedSessionsCheck, notifySetupHTML, bindNotifySetup, scheduleDailyNotification, weeklyReviewHTML } from "../notifications.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan } from "./tabs.js";
import { dailyContentHTML } from "./daily-content.js";
import { shareStory } from "../export.js";

// R4.0 — boucle de base : validation → FEEDBACK ≤10s (RPE 1-10, ressenti, douleur) →
// célébration → teaser de la prochaine séance (la boucle se ferme sur le teaser, jamais
// sur la récompense). Le feedback nourrit RÉELLEMENT l'ajusteur : RPE ≥8 hier = signal
// annoncé demain ; douleur = intensité verrouillée (rouge forcé) tant que non levée.
function feedbackModal(plan, session, k, onDone) {
  document.querySelectorAll(".eb-overlay").forEach((e) => e.remove());
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  const rpeBtns = Array.from({ length: 10 }, (_, i) => '<button class="btn" data-rpe="' + (i + 1) + '" type="button" style="padding:8px 0;min-width:0;flex:1">' + (i + 1) + "</button>").join("");
  ov.innerHTML = '<div class="eb-modal" role="dialog" aria-label="Ton ressenti">'
    + '<h2 style="margin:0 0 2px">Comment c’était ?</h2>'
    + '<div class="load-sub">10 secondes — ces réponses ajustent la suite du plan.</div>'
    + '<div style="font-weight:700;font-size:12px;margin-top:10px">Effort (RPE 1 = très facile · 10 = maximal)</div>'
    + '<div style="display:flex;gap:4px;margin-top:4px">' + rpeBtns + "</div>"
    + '<div style="font-weight:700;font-size:12px;margin-top:10px">Ressenti</div>'
    + '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">'
    + '<button class="btn" data-feel="great" type="button">😃 Super</button><button class="btn" data-feel="normal" type="button">🙂 Normal</button>'
    + '<button class="btn" data-feel="hard" type="button">😮‍💨 Dur</button><button class="btn" data-feel="bad" type="button">😣 Mauvais</button></div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px"><input type="checkbox" id="fbPain" style="width:20px;height:20px"><span>🩹 Douleur pendant ou après</span></label>'
    + '<input type="text" id="fbPainLoc" placeholder="Où ? (optionnel)" style="display:none;margin-top:6px;width:100%">'
    + '<div class="nav" style="justify-content:center;margin-top:12px"><button class="btn primary" id="fbSave" type="button" disabled>Valider →</button></div></div>';
  document.body.appendChild(ov);
  const state = { rpe: null, feeling: null };
  const refresh = () => { ov.querySelector("#fbSave").disabled = !(state.rpe && state.feeling); };
  ov.querySelectorAll("[data-rpe]").forEach((b) => b.onclick = () => { state.rpe = +b.dataset.rpe; ov.querySelectorAll("[data-rpe]").forEach((x) => x.classList.toggle("primary", x === b)); refresh(); });
  ov.querySelectorAll("[data-feel]").forEach((b) => b.onclick = () => { state.feeling = b.dataset.feel; ov.querySelectorAll("[data-feel]").forEach((x) => x.classList.toggle("primary", x === b)); refresh(); });
  const painCb = ov.querySelector("#fbPain");
  painCb.onchange = () => { ov.querySelector("#fbPainLoc").style.display = painCb.checked ? "" : "none"; };
  ov.querySelector("#fbSave").onclick = () => {
    if (!S.answers.completions) S.answers.completions = {};
    const pain = painCb.checked;
    const loc = (ov.querySelector("#fbPainLoc").value || "").trim();
    S.answers.completions[k] = { date: new Date().toISOString().slice(0, 10), rpe: state.rpe, feeling: state.feeling, pain, painLocation: loc || undefined };
    if (pain) S.answers.painFlag = { active: true, location: loc, since: new Date().toISOString().slice(0, 10) }; // R4.5 — verrouille la qualité via l'ajusteur
    ebSave();
    ov.remove();
    onDone();
  };
}

// Teaser de la prochaine séance — la boucle se ferme ici (projection, pas récompense).
function nextSessionTeaser(plan, todayISO) {
  const upcoming = [];
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayISO && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const nxt = upcoming[0];
  if (!nxt) return "";
  const tomorrow = new Date(new Date(todayISO + "T00:00:00Z").getTime() + 864e5).toISOString().slice(0, 10);
  const when = nxt.date === tomorrow ? "Demain" : nxt.jour;
  const s = nxt.sessions.find((x) => x.d !== "rs");
  const obj = s.det ? String(s.det).split("—")[0].split("·")[0].trim().slice(0, 50) : "";
  return '<div style="margin-top:12px;padding-top:10px;border-top:2px dashed #0003;font-size:13px"><b>' + when + " : " + s.name + "</b>" + (obj ? '<br><span style="color:#635b4a">Objectif : ' + obj + "</span>" : "") + "</div>";
}

// Célébration (modal courte, partage story natif — repli téléchargement PNG).
function showCongrats(plan, session, newBadge, todayISO) {
  document.querySelectorAll(".eb-overlay").forEach((e) => e.remove());
  let streak = 0; // R4.2 — série par JOUR (le repos validé compte autant qu'une séance)
  try { streak = globalThis.EBV2.adherence(plan, S.answers, todayISO).days || 0; } catch (e) {}
  const av = avatarDataFor(plan, todayISO);
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  ov.innerHTML = '<div class="eb-modal" role="dialog" aria-label="Séance validée">'
    + '<div style="display:flex;justify-content:center">' + avatarSVG(av, 110) + "</div>"
    + '<h2 style="text-align:center;margin:8px 0 2px;font-size:17px;line-height:1.35">' + celebrationMessage(session) + "</h2>"
    + '<div style="text-align:center;font-weight:700;margin-top:6px">' + session.name + "</div>"
    + (session.det ? '<div style="text-align:center;font-size:12px;color:#635b4a;margin-top:2px">' + String(session.det).split("—")[0].slice(0, 60) + "</div>" : "")
    + (streak > 1 ? '<div style="text-align:center;margin-top:8px">🔥 <b>' + streak + " jours d’affilée</b> — le repos validé compte aussi</div>" : "")
    + (newBadge ? '<div style="text-align:center;margin-top:6px;color:#8a6d00;font-weight:700">' + newBadge.icon + " Badge débloqué : " + newBadge.label + "</div>" : "")
    + '<div class="nav" style="justify-content:center;margin-top:14px;gap:10px;flex-wrap:wrap">'
    + '<button class="btn gold" id="ebShareStory" type="button">📸 Partager en story</button>'
    + '<button class="btn" id="ebCloseCongrats" type="button">Fermer</button></div>'
    + '<div class="load-sub" style="text-align:center;margin-top:6px">Image 9:16 générée localement — partage via la feuille de partage de ton téléphone.</div>'
    + nextSessionTeaser(plan, todayISO)
    + "</div>";
  document.body.appendChild(ov);
  ov.querySelector("#ebCloseCongrats").onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ov.querySelector("#ebShareStory").onclick = async () => {
    const btn = ov.querySelector("#ebShareStory");
    btn.disabled = true; btn.textContent = "Génération…";
    try {
      await shareStory({ sessionName: session.name, detail: session.det, sport: S.sport, streak, badge: newBadge, avatarSVG: avatarSVG(av, 520), accent: av.accent });
    } catch (e) { console.warn(e); }
    btn.disabled = false; btn.textContent = "📸 Partager en story";
  };
}

const ic = { sw: "\u{1F3CA}", bk: "\u{1F6B4}", rn: "\u{1F3C3}", br: "\u{1F501}", rs: "\u{1F4AA}" };

function currentWeek(plan) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    plan.weeks.find((w) => w.days.some((d) => d.date === today)) ||
    plan.weeks.find((w) => w.days.some((d) => d.date >= today)) ||
    plan.weeks[0]
  );
}

// Célébrations « moment » (RESTE-A-FAIRE #6) : bannières ponctuelles aux instants qui
// comptent — jour de course, veille de course, entrée en affûtage. Purement visuel,
// calculé depuis le plan déjà généré ; dégrade proprement si les jours n'ont pas de date.
export function momentHTML(plan, todayISO) {
  const today = todayISO || new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(new Date(today + "T00:00:00Z").getTime() + 864e5).toISOString().slice(0, 10);
  const raceDates = (plan.races || []).map((r) => r.date);
  if (S.answers && S.answers.race_date) raceDates.push(S.answers.race_date);
  const B = (bg, txt) => '<div class="warn" style="background:' + bg + ';font-weight:600">' + txt + "</div>";
  if (raceDates.includes(today))
    return B("#ffe3e0", "\u{1F3C1} <b>Jour de course.</b> Tout le travail est fait — départ prudent, finis fort. Bonne course !");
  if (raceDates.includes(tomorrow))
    return B("#fff3d6", "\u{1F389} <b>Veille de course.</b> Objectif du jour : des jambes fraîches. Repos, hydratation, matériel préparé — demain tu récoltes.");
  let taperStart = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (!taperStart && (d.phaseId === "taper" || (w.phase && w.phase.id === "taper"))) taperStart = d.date; }));
  if (taperStart && taperStart === today)
    return B("#e9defc", "✂️ <b>L’affûtage commence.</b> Le volume descend, la forme monte — le plus dur est derrière toi. Ne rajoute rien.");
  return "";
}

// Carte « Ravitaillement d'aujourd'hui » (module nutrition, périmètre ravitaillement
// d'effort uniquement — voir src/nutrition/). La température vient de la météo déjà
// intégrée (Open-Meteo) et arrive en différé : la carte se re-rend seule, dégrade
// proprement sans réseau/géoloc. L'avertissement du moteur est TOUJOURS affiché.
function nutritionCardHTML(day, tempC) {
  if (!day || !globalThis.EBV2 || !globalThis.EBV2.sessionNutrition) return "";
  const wkg = parseFloat(S.answers.weight) > 0 ? parseFloat(S.answers.weight) : null;
  const advs = day.sessions
    .map((s) => ({ s, a: globalThis.EBV2.sessionNutrition(s, { tempC: tempC == null ? null : tempC, weightKg: wkg }) }))
    .filter((x) => x.a);
  if (!advs.length) return "";
  let h = '<div class="load-card" id="nutCard"><div class="load-title">\u{1F964} Ravitaillement d’aujourd’hui' + (tempC != null ? ' <span style="font-weight:400">· ' + Math.round(tempC) + "°C prévus</span>" : "") + "</div>";
  advs.forEach(({ s, a }) => {
    // Résumé court : sous 60min, « 0–500 ml/h » se lit mal (plancher à 0, et « /h » trompeur
    // sur une séance plus courte qu'une heure) — on reprend le cadrage « à la soif » du moteur.
    const drinkSummary = a.during.drinkMlPerH[0] === 0
      ? "eau à la soif"
      : a.during.drinkMlPerH[0] + "–" + a.during.drinkMlPerH[1] + " ml/h" + (a.during.sodium ? " + sodium" : "");
    h += '<details style="margin-top:6px;font-size:12px"><summary style="cursor:pointer"><b>' + s.name + "</b> — "
      + (a.during.carbsGPerH ? a.during.carbsGPerH[0] + "–" + a.during.carbsGPerH[1] + " g/h de glucides, " + drinkSummary : drinkSummary) + "</summary>"
      + '<div style="margin:6px 0 0 2px;color:#3f3a30"><b>Avant :</b> ' + a.before
      + "<br><b>Pendant :</b> " + a.during.text
      + (a.after ? "<br><b>Après :</b> " + a.after : "")
      + '<br><span style="color:#777">Dépense estimée ~' + a.kcal[0] + "–" + a.kcal[1] + " kcal" + (wkg ? "" : " (renseigne ton poids dans \u{1F4CB} Profil pour affiner)") + ".</span></div></details>";
  });
  h += '<div class="load-sub" style="margin-top:8px">' + advs[0].a.disclaimer + "</div></div>";
  return h;
}

// R4.5 — bandeau douleur PERMANENT tant que le drapeau n'est pas levé : la qualité est
// verrouillée par l'ajusteur (rouge forcé), la série est gelée, on recommande médecin/kiné.
// Levée = action explicite + question de confirmation.
function painBannerHTML() {
  const pf = S.answers.painFlag;
  if (!pf || !pf.active) return "";
  return '<div class="warn" style="background:#ffe3e0;font-weight:600">🩹 <b>Douleur signalée' + (pf.location ? " (" + esc(pf.location) + ")" : "") + ".</b> "
    + 'Les séances de qualité sont remplacées par de la récupération tant que le drapeau est actif — ta série est gelée, rien n’est perdu. Si la douleur persiste, consulte un médecin ou un kiné.'
    + '<div class="nav" style="margin-top:8px"><button class="btn" id="ebLiftPain" type="button">Je n’ai plus mal → lever le drapeau</button></div></div>';
}
function bindPainBanner(plan) {
  const b = $("ebLiftPain");
  if (b) b.onclick = () => {
    if (!confirm("Plus aucune douleur, ni à froid ni pendant l’effort ?")) return;
    S.answers.painFlag = { active: false, location: S.answers.painFlag.location, since: S.answers.painFlag.since, liftedAt: new Date().toISOString().slice(0, 10) };
    ebSave();
    renderTabWeek(plan);
  };
}
// R4.2 — maladie déclarée : gèle la série (le jour ne compte ni ne casse), jamais de culpabilisation.
function sickToggleHTML(todayISO) {
  const sick = (S.answers.sickDates || []).includes(todayISO);
  return '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px"><input type="checkbox" id="rdSick"' + (sick ? " checked" : "") + ' style="width:20px;height:20px"><span>🤒 Malade aujourd’hui — la série est gelée, la reprise attendra que ça aille mieux</span></label>';
}
function bindSickToggle(plan, todayISO) {
  const cb = $("rdSick");
  if (cb) cb.onchange = () => {
    if (!Array.isArray(S.answers.sickDates)) S.answers.sickDates = [];
    if (cb.checked) { if (!S.answers.sickDates.includes(todayISO)) S.answers.sickDates.push(todayISO); }
    else S.answers.sickDates = S.answers.sickDates.filter((d) => d !== todayISO);
    S.answers.sickDates = S.answers.sickDates.slice(-60);
    ebSave();
  };
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Debout tôt \u{1F319}" : h < 12 ? "Bonjour ☀️" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir \u{1F319}" : "Encore debout \u{1F989}";
}

// Écran de check-in : AUCUNE séance visible tant que la forme du jour n'est pas
// renseignée (demande produit). Une fois par jour — readinessDoneToday() le sait déjà.
function checkinGateHTML(todayISO) {
  return '<div class="card"><div class="eyebrow">Avant de commencer</div><h2>' + greeting() + "</h2>"
    + '<div class="why">Quatre curseurs suffisent : le moteur adapte ta séance du jour à ta forme — jamais l’inverse.</div>'
    + readinessCardHTML({ title: "\u{1F321} Forme du jour", sub: "Sommeil, VFC, énergie, ressenti.", btnLabel: "Voir ma séance du jour →" })
    + sickToggleHTML(todayISO)
    + "</div>";
}

// Séance du jour (déjà adaptée au verdict de forme) — ou, si repos, la prochaine séance
// à venir : « la séance à venir » demandée, jamais un écran vide sans direction.
const _verdictIc = { verte: "\u{1F7E2}", orange: "\u{1F7E0}", rouge: "\u{1F534}" };
const _verdictLbl = { keep: "séance maintenue", reduce: "volume réduit", replace: "endurance à la place", rest: "repos conseillé", off: "repos complet" };
function heroSessionHTML(plan, todayISO) {
  if (!globalThis.EBV2 || !globalThis.EBV2.adjustToday) return "";
  const snap = Object.assign({ date: todayISO }, S.answers.readiness || {});
  let res;
  try { res = globalThis.EBV2.adjustToday(S.sport, S.answers, snap); } catch (e) { console.warn(e); return ""; }
  const v = res.adjustment.verdict;
  const badge = '<span style="float:right;font-size:11px;font-weight:700;color:#555;margin-top:2px">' + _verdictIc[v.level] + " " + _verdictLbl[res.adjustment.action] + "</span>";
  // R4.7 — le plan qui réagit : toute adaptation est ANNONCÉE et expliquée en une phrase
  // (RPE d'hier, douleur, sommeil… — c'est la différence entre un PDF statique et un coach).
  const why = res.adjustment.action !== "keep" && v.drivers.length
    ? '<div class="load-sub" style="margin:4px 0 0">↳ ' + v.drivers.join(" · ") + "</div>" : "";
  let body;
  if (res.sessions.length) {
    body = res.sessions.map((x) => x.det
      ? '<details class="gd-sess" style="margin-top:6px"><summary><b>' + x.name + "</b></summary><span class=\"gd-det\">" + x.det + "</span></details>"
      : '<div style="margin-top:6px"><b>' + x.name + "</b></div>").join("");
  } else {
    const upcoming = [];
    plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayISO && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const nxt = upcoming[0];
    body = '<div style="margin-top:6px">\u{1F60C} Repos aujourd’hui.' + (nxt ? " Prochaine séance : <b>" + nxt.jour + "</b> · " + nxt.sessions.filter((s) => s.d !== "rs").map((s) => s.name).join(", ") : "") + "</div>";
  }
  return '<div class="card">' + badge + '<div class="eyebrow">Aujourd’hui' + (res.jour ? " · " + res.jour : "") + "</div>" + why + body + "</div>";
}

export function renderTabWeek(plan) {
  const today = new Date().toISOString().slice(0, 10);
  const moment = momentHTML(plan, today);

  if (!readinessDoneToday()) {
    $("screen").innerHTML = moment + painBannerHTML() + checkinGateHTML(today);
    const rb = $("rdApply");
    if (rb) rb.onclick = async () => { await applyReadiness(); renderTabWeek(plan); };
    bindPainBanner(plan);
    bindSickToggle(plan, today);
    return;
  }

  const w = currentWeek(plan);
  const raceTag = w.race
    ? ' <span style="background:#ff3b30;color:#fff;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:700">\u{1F3C1} COURSE ' + w.race + "</span>"
    : w.postRace ? ' <span style="color:#9b72ff;font-size:10px">↳ récup post-course</span>' : "";
  let html = moment;
  html += painBannerHTML();
  html += retestBannerHTML(today); // R4.4 — annonce J-7/veille/écran du jour J
  html += missedSessionsCheck(plan); // R4.10 — relance bienveillante (une fois, jamais de rafale)
  html += heroSessionHTML(plan, today);
  html += dailyContentHTML(plan, today); // R4.9 — contenu du jour (anecdote/physio/stat/défi)
  html += weeklyReviewHTML(plan); // R4.10 — bilan hebdo (dimanche)
  html += notifySetupHTML(); // R4.10 — réglage de l'heure du rappel (une fois)
  html += '<div class="card"><div class="eyebrow">Ta semaine</div>';
  html += '<div class="gw"><div class="gw-h"><b>Semaine ' + w.num + "</b><span style=\"color:" + (w.phase.c || "#555") + '">' + w.phase.nom + "</span>" + raceTag + "<em>" + w.vol + "h" + (w.isRecup ? " récup" : "") + "</em></div>";
  html += '<div class="gw-grid">';
  w.days.forEach((d) => {
    const bg = d.sessions.map((s) => "<span>" + ic[s.d] + "</span>").join("");
    const nm = d.sessions
      .map((s, si) => {
        const k = w.num + "|" + d.jour + "|" + si;
        const dn = S.answers.done && S.answers.done[k];
        // R4.2 — le REPOS se valide aussi (« récupération respectée ✓ », 1 tap) : un jour
        // de repos validé compte STRICTEMENT autant qu'un jour de séance dans la streak.
        const title = s.d === "rs" ? "Récupération respectée" : "Marquer fait";
        const chk = '<button class="doneBtn' + (dn ? " done" : "") + '" type="button" data-dk="' + k + '" data-rest="' + (s.d === "rs" ? 1 : 0) + '" title="' + title + '" aria-label="' + title + ' : ' + s.name.replace(/"/g, "") + '">' + (dn ? "✓" : "○") + "</button> ";
        return chk + (s.det
          ? '<details class="gd-sess"><summary><b>' + s.name + "</b></summary><span class=\"gd-det\">" + s.det + "</span></details>"
          : "<b>" + s.name + "</b>");
      })
      .join("");
    const mark = d.date === today ? "<i>aujourd’hui</i>" : (plan.use10 ? "<i>C" + d.cyc + "J" + d.jc + "</i>" : "");
    html += '<div class="gd ' + d.charge + (d.date === today ? " today" : "") + '"><div class="gd-top"><b>' + d.jour + "</b>" + mark + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
  });
  html += "</div></div>";
  const todayDay = w.days.find((d) => d.date === today) || null;
  html += nutritionCardHTML(todayDay, null);
  html += nutritionJournalHTML(todayDay, today); // R4-1 — journal alimentaire (repliable)
  html += '<details class="load-card"><summary class="load-title">\u{1F321} Modifier ma forme du jour</summary>' + readinessCardHTML({ btnLabel: "Mettre à jour" }) + "</details>";
  html += "</div>";
  $("screen").innerHTML = html;
  bindPainBanner(plan);
  bindRetestBanner(today, () => renderTabWeek(ensurePlan())); // le retest a pu régénérer le plan
  bindNotifySetup(plan, () => renderTabWeek(plan));
  scheduleDailyNotification(plan);
  bindNutritionJournal(todayDay, today, () => renderTabWeek(plan));
  // Météo en différé : affine l'hydratation (chaleur → sodium) sans bloquer le rendu.
  if (todayDay) fetchWeather().then((wx) => {
    const el = $("nutCard");
    if (!el || !wx || wx.tmaxC == null) return;
    const h = nutritionCardHTML(todayDay, wx.tmaxC);
    if (h) el.outerHTML = h;
  });
  const _rb = $("rdApply");
  if (_rb) _rb.onclick = async () => { await applyReadiness(); renderTabWeek(plan); };
  document.querySelectorAll("#screen .doneBtn").forEach((b) => {
    b.onclick = () => {
      if (!S.answers.done) S.answers.done = {};
      const k = b.dataset.dk;
      const checking = !S.answers.done[k]; // ○→✓ (pas la dé-coche)
      let badgesBefore = [];
      if (checking && globalThis.EBV2 && globalThis.EBV2.badges) {
        try { badgesBefore = globalThis.EBV2.badges(plan, S.answers, today); } catch (e) {}
      }
      if (S.answers.done[k]) delete S.answers.done[k];
      else S.answers.done[k] = true;
      ebSave();
      const sc = window.pageYOffset;
      renderTabWeek(plan); // re-rend la VUE — le plan n'est pas recalculé
      window.scrollTo(0, sc);
      if (checking) {
        // retrouver la séance depuis la clé "sem|jour|idx" (le plan, pas la vue)
        const [wn, jour, si] = k.split("|");
        const wk = plan.weeks.find((x) => String(x.num) === wn);
        const dy = wk && wk.days.find((x) => x.jour === jour);
        const sess = dy && dy.sessions[+si];
        if (sess) {
          const celebrate = () => {
            let newBadge = null;
            if (globalThis.EBV2 && globalThis.EBV2.badges) {
              try {
                const after = globalThis.EBV2.badges(plan, S.answers, today);
                newBadge = after.find((x) => !badgesBefore.some((y) => y.id === x.id)) || null;
              } catch (e) {}
            }
            showCongrats(plan, sess, newBadge, today);
          };
          // R4.0 — repos : validation directe (pas de RPE sur du repos) ; séance : feedback
          // d'abord, puis re-rendu (le feedback peut poser le drapeau douleur → bandeau)
          if (sess.d === "rs") celebrate();
          else feedbackModal(plan, sess, k, () => { renderTabWeek(plan); celebrate(); });
        }
      }
    };
  });
}
