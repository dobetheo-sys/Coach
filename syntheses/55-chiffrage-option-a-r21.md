# Chiffrage — Option A (persistance R21)

**06/09/2026 — chiffrage seul, aucune ligne de code touchée.** Répond aux quatre questions posées
avant de lancer l'option A décrite dans `syntheses/54-r21-jamais-cable-et-persistance.md`
(persistance complète des réductions R21, façon `daySwaps`). La décision #2 (force vélo)
n'est pas traitée ici, comme demandé.

---

## Q1 — Étendue exacte des fichiers touchés

Doc 54 avait identifié trois points : `tabs.js` (`ensurePlan`/`invalidatePlan`), `app.js`
(`buildPlan`), le gestionnaire d'import FIT (`tab-profile.js`). **C'est plus large, sur deux
axes.**

### 1a — Les points d'invalidation, dans la PWA (12 sites, 7 fichiers)

```
grep -rn "invalidatePlan()" endurabuild/js/ | grep -v engine.js
```
rend 12 appels dans `tab-profile.js` (×6), `retest.js`, `plan-view.js`, `tab-plan-general.js`
(×2), `tabs.js` (×4), `steps.js` (reset complet). **Bonne nouvelle, qui limite le risque** :
`applyDaySwaps()` existe déjà et n'est appelée qu'à UN SEUL endroit, à l'intérieur
d'`ensurePlan()` (`tabs.js:109-121`) — pas à chacun des 12 sites d'invalidation. Un futur
`applyR21Recalcs()` suivrait le même patron (appelé une fois, dans `ensurePlan()`, juste après
`applyDaySwaps()`) : les 12 sites d'invalidation n'ont donc PAS besoin d'être modifiés
individuellement, à condition que la fonction de rejeu vive au point de reconstruction unique.
Le nombre de sites n'alourdit donc pas le chantier — c'est la bonne nouvelle de ce chiffrage.

### 1b — Le vrai point non anticipé : `src/app/bridge.ts` regénère SA PROPRE copie du plan, ailleurs

`adjustTodayV2` (`src/app/bridge.ts:209-266`, exposée `EBV2.adjustToday`, appelée depuis
`endurabuild/js/ui/readiness.js:108`) **ne lit JAMAIS `S.currentPlan`** — elle appelle
`generatePlan(toProfile(sport, answers))` en interne (ligne 214) pour se fabriquer sa PROPRE
paire `{plan, reasoned}`, et calcule dessus la « séance du jour adaptée » affichée à l'écran
🎯 Aujourd'hui (héros, prédiction). **Elle applique déjà `answers.daySwaps` elle-même**
(lignes 215-220), avec ce commentaire exact : *« sans ça, la "séance du jour" montrait la
séance d'AVANT échange pendant que la grille montrait celle d'après »*. C'est very précisément
le bug qu'un R21 mal câblé reproduirait : si la réduction R21 n'est rejouée que dans
`ensurePlan()` (PWA), l'écran 🎯 Aujourd'hui — qui ne passe pas par `ensurePlan()` pour sa
séance du jour — continuerait de montrer la séance **non réduite**, pendant que 📅 Semaine (qui
lit `S.currentPlan`) montrerait la version réduite. Deux écrans, deux réponses — la famille de
défaut la plus citée dans ce dépôt (R18.1).

**Conséquence chiffrée** : `applyR21Recalcs()` doit être appelé à DEUX endroits, pas un —
`tabs.js` (`ensurePlan`) ET `src/app/bridge.ts` (`adjustTodayV2`), exactement comme `daySwaps`
l'est déjà. C'est un changement dans `src/`, pas seulement dans `endurabuild/js/` — donc soumis
aux gates moteur (`audit:v1`, `golden:verify`, `lotPhysio`…), qui devront rester verts.

**Deux autres regénérations internes trouvées, risque plus faible** : `predictV2`
(`bridge.ts:658-659`) et `feasibilityV2` (`bridge.ts:1008`) ne régénèrent en interne QUE si
aucun `plan` ne leur est passé — dans la PWA, elles reçoivent presque toujours le plan déjà
construit par l'appelant. Si l'appelant continue de passer `S.currentPlan` (déjà rejoué), ces
deux-là héritent du rejeu sans modification. À VÉRIFIER au moment d'écrire (pas fait ici) :
qu'aucun appel de ces deux fonctions dans la PWA n'omette le paramètre `plan`.

**Trouvaille annexe, hors scope mais à noter** : `coachOnIngestV2` elle-même
(`bridge.ts:1150-1159`) régénère son propre plan et **n'applique PAS `answers.daySwaps`**,
contrairement à `adjustTodayV2` qui le fait. Si un athlète a échangé deux jours, le
`session_id` que R21 calcule et persiste (`weekNum|jour|index`) désignerait un **créneau**, pas
un contenu — après l'échange, ce même identifiant pointe vers un contenu différent de celui
qui a réellement dévié. Latent aujourd'hui (R21 n'est pas câblé), mais actif dès l'option A.

### Fichiers touchés, liste consolidée
`endurabuild/js/ui/tabs.js` (rejeu) · `src/app/bridge.ts` (rejeu ET correctif `daySwaps` manquant
dans `coachOnIngestV2`) · `endurabuild/js/ui/tab-profile.js` (câblage de l'appel + persistance du
log) · `src/coach/deviationDetector.ts` (identité de séance robuste aux échanges — voir Q1
ci-dessus) · potentiellement 2 fichiers de vérification (`predictV2`/`feasibilityV2`, lecture
seule). **6 fichiers réels contre 3 anticipés**, dont 2 dans `src/` (donc sous gates CI).

---

## Q2 — Forme de la persistance

**`{session_id, date, facteur, raison}` seul ne suffit pas — `reasoned` doit être caché
séparément.** Deux designs possibles, avec un compromis net entre eux :

**(a) Persister la RECETTE, rejouer en appelant `reduceDay()` à nouveau.** C'est ce que la
question suggère. `recalculerFenetre()` (`src/coach/proactiveCoach.ts:118-165`) appelle
`reduceDay(day, facteur, refs, reasoned.hz, reasoned.baseRefs)` — recalculer un rejeu identique
exige donc d'avoir `reasoned.baseRefs`/`reasoned.hz` **au moment du rejeu**, c'est-à-dire dans
`ensurePlan()`. Or `S.currentPlan` ne porte que le `V1Plan` brut (`endurabuild/js/app.js:72-80`,
`buildPlan()` ne renvoie que `globalThis.EBV2.buildPlan(...)`) : **`reasoned` doit être mis en
cache séparément**, par exemple `S.currentReasoned`, posé et invalidé en même temps que
`S.currentPlan`. C'est un second champ de cache à gérer partout où `S.currentPlan` l'est déjà.

**(b) Persister le RÉSULTAT (les `steps` déjà réduits), rejouer par simple substitution.**
Éviterait de caractériser `reasoned` — mais un résultat figé peut devenir **périmé** : si
l'athlète modifie son profil entre la réduction et le prochain rendu, la régénération produit
une séance légitimement DIFFÉRENTE pour cette date (pas seulement plus courte), et substituer
aveuglément l'ancien résultat figé masquerait ce changement — l'inverse de ce que `daySwaps` fait
(il échange des contenus fraîchement régénérés, jamais un contenu gelé).

**Recommandation : (a), malgré le coût du second champ de cache.** (b) est moins cher à écrire
mais introduit un mode de péremption silencieuse que ce dépôt a déjà nommé et corrigé ailleurs
sous d'autres formes (R18.1, « une garantie qui ne survit pas à un changement en amont »).

---

## Q3 — Risque de régression avec `dailyAdjuster` (readiness)

**Bonne nouvelle, structurelle plutôt que découverte par chance : les deux mécanismes ne
peuvent PAS se superposer sur le même jour, par construction actuelle des deux côtés.**

- `adjustDay()`/`adjustTodayV2` (`src/readiness/dailyAdjuster.ts:143` et
  `src/app/bridge.ts:209-266`) n'agit QUE sur `snapshot.date` — en pratique toujours
  **aujourd'hui** (la photo du matin). Il ne mute d'ailleurs même pas `S.currentPlan` : il
  travaille sur une copie interne, recalculée À CHAQUE appel depuis la snapshot persistée
  (`S.answers.readiness`) — rien n'est stocké, tout est réévalué à chaque rendu. Pas de
  problème de péremption pour ce mécanisme-là : il n'a jamais eu besoin d'une persistance de
  décision, contrairement à R21.
- `recalculerFenetre()` (R21) exclut explicitement AUJOURD'HUI de sa fenêtre —
  `joursFenetre()` (`src/coach/proactiveCoach.ts:102-112`) : `if (!dd || dd <= today || dd > fin)
  return;` — ne retient que les jours **strictement après** aujourd'hui.

Les deux domaines de dates sont donc **disjoints par construction** : `adjustDay` = aujourd'hui
seul, R21 = J+1 à J+14. Aucune composition à écrire, aucun ordre de priorité à arbitrer — les
deux ne se voient jamais sur le même jour dans l'état actuel du code.

**Une piste creusée et écartée, à documenter pour ne pas la reproposer** : recalculer R21 « à la
volée » depuis les données déjà persistées (`fitSessions`, `done`) plutôt que persister une
décision, comme `adjustDay` le fait pour aujourd'hui. Rejetée : contrairement au readiness (qui
réévalue un signal borné à UN jour, sans état cumulatif), retrouver un signal R21 sur un import
ancien à CHAQUE régénération réappliquerait une réduction sur une fenêtre de 14 jours qui se
décale chaque jour — un athlète ouvrant l'app plusieurs fois par jour verrait ses séances
futures réduites plusieurs fois de suite (composition non voulue, ×0,85 puis ×0,85 encore). C'est
précisément pourquoi le handoff R21 insiste sur *« appelé APRÈS chaque ingestion »* — un
ÉVÈNEMENT borné, pas une réévaluation continue. Confirme que la persistance-et-rejeu (façon
`daySwaps`) est la bonne famille de solution, pas un raccourci.

**Le seul risque réel identifié à ce stade** est celui nommé en Q1 : l'interaction entre R21 et
`daySwaps` sur l'IDENTITÉ d'une séance (un `session_id` par position de créneau, pas par
contenu), pas une question de priorité de réduction.

---

## Q4 — Ordre de grandeur

**Comparable, mais plus large que `daySwaps` lui-même.** `daySwaps` (mesuré directement dans le
dépôt) tient en **3 points de code, ~20 lignes au total** : l'écriture
(`tab-plan-general.js:102-109`, 8 lignes), le rejeu PWA (`tabs.js:126-138`, ~13 lignes), le rejeu
moteur (`bridge.ts:215-220`, 6 lignes). Pas de second champ de cache, pas de calcul externe à
appeler au rejeu (un échange est une opération de données pures).

L'option A porte la MÊME forme (écriture + double rejeu), mais chaque étape est plus lourde :

- **écriture** : `coachOnIngestV2` calcule déjà `log: RecalcLogEntry[]` — mais il faut câbler le
  gestionnaire d'import FIT pour l'appeler avec les bonnes entrées (`ingested` dérivé de
  `imp.sessions`, `today`), gérer la notification, ET persister `log` (nouveau, `daySwaps`
  n'avait qu'à pousser un triplet écrit par l'UI elle-même — ici la DONNÉE À PERSISTER vient
  d'un calcul, pas d'un geste direct de l'utilisateur) ;
- **rejeu** : contrairement à `applyDaySwaps` (échange pur, aucune dépendance externe),
  `applyR21Recalcs()` doit appeler `reduceDay()`, qui a besoin de `reasoned` — d'où le second
  champ de cache (Q2), absent du problème `daySwaps` ;
- **correctif connexe** : `coachOnIngestV2` doit apprendre à appliquer `daySwaps` lui-même
  (comme `adjustTodayV2` le fait déjà) avant de calculer ses `session_id`, sans quoi l'identité
  de séance devient ambiguë dès qu'un échange a eu lieu (Q1) ;
- **tests** : `daySwaps` n'a pas eu besoin de nouveau test E2E dédié (il en existe un,
  `smoke-boucle`/`smoke-usage` le couvrent en marge) ; R21 activé mérite au moins UNE suite
  dédiée (import FIT avec un écart d'intensité fabriqué → notification affichée → réduction
  visible sur 📅 Semaine ET sur 🎯 Aujourd'hui → survit à un rechargement) — les gestes de test
  décrits dans `npm run demo:proactif` existent déjà côté moteur mais ne couvrent pas la PWA.

**Situer le chantier** : plus gros que `daySwaps` (facteur ~3-4 en lignes de code réel, et deux
fichiers `src/` touchés au lieu d'un), du même ordre que des lots déjà livrés dans ce dépôt en
**une session** quand ils touchent un mécanisme borné et déjà bien compris (ex. le lot U8/U10 —
un défaut de dédoublonnage sur un bandeau existant) — mais avec une inconnue non résolue ici
(l'identité de séance robuste aux échanges, Q1) qui pourrait faire déborder sur une seconde
session si la solution la plus simple (un id par position) s'avère insuffisante à l'usage.

**Découpage recommandé si lancé** :
1. Cache `reasoned` à côté de `S.currentPlan` (`tabs.js`), avec sa propre invalidation —
   livrable et vérifiable seul, sans toucher R21 (mesurable : `S.currentReasoned` existe et
   suit `S.currentPlan`).
2. `coachOnIngestV2` applique `daySwaps` avant de calculer ses `session_id` (correctif
   indépendant, mesurable seul par contre-preuve : activer un échange, vérifier que le
   `session_id` calculé correspond au contenu réellement dévié).
3. Persistance + rejeu (`S.answers.r21Recalcs`, `applyR21Recalcs()` dans `tabs.js` ET
   `bridge.ts`), câblage du gestionnaire FIT, notification.
4. Suite E2E dédiée.

---

## Verdict

Les quatre questions ont chacune une réponse concrète et aucune ne bloque le lancement — mais
**l'étendue réelle (Q1) est le double de fichiers anticipés, dont deux dans `src/`**, et **le
risque nommé n'est plus "readiness vs R21" (Q3, résolu : disjoint par construction) mais
"R21 vs daySwaps" (identité de séance)**, non anticipé dans le document 54. Le chantier reste
d'une taille raisonnable (ordre de grandeur d'une session, avec un risque de déborder sur
l'étape 1 du découpage si l'identité de séance résiste à la solution simple). Prêt à trancher :
lancer maintenant (en 4 étapes), découper au fil de plusieurs sessions, ou rester en dette
tracée le temps de traiter d'autres priorités du backlog — les trois restent viables selon ce
chiffrage.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WRroTE1GUunNK31uvXV6oW
