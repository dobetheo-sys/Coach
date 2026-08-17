# Audit des questionnaires — 7 sports × 4 scénarios, piloté comme un utilisateur

**Date** : 14/08/2026 · **Déclencheur** : retour du fondateur, « tu me donnes un questionnaire
buggé en boucle » · **Build audité** : `Zenna-standalone.html` (post-correctif de la boucle).

**Méthode** : Playwright pilote le questionnaire **comme un doigt** — clics sur les options,
saisies plausibles (jamais le harnais de test, qui remplit ce qu'un humain saute). Quatre
scénarios par sport : `premier` (première option partout), `dernier` (dernière option partout —
exerce les branches opposées), `premium` (parcours « Affiner mon plan » complet), `proche`
(date de course trop proche → refus → « Corriger ma réponse » → date corrigée → génération).
À chaque écran : détection de blocage (Continuer inactif avec tout le visible rempli), de boucle
(même écran trois tours de suite), du message U19, et des erreurs console.

---

## LA BOUCLE — trouvée, corrigée, gardée

**Le symptôme rapporté était réel et reproduit pas à pas.** Le boot exigeait
`started && sport && onPlan` pour afficher le plan, mais `started` n'était posé **que par le
clic sur une carte sport** (`steps.js:865`). Un état migré depuis `eb_state_v1` — l'app est
**déployée**, ces états existent dans de vrais navigateurs — arrive avec `started:false` et un
sport déjà choisi : la carte n'est jamais recliquée, `started` reste faux **à vie**.

Vécu mesuré (3 rechargements) : on complète le questionnaire, on génère, on voit son plan…
et **chaque réouverture retombe sur « Ton plan est prêt 🎯 »**. Le questionnaire en boucle.

**Correctif en trois couches**, chacune pouvant casser seule :

| couche | fichier | ce qu'elle fait |
|---|---|---|
| **Guérison à la lecture** | `state.js` (`healContradictoryFlags`) | `onPlan:true` + `started:false` est une contradiction (être SUR un plan jamais démarré) : réparée au chargement. **C'est la couche qui compte — les états cassés sont déjà dans des navigateurs**, dont celui du fondateur. |
| À la génération | `tabs.js` (`renderTabs`) | générer un plan PROUVE la traversée : `started` est impliqué |
| Au boot | `app.js` | le prédicat cesse de sur-exiger : `sport && onPlan` suffit |

**Garde** : `tests/e2e/smoke-boucle.mjs` (**25ᵉ suite**), 8 assertions sur les trois couches,
**vérifiée rouge contre le code d'avant : 4 échecs sur 8**.

> Sur l'appareil du fondateur : ouvrir le nouveau build UNE fois suffit — l'état est réparé en
> storage à la lecture, sans rien refaire. Vérifié sur fixture exacte de l'état cassé.

---

## Les 28 traversées

| sport | premier | dernier | premium | proche |
|---|---|---|---|---|
| tri | ✅ plan | ⚠️ refus VOULU¹ | ✅ plan | ✅ refus → corrige → plan |
| duathlon | ✅ plan | ✅ plan | ✅ plan | ✅ refus → corrige → plan |
| swimrun | ✅ plan | ⚠️ garde VOULUE² | ✅ plan | ✅ refus → corrige → plan |
| trail | ✅ plan | ✅ plan | ✅ plan | ✅ refus → corrige → plan |
| run | ✅ plan | ✅ plan | ✅ plan | ✅ refus → corrige → plan |
| bike | ✅ plan | ✅ plan | ✅ plan | ✅ refus → corrige → plan |
| swim | ✅ plan | ✅ plan | ✅ plan | ✅ refus → corrige → plan |

**26 générations nominales · 2 blocages, tous deux des gardes VOULUES avec leur explication à
l'écran · 0 boucle · 0 blocage muet · 0 erreur console sur les 28 traversées.**

¹ **tri/dernier** : dernière option de format = **Full (Ironman)**, et la sonde pose la course à
200 jours (≈ 29 semaines) — sous le plancher R11.4. Le refus s'affiche avec son motif
(« Il reste 29 semaine(s)… ») et ses issues. C'est le moteur qui protège, pas un défaut.

² **swimrun/dernier** : « Championnat du monde (~70 km) » + « je ne nage pas 30 min sans
m'arrêter » → **prérequis S10 refusé**, bandeau rouge « ↳ Prérequis non atteints » affiché avec
le pourquoi. Choisir un format plus court débloque immédiatement. C'est le garde-fou qui existe
précisément pour ça (garde `smoke-swimrun` depuis R16.10).

## Vérifié en chemin

- **L'écran « Courses intermédiaires »** (premium) : les deux ordres de saisie (date puis
  importance, importance puis date) conservent la date et activent Continuer. Note de fond :
  `race1_date`/`race2_date` sont re-rendus sans attribut `value` mais `bindInputs` restaure
  depuis `S.answers` — le champ ne se vide pas.
- **R22b tient sur les 7 sports** : chaque refus « course trop proche » porte un bouton
  « Corriger ma réponse » qui emmène sur l'étape de la date ; la corriger puis regénérer aboutit.
- **U19 tient** : aucun écran bloquant sans message de ce qui manque.
- **État corrompu / hérité** : `eb_state_v2` illisible → l'app repart proprement en préservant
  la copie corrompue (D1) ; `eb_state_v1` seul → migration puis (désormais) persistance du plan.

## Deux notes d'instrument, gardées écrites

1. Ma première traversée `premium` s'est bloquée à « Courses intermédiaires »… parce que **ma
   sonde** choisissait « Oui » sans remplir `race1_date`. Le blocage était la validation qui
   fait son travail. Corrigé dans la sonde (saisies plausibles partout) avant de conclure.
2. Ma première fixture de guérison portait `off_days:"aucun"`, hors domaine — le refus typé qui
   en sortait était le comportement voulu de l'app, pas la boucle. Corrigée avant de conclure.
