// La SÉANCE VÉCUE — les briques communes à tous les écrans qui montrent, valident ou
// commentent une séance : bandeaux de moment, drapeau douleur, déclaration de maladie,
// séance du jour déjà adaptée, feedback post-séance, célébration et partage.
//
// R16.9 — ce module naît de la fusion de 📅 Semaine dans 🗓 Plan. Ces fonctions vivaient
// dans `tab-week.js` et étaient importées par `tab-today.js` : les laisser mourir avec
// l'onglet aurait fait disparaître la boucle validation → feedback → célébration, qui
// n'a rien à voir avec un onglet. Elles sont donc EXTRAITES avant suppression, comme le
// demandait l'étape 2 du handoff — un module ne se supprime pas, il se vide d'abord.
import { S, $, ebSave, esc, fmtDay, todayISO } from "../state.js";
import { whyOf, techOf } from "./plan-view.js";
import { avatarDataFor, avatarSVG } from "./avatar.js";
import { celebrationMessage } from "./celebrations.js";
import { trapModal } from "./modal.js";
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
    + '<div style="font-weight:700;font-size:var(--fs-sm);margin-top:10px">Effort (RPE 1 = très facile · 10 = maximal)</div>'
    + '<div style="display:flex;gap:4px;margin-top:4px">' + rpeBtns + "</div>"
    + '<div style="font-weight:700;font-size:var(--fs-sm);margin-top:10px">Ressenti</div>'
    + '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">'
    + '<button class="btn" data-feel="great" type="button">😃 Super</button><button class="btn" data-feel="normal" type="button">🙂 Normal</button>'
    + '<button class="btn" data-feel="hard" type="button">😮‍💨 Dur</button><button class="btn" data-feel="bad" type="button">😣 Mauvais</button></div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:var(--fs-md)"><input type="checkbox" id="fbPain" style="width:20px;height:20px"><span>🩹 Douleur pendant ou après</span></label>'
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
    S.answers.completions[k] = { date: todayISO(), rpe: state.rpe, feeling: state.feeling, pain, painLocation: loc || undefined };
    if (pain) S.answers.painFlag = { active: true, location: loc, since: todayISO() }; // R4.5 — verrouille la qualité via l'ajusteur
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
  return '<div style="margin-top:12px;padding-top:10px;border-top:2px dashed #0003;font-size:var(--fs-md)"><b>' + when + " : " + s.name + "</b>" + (obj ? '<br><span style="color:#635b4a">Objectif : ' + obj + "</span>" : "") + "</div>";
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
    + '<h2 style="text-align:center;margin:8px 0 2px;font-size:var(--fs-hand);line-height:1.35">' + celebrationMessage(session) + "</h2>"
    + '<div style="text-align:center;font-weight:700;margin-top:6px">' + session.name + "</div>"
    + (session.det ? '<div style="text-align:center;font-size:var(--fs-sm);color:#635b4a;margin-top:2px">' + String(session.det).split("—")[0].slice(0, 60) + "</div>" : "")
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

/**
 * VALIDATION D'UNE SÉANCE — le point unique. R16.9 : la coche existait en DEUX versions,
 * l'une dans 📅 Semaine (feedback + célébration + badges) et l'autre dans 🗓 Plan (bascule
 * muette). Cocher la même séance ne faisait donc pas la même chose selon l'onglet — et le
 * plan absorbant la semaine, c'est la version complète qui reste, partout.
 * `rerender` re-rend la VUE appelante ; le plan n'est jamais recalculé ici.
 */
export function toggleDone(plan, k, todayIso, rerender) {
  if (!S.answers.done) S.answers.done = {};
  const checking = !S.answers.done[k]; // ○→✓ (la dé-coche ne célèbre rien)
  let badgesBefore = [];
  if (checking && globalThis.EBV2 && globalThis.EBV2.badges) {
    try { badgesBefore = globalThis.EBV2.badges(plan, S.answers, todayIso); } catch (e) {}
  }
  if (S.answers.done[k]) delete S.answers.done[k];
  else S.answers.done[k] = true;
  ebSave();
  const sc = window.pageYOffset;
  rerender();
  window.scrollTo(0, sc);
  if (!checking) return;
  // retrouver la séance depuis la clé "sem|jour|idx" (le plan, pas la vue)
  const [wn, jour, si] = k.split("|");
  const wk = plan.weeks.find((x) => String(x.num) === wn);
  const dy = wk && wk.days.find((x) => x.jour === jour);
  const sess = dy && dy.sessions[+si];
  if (!sess) return;
  const celebrate = () => {
    let newBadge = null;
    if (globalThis.EBV2 && globalThis.EBV2.badges) {
      try {
        const after = globalThis.EBV2.badges(plan, S.answers, todayIso);
        newBadge = after.find((x) => !badgesBefore.some((y) => y.id === x.id)) || null;
      } catch (e) {}
    }
    showCongrats(plan, sess, newBadge, todayIso);
  };
  // R4.0 — repos : validation directe (pas de RPE sur du repos) ; séance : feedback
  // d'abord, puis re-rendu (le feedback peut poser le drapeau douleur → bandeau)
  if (sess.d === "rs") celebrate();
  else feedbackModal(plan, sess, k, () => { rerender(); celebrate(); });
}

// Célébrations « moment » (RESTE-A-FAIRE #6) : bannières ponctuelles aux instants qui
// comptent — jour de course, veille de course, entrée en affûtage. Purement visuel,
// calculé depuis le plan déjà généré ; dégrade proprement si les jours n'ont pas de date.
export function momentHTML(plan, todayIso) {
  const today = todayIso || todayISO();
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
// Levée = action explicite + question de confirmation.
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
    S.answers.painFlag = { active: false, location: S.answers.painFlag.location, since: S.answers.painFlag.since, liftedAt: todayISO() };
    ebSave();
    if (rerender) rerender();
  };
}
// R4.2 — maladie déclarée : gèle la série (le jour ne compte ni ne casse), jamais de culpabilisation.
export function sickToggleHTML(todayIso) {
  const sick = (S.answers.sickDates || []).includes(todayIso);
  return '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:var(--fs-md)"><input type="checkbox" id="rdSick"' + (sick ? " checked" : "") + ' style="width:20px;height:20px"><span>🤒 Malade aujourd’hui — la série est gelée, la reprise attendra que ça aille mieux</span></label>';
}
export function bindSickToggle(plan, todayIso) {
  const cb = $("rdSick");
  if (cb) cb.onchange = () => {
    if (!Array.isArray(S.answers.sickDates)) S.answers.sickDates = [];
    if (cb.checked) { if (!S.answers.sickDates.includes(todayIso)) S.answers.sickDates.push(todayIso); }
    else S.answers.sickDates = S.answers.sickDates.filter((d) => d !== todayIso);
    S.answers.sickDates = S.answers.sickDates.slice(-60);
    ebSave();
  };
}

// Séance du jour (déjà adaptée au verdict de forme) — ou, si repos, la prochaine séance
// à venir. Rendue en PREMIER dans l'onglet central 🎯 Aujourd'hui.
const _verdictIc = { verte: "\u{1F7E2}", orange: "\u{1F7E0}", rouge: "\u{1F534}" };
const _verdictLbl = { keep: "séance maintenue", reduce: "volume réduit", replace: "endurance à la place", rest: "repos conseillé", off: "repos complet" };
export function heroSessionHTML(plan, todayIso) {
  if (!globalThis.EBV2 || !globalThis.EBV2.adjustToday) return "";
  const snap = Object.assign({ date: todayIso }, S.answers.readiness || {});
  let res;
  try { res = globalThis.EBV2.adjustToday(S.sport, S.answers, snap); } catch (e) { console.warn(e); return ""; }
  const v = res.adjustment.verdict;
  const badge = '<span style="float:right;font-size:var(--fs-xs);font-weight:700;color:#555;margin-top:2px">' + _verdictIc[v.level] + " " + _verdictLbl[res.adjustment.action] + "</span>";
  // R4.7 — le plan qui réagit : toute adaptation est ANNONCÉE et expliquée en une phrase
  // (RPE d'hier, douleur, sommeil… — c'est la différence entre un PDF statique et un coach).
  const why = res.adjustment.action !== "keep" && v.drivers.length
    ? '<div class="load-sub" style="margin:4px 0 0">↳ ' + v.drivers.join(" · ") + "</div>" : "";
  let body;
  if (res.sessions.length) {
    // §5 (R6) — dans le HÉROS d'Aujourd'hui, le POURQUOI est VISIBLE sans rien ouvrir : c'est
    // l'écran que l'athlète regarde tous les matins, et « pourquoi cette séance » y a plus de
    // valeur que la liste des blocs, qui reste à un clic.
    body = res.sessions.map((x) => {
      const w = whyOf(x);
      return '<div style="margin-top:8px"><b>' + x.name + "</b>"
        + (w ? '<div class="gd-why" style="margin:3px 0 0">\u{1F4A1} ' + w + "</div>" : "")
        + (x.det ? '<details class="gd-sess" style="margin-top:4px"><summary>Le détail de la séance</summary><span class="gd-det">' + techOf(x) + "</span></details>" : "")
        + "</div>";
    }).join("");
  } else {
    const upcoming = [];
    plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayIso && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const nxt = upcoming[0];
    body = '<div style="margin-top:6px">\u{1F60C} Repos aujourd’hui.' + (nxt ? " Prochaine séance : <b>" + nxt.jour + "</b> · " + nxt.sessions.filter((s) => s.d !== "rs").map((s) => s.name).join(", ") : "") + "</div>";
  }
  return '<div class="card">' + badge + '<div class="eyebrow">Aujourd’hui' + (res.jour ? " · " + res.jour : "") + " · " + fmtDay(todayIso) + "</div>" + why + body + "</div>";
}
