# Rapport de livraison — Spec R4 « rétention & disciplines modulaires » (MESSAGE_CLAUDE_CODE_R4)

Validation : **8 gardes CI vertes** (dont la nouvelle `npm run demo:retention`, 11 assertions
§14) · smoke navigateur en 3 lots : **14/14** (fondations), **8/8** (célébrations/notifs),
**12/12** (retest/contenu/efficience).

## Note de lignée (prérequis du document)
La spec référence `MESSAGE_CLAUDE_CODE_R3.md` et `audit_v5.js`, une lignée remplacée depuis
par le **moteur V2** (`src/`) : les prérequis R3.0–R3.3 sont satisfaits par équivalence —
volume piloté par steps numériques structurés (R3.2/R3.3, zéro prose comme représentation
primaire), et les drapeaux médicaux suppriment réellement l'intensité (medHold retire
dur1/dur2 AVANT génération ; vérifié par les 486 combinaisons d'audit, pas `audit_v5.js`).
Le « défaut critique » cité (flags médicaux n'effaçant pas les consignes d'allure) n'existe
pas dans le moteur V2.

## R4.1 — Registre de disciplines + trail ✅
- `src/engine/disciplineRegistry.ts` : chaque discipline = DONNÉE (métrique primaire,
  source de zones + protocole de retest, volume distance/durée, compétences, règles de
  charge, impact). Exposé `EBV2.disciplines`.
- **Décision d'architecture** (l'arbitrage demandé) : les identifiants `d` (sw/bk/rn) et le
  contrat V1Plan restent inchangés — le trail est porté par le pipeline course (format
  `trail`) mais ses spécificités viennent du registre, plus du code en dur. Les 486
  combinaisons d'audit restent le contrat ; **une discipline fictive ajoutée au registre ne
  change rien aux plans** (asserté en CI, test d'extensibilité §14).
- **Trail livré** : longue en **TEMPS + D+ cible** (350–450 m/h, jamais en km seul —
  asserté en CI), montées au train/RPE (« l'allure brute ne veut rien dire »), séance
  **« Côtes + descentes techniques »** (compétence descente, progression non-cardio) —
  coupée si blessure d'impact : la descente est une charge excentrique, mêmes drapeaux de
  prudence que la route (périostite couverte).

## R4.0 — Boucle de base ✅
Coche ✓ → **feedback ≤10 s** (RPE 1-10, ressenti 4 états, drapeau douleur + zone libre,
`answers.completions`) → célébration → **teaser de la prochaine séance** (« Demain :
6×400m — objectif… ») : la boucle se ferme sur la projection, jamais sur la récompense.
Le repos se valide en 1 tap sans RPE (pas d'effort à noter). `metrics_import` : couvert
par l'import FIT existant (séances + FC/vitesse/puissance, voir R4.8).

## R4.5 — Flags douleur ✅ (sécurité avant gamification, comme demandé)
`painFlag` → verdict **rouge forcé** dans `assessReadiness` quels que soient les autres
signaux → la qualité >Z2 est REMPLACÉE par de la récupération dans toutes les disciplines
(mécanique existante de l'ajusteur, assertée : plus aucune séance >Z2 le jour testé) ;
bandeau permanent médecin/kiné ; streak gelée ; levée = action explicite + confirmation
(« Plus aucune douleur à froid ni pendant l'effort ? »). Le contenu du jour bascule sur
la bibliothèque récupération/blessure (R4.9).

## R4.2 — Streak d'adhérence ✅
`EBV2.adherence` : unité = **jour global complété** (toutes les séances du jour validées,
**repos compris** — poids strictement identique, asserté en CI). Gel sous douleur et
maladie déclarée (toggle 🤒 au check-in) — jours gelés : ni comptés, ni cassants
(asserté). Déborder du plan ne rapporte **rien** (coches fantômes + FIT 4h hors plan →
0 XP, streak inchangée — asserté). Casse : message neutre orienté reprise, pas de rouge,
pas de compteur barré.

## R4.3 — Célébrations ✅
`celebrations.js` : **15 messages × 4 catégories** (endurance « travail de l'ombre »,
qualité « travail qui brille », repos « valorisation physiologique », longue « endurance
mentale »), ton adulte sport-fashion sobre, `{goal}` = objectif réel de l'athlète,
rotation sans répétition immédiate (persistée). Catégorie retest : le cycle R4.4 a sa
propre mise en scène (pas de doublon).

## R4.4 — Retests « boss fight » ✅
Cycle complet sur les rails existants : planification (Profil, type selon sport, date) →
**J-7→J-2** bannière d'annonce → **J-1** consigne fraîcheur → **jour J** écran scénarisé
(protocole du registre étape par étape + saisie du résultat) → **révélation** : delta vs
test précédent, et les zones changent RÉELLEMENT en direct (journal → `syncRefsFromTests`
→ régénération ; asserté au smoke : `a.pace` recalé, plan recalculé) → **carte story
RETEST** distincte (titre, accent violet). **Régression : aucun terme négatif** (asserté),
message exact de la spec (« Souvent, la réponse n'est pas dans l'entraînement : sommeil,
travail, nutrition, stress ») + recalibrage annoncé et déjà appliqué.
Non fait : notification J-7 dédiée hors app ouverte (limite PWA, voir R4.10).

## R4.6 — Cartes story 🔶 partiel (déviation assumée)
La spec demande du 100 % SVG fond transparent. **Conservé : rendu canvas → PNG 1080×1920**
(la Web Share API exige un PNG raster de toute façon, et le cœur visuel — l'avatar — est
déjà en SVG dessiné sur le canvas). Template RETEST distinct livré ; métriques d'efficience
sur la carte : non (affichées dans Suivi). **Slot avatar** : la spec le « réserve » (avatar
reporté) — chez nous l'avatar est DÉJÀ livré (brief R4 parallèle + demande utilisateur
explicite) et occupe ce slot ; conflit entre les deux documents arbitré en faveur de
l'existant.

## R4.7 — Le plan qui réagit ✅ / 🔶
- RPE ≥8 hier → entre automatiquement dans la photo du jour (bridge) → verdict durci et
  **annoncé** en une phrase sous « Aujourd'hui » (tous les drivers affichés). Dès la
  première séance validée avec feedback, l'effet est visible le lendemain — le « aha ».
- Remplacer qualité par endurance : couvert par le chemin readiness (jamais l'inverse).
- Garde-fou volume : **+20 % de vol_max → avertissement explicite chiffré**, refus =
  valeur inchangée (asserté au smoke).
- **Non fait** : déplacement drag d'une séance dans la semaine (le plan est régénéré à
  chaque ouverture — des déplacements persistants demandent une couche d'overrides
  post-génération ; noté au backlog, pas improvisé).

## R4.8 — Récompenses d'efficience ✅
`fitRich` (FC/vitesse/puissance persistées à l'import FIT) → carte « Efficience » dans
Suivi : UNIQUEMENT à charge égale ou inférieure (durée ±15 %) — FC plus basse (≥3 bpm) à
vitesse égale, ou vitesse supérieure (≥2 %) à FC égale. Sans données : **rien** (plutôt
rien qu'une récompense fausse). Jamais de récompense au volume (règle affichée dans l'UI,
et assertée côté XP/streak en CI).

## R4.9 — Contenu du jour ✅
`daily-content.js` : carte quotidienne, rotation **déterministe par date** (l'aléatoire ne
porte jamais sur la charge). **90 anecdotes** d'histoire de l'endurance, **18 capsules
physiologie** indexées sur la phase RÉELLE du plan (base/dev/spec/peak/affûtage/récup),
**stat personnelle** générée de l'historique réel (évolution de référence datée, ou heures
validées), **15 micro-défis** strictement non-volumiques. Pondération : repos → pas de
défi ; veille de qualité → défi interdit ; douleur → bibliothèque récupération uniquement.

## R4.10 — Notifications 🔶 (limite plateforme documentée dans l'UI même)
PWA sans backend → **pas de push app fermée** (il faudrait un serveur Push API — même
décision d'infra que le relais OAuth Strava, à trancher par l'utilisateur). Livré, honnête :
rappel « séance du jour » à l'heure choisie (app ouverte, sinon rattrapage à l'ouverture,
1×/jour), **relance bienveillante** après 3 séances manquées consécutives (UNE fois,
jours gelés exclus, reprise facile proposée, jamais de rafale), **bilan hebdo** dimanche
(réalisé/prévu, tendance, séance clé suivante). Aucune autre notification. Réglage au
Profil + carte unique dans Semaine (déviation : pas imposé à l'onboarding — une question
de plus dans le questionnaire pour un réglage modifiable a perdu l'arbitrage friction).

## §13 ordre / §12 hors scope / anomalies
- Ordre respecté (R4.1 → R4.0 → R4.5 → R4.2 → R4.7 → R4.10 → R4.3 → R4.4 → R4.6 → R4.8 → R4.9).
- Hors scope confirmé : clubs/groupes (R5), comparaison compétitive. Avatar : voir R4.6.
- « Mésocycle 10+10/5 » (§8) : notre structure validée est 3+1/2+1 (7j ou 10j) — conservée,
  le moteur garde la main dessus comme demandé.
- §14 : critères assertés répartis entre `demo:retention` (streak/gel/hors-plan/registre/
  trail), `demo:readiness` (douleur verrouille >Z2), et smokes navigateur (régression sans
  terme négatif, relance unique).
