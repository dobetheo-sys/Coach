# HANDOFF R13 — Corrections de l'audit standalone-4 (31/07/2026)

**Moteur audité :** `v2-sprint9` (bundle `engine.js` du fichier `EnduraBuild-standalone-4.html`).
**Méthode :** les défauts ci-dessous ne sont pas des lectures de code — ils sont **mesurés par exécution** du moteur en Node. Le banc `bench_r13.js` (joint) les reproduit tous : **17 échecs sur le build actuel, zéro sur les non-régressions.**

**Règle de conduite du sprint :** un correctif n'est terminé que quand sa ligne du banc passe **et** que les lignes `NR` restent vertes. Un banc qui passait déjà avant le correctif ne teste rien — c'est pour ça qu'il est livré rouge. Relancer aussi `npm run audit:v1 / audit:v2` après chaque chapitre (consigne des en-têtes de modules).

```
node bench_r13.js dist/engine.js dist/EnduraBuild-standalone.html
```

Ordre d'exécution recommandé : **R13.1 → R13.2 → R13.3 → R13.4 → R13.5 → R13.6** (les deux premiers sont des correctifs d'une demi-journée ; 3 et 4 touchent le routage des créneaux ; 5 exige un diagnostic tracé avant patch ; 6 est une décision de périodisation).

---

## R13.1 — L'âge a DEUX domaines, et les extrêmes passent entre les deux (P0)

**Le défaut, mesuré.** `ANSWER_SCHEMA.age` accepte **[10–100]** ; `PHYSIO_BOUNDS.age` vaut **[14–95]**. `boundedOrZero("age", 12)` renvoie donc `0`, et le prédicat `minor = ageN > 0 && ageN <= 17` devient faux. Résultat au banc :

| Âge | Pic | Blocs VO2max | R6.3 | Avertissement |
|---|---|---|---|---|
| 30 | 7,6 h | 20 | — | — |
| 15 | 5,6 h | 0 | mineur ✓ | ✓ |
| **10–13** | **7,6 h** | **20** | **absent** | **absent** |
| 65 | 6,5 h | 19 | master ✓ | — |
| **96–100** | **7,6 h** | **20** | **absent** | **absent** |

Un enfant de 10 ans reçoit le plan adulte complet, VO2max comprises, sans un mot. Un athlète de 98 ans aussi — et `hrZones` retombe sur l'âge par défaut 35 : FCmax affichée ≈ 184 bpm au lieu de ≈ 139. C'est le défaut que l'en-tête de R11 nomme lui-même (« une énumération écrite deux fois est une énumération qui divergera »), appliqué au champ le plus sensible du produit.

**L'inventaire complet des divergences** (toutes les clés présentes dans les deux tables) :

| Clé | ANSWER_SCHEMA | PHYSIO_BOUNDS | Zone morte |
|---|---|---|---|
| `age` | 10–100 | 14–95 | 10–13 et 96–100 |
| `weight` | 25–250 | 35–200 | 25–34 et 201–250 |
| `height` | 100–250 | 120–230 | 100–119 et 231–250 |
| `hr_max` / `hrMax` | 120–230 | 120–220 | 221–230 |
| `ftp` | 50–600 | 60–600 | 50–59 |

**Le correctif.**
1. **Une seule source.** `PHYSIO_BOUNDS` cesse de porter des bornes littérales pour toute clé existant dans `ANSWER_SCHEMA` : elles se **dérivent du schéma** à l'initialisation du module (`fromSchema("age")`, etc.). `hrRest` (absent du schéma) garde sa borne locale. Si une borne physio doit être plus stricte que le schéma, c'est **le schéma** qu'on change — jamais une seconde table.
2. **Honorer le contrat E3** (« hors bornes = non renseigné **+ avertissement** ») : partout où `boundedOrZero` écarte une valeur non nulle sur une clé porteuse de charge (`age` au minimum), un avertissement nommé est poussé. Après l'unification, cette branche est morte sur le chemin validé — elle reste le filet des appelants qui ne passent pas par `validateAnswers` (voir Annexe B : `adjustTodayV2` appelle `generatePlan` sans validation).
3. Les prédicats `minor`/`master` du `reasoningEngine` lisent l'âge **validé** (parse direct), plus jamais à travers un second contrôle de bornes.

**Critères d'acceptation.**
- Banc : `R13.1-A10 / A12 / A13 / B` passent ; `R13.1-NR1 / NR2` restent verts (15 ans protégé, 30 ans garde sa VO2, 65 master, 101 refusé).
- Unitaire (src, hors banc — `hrZones` n'est pas exposée) : `hrZones("98", null, null).fcMax` ∈ [137, 141] ; `hrZones("12", …)` n'utilise plus le repli 35 ans.
- CI : un test importe les deux tables et **échoue si une clé commune diverge** — la règle devient exécutable, pas un commentaire.

---

## R13.2 — La CSS d'impression a fuité dans le `<style>` du standalone (P1, build)

**Le défaut.** La feuille print de `ui/plan-view.js` — une **chaîne JavaScript**, avec ses `'+'` de concaténation — est collée telle quelle dans le `<style>` principal du fichier autonome (ligne ~274). Le parseur CSS en récupère ce qui est syntaxiquement valide :
- `body{font-family:-apple-system,Arial…; max-width:900px; margin:0 auto; padding:24px}` — **Space Grotesk meurt comme police de base** de tout le fichier autonome, et le body prend une largeur/un padding qui s'empilent sur `.wrap` ;
- `h2{font-size:16px; margin-top:24px; border-bottom:2px solid…}` global — le h2 du check-in prend un soulignement parasite ;
- `ul{font-size:12px; line-height:1.5}` global — toutes les listes rétrécissent.

C'est un défaut du **script d'empaquetage** du standalone, pas du code applicatif — et il explique un « ça rend moins bien que la PWA » qu'aucun diff de module ne montrera jamais.

**Le correctif.** Dans le script qui génère le standalone : la CSS print ne vit **que** dans la chaîne JS de `plan-view.js` (fenêtre d'impression) et n'est jamais émise dans `<style>`. Ajouter un **garde de build** : après génération, si le bloc `<style>` contient `-apple-system,Arial` ou une ligne `+'…'`, le build échoue avec le message qui nomme la cause.

**Critères.** Banc : `R13.2-S1` (aucune fuite) et `R13.2-S2` (la dernière `font-family` de `body` est Space Grotesk) — lancer le banc **avec le chemin du HTML en 2ᵉ argument**, sinon il marque SKIP.

---

## R13.3 — En triathlon, un athlète mono-séance ne nage pas (P1, sport)

**Le défaut, mesuré.** `dbl = a.doubles === "oui"` strict ; or `swMain` (sw.css) et `swTech` ne sont poussées **que** sous `dbl`. Pour `doubles = "non"` ou `"parfois"` — la majorité des athlètes — sur un Full de 59 semaines avec CSS renseigné :
- **1,0 nage/semaine** en dev+spec+peak, unique zone du plan : `sw.easy` (zéro seuil CSS en 59 semaines) ;
- **zéro nage sur les 6 semaines d'affûtage** — l'athlète se présente à un départ de 3,8 km sans avoir nagé depuis un mois et demi. Les sensations d'eau se perdent en 10–14 jours ; en eau libre froide, ce n'est pas une contre-performance, c'est un risque.

Avec `doubles = "oui"` le module est sain (3,0 nages/sem, css+aero) : le défaut est le **routage des créneaux mono-séance**, pas la bibliothèque.

**Le correctif** (dans `sports/tri/index.ts`, `buildTriSessions`) — quand `!dbl`, le créneau `facile2` cesse d'être systématiquement « Nage récup courte » :
- phase `base` → `swTech` ; phases `dev / spec / peak` → `swMain` (sw.css) pour non-débutant (le débutant garde sa version technique+seuil existante) ; semaines de récup → `swShort` inchangé ;
- phase `taper` → nouvelle séance **« Rappel nage course »** : 300 souple + 4–6×100 @ `sw.css` r20–30 s + 100 souple (≤ ~1 400 m), présente **chaque** semaine d'affûtage, dernière nage ≤ 5 jours avant la course — le miroir exact du « Rappel race-pace » vélo ;
- rien à faire pour le drapeau médical : `medicalZone` redescend `sw.css` d'elle-même (porte) et `enforceMedicalHold` rattrape (filet) — le vérifier au banc medHold existant, pas le recoder.

**Critères.** Banc : `R13.3-N-non` et `R13.3-N-parfois` (≥ 1,5 nage/sem en dev+spec+peak, `sw.css` présent, une nage chaque semaine d'affûtage) ; `R13.3-NR` reste vert (doubles=oui entre 2,2 et 3,2 nages/sem). Les garanties C15/C24/C24b (planchers et plafonds piscine) et C22 doivent tenir — le banc et `audit:v2` le disent.

---

## R13.4 — La semaine de course est cassée par un fall-through (P1, sport)

**Trois défauts, mesurés sur Full et 70.3.**
1. Créneau `dur2` : `spec/peak → allure course ; else → Force basse cadence`. **L'affûtage tombe dans le `else`** : 6 blocs `bk.frc` en taper sur le Full (4 sur le 70.3), dont une séance de force gros braquet **à J-3 de l'Ironman**. Le manifeste interdit la VO2max en affûtage ; la force à 50–60 rpm a le même coût de fatigue résiduelle (48–72 h). Elle est là par accident de branchement, pas par intention.
2. **Veille de course : 48 min (Full) / 63 min (70.3).** Un déverrouillage se joue à 15–25 min (échauffement + 3 accélérations), pas en séance pleine.
3. **Jour J :** la séance porte déjà `race:true` (bon), mais `min` vaut 13–29 min et **entre dans la charge hebdomadaire** — l'Ironman compté comme un footing.

**Le correctif.**
1. `dur2` : brancher l'affûtage **explicitement** — `else if (phase === "taper")` → « Rappel allure course CAP » (W10 + 2×8 min `rn.mara` r3 + C5, ≤ 35 min). Ajouter au registre `FORBIDDEN` et à l'auditeur : **« une séance de force (`*.frc`) en affûtage »** — la règle devient vérifiée, pas espérée.
2. Plafond dur sur la séance J-1, tous sports à course : ≤ 25 min (déverrouillage = W10 + 3×1 min accélérations + 5 souple).
3. Jour J : `min: 0` (exclu de la charge, de l'adhérence — `missedSessionsCheck` ne doit jamais compter la course comme « séance manquée » — et des célébrations automatiques) ; l'affichage porte les temps **prédits** (`EBV2.predict` existe et sort déjà natation/vélo/CAP) plutôt qu'une durée de footing inventée.

**Critères.** Banc : `R13.4-C1/C2/C3` sur Full **et** 70.3. R3.13 (affûtage ≤ 60 % du pic) doit rester vert à l'auditeur.

---

## R13.5 — Épaule + natation : le plan s'effondre et personne ne le dit (P0/P1)

**Le défaut, mesuré.** `swim / fond / injury:epaule / history:confirme` → 20 semaines **plates à ~0,5–0,9 h/sem** (séances de 17 min), pendant que le journal affiche « R6.2 volume ×0.90 » et « sonde de capacité → 2,9 h ». Ratio max/min des semaines de charge : **1,22** — il n'y a plus de courbe. Zéro avertissement. Trois contrats violés d'un coup : le chiffre annoncé ment (×3 à ×5 selon le profil), la périodisation n'existe plus, et `reconcileDeclaredVolume` — dont c'est précisément le rôle — ne déclenche rien. `assertPlanIsAPlan` ne rattrape pas (`fond` < 16 semaines, donc pas de plancher de pic). Avec `history:ancien`, le même profil tient (pic 2,3 h, ratio 1,76) : l'effondrement est une **interaction** cap épaule × planchers × sonde, pas une constante.

**Le correctif — diagnostic AVANT patch** (discipline habituelle du projet) :
1. Rejouer le scénario avec la trace (`traceEnabled`) et identifier la passe qui écrase : hypothèse principale, le `bnd.cap = 0.8 × swimDist` du bloc épaule figé à une valeur de première semaine au lieu de suivre `PT(...)` × courbe comme les autres blocs. Le patch corrige **la cause tracée**, pas le symptôme.
2. **Généraliser la réconciliation** : si le pic prescrit < 75 % de la promesse V2.1, le chiffre annoncé s'aligne **et** un avertissement nomme le limiteur réel (« ta zone épaule borne chaque séance à X m : le plan livrable est Y h/sem, pas Z »). C'est la même règle que la sonde applique déjà ailleurs — elle doit couvrir ce chemin.
3. **Plancher de vie de la courbe** : sur les semaines de charge, ratio max/min ≥ 1,35, sinon la sonde abaisse la promesse et le dit. Un plan plat n'est pas un plan périodisé, c'est un abonnement.

**Critères.** Banc : `R13.5-E1-confirme` **et** `R13.5-E1-ancien` (les deux histoires du même athlète). La substitution épaule garde son budget borné (B1 v6 — la blessure ne doit pas non plus ré-augmenter la charge : `audit:v2` le tient).

---

## R13.6 — Les phases en pourcentage explosent sur les plans longs (P1, sport)

**Le défaut, mesuré.** `PHASE_PCTS` (taper 0.1, peak…) appliqué à 59 semaines : **6 semaines d'affûtage, 9 de peak**, dernière semaine d'entraînement à **24 % du pic**. La littérature de l'affûtage (méta-analyse Bosquet 2007) : 8–14 jours optimaux, ~3 semaines maximum pour un Ironman, réduction de volume 40–60 %. Six semaines à un quart du pic, c'est un désentraînement organisé — l'athlète le plus discipliné arrive détraîné.

**Le correctif.** Les pourcentages restent la répartition par défaut, mais prennent des **plafonds absolus** :
- `taper = clamp(round(0.10 × W), 1, W ≥ 30 ? 3 : 2)` ;
- `peak ≤ 5` semaines ;
- l'excédent est reversé à `spec` (puis `dev`), la part de `base` inchangée ; C19 (peak ≥ 1) conservé.
- Cible de semaine de course (hors jour J, qui vaut 0 après R13.4) : **30–60 % du pic** — la borne haute existe déjà (R3.13), la borne basse devient vérifiée.

**Critères.** Banc : `R13.6-P1` (Full 59 sem → taper 2–3, peak ≤ 5), `R13.6-P2` reste vert (semi 17 sem → taper 1–2), `R13.6-P3` (dernière semaine 30–60 % du pic). Après R13.6, re-vérifier R13.3 (les semaines d'affûtage restantes contiennent toujours leur nage) et C22 — les redistributions de phases déplacent des volumes.

---

## Annexe A — Deux correctifs d'opportunité, **bloquants au banc**

**A1 — C22 n'est pas étanche.** Saut charge→charge mesuré : S33→S34 **+13 %** (553→622 min) sur le Full de référence, malgré la « garantie finale +10 % ». Même leçon que R5.1/R5.3, un cran plus loin : une passe postérieure regonfle encore après le clamp. Correctif : itérer clamp C22 + planchers jusqu'au point fixe (≤ 3 passes) **en tout dernier**, tolérance +10,5 % (arrondis). Critère : `ANX-C22` sur la matrice du banc.

**A2 — Genou déclaré + plan vélo pur : silence total.** R6.1 déclare `genou: forbid ["rn","bk"]` ; en mono-sport vélo, la génération applique ×0.9 sans un mot. La distinction chronique/aigu est défendable (l'ajusteur quotidien fait le bon travail — testé : douleur genou → nage souple, tibia → repos actif), mais une contre-indication déclarée **sur la discipline principale du sport choisi** vaut au minimum un avertissement à la génération : « ta zone fragile (genou) est précisément celle que ce sport charge — le plan réduit le volume, un avis médical avant montée en charge est la vraie réponse ». ~5 lignes dans le `reasoningEngine`, à côté de R6.2. Critère : `ANX-GEN`.

---

## Annexe B — Hors périmètre R13, à trier pour R14 (ne pas ouvrir ce sprint)

1. **`adjustTodayV2` contourne `validateAnswers`** (`generatePlan(toProfile(...))` direct) — le filet E3 de R13.1 le couvre, mais la validation devrait y passer aussi (non bloquante, sans throw).
2. **Bootloader sans filet** : `JSON.parse`/import en échec = écran blanc muet. Un try/catch + message « recharge / re-télécharge le fichier » coûte cinq lignes.
3. **Ré-ancrage du cycle menstruel** : la projection par modulo dérive de ±2–3 j/mois ; un tap « mes règles ont commencé aujourd'hui » dans le check-in rendrait la fenêtre vraie au lieu de projetée. Le module est par ailleurs exemplaire (McNulty 2020, placement sans toucher au volume) — ne pas y toucher au-delà.
4. **Check-in HRV** : « je ne la suis pas » → `normale`. Neutre aujourd'hui ; sémantiquement, absent ≠ normal — passer à `null` quand le verdict saura le distinguer.
5. **Code mort swimrun** dans le standalone (branches steps.js, schéma, config) — le flag registre fonctionne (vérifié : l'UI filtre par `EBV2.sports`), c'est du poids, pas un risque.

---

## Ce que l'audit confirme de solide (ne pas « améliorer »)

Le contrat d'entrée R11 tient partout où il a été attaqué (Ironman à 7 semaines refusé avec les deux issues, âge 101 refusé, 7 jours bloqués refusés, virgule française, casse de format). Le **drapeau médical porte+filet est étanche** (mesuré : uniquement `sw.easy/bk.z2/rn.easy`, pic 4 h, avertissement nommé). Le **prédicteur est plausible** (Full : natation 1 h 19–1 h 24 sur CSS 2:00 ; vélo 159–173 W sur FTP 227, IF 0,70–0,76 ; marathon 4 h 00–4 h 15). La **nutrition** est exactement à sa frontière (mots interdits testés, disclaimers, ACSM/ISSN/Burke, garde IMC E4). L'**ajusteur quotidien** est sain (deux registres objectif/subjectif, douleur → rouge forcé, swaps de discipline corrects). Ces zones sont des invariants à protéger, pas des chantiers.
