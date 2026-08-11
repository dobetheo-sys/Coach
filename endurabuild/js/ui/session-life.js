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
import { whyOf, techOf, techListHTML } from "./plan-view.js";
import { avatarTriDataFor } from "./avatar.js";
import { avatarTriSVG, avatarTriStorySVG, avatarTriAccent } from "./avatar-tri.js";
import { celebrationMessage } from "./celebrations.js";
import { trapModal } from "./modal.js";
import { shareStory, shareText } from "../export.js";
import { DISC, VERDICT_ICON } from "./icons.js";

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
  return '<div style="margin-top:12px;padding-top:10px;border-top:2px dashed var(--zn-sep,#0003);font-size:var(--fs-md)"><b>' + when + " : " + s.name + "</b>" + (obj ? '<br><span style="color:var(--zn-muted,#635b4a)">Objectif : ' + obj + "</span>" : "") + "</div>";
}

// Célébration (modal courte, partage story natif — repli téléchargement PNG).
export function showCongrats(plan, session, newBadge, todayISO) {
  document.querySelectorAll(".eb-overlay").forEach((e) => e.remove());
  let streak = 0; // R4.2 — série par JOUR (le repos validé compte autant qu'une séance)
  try { streak = globalThis.EBV2.adherence(plan, S.answers, todayISO).days || 0; } catch (e) {}
  const av = avatarTriDataFor(plan, todayISO);
  const ov = document.createElement("div");
  ov.className = "eb-overlay";
  ov.innerHTML = '<div class="eb-modal" role="dialog" aria-label="Séance validée">'
    + '<div style="display:flex;justify-content:center">' + avatarTriSVG(av, 110) + "</div>"
    + '<h2 style="text-align:center;margin:8px 0 2px;font-size:var(--fs-hand);line-height:1.35">' + celebrationMessage(session) + "</h2>"
    + '<div style="text-align:center;font-weight:700;margin-top:6px">' + session.name + "</div>"
    + (session.det ? '<div style="text-align:center;font-size:var(--fs-sm);color:var(--zn-muted,#635b4a);margin-top:2px">' + String(session.det).split("—")[0].slice(0, 60) + "</div>" : "")
    + (streak > 1 ? '<div style="text-align:center;margin-top:8px">🔥 <b>' + streak + " jours d’affilée</b> — le repos validé compte aussi</div>" : "")
    + (newBadge ? '<div style="text-align:center;margin-top:6px;color:var(--zn-gold-text,#8a6d00);font-weight:700">' + newBadge.icon + " Badge débloqué : " + newBadge.label + "</div>" : "")
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
  const shareOpts = { sessionName: session.name, detail: session.det, sport: S.sport, streak, badge: newBadge, avatarSVG: avatarTriStorySVG(av, 520), avatarAspect: 1.78, accent: avatarTriAccent(av) };
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
    return B("var(--zn-bg-race,#ffe3e0)", "\u{1F3C1} <b>Jour de course.</b> Tout le travail est fait — départ prudent, finis fort. Bonne course !");
  if (raceDates.includes(tomorrow))
    return B("var(--zn-bg-eve,#fff3d6)", "\u{1F389} <b>Veille de course.</b> Objectif du jour : des jambes fraîches. Repos, hydratation, matériel préparé — demain tu récoltes.");
  let taperStart = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (!taperStart && (d.phaseId === "taper" || (w.phase && w.phase.id === "taper"))) taperStart = d.date; }));
  if (taperStart && taperStart === today)
    return B("var(--zn-bg-taper,#e9defc)", "✂️ <b>L’affûtage commence.</b> Le volume descend, la forme monte — le plus dur est derrière toi. Ne rajoute rien.");
  return "";
}

/** La date de FIN du plan : la course visée si elle est connue, sinon le dernier jour
 *  calendaire de la dernière semaine. Point unique (R11.1) — c'était déjà calculé une fois
 *  dans `planDeadlineHTML` (tab-profile.js) et redevenu nécessaire pour proposer
 *  l'abonnement ravitaillement en fin de plan (retour utilisateur, 08/08/2026). */
export function planEndDate(plan, answers) {
  if (answers && answers.race_date) return answers.race_date;
  const lastW = plan && plan.weeks && plan.weeks[plan.weeks.length - 1];
  const lastD = lastW && lastW.days[lastW.days.length - 1];
  return (lastD && lastD.date) || "";
}

// R4.5 — bandeau douleur PERMANENT tant que le drapeau n'est pas levé : la qualité est
// verrouillée par l'ajusteur (rouge forcé), la série est gelée, on recommande médecin/kiné.
// Levée = action explicite + question de confirmation.
export function painBannerHTML() {
  const pf = S.answers.painFlag;
  if (!pf || !pf.active) return "";
  return '<div class="warn" style="background:var(--zn-bg-race,#ffe3e0);font-weight:600">🩹 <b>Douleur signalée' + (pf.location ? " (" + esc(pf.location) + ")" : "") + ".</b> "
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
const _verdictLbl = { keep: "séance maintenue", reduce: "volume réduit", replace: "endurance à la place", rest: "repos conseillé", off: "repos complet" };
// Retour du fondateur (07/08/2026) : « la séance du jour, plus visuelle. » Le héros du jour
// était du texte pur (nom en gras, une phrase de pourquoi, un lien replié) — rien ne dit au
// premier coup d'œil « c'est de la nage » ou « c'est du vélo ». Un badge rond par discipline,
// couleur + pictogramme : DISC (`./icons.js`, R11.1) est le point unique.
function discBadgeHTML(d) {
  const b = DISC[d] || DISC.rn;
  // R16.8 — un glyphe décoratif se dimensionne en `em`, jamais en px littéral : ce n'est pas
  // de la typographie, l'échelle --fs-* ne le régit pas (voir styles.css :root).
  return '<div aria-hidden="true" style="flex:0 0 auto;width:38px;height:38px;border-radius:11px;background:' + b.ac
    + ';border:2px solid var(--zn-ink,#16130e);display:flex;align-items:center;justify-content:center;font-size:1.2em;line-height:1">' + b.ic + "</div>";
}

// R-ZENNA — anneau « forme du jour » (reskin visuel de l'onglet Aujourd'hui). Le nombre
// affiché est l'énergie déclarée au check-in (`S.answers.readiness.energy`, 0-100, le MÊME
// signal que lit le moteur pour le verdict) — jamais une valeur inventée pour l'occasion
// (R11.1). `null` si aucun check-in n'a encore renseigné d'énergie.
function formRingSVG(val) {
  if (val == null || !isFinite(val)) return "";
  const r = 21, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, val)) / 100);
  return '<div class="zn-form-ring" aria-hidden="true"><svg width="52" height="52" viewBox="0 0 52 52">'
    + '<circle cx="26" cy="26" r="' + r + '" stroke="rgba(255,255,255,.18)" stroke-width="5" fill="none"/>'
    + '<circle cx="26" cy="26" r="' + r + '" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"'
    + ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 26 26)"/></svg>'
    + '<div class="zn-form-val"><span>' + Math.round(val) + '</span><em>forme</em></div></div>';
}

export function heroSessionHTML(plan, todayIso) {
  if (!globalThis.EBV2 || !globalThis.EBV2.adjustToday) return "";
  const snap = Object.assign({ date: todayIso }, S.answers.readiness || {});
  let res;
  try { res = globalThis.EBV2.adjustToday(S.sport, S.answers, snap); } catch (e) { console.warn(e); return ""; }
  const v = res.adjustment.verdict;
  // R-ZENNA — la puce de verdict et l'anneau de forme REMPLACENT le badge texte flottant à
  // droite de l'eyebrow (même donnée, `v`/`res.adjustment` — aucun second calcul, R11.1).
  const verdictChip = '<span class="zn-verdict-chip zn-verdict-' + v.level + '">' + VERDICT_ICON[v.level] + " " + _verdictLbl[res.adjustment.action] + "</span>";
  const ring = formRingSVG(S.answers.readiness && S.answers.readiness.energy);
  // R4.7 — le plan qui réagit : toute adaptation est ANNONCÉE et expliquée en une phrase
  // (RPE d'hier, douleur, sommeil… — c'est la différence entre un PDF statique et un coach).
  const why = res.adjustment.action !== "keep" && v.drivers.length
    ? '<div class="load-sub" style="margin:4px 0 0">↳ ' + v.drivers.join(" · ") + "</div>" : "";
  // U8 — UN JOUR DE REPOS N'EST PAS UNE SÉANCE QUI S'APPELLE « OFF ».
  //
  // Le moteur matérialise le repos par une séance `{d:"rs", name:"OFF", min:0}` — c'est le bon
  // choix côté plan (la grille a une case pour chaque jour, et le repos se VALIDE comme le
  // reste). Mais le héros du jour testait `res.sessions.length`, qui vaut donc 1 : l'athlète
  // lisait un **« OFF »** sec, avec un « Le détail de la séance » qui n'ouvre rien.
  //
  // Pendant ce temps la branche du dessous — « 😌 Repos aujourd'hui. Prochaine séance : Mar ·
  // Sweetspot vélo » — écrite exactement pour ce cas, n'était JAMAIS atteinte. Le bon message
  // existait déjà et était mort.
  //
  // Mesuré : **153 jours sur 441** en semaine 1 (7 sports × niveaux × densités) sont des jours
  // de repos, soit un tiers des ouvertures de l'app. Et **63 profils sur 63** démarrent par un
  // lundi de repos : quelqu'un qui crée son plan un lundi, après avoir répondu à 37 questions,
  // recevait « OFF » comme tout premier écran.
  const queDuRepos = res.sessions.every((x) => x.d === "rs");
  let body;
  if (res.sessions.length && !queDuRepos) {
    // §5 (R6) — dans le HÉROS d'Aujourd'hui, le POURQUOI est VISIBLE sans rien ouvrir : c'est
    // l'écran que l'athlète regarde tous les matins, et « pourquoi cette séance » y a plus de
    // valeur que la liste des blocs, qui reste à un clic.
    // Retour utilisateur (08/08/2026, 2e passage) : « mettre plus en valeur le corps de
    // séance, c'est le point d'intérêt de l'onglet ». Le détail technique restait replié
    // par défaut — le même geste que Plan/Semaine (U16), pertinent là où plusieurs séances
    // se lisent d'un coup, mais Aujourd'hui n'en montre QU'UNE (ou deux, brick) : c'est la
    // raison d'être de l'onglet, elle s'ouvre d'office ici. `open` uniquement dans ce héros.
    body = res.sessions.map((x) => {
      const w = whyOf(x);
      return '<div style="display:flex;gap:10px;align-items:flex-start;margin-top:10px">' + discBadgeHTML(x.d)
        + '<div style="flex:1;min-width:0"><b>' + x.name + "</b>"
        + (w ? '<div class="gd-why" style="margin:3px 0 0">\u{1F4A1} ' + w + "</div>" : "")
        + (x.det ? '<details class="gd-sess" open style="margin-top:4px"><summary>Le détail de la séance</summary>' + techListHTML(techOf(x)) + "</details>" : "")
        + "</div></div>";
    }).join("");
  } else {
    const upcoming = [];
    plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayIso && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const nxt = upcoming[0];
    body = '<div style="margin-top:6px">\u{1F60C} Repos aujourd’hui.'
      + (nxt ? " Prochaine séance : <b>" + nxt.jour + " " + fmtDay(nxt.date) + "</b> · " + nxt.sessions.filter((s) => s.d !== "rs").map((s) => s.name).join(", ") : "")
      + "</div>";
  }
  // Mesuré : la carte "Charge" (SVG) plus bas dans l'onglet pèse davantage en pixels que le
  // héros, qui utilisait le même style `.card` générique que le reste — rien ne distinguait
  // « la séance du jour » de « ta charge » ou de « ta prédiction ». Bordure et ombre à
  // l'accent du sport (déjà utilisé par le bouton primaire et le badge de discipline) pour
  // que l'œil s'y pose en premier, sans dupliquer une nouvelle classe CSS pour un seul rôle.
  //
  // `zn-hero`/`zn-hero-top`/`zn-hero-verdict-row`/`zn-disc-chip` sont des classes ADDITIVES
  // (reskin R-ZENNA, css/zenna-today.css, scopées à `body.theme-zenna`) : sans cette feuille
  // de style elles ne font rien, le rendu `.card` d'origine reste intact (repli identique).
  const firstDisc = queDuRepos ? null : (res.sessions.find((x) => x.d !== "rs") || res.sessions[0]);
  const discChip = firstDisc ? '<div class="zn-disc-chip"><span>' + (DISC[firstDisc.d] || DISC.rn).ic + " " + (DISC[firstDisc.d] || DISC.rn).label + "</span></div>" : "";
  return '<div class="card zn-hero" style="border-color:var(--acc);box-shadow:6px 6px 0 var(--acc)">'
    + '<div class="zn-hero-top"><div class="eyebrow">Aujourd’hui' + (res.jour ? " · " + res.jour : "") + " · " + fmtDay(todayIso) + '</div>'
    + '<div class="zn-hero-verdict-row">' + verdictChip + ring + "</div></div>"
    + why + body + discChip + "</div>";
}
