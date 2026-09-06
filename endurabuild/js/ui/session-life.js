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
import { znZoneSegs, znZoneProfile, znConfetti, znXpFloat, znToast } from "./zenna-motion.js";
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
  // O-56 §2 — UNE NAGE CONTINUE VALIDÉE EST UNE RÉFÉRENCE MESURÉE : elle entre au journal.
  //
  // Le bloc de continuité est le bloc ÉPINGLÉ (`bnd.pinned` : « la distance EST le stimulus »,
  // leçon I14) — c'est exactement la grandeur qu'on cherche à créditer, et elle est déjà marquée
  // dans le plan, donc rien à deviner. `syncRefsFromTests` la promeut ensuite vers
  // `longest_swim_m`, que le moteur lit depuis B-17 : aucune entrée nouvelle, aucun état entre
  // deux builds, aucun couplage aux coordonnées d'un plan.
  //
  // `source: "seance"` la distingue d'une saisie DÉLIBÉRÉE (profil, retest) : la règle d'O-25
  // — « une valeur saisie bat tout import du même jour » — continue donc de valoir, et une
  // séance validée ne peut pas écraser une correction que l'athlète vient de faire à la main.
  //
  // LES PALIERS DE B-17 SONT DÉJÀ LE TEST : le plan prescrit une continue à 2 000 m, l'athlète
  // la fait, sa capacité démontrée vaut 2 000, le palier suivant peut viser plus haut. Le
  // mécanisme de mesure existe et ne demande AUCUNE question de plus.
  if (checking && sess.d === "sw") {
    const cont = (sess.steps || []).find((st) => st.role === "body" && st.bnd && st.bnd.pinned && st.distanceM != null);
    if (cont) {
      const m = (cont.reps || 1) * cont.distanceM;
      if (!Array.isArray(S.answers.tests)) S.answers.tests = [];
      S.answers.tests.push({ type: "swimContinuity", value: m, date: todayISO(), source: "seance" });
      ebSave();
    }
  }
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
  // REFONTE 20a/20b (06/09/2026) — le bandeau porte sa SORTE en classe (`zn-bandeau--race`,
  // `--eve`, `--done`, `--taper`), dérivée du jeton de fond qu'il demande déjà : sur 🎯 Aujourd'hui
  // (zenna-aujourdhui.css, sous `.zn-today`) il devient un creux à pastille au style 20x ; sur
  // 📅 Semaine et 🗓 Plan, qui appellent aussi cette fonction, le fond inline reste et rien ne
  // bouge — les classes sont additives.
  const B = (bg, txt) => '<div class="warn zn-bandeau zn-bandeau--' + ((bg.match(/--zn-bg-(\w+)/) || [])[1] || "info") + '" style="background:' + bg + ';font-weight:600"><i class="zn-bandeau-dot" aria-hidden="true"></i><div>' + txt + "</div></div>";
  if (raceDates.includes(today))
    return B("var(--zn-bg-race,#ffe3e0)", "\u{1F3C1} <b>Jour de course.</b> Tout le travail est fait — départ prudent, finis fort. Bonne course !");
  if (raceDates.includes(tomorrow))
    return B("var(--zn-bg-eve,#fff3d6)", "\u{1F389} <b>Veille de course.</b> Objectif du jour : des jambes fraîches. Repos, hydratation, matériel préparé — demain tu récoltes.");
  // ── PLAN TERMINÉ (refonte, chantier 3) ──
  //
  // La course est passée : il n'y a plus de séance à piloter, et l'app continuait pourtant à
  // rendre le même écran qu'un mardi de semaine 4 — un héros, une charge, une prédiction pour
  // une échéance qui n'existe plus. L'état manquant n'est pas « vide », il est TERMINÉ.
  //
  // CE QUE CE BANDEAU NE FAIT PAS, et c'est le point de la maquette : il ne pousse pas à
  // repartir. Pas de « Créer un nouveau plan », pas de « Prêt pour la suite ? ». Quelqu'un qui
  // vient de courir son objectif n'a pas besoin qu'on lui vende la saison prochaine le
  // lendemain matin. On dit ce qui a été fait, on nomme le chemin pour la suite SANS l'ouvrir
  // (les réglages du Plan le portent déjà, R23.12b — un seul chemin), et on se tait.
  const fin = planEndDate(plan, S.answers);
  if (fin && today > fin) {
    const done = S.answers && S.answers.done ? Object.keys(S.answers.done).length : 0;
    return B("var(--zn-bg-done,#e2f3ec)",
      "\u{1F3C5} <b>Plan terminé.</b> " + plan.totalWeeks + " semaines"
      + (done ? ", " + done + " séance" + (done > 1 ? "s" : "") + " validée" + (done > 1 ? "s" : "") : "")
      + " — c’est fait. Rien à faire aujourd’hui. Quand tu voudras repartir, un nouveau plan se crée depuis "
      + "les réglages de l’onglet Plan.");
  }
  let taperStart = null;
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (!taperStart && (d.phaseId === "taper" || (w.phase && w.phase.id === "taper"))) taperStart = d.date; }));
  if (taperStart && taperStart === today)
    return B("var(--zn-bg-taper,#e9defc)", "✂️ <b>L’affûtage commence.</b> Le volume descend, la forme monte — le plus dur est derrière toi. Ne rajoute rien.");
  // ── SEMAINE D'AFFÛTAGE, LES JOURS SUIVANTS (refonte, chantier 3) ──
  //
  // Le bandeau ci-dessus ne se montrait que le PREMIER jour de l'affûtage. Or c'est toute la
  // semaine qui pose problème : les séances sont courtes, l'athlète se sent frais, et le doute
  // (« l'app s'est trompée », « je vais perdre ma forme ») arrive le mercredi, pas le lundi.
  // La semaine s'annonce donc chaque jour pour ce qu'elle est — plus discrètement que son
  // premier jour, qui garde sa célébration : répéter le même ton six fois l'userait.
  const wAuj = plan.weeks.find((w) => w.days.some((d) => d.date === today));
  const estAffutage = !!wAuj && wAuj.days.some((d) => d.phaseId === "taper")
    || (!!wAuj && !!wAuj.phase && wAuj.phase.id === "taper");
  if (estAffutage)
    return B("var(--zn-bg-taper,#e9defc)", "✂️ <b>Semaine d’affûtage.</b> Court, c’est normal — et c’est le travail. La forme se révèle en retirant de la charge, pas en en ajoutant.");
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
// `discBadgeHTML` VIVAIT ICI et a été RETIRÉE le 12/08/2026 (fondateur, brief « badge dupliqué »).
// Elle rendait la tuile pleine de 38 px posée dans la carte « Le détail de la séance ». Elle
// répondait au retour du 07/08 (« la séance du jour, plus visuelle ») — mais ce besoin est déjà
// couvert par la pile `.zn-disc-chip` du héros, qui nomme la discipline en toutes lettres ; la
// tuile n'en était que la répétition, 79 px plus bas.
// Retirée plutôt que laissée en place inutilisée : une fonction morte qui rend un badge est une
// invitation à la rebrancher. Ce que la carte de détail apporte et que le héros n'a pas, c'est la
// BARRE DE ZONES — elle, elle reste.
//
// REFONTE 18a (06/09/2026) — L'ANNEAU DE FORME (`formRingSVG`) QUITTE LE HÉROS. Le canevas 18a
// ne le porte pas : la forme du jour vit dans la section « TON ÉTAT DU JOUR » (une ligne, une
// jauge, la couleur du verdict), rendue par `etatDuJourHTML` ci-dessous. Le CONTRAT de données
// est conservé au caractère près — `.zn-form-val > span[data-val]` porte l'énergie déclarée au
// check-in, la MÊME valeur que lit le moteur (R11.1), et smoke-zenna §2 la relit à sa valeur
// finale en reduced-motion. Ce qui change est la forme (une jauge horizontale à la place d'un
// anneau), pas la donnée ni son point de lecture.

/** Le grand chiffre du héros : minutes en dessous d'1 h 30, heures au-delà — au-delà, « 300 MIN »
 *  se lit moins bien que « 5 H00 », et c'est l'écran qu'on regarde à moitié réveillé. Le nombre
 *  reste un ENTIER dans les deux cas, pour que le compteur puisse l'animer. */
function heroMetric(min) {
  const m = Math.round(min || 0);
  if (!m) return null;
  const t = Math.round(m);   // un flottant fuirait ses décimales dans « H30.5 » (famille « 1'60 »)
  if (t < 90) return { val: t, unit: "min" };
  return { val: Math.floor(t / 60), unit: "h" + String(t % 60).padStart(2, "0") };
}
/** « 1h02 » en display — la durée totale d'une séance (18a). */
function dureeDisplay(min) {
  const t = Math.round(min || 0);
  if (t < 60) return '<span class="zn-det-total">' + t + '<span class="zn-det-total-u">′</span></span>';
  return '<span class="zn-det-total">' + Math.floor(t / 60) + '<span class="zn-det-total-u">h</span>' + String(t % 60).padStart(2, "0") + "</span>";
}
const _COULEUR = { verte: "vert", orange: "orange", rouge: "rouge" };

/** La phrase de verdict du héros (18a : « Séance maintenue telle quelle : ton point du matin est
 *  vert. » ; 6b : ce qui change et sur quelle base). Le libellé d'action et le niveau sont ceux
 *  du moteur (`_verdictLbl`, `v.level`), les motifs (`v.drivers`) aussi — on les met en phrase,
 *  on n'en invente aucun. */
function verdictPhrase(res) {
  const v = res.adjustment.verdict, act = res.adjustment.action;
  const lbl = _verdictLbl[act] || act;
  const tete = lbl.charAt(0).toUpperCase() + lbl.slice(1);
  const couleur = _COULEUR[v.level] || v.level;
  if (act === "keep") return tete + " telle quelle : ton point du matin est " + couleur + ".";
  return tete + " : ton point du matin est " + couleur + (v.drivers && v.drivers.length ? " — " + v.drivers.join(" · ") : "") + ".";
}

/** 18a — LE DÉROULÉ À RAIL. Chaque ligne est un bloc du moteur (`session.steps`, via
 *  `znZoneSegs` — donc `ZONE_LEVEL`, jamais une seconde table) : sa durée à gauche, colorée par
 *  sa classe, un rail dont l'épaisseur suit l'intensité, son nom, et la CONSIGNE — qui est le
 *  segment de texte que `renderSess` a produit pour ce bloc (`techOf` coupé sur le séparateur
 *  qu'il pose déjà, la technique d'U16). `renderSess` reste le seul producteur de texte : on
 *  n'écrit ici aucune consigne, on la POSE à côté du bloc qu'elle décrit.
 *  Quand le nombre de segments de texte ne correspond pas au nombre de blocs (un rendu qui
 *  regroupe, ou qui ajoute la note « ⏱ dont ~N min de récup »), les segments sont rendus tels
 *  quels, sans rail : on ne devine pas l'appariement. La note ⏱ vit toujours en pied. */
function railHTML(session, segs) {
  const tech = techOf(session);
  const parts = tech ? tech.split(" · ").map((x) => x.trim()).filter(Boolean) : [];
  const notes = parts.filter((x) => /^⏱/.test(x));
  const corps = parts.filter((x) => !/^⏱/.test(x));
  const cls = (l) => l >= 4 ? "dur" : l === 3 ? "mod" : "facile";
  const duree = (x) => {
    // la grandeur de la prescription : minutes pour un bloc en temps, mètres pour un bloc en distance
    if (/m$/.test(x.grandeur) && !/min$/.test(x.grandeur)) return x.grandeur.replace(/^(\d+)×/, "$1×");
    return Math.round(x.min) + "′";
  };
  let rows = "";
  if (segs.length && segs.length === corps.length) {
    rows = segs.map((x, i) => '<div class="zn-rail-row ' + cls(x.lvl) + ' lvl-' + x.lvl + '">'
      + '<div class="zn-rail-dur">' + duree(x) + '</div><div class="zn-rail-track"><i></i></div>'
      + '<div class="zn-rail-body"><div class="zn-rail-nom">' + x.mot + (x.role === "body" && x.grandeur ? '<span class="zn-rail-q"> · ' + x.grandeur + "</span>" : "") + "</div>"
      + '<div class="zn-rail-txt">' + corps[i] + "</div></div></div>").join("");
  } else {
    rows = corps.map((t) => '<div class="zn-rail-row libre"><div class="zn-rail-dur"></div><div class="zn-rail-track"><i></i></div>'
      + '<div class="zn-rail-body"><div class="zn-rail-txt">' + t + "</div></div></div>").join("");
  }
  return '<div class="zn-rail">' + rows + "</div>"
    + (notes.length ? '<div class="zn-rail-note">' + notes.join(" · ") + "</div>" : "");
}

/** 18a — « 1h02 · 58′ FACILE · 4′ DUR » : la durée totale du moteur et la ventilation du
 *  CLASSIFICATEUR du moteur (`EBV2.sessionSplit`, celui de la courbe de charge — jamais une
 *  seconde règle). Le modéré s'affiche quand il existe : le moteur compte trois classes, le
 *  canevas n'en dessinait que deux sur une séance qui n'en avait que deux. */
function repartitionHTML(session, totalMin) {
  let sp = null;
  try { sp = globalThis.EBV2 && globalThis.EBV2.sessionSplit ? globalThis.EBV2.sessionSplit(session, S.answers) : null; } catch (e) { sp = null; }
  const c = (v, k, lab) => v > 0.5 ? '<div class="zn-det-part ' + k + '"><div class="zn-det-part-v">' + Math.round(v) + "′</div><div class=\"zn-det-part-l\">" + lab + "</div></div>" : "";
  return '<div class="zn-det-head">' + dureeDisplay(totalMin)
    + (sp ? '<div class="zn-det-parts">' + c(sp.easyMin, "facile", "facile") + c(sp.modMin, "mod", "modéré") + c(sp.hardMin, "dur", "dur") + "</div>" : "")
    + "</div>";
}
/** L'icône « 💡 » du canevas (une ampoule au trait) — décorative, la note du moteur est le texte. */
const SVG_NOTE = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.5a5 5 0 0 1 3 9v2H7v-2a5 5 0 0 1 3-9z"/><path d="M8.5 17h3"/></svg>';

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
  const actives = res.sessions.filter((x) => x.d !== "rs");

  // ── REFONTE 18a (06/09/2026) — LE HÉROS EST LE RELIEF DE L'ÉCRAN, ET IL N'Y EN A QU'UN ──
  //
  // Le canevas : eyebrow « AUJOURD'HUI » à gauche, « COURSE · Z2 » à droite, le titre display,
  // le grand chiffre, la ligne mono « puis … », un filet, la phrase de verdict. Le verdict n'est
  // plus une puce ni un anneau : c'est une PHRASE (« Séance maintenue telle quelle : ton point
  // du matin est vert. »), et la forme du jour vit dans sa propre section plus bas.
  // La DATE reste dans l'eyebrow (« Aujourd'hui · Mar · 11/08 ») : smoke-dates la lit dans la
  // première carte de l'écran, et c'est aussi le seul endroit où l'athlète voit la date DU
  // PLAN, pas celle de l'appareil — un décalage de fuseau se verrait ici (R7).
  // `.zn-disc-chip` GARDE son nom : c'est « le seul indicateur de discipline de l'écran » que
  // smoke-zenna §1bis mesure ; il change de place (à droite de l'eyebrow) et de mot (« Vélo ·
  // Tempo », discipline · zone dominante — lue sur les segments, jamais une table à part).
  const eyebrow = "Aujourd’hui" + (res.jour ? " · " + res.jour : "") + " · " + fmtDay(todayIso);

  let corps = "", detail = "";
  if (actives.length) {
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
    const tech = techOf(primary);
    const suite = actives.slice(1).map((x) => x.name).join(" · ");
    const segsP = znZoneSegs(primary, _blkMin);
    const corpsSegs = segsP.filter((x) => x.role === "body");
    const dominant = corpsSegs.length ? corpsSegs.reduce((m, x) => (x.min > m.min ? x : m), corpsSegs[0]) : null;
    const disc = DISC[primary.d] || DISC.rn;
    corps = '<div class="zn-hero-top"><div class="eyebrow">' + eyebrow + "</div>"
      + '<div class="zn-disc-chip"><span>' + disc.label + (dominant && dominant.mot ? " · " + dominant.mot : "") + "</span></div></div>"
      + '<div class="zn-hero-title">' + primary.name + "</div>"
      + (metric ? '<div class="zn-hero-metric"><span class="zn-hero-num" data-val="' + metric.val + '">' + metric.val + '</span><span class="zn-hero-unit">' + metric.unit + "</span></div>" : "")
      + (suite ? '<div class="zn-hero-sub">puis ' + suite + "</div>" : (tech ? '<div class="zn-hero-sub">' + tech + "</div>" : ""))
      + '<div class="zn-hero-verdict">' + verdictPhrase(res) + "</div>";

    // ── LE DÉTAIL DE LA SÉANCE, À NU (18a) : intertitre, durée + ventilation, profil de zones
    // (8a), déroulé à rail, note du moteur. Une section par séance active — sur un jour à DEUX
    // séances, chacune a la sienne, la première comprise (O-60 : c'était elle qui n'avait son
    // déroulé nulle part). `data-seance-detail` marque chaque section pour smoke-zenna
    // §1quater, qui vérifie la PROPRIÉTÉ « chaque séance du jour a son déroulé à l'écran ».
    // `gd-why` EST conservée sur la note : c'est la classe sémantique du « pourquoi » d'une
    // séance dans tout le produit, et `smoke-r4` §5 la cherche pour vérifier que la
    // justification est visible SANS rien déplier — elle l'est, à nu sous le déroulé.
    detail = actives.map((x, i) => {
      const segs = znZoneSegs(x, _blkMin);
      const wx = whyOf(x);
      const d = DISC[x.d] || DISC.rn;
      const min = actives.length === 1 ? totalMin : (segs.reduce((t, s) => t + s.min, 0) || 0);
      return '<div class="zn-sec zn-sec-detail"><span>' + (i === 0 ? "Le détail de la séance" : "Et ensuite") + '</span><i></i><span>' + d.label + "</span></div>"
        + '<div class="zn-detail" data-seance-detail="' + x.name.replace(/"/g, "&quot;") + '">'
        + (actives.length > 1 ? '<div class="zn-detail-nom" data-seance-nom>' + x.name + "</div>" : "")
        + repartitionHTML(x, min)
        + znZoneProfile(x, _blkMin)
        + railHTML(x, segs)
        + (wx ? '<div class="gd-why zn-detail-note">' + SVG_NOTE + "<span>" + wx + "</span></div>" : "")
        + "</div>";
    }).join("");
  } else {
    // 19a — LE REPOS EST UNE BONNE NOUVELLE, PAS UN ÉCRAN VIDE : le relief le dit en display,
    // explique à quoi il sert (la phrase U8, gardée mot pour mot — sa garde la vérifie au
    // caractère près, et elle avait vécu morte derrière un « OFF » sec pendant des mois), et
    // nomme ce qu'il prépare : la prochaine séance, datée.
    const upcoming = [];
    plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date > todayIso && d.sessions.some((s) => s.d !== "rs")) upcoming.push(d); }));
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const nxt = upcoming[0];
    const nxtS = nxt ? nxt.sessions.filter((s) => s.d !== "rs") : [];
    const nxtMin = nxtS.reduce((t, s) => t + (s.min || 0), 0);
    corps = '<div class="zn-hero-top"><div class="eyebrow">' + eyebrow + "</div>"
      + '<div class="zn-disc-chip"><span>Prescrit par le plan</span></div></div>'
      + '<div class="zn-hero-title">Repos</div>'
      + '<div class="zn-hero-rest">\u{1F60C} Repos aujourd’hui — c’est là que le travail des jours passés devient de la forme.</div>'
      + (nxt ? '<div class="zn-hero-next"><i></i><div><div class="zn-hero-next-lab">Ce qu’il prépare</div>'
        + '<div class="zn-hero-next-val">Prochaine séance : ' + nxt.jour + " " + fmtDay(nxt.date) + " · " + nxtS.map((s) => s.name).join(", ")
        + (nxtMin ? ", " + (heroMetric(nxtMin) ? heroMetric(nxtMin).val + " " + heroMetric(nxtMin).unit : "") : "") + "</div></div></div>" : "");
  }
  // `zn-hero*` sont des classes ADDITIVES (reskin R-ZENNA, css/zenna-today.css, scopé à
  // `body.theme-zenna`) : sans cette feuille, elles ne font rien et le contenu reste lisible
  // dans la carte générique — le repli est l'absence d'effet, jamais un écran vide.
  // `zn-hero--repos` : le relief d'un jour de repos est une SURFACE (19a), pas l'orange — l'orange
  // est le fait du jour, et ce jour-là le fait est qu'il n'y a rien à faire.
  return '<div class="card zn-hero zn-relief' + (actives.length ? "" : " zn-hero--repos") + '">' + corps + "</div>" + detail;
}

/** 18a — « TON ÉTAT DU JOUR » : la ligne « Forme du jour · VERTE · 80 », la jauge, la sous-ligne
 *  des motifs du moteur. Tout vient de ce que le check-in a déclaré et de ce que l'ajusteur en a
 *  dit (`v.level`, `v.drivers`, `readiness.energy`) — aucun chiffre fabriqué. La ligne mène au
 *  panneau « Modifier ma forme du jour » juste en dessous (rendu par tab-today.js).
 *  `.zn-form-val > span[data-val]` : le contrat que smoke-zenna §2 relit (voir plus haut). */
export function etatDuJourHTML(plan, todayIso) {
  if (!globalThis.EBV2 || !globalThis.EBV2.adjustToday) return "";
  const r = S.answers.readiness || {};
  const snap = Object.assign({}, r, { date: todayIso });
  let res;
  try { res = globalThis.EBV2.adjustToday(S.sport, S.answers, snap); } catch (e) { return ""; }
  const v = res.adjustment.verdict;
  const energie = r.energy != null && isFinite(r.energy) ? Math.max(0, Math.min(100, +r.energy)) : null;
  const niveau = (v.level || "").charAt(0).toUpperCase() + (v.level || "").slice(1);
  const sous = [];
  if (r.sleepHours != null && isFinite(r.sleepHours)) sous.push("Sommeil " + Math.floor(r.sleepHours) + " h " + String(Math.round((r.sleepHours % 1) * 60)).padStart(2, "0"));
  (v.drivers || []).forEach((d) => sous.push(d));
  return '<div class="zn-row zn-etat-row">'
    + '<div class="zn-etat-main"><div class="zn-etat-line"><span class="zn-etat-nom">Forme du jour</span>'
    + '<span class="zn-form-val zn-etat-val lvl-' + v.level + '">' + niveau + (energie != null ? ' · <span data-val="' + Math.round(energie) + '">' + Math.round(energie) + "</span>" : "") + "</span></div>"
    + (energie != null ? '<div class="zn-gauge lvl-' + v.level + '"><i class="grow-x" style="width:' + Math.round(energie) + '%"></i></div>' : "")
    + (sous.length ? '<div class="zn-etat-sous">' + sous.join(" · ") + "</div>" : "")
    + "</div></div>";
}
