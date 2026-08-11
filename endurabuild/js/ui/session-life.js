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
import { whyOf, techOf, techListHTML, _blkMin } from "./plan-view.js";
import { znZoneBar, znConfetti, znXpFloat, znToast } from "./zenna-motion.js";
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
  // R-ZENNA — la célébration part de l'avatar, le centre visuel de la modale.
  znConfetti(ov.querySelector("svg") || ov.querySelector(".eb-modal"));
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
  // `flex:0 0 auto` — SANS lui, la case est un ITEM FLEX du label et se laisse comprimer par le
  // texte à côté : déclarée à 20 px, elle était MESURÉE à 13×20 (audit R-ZENNA), sous le minimum
  // absolu de WCAG 2.5.8 (24×24). C'est la commande qui gèle la série en cas de maladie ; la
  // rater d'un doigt fait cocher « malade » ou non selon la chance. 24 px, et elle ne rétrécit
  // plus. Défaut PRÉ-EXISTANT au reskin, présent dans les deux thèmes — corrigé à la source.
  const caseStyle = "width:24px;height:24px;flex:0 0 auto";
  return '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:var(--fs-md)">'
    + '<input type="checkbox" id="rdSick"' + (sick ? " checked" : "") + ' style="' + caseStyle + '">'
    + "<span>🤒 Malade aujourd’hui — la série est gelée, la reprise attendra que ça aille mieux</span></label>";
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

// R-ZENNA — ANNEAU « FORME DU JOUR ».
//
// Le nombre affiché est l'énergie déclarée au check-in (`S.answers.readiness.energy`, 0-100,
// le MÊME signal que lit le moteur pour rendre son verdict) — jamais une valeur fabriquée
// pour l'occasion (R11.1). `null` si aucun check-in n'a encore renseigné d'énergie : un
// anneau vide vaut mieux qu'un anneau qui invente un chiffre.
//
// Le remplissage est posé à sa valeur FINALE dans l'attribut, et `data-off` porte la même
// valeur pour l'animation : `znDrawFormRing` part de plein et transitionne vers `data-off`.
// Sans JS (ou en `prefers-reduced-motion`), l'anneau est déjà juste — l'animation n'est
// jamais ce qui rend la donnée correcte.
function formRingSVG(val) {
  if (val == null || !isFinite(val)) return "";
  const v = Math.max(0, Math.min(100, val));
  const r = 21, c = 2 * Math.PI * r, off = c * (1 - v / 100);
  return '<div class="zn-form-ring" aria-hidden="true"><svg width="52" height="52" viewBox="0 0 52 52">'
    + '<circle cx="26" cy="26" r="' + r + '" stroke="rgba(10,10,10,.2)" stroke-width="5" fill="none"/>'
    + '<circle class="zn-ring-fg" cx="26" cy="26" r="' + r + '" stroke="#0a0a0a" stroke-width="5" fill="none" stroke-linecap="round"'
    + ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" data-off="' + off.toFixed(1) + '"'
    + ' transform="rotate(-90 26 26)"/></svg>'
    + '<div class="zn-form-val"><span data-val="' + Math.round(v) + '">' + Math.round(v) + "</span><em>forme</em></div></div>";
}

/** Le grand chiffre du héros : minutes en dessous d'1 h 30, heures au-delà — au-delà, « 300 MIN »
 *  se lit moins bien que « 5 H00 », et c'est l'écran qu'on regarde à moitié réveillé. Le nombre
 *  reste un ENTIER dans les deux cas, pour que le compteur puisse l'animer. */
function heroMetric(min) {
  const m = Math.round(min || 0);
  if (!m) return null;
  if (m < 90) return { val: m, unit: "MIN" };
  return { val: Math.floor(m / 60), unit: "H" + String(m % 60).padStart(2, "0") };
}

export function heroSessionHTML(plan, todayIso) {
  if (!globalThis.EBV2 || !globalThis.EBV2.adjustToday) return "";
  // ⚠ L'ORDRE DES ARGUMENTS EST LA CORRECTION, PAS UN DÉTAIL DE STYLE.
  //
  // `S.answers.readiness.date` vaut la JOURNÉE D'ENTRAÎNEMENT (`jourEntrainementISO`, qui
  // recule d'un jour avant 4 h du matin — R23.2). En la passant en second, `Object.assign`
  // la laissait ÉCRASER `date: todayIso` : entre minuit et 4 h, l'ajusteur recevait la date
  // d'HIER et le héros affichait la séance d'hier. Mesuré à 01 h 30 : en-tête « LUN · 11/08 »
  // et « Repos » dans le héros, pendant que la carte de validation, elle, lit le plan
  // directement et proposait « MAR 11/08 · Sweetspot vélo ». Deux écrans de la même app, deux
  // réponses à « qu'est-ce que je fais aujourd'hui ? » — la forme exacte que R11.1 interdit.
  //
  // R23.2 énonce pourtant la règle mot pour mot : « `snap.date`, lui, reste la date CALENDAIRE
  // — l'ajusteur s'en sert pour choisir la séance du jour, et la décaler ferait adapter la
  // séance d'hier. » L'intention était juste, l'écriture la contredisait. La date calendaire
  // passe donc EN DERNIER, donc elle gagne ; le reste du snapshot (sommeil, énergie, VFC) vient
  // bien du check-in.
  const snap = Object.assign({}, S.answers.readiness || {}, { date: todayIso });
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
    ? '<div class="zn-hero-sub" style="margin-top:6px">↳ ' + v.drivers.join(" · ") + "</div>" : "";
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
  const actives = res.sessions.filter((x) => x.d !== "rs");

  // ── L'EN-TÊTE COMMUNE : date, verdict, anneau de forme ──
  const entete = '<div class="zn-hero-orb zenna-pulse" aria-hidden="true"></div>'
    + '<div class="zn-hero-top"><div class="eyebrow">Aujourd’hui' + (res.jour ? " · " + res.jour : "") + " · " + fmtDay(todayIso) + "</div>"
    + '<div class="zn-hero-verdict-row">' + verdictChip + ring + "</div></div>";

  let corps = "", detail = "";
  if (actives.length) {
    // §5 (R6) — dans le HÉROS d'Aujourd'hui, le POURQUOI est VISIBLE sans rien ouvrir : c'est
    // l'écran que l'athlète regarde tous les matins, et « pourquoi cette séance » y a plus de
    // valeur que la liste des blocs, qui vit dans la carte de détail juste en dessous.
    //
    // R-ZENNA — LE HÉROS DÉCRIT LA JOURNÉE, PAS UNE SÉANCE ISOLÉE. Le titre est la séance qui
    // ouvre la journée (l'ordre du moteur est chronologique), le grand chiffre est le TOTAL du
    // jour : sur un brick, annoncer 45 min quand la journée en fait 105 serait faux au moment
    // où l'athlète décide de son créneau. Les séances suivantes sont nommées juste en dessous.
    const primary = actives[0];
    // LA DURÉE VIENT DU MOTEUR, PAS D'UNE SOMME REFAITE ICI.
    //
    // `adjustToday` ne recopie PAS `min` sur les séances qu'il rend (mesuré : ses objets
    // portent `name, det, d, steps` et rien d'autre) — sommer `x.min` donnait donc 0, et le
    // grand chiffre du héros disparaissait. Il expose en revanche `adjustment.adjustedMinutes`,
    // qui est le total du jour APRÈS adaptation : c'est la seule valeur juste quand le verdict
    // a réduit la séance, et la recalculer depuis les steps en produirait une seconde,
    // forcément divergente le jour où l'ajusteur changera de règle (R11.1).
    const totalMin = res.adjustment.adjustedMinutes;
    const metric = heroMetric(totalMin);
    const w = whyOf(primary);
    const tech = techOf(primary);
    const suite = actives.slice(1).map((x) => x.name).join(" · ");
    corps = '<div class="zn-hero-title">' + primary.name + "</div>"
      + (metric ? '<div class="zn-hero-metric"><span class="zn-hero-num" data-val="' + metric.val + '">' + metric.val + '</span><span class="zn-hero-unit">' + metric.unit + "</span></div>" : "")
      + (suite ? '<div class="zn-hero-sub">puis ' + suite + "</div>" : (tech ? '<div class="zn-hero-sub">' + tech + "</div>" : ""))
      // `gd-why` EST conservée à côté de la classe du héros : c'est la classe sémantique du
      // « pourquoi » d'une séance dans tout le produit, et `smoke-r4` §5 la cherche pour
      // vérifier que la justification est visible SANS rien déplier. La renommer aurait rendu
      // muette une garde qui protège l'explicabilité — le contre-positionnement du produit.
      + (w ? '<div class="gd-why zn-hero-why">\u{1F4A1} ' + w + "</div>" : "")
      + '<div class="zn-disc-chip"><span>' + (DISC[primary.d] || DISC.rn).ic + " " + (DISC[primary.d] || DISC.rn).label + "</span></div>";

    // ── LA CARTE DE DÉTAIL — la barre de zones est CONSTRUITE depuis les steps du moteur ──
    // Pas un décor : chaque segment est un bloc réel, large comme sa durée, coloré par sa zone
    // (`znZoneBar`, qui lit `_blkMin` — la même fonction que la courbe de charge, R11.1).
    detail = '<div class="card"><div class="eyebrow">Le détail de la séance</div>'
      + actives.map((x) => {
        const wx = whyOf(x);
        return '<div style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">' + discBadgeHTML(x.d)
          + '<div style="flex:1;min-width:0"><b>' + x.name + "</b>"
          + (actives.length > 1 && wx ? '<div class="gd-why" style="margin:3px 0 0">\u{1F4A1} ' + wx + "</div>" : "")
          + znZoneBar(x, _blkMin)
          + techListHTML(techOf(x))
          + "</div></div>";
      }).join("")
      + "</div>";
  } else {
    // U8 — UN JOUR DE REPOS N'EST PAS UNE SÉANCE QUI S'APPELLE « OFF ».
    //
    // Le moteur matérialise le repos par une séance `{d:"rs", name:"OFF", min:0}` — c'est le bon
    // choix côté plan (la grille a une case pour chaque jour, et le repos se VALIDE comme le
    // reste). Mais le héros du jour testait `res.sessions.length`, qui vaut donc 1 : l'athlète
    // lisait un **« OFF »** sec, avec un « Le détail de la séance » qui n'ouvre rien.
    //
    // Mesuré : **153 jours sur 441** en semaine 1 (7 sports × niveaux × densités) sont des jours
    // de repos, soit un tiers des ouvertures de l'app. Et **63 profils sur 63** démarrent par un
    // lundi de repos : quelqu'un qui crée son plan un lundi, après avoir répondu à 37 questions,
    // recevait « OFF » comme tout premier écran.
    const upcoming = [];
    plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayIso && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const nxt = upcoming[0];
    corps = '<div class="zn-hero-title">Repos</div>'
      // La phrase « Repos aujourd’hui » est GARDÉE MOT POUR MOT (U8, smoke-usage) : ce message
      // avait vécu mort pendant des mois derrière un « OFF » sec, et sa garde le vérifie au
      // caractère près. Ma première réécriture disait « Rien à faire aujourd’hui » — même sens,
      // mais elle faisait rougir le critère qui protège précisément ce message.
      + '<div class="zn-hero-rest">\u{1F60C} Repos aujourd’hui — c’est là que le travail des jours passés devient de la forme.</div>'
      + (nxt ? '<div class="zn-hero-sub">Prochaine séance : ' + nxt.jour + " " + fmtDay(nxt.date) + " · "
        + nxt.sessions.filter((s) => s.d !== "rs").map((s) => s.name).join(", ") + "</div>" : "")
      + '<div class="zn-disc-chip"><span>' + DISC.rs.ic + " " + DISC.rs.label + "</span></div>";
  }
  // `zn-hero*` sont des classes ADDITIVES (reskin R-ZENNA, css/zenna-today.css, scopé à
  // `body.theme-zenna`) : sans cette feuille, elles ne font rien et le contenu reste lisible
  // dans la carte générique — le repli est l'absence d'effet, jamais un écran vide.
  return '<div class="card zn-hero">' + entete + why + corps + "</div>" + detail;
}
