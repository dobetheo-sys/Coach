# R21 jamais câblé dans la PWA, et un problème de persistance plus profond que prévu

**06/09/2026 — trouvaille faite en étudiant la décision #1 de `decisionsarbitrees.md` ("Retest →
notification proactive"), avant d'écrire une seule ligne de code.** Ce document ne tranche rien
— il rassemble ce qui a été trouvé, avec ses citations exactes, pour un arbitrage humain. Aucun
fichier de `src/` ou d'`endurabuild/` n'a été modifié.

---

## Rappel — ce qui était demandé

`decisionsarbitrees.md`, point 1 : *"coupler le calcul temporel existant (`tab-profile.js:462`,
J+42) à R21 (`coachOnIngestV2`) via un signal `DeviationSignal` 'zone à retester'. Reste en
registre notification, jamais bloquant."*

Trois sous-décisions ont déjà été prises en creusant ce point, avant la trouvaille ci-dessous —
elles restent valables et n'ont pas besoin d'être rouvertes :

1. **Dédoublonnage** : la notification de retest en retard ne se répète qu'**une fois par
   semaine** (et non à chaque import), plus un petit **indicateur visuel persistant** (badge)
   à ajouter quelque part dans l'interface (Profil ou onglet), visible en continu tant que le
   retest est en retard, indépendamment du rythme des notifications.
2. **Formatage** : le canal de notification existant (`formatNotification()`,
   `src/coach/notificationSink.ts`) ouvre toujours sur *"Écart détecté : [chiffre]."* — une
   formulation qui ne convient pas à un rappel de retest (ce n'est pas un écart). Décision :
   **code de formatage séparé** pour ce signal, sans toucher `formatNotification()`.

---

## Trouvaille 1 — R21 n'est jamais appelé dans l'application réelle

`coachOnIngestV2`/`onSessionIngested` (le mécanisme R21 complet : détection de déviation,
recalcul de fenêtre à 14 jours, notification) existe dans `src/coach/`, est testé
(`npm run demo:proactif`, 25ᵉ gate CI), et se trouve bien dans le bundle livré (`engine.js`,
lignes ~21970-23710 : `onSessionIngested`, `coachOnIngestV2`). **Mais aucun endroit de la PWA
elle-même (`endurabuild/js/*.js`, hors bundle) ne l'appelle** :

```
grep -rln "coachOnIngest" endurabuild/js/   →  uniquement engine.js (le bundle)
```

Le seul point d'import réel de séances effectuées est le gestionnaire de fichiers `.FIT`
(`endurabuild/js/ui/tab-profile.js`, `fitInput.onchange`, ~ligne 1278) : il appelle
`globalThis.EBV2.importFit(...)`, alimente `S.answers.fitSessions`/`fitRich`/`tests`, coche
automatiquement les séances correspondantes — mais ne passe **jamais** ce qui vient d'être
importé à `coachOnIngestV2`. L'import Strava (`endurabuild/js/ui/steps.js`, `stravaImport()`)
n'alimente que `S.answers.tests` (calibration FTP/allure/CSS) — il ne produit même pas la forme
`IngestedSession[]` dont R21 aurait besoin.

**Conséquence concrète** : aujourd'hui, quel que soit ce qu'un athlète importe (un fichier FIT
avec un écart d'intensité énorme, une charge hebdomadaire doublée...), **aucune notification de
déviation ne peut jamais apparaître** dans l'app réelle. Le mécanisme est prouvé correct sur le
papier et inerte en pratique. Rien dans `BUGS_OUVERTS.md` ni `CLAUDE.md` ne documente cet état —
c'est une trouvaille nouvelle de cette session, pas un défaut déjà connu et assumé.

---

## Trouvaille 2 — même câblé, la réduction de charge ne survivrait pas à une régénération

En cherchant *où* brancher l'appel, un second problème, plus profond, est apparu.

**Le modèle de persistance du plan dans la PWA** (`endurabuild/js/ui/tabs.js:109-140`,
`ensurePlan()`/`invalidatePlan()`) : le plan n'est **pas** une donnée persistée — c'est une
fonction pure de `S.answers`, mise en cache dans `S.currentPlan` et régénérée intégralement
(`buildPlan(S.answers)`) à chaque fois que `S.currentPlan` est invalidé (changement de profil,
reset, etc. — ce qui arrive souvent). Ce que le plan lui-même NE porte PAS ne survit à aucune
régénération.

**Comment ce dépôt a déjà résolu ce problème une fois** : les échanges de jours (⇄) sont un
exemple exact de modification qui doit survivre à une régénération complète. La solution n'est
PAS de garder l'objet plan modifié en mémoire — c'est de **persister la décision** dans
`S.answers.daySwaps` et de la **rejouer** après coup :

```js
// tabs.js:109-121 — ensurePlan()
S.currentPlan = buildPlan(S.answers);
...
applyDaySwaps(S.currentPlan); // rejoue les décisions persistées, sur le plan tout juste régénéré
```

**Pourquoi R21 ne peut pas suivre ce patron tel quel** : `recalculerFenetre()`
(`src/coach/proactiveCoach.ts:118-165`) réduit une séance avec `reduceDay(day, facteur, refs,
reasoned.hz, reasoned.baseRefs)` — elle a besoin de l'objet **`reasoned`** (les références de
l'athlète, les zones), pas seulement du plan. Or `buildPlan()` côté PWA
(`endurabuild/js/app.js:72-80`) ne renvoie que `globalThis.EBV2.buildPlan(S.sport, a)` — le
`V1Plan` brut. **`reasoned` n'est jamais conservé au niveau de la PWA** : il existe seulement à
l'intérieur de `EBV2.coachOnIngest`, qui régénère sa PROPRE paire `{plan, reasoned}` en interne
(`src/app/bridge.ts:1149`, `coachOnIngestV2` appelle `generatePlan(...)`) — un plan et des
références qui ne sont pas ceux que `S.currentPlan` a mis en cache.

**Ce que ça veut dire concrètement** : appeler `coachOnIngestV2` aujourd'hui donnerait un
résultat correct pour l'instant T, mais soit (a) on remplace `S.currentPlan` par le plan que la
fonction vient de recalculer — et la réduction disparaît à la prochaine régénération (retour au
plan non réduit), un défaut de la même famille que celui que `daySwaps` a été construit pour
corriger ; soit (b) on construit le même mécanisme de persistance-et-rejeu que `daySwaps` — ce
qui demande d'abord de faire en sorte que la PWA conserve `reasoned` (ou au moins `refs`+`hz`) à
côté de `S.currentPlan`, un changement qui touche `tabs.js` (`ensurePlan`/`invalidatePlan`) et
`app.js` (`buildPlan`), en plus du gestionnaire d'import FIT lui-même.

---

## Ce qui reste vrai malgré tout, et qui n'est pas affecté

Le retest (l'objet de la décision #1) **n'a pas ce problème** : un rappel de retest est une pure
information, il ne mute jamais le plan. Il pourrait donc se brancher sur le canal de
notification (`NotificationSink`/`InAppSink`) sans attendre la résolution du problème de
persistance ci-dessus — les 3 signaux existants (écart d'allure/puissance, séance manquée,
charge 7 jours) sont ceux qui, eux, ont besoin de la mécanique de recalcul-et-persistance pour
être vraiment utiles (sinon la réduction de charge qu'ils proposeraient disparaîtrait au
prochain rendu).

---

## Les options, telles qu'elles se présentent

**A — Solution complète.** Étendre le cache de plan de la PWA pour qu'il conserve `reasoned` (un
second champ à côté de `S.currentPlan`, invalidé en même temps), persister les réductions R21
dans `S.answers` (une liste `{session_id, date, facteur, raison}` ou équivalent), écrire une
fonction de rejeu `applyR21Recalcs()` analogue à `applyDaySwaps()`, appelée dans `ensurePlan()`.
Fichiers touchés : `tabs.js`, `app.js`, le gestionnaire d'import FIT (`tab-profile.js`), plus les
nouveaux modules. C'est la version qui rend les 3 signaux de déviation réellement actifs et
durables dans l'app — mais c'est un chantier d'architecture, pas un ajout de fonctionnalité
isolée.

**B — Remplacement du plan en mémoire, sans persistance.** Appeler `coachOnIngestV2` dans le
gestionnaire d'import FIT, remplacer `S.currentPlan` par le plan qu'il retourne. Rapide à écrire,
mais la réduction de charge disparaît à la prochaine invalidation du cache (changement de profil,
nouvelle session du navigateur selon la fréquence d'invalidation) — reproduit sciemment un défaut
que ce dépôt a déjà corrigé une fois pour une autre fonctionnalité (`daySwaps`). Non recommandé
sans un avis explicite que ce risque est acceptable.

**C — Retest seul aujourd'hui, reste du signal en dette tracée.** Le retest se branche sur le
canal de notification maintenant (aucune mutation de plan, donc aucun problème de persistance).
Les 3 signaux de déviation existants restent non câblés dans la PWA, consignés comme entrée à
part dans `BUGS_OUVERTS.md` avec les deux trouvailles ci-dessus, en attente d'un arbitrage sur A
vs B pour eux. Portée maîtrisée, livrable sans toucher à l'architecture de persistance de la PWA.

---

**Rien n'a été implémenté.** Ce document existe pour permettre de trancher entre A/B/C (ou une
autre option) avec un avis extérieur, avant qu'une seule ligne ne soit écrite dans
`endurabuild/`.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WRroTE1GUunNK31uvXV6oW
