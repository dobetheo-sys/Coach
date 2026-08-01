# HANDOFF R14 — Prédiction de course : de la « forme actuelle » à la « forme projetée jour J »

**Moteur audité :** `v2-sprint9` (bundle `engine.js` du fichier `EnduraBuild-standalone-5.html`, post-R13).
**Banc :** `bench_r14.js` — **14 échecs sur 16 contre le build actuel**, 2 passages qui sont les non-régressions à protéger. Rouge par construction : la clé `projected` n'existe pas encore, et les deux annexes mesurent des défauts réels.

```
node bench_r14.js dist/engine.js
```

---

## Le constat, mesuré

`predictRace` ne lit que `refs = {ftp, thrPace, css}` — c'est-à-dire les **valeurs saisies ou testées aujourd'hui**. Rien dans la chaîne ne connaît le temps qui reste, le volume qui sera fait, ni ce que l'athlète a déjà accompli.

Mesuré sur un Ironman à 59 semaines (FTP 227, allure 4:50, CSS 2:00), en simulant **30 semaines intégralement cochées** :

| | Natation 3800 m | Vélo | CAP marathon |
|---|---|---|---|
| Prédiction semaine 1 | 1h19–1h24 | 159–173 W | 4h00–4h15 |
| Prédiction semaine 31 | 1h19–1h24 | 159–173 W | 4h00–4h15 |

`JSON.stringify(items)` **identique au caractère près**. L'athlète le plus assidu du monde voit exactement le même chrono après sept mois d'entraînement. C'est le seul module du moteur qui ignore complètement le plan qu'il accompagne — et c'est aussi celui qui décide du pacing du jour J.

Trois défauts périphériques, également mesurés :

1. **`pctLoad` ne peut pas servir de mesure de fiabilité.** Il vaut `doneMin / totalMin` sur le plan **entier, futur compris** : 30 semaines parfaites sur 59 donnent **43 %**, sous le seuil de 60 % qui resserre la fourchette. La condition `followed` est donc mécaniquement inatteignable en début de préparation et devient vraie en fin de plan pour une raison qui n'a rien à voir avec la régularité.
2. **`terrain = "montagne"` ne déclenche aucune correction de relief.** `COURSE_PROFILE_RUN` a les clés `plat / vallonne / **montagneux**`, l'énumération `terrain` du schéma a `plat / vallonne / **montagne**`. Mesuré sur le jour J : plat = 240 min, montagne = 240 min — les +8 à +15 % disparaissent en silence. `vallonne` fonctionne par coïncidence orthographique. Encore une énumération écrite deux fois.
3. **L'exposant de Riegel est figé à 1,06.** Deux athlètes de même allure seuil, l'un à 4 h/semaine, l'autre à 14 h : **marathon prédit identique (3h32)**. Or c'est précisément le volume qui gouverne la tenue de la distance.

---

## Ce que dit la littérature (et ce qu'elle ne dit pas)

**Solidement établi**
- **Taper** — Bosquet, Montpetit, Arvisais & Mujika, *MSSE* 2007;39(8):1358–67 (méta-analyse, 27 études retenues) : gain moyen **+1,96 %** (plage −2,28 à +8,91 %). Stratégie optimale : 2 semaines, volume réduit de 41–60 % de façon exponentielle, **intensité et fréquence maintenues**. Corroboré par Wang et al., *PLOS ONE* 2023 (effet maximal 8–14 jours).
- **VO2max** — Milanović, Sporiš & Weston, *Sports Medicine* 2015 (28 études, 723 sujets) : **+4,9 mL·kg⁻¹·min⁻¹** vs contrôle. Et surtout **HERITAGE (Bouchard, 483 sujets, 20 semaines)** : gain moyen ~0,4 L/min, mais **7 % des sujets à ≤ +0,1 L/min et 8 % à ≥ +0,7 L/min pour le même programme**. C'est l'argument décisif : **une projection ponctuelle est fausse par construction, seule une fourchette est honnête.**
- **Extrapolation entre distances** — Vickers & Vertosick, *BMC Sports Sci Med Rehabil* 2016;8:26 (N=2303) : Riegel est bien calibré jusqu'au semi mais **sous-estime le marathon d'au moins 10 minutes pour la moitié des coureurs** ; le kilométrage hebdomadaire est un prédicteur majeur (MSE 208 vs 381 pour Riegel en validation).
- **Ironman** — Rüst, Knechtle, Knechtle, Rosemann & Lepers, *OAJSM* 2011;2:121–129 (N=184) : `temps IM (min) = 152,1 + 1,332 × PB marathon + 1,964 × PB olympique`, **r² = 0,65, SEE = 57 min**. Un SEE de ~57 min sur ~11 h, c'est **±8 %** : notre fourchette projetée ne peut pas être plus étroite que ça sans mentir.
- **Altitude** — Wehrlin & Hallén 2006 : VO2max −6,3 %/1000 m au-dessus de ~1500 m.

**Plausible mais faiblement validé** (à traiter comme heuristique, et à écrire comme tel dans le code)
- Gains de FTP par niveau : ~20–30 %/an (débutant), 5–10 %/an (intermédiaire), 2–5 %/an (avancé). Convergence de sources de coaching, pas d'étude princeps.
- Exposants de Riegel par volume (1,04 gros volume → 1,12 faible volume) : calibration empirique de calculateurs.
- Cibles d'IF vélo par format (déjà dans `TRI_BIKE`) : heuristiques de praticiens.
- Gain CSS ~5,4 % sur bloc HIIT structuré : petit échantillon, nageurs très entraînés.

**À rejeter explicitement**
- **Toute dérivation d'un temps depuis la CTL.** Andrew Coggan, concepteur du modèle, la qualifie d'indicateur **relatif** de forme et non de prédicteur absolu ; le TSB indique un état d'adaptation, pas une capacité de performance. Le seul test empirique direct trouvé (N-of-1, 96 sorties) montre que la topologie explique ~88 % de la variance et que CTL/ATL/TSB n'apportent que ~1 minute. **La CTL reste une tendance de charge, jamais une entrée du prédicteur.**
- Le modèle de Banister : excellent ajustement rétrospectif (R² 0,79 chez Hellard 2006) mais **validité prédictive prospective non démontrée** et paramètres instables — inapplicable sans tests répétés très fréquents.
- Le mode « course parfaite » de Garmin, qui projette sans fourchette et se trompe couramment de 30 à 60 min sur marathon.

---

## R14.1 — Le contrat : deux prédictions, jamais une seule

`EBV2.predict(sport, answers, plan)` conserve sa sortie actuelle **inchangée** (c'est la « forme actuelle », la vérité mesurée) et gagne une clé `projected` :

```js
{
  items, advice, decisions,        // FORME ACTUELLE — ne pas toucher (ANX-NR le vérifie)
  projected: null | {
    applicable   : boolean,        // false = on refuse de projeter, avec le motif dans decisions
    horizonWeeks : number,         // semaines entre aujourd'hui et la course
    adherence    : number,         // 0..1 — fenêtre glissante, semaines ÉCOULÉES uniquement
    gainPct      : { ftp, thrPace, css, vam? },   // fractions appliquées (0.061 = +6,1 %)
    gainSource   : "prior" | "mesure" | "mixte",
    spreadPct    : number,         // demi-largeur affichée, 0.03..0.12
    confidence   : "faible" | "moyenne" | "bonne",
    refs         : { ftp, thrPace, css },          // références projetées, mêmes unités
    items        : [{ leg, value, why }],          // mêmes legs, valeurs projetées
    decisions    : [{ id, what, val, why }],       // P1…P8, traçables comme partout ailleurs
  }
}
```

L'UI affiche les deux, étiquetés : *« Aujourd'hui : 4h00–4h15 »* / *« Projeté au 12/09/2027 : 3h44–4h02 (confiance moyenne) »*. Jamais un seul chiffre, jamais sans la date de référence.

**Critères :** `R14.1-A` (contrat complet, `applicable` vrai sur un plan long), `R14.1-B` (le chrono projeté diffère réellement de l'actuel).

---

## R14.2 — Les huit règles du projecteur (P1…P8)

Chaque règle porte un identifiant et produit une entrée dans `projected.decisions`, comme le reste du moteur.

**P1 — L'adhérence est une fenêtre glissante, pas un pourcentage de plan.**
`adherence` = minutes cochées / minutes prescrites sur les **6 dernières semaines écoulées** (jours < aujourd'hui, semaines futures exclues). `pctLoad` reste ce qu'il est pour la barre d'avancement, mais **ne pilote plus rien dans le prédicteur**.

**P2 — Le gain est plafonné et sature.**
`gain(w) = G∞ × (1 − exp(−w / τ))`, `τ = 20 semaines`, `w` = semaines restantes de préparation effective.

| Profil (`level` / `history`) | G∞ vélo (FTP) | G∞ course (allure seuil) | G∞ nage (CSS) |
|---|---|---|---|
| débutant ou reprise | 0,24 | 0,18 | 0,20 |
| intermédiaire / confirmé | 0,08 | 0,06 | 0,07 |
| avancé / longue date | 0,04 | 0,03 | 0,035 |

La course reçoit un G∞ plus bas que le vélo : l'économie de course ne gagne que 2–4 % (Barnes & Kilding 2015) et progresse lentement. Ces valeurs sont des **plafonds heuristiques** : à écrire dans le code avec la mention « heuristique convergente, non issue d'une source primaire », et à réviser dès qu'on aura des données internes.

**P3 — La mesure prime sur le prior.**
Si `answers.tests` contient ≥ 2 points datés du même type, espacés d'au moins 6 semaines : calculer le taux **mesuré** de l'athlète (%/semaine), le rétrécir vers le prior (`w_mesure = n_points / (n_points + 2)`), et **borner par P2**. `gainSource` passe à `"mesure"` ou `"mixte"`, et la décision le dit. C'est la seule façon de sortir de l'heuristique : l'athlète devient sa propre référence.

**P4 — Le bénéfice d'affûtage ne s'ajoute que si l'affûtage existe.**
`+1,96 %` (Bosquet 2007) appliqué **uniquement** si le plan contient un affûtage conforme : 2–3 semaines (garanti depuis R13.6), réduction de volume 41–60 % vs le pic, intensité maintenue. Vérifier les trois, pas seulement la présence d'une phase `taper`.

**P5 — L'exposant de Riegel suit le volume.**
`exp = 1,04` (≥ 12 h/sem) · `1,06` (8–12) · `1,09` (5–8) · `1,12` (< 5 h/sem), interpolé. Quand le kilométrage course hebdomadaire est disponible (il l'est : le plan le prescrit), basculer sur **Vickers-Vertosick** pour marathon et semi. Cette règle corrige **aussi la prédiction « forme actuelle »** — c'est le seul point de R14 qui touche l'existant.

**P6 — Le pacing ne se projette JAMAIS.**
Les cibles de puissance vélo et d'allure restent calculées sur la **référence mesurée la plus récente**. `projected.items` reprend à l'identique le leg « Vélo » de `items`, avec la mention *« cible ancrée sur ta FTP mesurée — elle bougera à ton prochain test »*. Raison : une projection optimiste qui remonte l'IF de 0,73 à 0,78 fait partir trop vite, et le coût se paie au marathon (voire à l'abandon). **Le temps se projette, l'intensité s'ancre.** C'est la règle de sécurité du chapitre.

**P7 — L'incertitude s'affiche et se calcule.**
`spreadPct = 0,03 + 0,05 × (horizonWeeks / 52) + 0,03 × (âge du test le plus récent en semaines / 52) − 0,02 × (adherence − 0,5)`, borné à `[0,03 ; 0,12]`. Au-delà de **±12 %**, `applicable = false` et l'UI affiche *« trop tôt pour projeter un chrono — voici ta forme d'aujourd'hui »*. Repère de calibration : le SEE de 57 min de Rüst 2011 sur un Ironman ≈ ±8 %, notre borne haute doit être du même ordre.

**P8 — Aucune projection sans matière.**
Pas de référence mesurée pour une discipline → pas de temps projeté pour cette discipline (le conseil de test existant suffit). Adhérence < 50 % → gain ramené à ≈ 0 avec le motif affiché : *« sur les 6 dernières semaines, moins de la moitié des séances ont été faites — le plan ne peut pas produire le gain qu'il prévoyait »*. Jamais de reproche, jamais de silence.

**Critères :** `R14.2` (P6), `R14.3-A/B` (P2, horizon), `R14.4` (P2, plafonds), `R14.5-A/B` (P1, P8), `R14.6-A/B` (P7), `R14.7` (P3), `R14.8` (P5), `R14.9` (P8).

---

## R14.3 — Deux corrections de contexte à reprendre au passage

**a) Unifier `terrain` et `course_profile`.** Deux champs pour la même idée, avec des clés qui ne se recouvrent pas : `COURSE_PROFILE_RUN` doit accepter la clé `montagne` du schéma (ou, mieux, être **dérivé du domaine de `terrain`** comme R13.1 l'a fait pour les bornes physiologiques). Le jour J utilise `a.terrain`, la carte Prédiction utilise `answers.course_profile` : tant qu'ils divergent, le même athlète peut lire deux chronos différents dans deux écrans de la même app. Une seule source, et un seul chemin.

**b) Le dénivelé vélo (cas Nice, ~2500 m D+).** Le coût métabolique suit la puissance **normalisée**, pas la moyenne : sur parcours vallonné, NP et AP divergent nettement. La cible d'IF doit descendre (borne basse de la bande `TRI_BIKE`, voire −0,02) et le conseil de pacing mentionner l'indice de variabilité. À traiter comme un **conseil**, pas comme un chrono vélo — le module a raison de ne pas prédire un temps de vélo.

**Critère :** `ANX-PROF`. Le dénivelé vélo n'a pas de critère automatique : c'est une revue manuelle.

---

## Ce qu'il ne faut pas faire (liste noire, à relire avant de coder)

1. Dériver un chrono de la CTL, de l'ATL ou du TSB.
2. Afficher un temps projeté sans fourchette ni date de référence.
3. Projeter une cible de puissance ou d'allure du jour J (P6).
4. Appliquer un gain de débutant à un athlète expérimenté.
5. Promettre le bénéfice d'affûtage quand le plan n'affûte pas conformément.
6. Remplacer la prédiction « forme actuelle » par la projetée — les deux coexistent, la mesurée reste l'ancre.
7. Garder `pctLoad` comme mesure de fiabilité.
8. Écrire les plafonds de gain comme des vérités : ce sont des heuristiques, le code doit le dire, et P3 doit pouvoir les remplacer par la mesure de l'athlète.

---

## Non-régressions à protéger

`ANX-NR` verrouille la prédiction « forme actuelle » du profil de référence (1h19–1h24 · 159–173 W · 4h00–4h15). `R14.9` verrouille le refus honnête quand les références manquent. Relancer aussi **`bench_r13.js`** (23 critères) et `npm run audit:v1 / audit:v2` : P5 modifie l'extrapolation, donc les temps affichés dans le `det` du jour J, que R13.4 vérifie.

Ordre suggéré : **R14.3-a** (unification des clés, une heure) → **R14.1** (contrat + squelette) → **P1/P2/P7/P8** (le cœur, testable immédiatement) → **P3** (journal de tests) → **P4** (affûtage) → **P5** (Riegel variable, seul point qui touche l'existant) → **P6** (garde de pacing) → **R14.3-b** (revue manuelle dénivelé).
