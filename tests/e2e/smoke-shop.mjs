// Le canal de vente (abonnement de ravitaillement récurrent, gels/boissons) n'avait AUCUNE
// garde E2E depuis sa livraison (PR #29/#31/#35) — cette suite couvre le mécanisme existant
// (proposition basée sur le besoin calculé des séances à venir) ET son extension du
// 08/08/2026 (retour utilisateur : « suggérer d'être accompagné avec nos gels dès la fin du
// plan ») — la carte ne disparaissait plus discrètement, elle disparaissait TOTALEMENT une
// fois le plan terminé, exactement le moment où la question a un sens.
import { startServer, launchBrowser, makeReporter, runnerStateV1 } from "./harness.mjs";

const PORT = 8598;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

async function ouvrirNutrition(state) {
  await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("eb_state_v1", JSON.stringify(s)); }, state);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.click('[data-tab="outils"]');
  await page.waitForTimeout(400);
}

// ---- 1. Plan en cours, avec des séances qui ont besoin de glucides : la carte se propose --
{
  const st = runnerStateV1({ format: "70.3" }); // triathlon long : au moins une séance a besoin de gels
  st.sport = "tri";
  await ouvrirNutrition(st);
  const count = await page.locator("#shopCard").count();
  ok(count === 1, "un plan en cours avec un besoin calculé propose la carte d'abonnement");
  const txt = count ? await page.locator("#shopCard").textContent() : "";
  ok(/S’abonner au ravitaillement|s.abonner au ravitaillement/i.test(txt), "libellé standard (pas le libellé « fin de plan »)");
}

// ---- 2. Retour utilisateur (08/08/2026) : plan TERMINÉ, jamais abonné → la carte reste,
// avec un cadrage différent, et s'ouvre d'office (pas besoin de la chercher) -----------------
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05"; // très en amont : la course est passée depuis longtemps
  await ouvrirNutrition(st);
  const card = page.locator("#shopCard");
  ok(await card.count() === 1, "la carte reste visible une fois le plan terminé (elle disparaissait avant ce lot)");
  // R-ZENNA — ce critère lisait l'attribut `open` d'un `<details>`. La composition de la
  // maquette n'en est plus un : la carte est un bloc, et « ouverte d'office » se mesure
  // désormais sur ce qui est RÉELLEMENT à l'écran sans avoir rien touché — le devis et le
  // bouton d'activation. C'est l'INTENTION du critère (« pas de 4e clic pour la trouver »),
  // et elle est mieux servie ainsi : un attribut peut être présent sur une carte vide.
  ok(await card.locator("#shopOk").count() === 1,
    "elle s'ouvre d'office : le bouton d'activation est là sans avoir rien touché (pas de 4e clic pour la trouver)");
  ok(await card.locator(".seg [data-cadence]").count() >= 2,
    "le choix de cadence est visible d'emblée, pas derrière un repli");
  const txt = await card.textContent();
  ok(/touche à sa fin/.test(txt), "le texte reflète la fin de plan, pas un besoin calculé sur des séances qui n'existent plus");
  ok(/Rester accompagné/.test(txt), "le titre invite à CONTINUER l'accompagnement, pas à s'abonner comme si de rien n'était");
}

// ---- 3. Déjà abonné (actif) : pas de reproposition, la carte de gestion normale s'affiche --
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05";
  st.answers.shopSubscription = { startedAt: "2026-01-10", cadence: "hebdo", flavor: "neutre", format: "gel individuel" };
  await ouvrirNutrition(st);
  const txt = await page.locator("#shopCard").textContent();
  // R-ZENNA — ce critère lisait le libellé « Abonnement ravitaillement », que la composition
  // de la maquette a renommé. Il est réécrit sur ce qu'il VOULAIT dire (« gestion, pas
  // proposition ») plutôt que sur le nouveau texte : un critère calé sur un libellé se
  // contente de photographier ce qu'on vient d'écrire. La gestion se reconnaît à ses ACTIONS.
  ok(/Abonnement actif/i.test(txt), "abonné actif : la carte annonce l'état de l'abonnement");
  ok(await page.locator("#shopCard #shopEdit").count() === 1
    && await page.locator("#shopCard #shopAskCancel").count() === 1,
    "…et porte les actions de GESTION (modifier / résilier)");
  ok(await page.locator("#shopCard #shopOk").count() === 0 && await page.locator("#shopCard #shopExpand").count() === 0,
    "…pas la proposition : ni bouton d'activation, ni invite à découvrir l'offre");
  ok(!/touche à sa fin/.test(txt), "aucune reproposition « fin de plan » tant que l'abonnement est actif");
}

// ---- 4. R-ZENNA : la composition de la maquette n'a PAS emporté la restriction ------------
// `shopPromptDue` énonce « le tunnel se propose une fois puis se tait 4 semaines — jamais un
// rappel permanent ». L'ancienne carte la tenait par l'attribut `open` de son `<details>` ;
// la composition de la maquette n'en est plus un, et ne dessine QUE l'état déplié. Sans état
// dédié, une carte de VENTE resterait dépliée en permanence dans l'onglet. Ces critères
// mesurent les deux moitiés : elle se tait, et elle se rouvre d'un geste.
{
  const st = runnerStateV1({ format: "70.3" });
  st.sport = "tri";
  st.answers.weight = "72";
  st.answers.plan_start = "2026-08-10"; // plan tout neuf : l'ancre des 28 jours n'est pas échue
  await ouvrirNutrition(st);
  const card = page.locator("#shopCard");
  ok((await card.getAttribute("class") || "").includes("shop-card-min"),
    "plan récent, proposition pas encore due : la carte est REPLIÉE (pas de rappel permanent)");
  ok(await page.locator("#shopCard .seg [data-cadence]").count() === 0,
    "repliée, elle ne déroule ni devis ni sélecteur — juste de quoi la rouvrir");
  const rouvrable = await page.locator("#shopExpand").count() === 1;
  ok(rouvrable, "…et un bouton la rouvre : consulter reste gratuit");

  // Le clic est CONDITIONNEL. Sans ça, casser la restriction fait mourir la suite sur un
  // TimeoutError AVANT `report()` : code de sortie 1, mais pas une ligne de verdict — le
  // défaut d'instrument de R22b/H-1b, refait ici. Une garde doit RAPPORTER, pas mourir.
  if (rouvrable) {
    await page.click("#shopExpand");
    await page.waitForTimeout(500);
    ok(await page.locator("#shopCard .seg [data-cadence]").count() >= 2, "dépliée, la composition complète est là");
    const ancre = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("eb_state_v2") || "{}");
      const p = (s.plans || [])[s.active || 0] || {};
      return ((p.answers || {}).shopSubscription || {}).lastPromptAt || null;
    });
    ok(!!ancre, "déplier REPOSE l'ancre des 28 jours (" + ancre + ") — c'est le signal « proposition vue »");
  }
}

// ---- 5. R7 : aucune date ISO brute à l'écran ----------------------------------------------
// Première écriture de ce critère : posé sur la carte de PROPOSITION, où la seule date passe
// par le libellé du bouton. Casser `fmtDay` sur l'échéance le laissait VERT — il nommait « les
// dates affichées » et en mesurait une seule, dans l'état où les autres n'existent pas. Il
// porte donc sur l'état ABONNÉ, celui qui affiche l'échéance ET la date de résiliation.
{
  const st = runnerStateV1({ format: "5k", history: "reprise", vol_max: "3" });
  st.answers.plan_start = "2026-01-05";
  st.answers.shopSubscription = { startedAt: "2026-01-10", cadence: "hebdo", flavor: "neutre", format: "gel individuel" };
  await ouvrirNutrition(st);
  // PAS de `\b` autour du motif : `textContent` concatène les nœuds SANS séparateur, donc la
  // carte rend « Prochaine échéance2026-08-15 » — entre le « e » et le « 2 » il n'y a aucune
  // frontière de mot, et le critère restait vert sur la date brute qu'il existe pour trouver.
  // Vérifié : avec `\b`, la cassure K3 passait. Une hypothèse sur la forme du texte mesuré,
  // pas sur la propriété — la même famille d'erreur que ce dépôt paie régulièrement.
  const ISO = /20\d\d-\d\d-\d\d/;
  const t1 = await page.locator("#shopCard").textContent();
  ok(!ISO.test(t1), "abonnement actif : l'échéance est en date lisible, pas en ISO brut"
    + (ISO.test(t1) ? " — reste : " + t1.match(ISO)[0] : ""));

  await page.click("#shopAskCancel");
  await page.waitForTimeout(300);
  await page.click("#shopCancel");
  await page.waitForTimeout(500);
  const t2 = await page.locator("#shopCard").textContent();
  ok(/Résiliation prévue le/.test(t2), "la résiliation programmée est annoncée sur la carte");
  ok(!ISO.test(t2), "…et sa date aussi est lisible" + (ISO.test(t2) ? " — reste : " + t2.match(ISO)[0] : ""));
}

// ---- 6. LE TUNNEL SE TRAVERSE — le premier geste ne referme plus la carte ------------------
// Le défaut que ce bloc garde : la carte s'ouvre d'elle-même quand `shopPromptDue` est vrai,
// et les gestes sur la carte reposaient `lastPromptAt`, ce qui rendait `shopPromptDue` FAUX au
// rendu suivant. `shopExpanded` n'étant posé que par le bouton « Voir ce que ça donne », la
// carte se refermait au premier choix : mesuré, 811 px → 190 px, plus de devis, plus de bouton
// d'activation. Il était donc IMPOSSIBLE de s'abonner par le chemin où le produit propose
// lui-même l'offre. Ce critère traverse le tunnel en entier, comme un athlète le ferait.
{
  const st = runnerStateV1({ format: "70.3", weight: "72" });
  st.sport = "tri";
  st.answers.plan_start = "2026-06-01"; // plan EN COURS, ancre des 28 jours échue → carte ouverte
  await ouvrirNutrition(st);
  const etat = async () => page.evaluate(() => {
    const c = document.getElementById("shopCard");
    return c ? (c.className.includes("shop-card-min") ? "repliee" : "depliee") : "absente";
  });
  // LES CLICS SONT CONDITIONNELS, ET C'EST LE POINT. Vérifié en cassant le correctif : la
  // carte se referme, `[data-flavor]` n'existe plus, `page.click` meurt sur un TimeoutError
  // AVANT `report()` — code de sortie 1, mais AUCUNE ligne de verdict. C'est le défaut
  // d'instrument que ce fichier documente déjà (R22b/H-1b) et que je venais de refaire.
  // Une garde doit RAPPORTER ce qu'elle a trouvé, pas mourir en chemin.
  const cliquer = async (sel) => {
    if (!(await page.locator(sel).count())) return false;
    await page.click(sel);
    await page.waitForTimeout(400);
    return true;
  };
  ok(await etat() === "depliee", "la proposition due s'ouvre d'elle-même");
  ok(await cliquer('#shopCard [data-cadence="mensuel"]'), "le sélecteur de cadence est atteignable");
  ok(await etat() === "depliee", "…choisir une cadence NE la referme pas (le tunnel restait infranchissable)");
  ok(await page.locator("#shopOk").count() === 1, "…et le bouton d'activation est toujours là");
  ok(await cliquer('#shopCard [data-flavor="citron"]'), "…le choix de goût est encore là après le premier geste");
  // Le focus revient sur le contrôle activé : sans ça, `innerHTML` détruit le bouton et le
  // focus retombe sur <body> — au clavier, on est renvoyé en haut de l'onglet à chaque choix.
  const foc = await page.evaluate(() => (document.activeElement && document.activeElement.dataset)
    ? (document.activeElement.dataset.flavor || document.activeElement.dataset.cadence || null) : null);
  ok(foc === "citron", "…et le focus revient sur le choix qu'on vient de faire (vu : " + foc + ")");
  ok(await cliquer("#shopOk"), "…et le bouton d'activation reste cliquable au bout du parcours");
  await page.waitForTimeout(300);
  const t = await page.locator("#shopCard").textContent();
  ok(/Abonnement actif/i.test(t) && /citron/.test(t) && /chaque mois/.test(t),
    "…l'abonnement se conclut, avec les choix faits en route");
}

// ---- 7. Les rôles ARIA disent ce que les contrôles FONT --------------------------------------
// Ce bloc REBOOTE sur l'état PROPOSITION. Ma première écriture lisait la carte laissée par le
// bloc précédent — c'est-à-dire l'état ABONNÉ, où le segmenté de cadence n'existe pas : compter
// zéro `role="tab"` y était vrai quoi qu'il arrive. Critère VACUEUX, démontré en réintroduisant
// `role="tablist"` : il restait vert. On mesure là où les contrôles existent.
{
  const st = runnerStateV1({ format: "70.3", weight: "72" });
  st.sport = "tri";
  st.answers.plan_start = "2026-06-01";
  await ouvrirNutrition(st);
  const r = await page.evaluate(() => {
    const c = document.getElementById("shopCard");
    const groupes = [...c.querySelectorAll('[role=radiogroup]')];
    return {
      tab: c.querySelectorAll('[role=tab]').length,
      panel: c.querySelectorAll('[role=tabpanel]').length,
      groupes: groupes.length,
      nommes: groupes.filter((g) => g.getAttribute("aria-label") || g.getAttribute("aria-labelledby")).length,
      // exactement UN choix coché par groupe : ni zéro (on ne sait pas ce qui est pris),
      // ni deux (des choix qui s'excluent ne peuvent pas être cochés ensemble)
      coches: groupes.map((g) => g.querySelectorAll('[aria-checked=true]').length),
    };
  });
  ok(r.tab === 0 && r.panel === 0,
    "aucun rôle d'onglet là où il n'y a aucun panneau à piloter (" + r.tab + " tab / " + r.panel + " tabpanel)");
  ok(r.groupes === 3, "cadence, goût et format sont trois groupes de choix exclusifs (" + r.groupes + ")");
  ok(r.nommes === r.groupes, "…chacun porte son intitulé, relié au groupe (" + r.nommes + "/" + r.groupes + ")");
  ok(r.coches.every((n) => n === 1), "…et chacun annonce EXACTEMENT un choix pris (" + r.coches.join("/") + ")");
}

// ---- 8. Le sous-titre de cadence ne promet plus un jour d'envoi qu'aucun calcul ne tient ----
// Il annonçait « envoi le samedi » / « envoi le 1er ». `nextEcheance` compte des multiples de la
// cadence depuis `startedAt` : l'envoi tombe le jour où l'on s'abonne. Mesuré sur les 7 jours,
// « samedi » n'est vrai que pour qui s'abonne un samedi ; et le mensuel valant 30 jours fixes,
// les échéances tombent les 31, 30, 30 — « le 1er » n'arrive jamais.
{
  const sous = await page.evaluate(() => [...document.querySelectorAll("#shopCard .so-s")].map((n) => n.textContent));
  ok(sous.length === 2 && !sous.some((t) => /samedi|le 1er/i.test(t)),
    "aucun jour d'envoi promis dans le sélecteur de cadence (" + sous.join(" · ") + ")");
  ok(sous.every((t) => /\d+ jours/.test(t)), "…il annonce la PÉRIODE, que le calcul tient (" + sous.join(" · ") + ")");
}

// ---- 9. Un mineur ne se voit rien proposer à la vente ---------------------------------------
// O-16 refuse déjà l'estimation énergétique sous 16 ans ; une carte COMMERCIALE est de la
// catégorie 7 du manifeste et ne passe pas devant la santé. Les DEUX moitiés sont mesurées :
// la carte disparaît pour le mineur, et le RAVITAILLEMENT de la séance (N1-N7) reste servi —
// c'est la vente qui se retire, jamais l'information.
// La mesure est DIFFÉRENTIELLE — même profil à 14 et à 16 ans, on compare les deux onglets.
//
// Ma première écriture assertait « le ravitaillement de la séance reste affiché » en comptant
// `#nutCard`. Elle est sortie rouge, et la cause n'était pas la garde d'âge : `nutritionCardHTML`
// ne rend quelque chose que si le jour COURANT porte une séance — vérifié, `#nutCard` valait 0
// pour l'adulte aussi. Le critère nommait « l'information ne se retire pas » et mesurait « une
// carte existe aujourd'hui », c'est-à-dire une propriété du CALENDRIER. Comparer les deux âges
// enlève cette dépendance, et le critère ne peut plus passer sur un onglet vide (on exige que
// la liste commune soit non vide).
{
  const cartesHorsVente = async (age) => {
    const st = runnerStateV1({ format: "10k", weight: "52", age });
    st.answers.plan_start = "2026-06-01";
    await ouvrirNutrition(st);
    return page.evaluate(() => ({
      vente: document.querySelectorAll("#shopCard").length,
      autres: [...document.querySelectorAll("#screen .load-card, #screen .fold")]
        .filter((n) => n.id !== "shopCard" && !n.closest("#shopCard"))
        // On compare la PRÉSENCE des cartes, pas leur contenu : le sommaire porte aussi la
        // valeur (« · ~1760–2390 kcal ») et un chevron, et chez le mineur la valeur est
        // légitimement absente — O-16 refuse l'estimation énergétique sous 16 ans, ce qui est
        // le comportement voulu et gardé ailleurs. Sans cette normalisation, le critère
        // rougissait sur un « › » de différence.
        .map((n) => ((n.querySelector("summary") || {}).innerText || "")
          .replace(/[›·].*$/s, "").replace(/\s+/g, " ").trim()),
    }));
  };
  const mineur = await cartesHorsVente("14");
  const adulte = await cartesHorsVente("16");
  ok(mineur.vente === 0, "14 ans : aucune carte de vente");
  ok(adulte.vente === 1, "16 ans : la carte revient — le seuil n'est pas un masquage général");
  ok(adulte.autres.length > 0 && JSON.stringify(mineur.autres) === JSON.stringify(adulte.autres),
    "…et RIEN D'AUTRE ne disparaît pour le mineur : c'est la vente qui se retire, pas l'information ("
      + adulte.autres.length + " carte(s) identiques : " + adulte.autres.join(" | ") + ")");
}

ok(errs.length === 0, "aucune erreur JS (" + errs.length + (errs.length ? " — " + errs[0] : "") + ")");
await browser.close();
server.close();
process.exit(report());
