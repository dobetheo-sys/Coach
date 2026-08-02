// Carte « 🎯 Ton chrono visé » — le RAISONNEMENT INVERSE, rendu à l'athlète.
//
// Le moteur construit en avant : d'où tu pars, jusqu'où la courbe peut monter. Cette carte
// prend le problème par l'autre bout — un chrono visé, et ce que ça exige à reculons.
//
// CE QU'ELLE NE FAIT PAS, ET C'EST SA RAISON D'ÊTRE. Elle ne touche à AUCUNE séance. Le chrono
// saisi n'entre dans aucune entrée de `buildPlan` : le plan est construit d'abord, la carte le
// lit, et le verdict s'écrit par-dessus. Laisser un objectif de temps augmenter une charge,
// ce serait la priorité n°5 du manifeste qui écrase les quatre premières — et c'est exactement
// ce qu'un athlète motivé ferait à notre place si on lui en donnait le bouton.
//
// La saisie vit ICI plutôt qu'au Profil : la question (« est-ce que mon objectif tient ? ») et
// sa réponse doivent être au même endroit. Un champ au Profil et un verdict trois onglets plus
// loin, c'est deux écrans pour une seule idée.
import { $, S, ebSave, esc } from "../state.js";

const V = {
  atteignable: { pic: "🟢", titre: "Atteignable" },
  juste: { pic: "🟠", titre: "Juste — sans marge" },
  "hors-horizon": { pic: "🟠", titre: "Pas d'ici là" },
  "hors-modele": { pic: "⚪️", titre: "Au-delà de ce que le modèle sait chiffrer" },
  indeterminable: { pic: "⚪️", titre: "Pas assez d'éléments" },
};

/** Le sport et l'état sous lesquels la carte a un sens. Ailleurs : elle n'existe pas. */
export function feasibilityApplies() {
  return S.sport === "run" && !!globalThis.EBV2 && typeof globalThis.EBV2.feasibility === "function";
}

export function feasibilityCardHTML(plan) {
  if (!feasibilityApplies()) return "";
  const saisi = String(S.answers.target_time || "");
  // U12 — LA CARTE SE REPLIE TANT QU'ELLE N'A RIEN À DIRE.
  //
  // L'onglet 🗓 Plan fait déjà 7,7 écrans de défilement sur un téléphone ; cette carte y ajoutait
  // 462 px (7 % de l'onglet) pour poser une question OPTIONNELLE à laquelle la plupart des gens
  // ne répondront pas. Une fonctionnalité facultative n'a pas à coûter de la place à ceux qui ne
  // l'utilisent pas. Ouverte d'office dès qu'un chrono est saisi : à ce moment-là, elle a une
  // réponse à donner, et la replier serait cacher ce qu'on vient de demander.
  let html = '<details class="card" id="rvCard"' + (saisi ? " open" : "") + '>'
    + '<summary><span class="eyebrow">Ton objectif</span><h2 style="display:inline">🎯 Ton chrono visé</h2></summary>'
    + '<div class="why">Optionnel. Si tu vises un temps précis, on te dit franchement ce qu’il exige — '
    + "et si l’horizon qui te reste peut le produire. <b>Ta réponse ne change pas ton plan</b> : "
    + "l’entraînement se construit sur ce que ton corps peut encaisser, jamais sur ce qu’on aimerait afficher.</div>"
    + '<div class="q"><span class="q-label">Chrono visé (h:mm:ss ou mm:ss)</span>'
    + '<input type="text" inputmode="numeric" data-input="target_time" id="rvIn" value="' + esc(saisi) + '" placeholder="ex. 3:30:00"></div>';

  let res = null;
  try { if (saisi) res = globalThis.EBV2.feasibility("run", S.answers, plan); } catch (e) { res = null; }
  if (saisi && !res) {
    html += '<div class="warn">Ce chrono n’est pas lisible. Écris-le en <b>h:mm:ss</b> (3:30:00) '
      + "ou en <b>mm:ss</b> (46:30).</div>";
  } else if (res) {
    const v = V[res.verdict] || V.indeterminable;
    html += '<div class="warn" style="background:var(--bg2)"><b>' + v.pic + " " + v.titre + "</b><br>"
      + md(res.human) + "</div>";
    if (res.decisions && res.decisions.length) {
      html += "<details><summary>Comment on arrive là</summary><div style=\"margin-top:6px\">";
      res.decisions.forEach((d) => {
        html += '<div style="margin:6px 0"><b>' + esc(d.what) + "</b> : " + esc(d.val)
          + '<div class="why">' + md(d.why) + "</div></div>";
      });
      html += "</div></details>";
    }
  }
  return html + "</details>";
}

/**
 * R11.1 — UN SEUL ÉCHAPPEUR. Ma première écriture en redéfinissait un ici (`escape2`), alors
 * que `state.js` exporte `esc` depuis l'origine — exactement la règle « jamais deux fois la
 * même table » que ce dépôt applique partout, enfreinte dans le code qui venait de l'invoquer.
 * On échappe TOUT avec la fonction commune, PUIS on rend le gras : le `<b>` ne peut donc venir
 * que du `**` du moteur, jamais d'un `<` qui aurait survécu.
 */
function md(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

/**
 * La saisie se valide au `change` (sortie de champ / Entrée), jamais à chaque frappe : re-rendre
 * l'onglet à chaque caractère ferait perdre le focus et afficherait un verdict sur « 3: ».
 */
export function bindFeasibility(rerender) {
  const el = $("rvIn");
  if (!el) return;
  el.onchange = () => {
    const v = el.value.trim();
    if (v === String(S.answers.target_time || "")) return;
    S.answers.target_time = v;
    ebSave();
    rerender();
  };
}
