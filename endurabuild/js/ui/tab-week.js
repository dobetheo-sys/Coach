// Onglet 📅 Semaine — le calendrier de la semaine courante (refonte R5 : le check-in du
// matin et la séance du jour vivent dans l'onglet central 🎯 Aujourd'hui ; ici, la grille
// de la semaine, les échanges de jours ⇄, le bilan hebdo, le contenu du jour, les rappels).
// La règle produit tient toujours : pas de séance visible avant le check-in → redirection
// vers Aujourd'hui tant que la forme du jour n'est pas renseignée.
import { S, $, ebSave, esc } from "../state.js";
import { readinessCardHTML } from "./plan-view.js";
import { applyReadiness, readinessDoneToday } from "./readiness.js";
import { avatarDataFor, avatarSVG } from "./avatar.js";
import { celebrationMessage } from "./celebrations.js";
import { notifySetupHTML, bindNotifySetup, scheduleDailyNotification, weeklyReviewHTML } from "../notifications.js";
import { retestBannerHTML, bindRetestBanner } from "./retest.js";
import { ensurePlan, invalidatePlan, setTab } from "./tabs.js";
import { trapModal } from "./modal.js";

// Déplacement de séance persistant (spec §8) : échange de deux jours d'une même semaine.
// L'échange est stocké (answers.daySwaps) et réappliqué après chaque régénération ; les ✓
// et feedbacks des deux jours sont remappés UNE fois à la création (ils suivent la séance).
function toggleSwap(wnum, jA, jB) {
  if (!Array.isArray(S.answers.daySwaps)) S.answers.daySwaps = [];
  const ix = S.answers.daySwaps.findIndex(([w2, a2, b2]) => w2 === wnum && ((a2 === jA && b2 === jB) || (a2 === jB && b2 === jA)));
  if (ix >= 0) S.answers.daySwaps.splice(ix, 1);
  else S.answers.daySwaps.push([wnum, jA, jB]);
  const remap = (obj) => {
    if (!obj) return;
    for (let i = 0; i < 8; i++) {
      const kA = wnum + "|" + jA + "|" + i, kB = wnum + "|" + jB + "|" + i;
      const tA = obj[kA], tB = obj[kB];
      if (tB !== undefined) obj[kA] = tB; else delete obj[kA];
      if (tA !== undefined) obj[kB] = tA; else delete obj[kB];
    }
  };
  remap(S.answers.done);
  remap(S.answers.completions);
}
function handleSwapClick(plan, wnum, jour) {
  const p = S._swapPending;
  if (!p || p.w !== wnum) { S._swapPending = { w: wnum, jour }; renderTabWeek(plan); return; }
  if (p.jour === jour) { S._swapPending = null; renderTabWeek(plan); return; }
  toggleSwap(wnum, p.jour, jour);
  S._swapPending = null;
  ebSave();
  invalidatePlan();
  let np = ensurePlan();
  // Garde-fou : l'échange ne doit pas créer deux jours durs consécutifs (récupération d'abord)
  const wk = np.weeks.find((x) => x.num === wnum);
  const adjacentHard = !!wk && wk.days.some((d, i) => i > 0 && d.charge === "dur" && wk.days[i - 1].charge === "dur");
  if (adjacentHard && !confirm("Cet échange crée deux jours durs consécutifs — le corps récupère mal comme ça. Garder quand même ?")) {
    toggleSwap(wnum, p.jour, jour); // annulation : on remet tout comme avant
    ebSave();
    invalidatePlan();
    np = ensurePlan();
  }
  renderTabWeek(np);
}
import { dailyContentHTML } from "./daily-content.js";
import { shareStory, shareText } from "../export.js";

// R4.0 — boucle de base : validation → FEEDBACK ≤10s (RPE 1-10, ressenti, douleur) →
// célébration → teaser de la prochaine séance (la boucle se ferme sur le teaser, jamais
// sur la récompense). Le feedback nourrit RÉELLEMENT l'ajusteur : RPE ≥8 hier = signal
// annoncé demain ; douleur = intensité verrouillée (rouge forcé) tant que non levée.
export function feedbackModal(plan, session, k, onDone) {
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
  const untrap = trapModal(ov, () => { ov.remove(); onDone(); }); // Échap = passer le feedback, la séance reste validée
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
    untrap();
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
export function showCongrats(plan, session, newBadge, todayISO) {
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
    + '<div class="nav" style="justify-content:center;margin-top:14px;gap:8px;flex-wrap:wrap">'
    + '<button class="btn gold" id="ebShareStory" type="button">📸 Story</button>'
    + '<button class="btn gold" id="ebShareSquare" type="button">🖼 Carte</button>'
    + '<button class="btn gold" id="ebShareText" type="button">💬 Texte</button>'
    + '<button class="btn" id="ebCloseCongrats" type="button">Fermer</button></div>'
    + '<div class="load-sub" style="text-align:center;margin-top:6px">Story 9:16 · carte carrée 1:1 · ou résumé texte — généré localement, partagé via la feuille de ton téléphone.</div>'
    + nextSessionTeaser(plan, todayISO)
    + "</div>";
  document.body.appendChild(ov);
  const untrap = trapModal(ov, () => ov.remove());
  const closeOv = () => { untrap(); ov.remove(); };
  ov.querySelector("#ebCloseCongrats").onclick = closeOv;
  ov.onclick = (e) => { if (e.target === ov) closeOv(); };
  // R6 — plusieurs types de partage : story 9:16, carte 1:1, texte (repli presse-papiers)
  const shareOpts = { sessionName: session.name, detail: session.det, sport: S.sport, streak, badge: newBadge, avatarSVG: avatarSVG(av, 520), accent: av.accent };
  const bindShare = (id, label, fn) => {
    const btn = ov.querySelector(id);
    if (btn) btn.onclick = async () => {
      btn.disabled = true; btn.textContent = "…";
      try { await fn(btn); } catch (e) { console.warn(e); }
      btn.disabled = false; btn.textContent = label;
    };
  };
  bindShare("#ebShareStory", "📸 Story", () => shareStory(shareOpts, "story"));
  bindShare("#ebShareSquare", "🖼 Carte", () => shareStory(shareOpts, "square"));
  bindShare("#ebShareText", "💬 Texte", async (btn) => {
    const r = await shareText(shareOpts);
    if (r === "clipboard") btn.textContent = "Copié ✓";
  });
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

// R4.5 — bandeau douleur PERMANENT tant que le drapeau n'est pas levé : la qualité est
// verrouillée par l'ajusteur (rouge forcé), la série est gelée, on recommande médecin/kiné.
// Levée = action explicite + question de confirmation. Exporté (R5) : affiché aussi
// dans l'onglet 🎯 Aujourd'hui.
export function painBannerHTML() {
  const pf = S.answers.painFlag;
  if (!pf || !pf.active) return "";
  return '<div class="warn" style="background:#ffe3e0;font-weight:600">🩹 <b>Douleur signalée' + (pf.location ? " (" + esc(pf.location) + ")" : "") + ".</b> "
    + 'Les séances de qualité sont remplacées par de la récupération tant que le drapeau est actif — ta série est gelée, rien n’est perdu. Si la douleur persiste, consulte un médecin ou un kiné.'
    + '<div class="nav" style="margin-top:8px"><button class="btn" id="ebLiftPain" type="button">Je n’ai plus mal → lever le drapeau</button></div></div>';
}
export function bindPainBanner(plan, rerender) {
  const b = $("ebLiftPain");
  if (b) b.onclick = () => {
    if (!confirm("Plus aucune douleur, ni à froid ni pendant l’effort ?")) return;
    S.answers.painFlag = { active: false, location: S.answers.painFlag.location, since: S.answers.painFlag.since, liftedAt: new Date().toISOString().slice(0, 10) };
    ebSave();
    (rerender || (() => renderTabWeek(plan)))();
  };
}
// R4.2 — maladie déclarée : gèle la série (le jour ne compte ni ne casse), jamais de culpabilisation.
export function sickToggleHTML(todayISO) {
  const sick = (S.answers.sickDates || []).includes(todayISO);
  return '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px"><input type="checkbox" id="rdSick"' + (sick ? " checked" : "") + ' style="width:20px;height:20px"><span>🤒 Malade aujourd’hui — la série est gelée, la reprise attendra que ça aille mieux</span></label>';
}
export function bindSickToggle(plan, todayISO) {
  const cb = $("rdSick");
  if (cb) cb.onchange = () => {
    if (!Array.isArray(S.answers.sickDates)) S.answers.sickDates = [];
    if (cb.checked) { if (!S.answers.sickDates.includes(todayISO)) S.answers.sickDates.push(todayISO); }
    else S.answers.sickDates = S.answers.sickDates.filter((d) => d !== todayISO);
    S.answers.sickDates = S.answers.sickDates.slice(-60);
    ebSave();
  };
}

// Séance du jour (déjà adaptée au verdict de forme) — ou, si repos, la prochaine séance
// à venir. Exportée (R5) : rendue en PREMIER dans l'onglet central 🎯 Aujourd'hui.
const _verdictIc = { verte: "\u{1F7E2}", orange: "\u{1F7E0}", rouge: "\u{1F534}" };
const _verdictLbl = { keep: "séance maintenue", reduce: "volume réduit", replace: "endurance à la place", rest: "repos conseillé", off: "repos complet" };
export function heroSessionHTML(plan, todayISO) {
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
    setTab("today"); // règle produit : le check-in (diaporama d'Aujourd'hui) d'abord
    return;
  }

  const w = currentWeek(plan);
  const raceTag = w.race
    ? ' <span style="background:#ff3b30;color:#fff;border-radius:5px;padding:1px 7px;font-size:10px;font-weight:700">\u{1F3C1} COURSE ' + w.race + "</span>"
    : w.postRace ? ' <span style="color:#9b72ff;font-size:10px">↳ récup post-course</span>' : "";
  let html = moment;
  html += painBannerHTML();
  html += retestBannerHTML(today); // R4.4 — annonce J-7/veille/écran du jour J
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
    // §8 — déplacement de séance : ⇄ sur chaque jour, deux taps = échange persistant.
    const pend = S._swapPending && S._swapPending.w === w.num && S._swapPending.jour === d.jour;
    const swapBtn = '<button class="swapBtn" type="button" data-swap="' + w.num + "|" + d.jour + '" title="Échanger ce jour avec un autre" aria-label="Échanger ' + d.jour + ' avec un autre jour" style="border:none;background:' + (pend ? "#2e6bff" : "transparent") + ";color:" + (pend ? "#fff" : "#b3ab9b") + ';border-radius:5px;font-size:12px;cursor:pointer;padding:0 4px">⇄</button>';
    html += '<div class="gd ' + d.charge + (d.date === today ? " today" : "") + (pend ? " swap-pend" : "") + '"' + (pend ? ' style="outline:2px dashed #2e6bff"' : "") + '><div class="gd-top"><b>' + d.jour + "</b>" + mark + swapBtn + '</div><div class="gd-badges">' + bg + '</div><div class="gd-n">' + nm + "</div></div>";
  });
  html += "</div>";
  if (S._swapPending && S._swapPending.w === w.num)
    html += '<div class="load-sub" style="margin-top:6px">⇄ <b>' + S._swapPending.jour + "</b> sélectionné — touche le jour avec lequel l’échanger (ou re-touche ⇄ pour annuler).</div>";
  html += "</div>";
  html += sickToggleHTML(today);
  // Journal des adaptations quotidiennes (readinessLog) — la preuve que le plan réagit.
  const rlog = Array.isArray(S.answers.readinessLog) ? S.answers.readinessLog : [];
  if (rlog.length) {
    const icV = { verte: "🟢", orange: "🟠", rouge: "🔴" };
    const lblV = { keep: "maintenue", reduce: "réduite", replace: "remplacée par endurance", rest: "repos", off: "repos complet" };
    const nAdapt = rlog.filter((x) => x.action !== "keep").length;
    html += '<details class="load-card"><summary class="load-title">🤖 Adaptations quotidiennes (' + rlog.length + " check-ins · " + nAdapt + " ajustement" + (nAdapt > 1 ? "s" : "") + ")</summary>";
    rlog.slice(-10).reverse().forEach((x) => { html += '<div style="font-size:12px;margin:4px 0">' + (icV[x.level] || "") + " " + x.date + " — séance " + (lblV[x.action] || x.action) + "</div>"; });
    html += '<div class="load-sub" style="margin-top:4px">C’est la différence entre un plan PDF et un coach : chaque matin, la séance s’ajuste à ta forme réelle.</div></details>';
  }
  html += '<details class="load-card"><summary class="load-title">\u{1F321} Modifier ma forme du jour</summary>' + readinessCardHTML({ btnLabel: "Mettre à jour" }) + "</details>";
  html += "</div>";
  $("screen").innerHTML = html;
  bindPainBanner(plan);
  bindSickToggle(plan, today);
  bindRetestBanner(today, () => renderTabWeek(ensurePlan())); // le retest a pu régénérer le plan
  bindNotifySetup(plan, () => renderTabWeek(plan));
  scheduleDailyNotification(plan);
  const _rb = $("rdApply");
  if (_rb) _rb.onclick = async () => { await applyReadiness(); renderTabWeek(plan); };
  document.querySelectorAll("#screen [data-swap]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [wn, jour] = b.dataset.swap.split("|");
      handleSwapClick(plan, +wn, jour);
    };
  });
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
