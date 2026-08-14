# Phase 2.0 — les mesures préalables exigées par l'arbitrage B-22

**Date** : 14/08/2026 · Répond à `ARBITRAGE_B22_PHASE2.md` §1-§3, §5, §6.

> **⚠ RECTIFICATIF (14/08/2026, après relecture de l'historique).** Ce rapport affirmait
> « B-21 toujours gelé » et « hors course sèche le pont passe `undefined` ». **Les deux étaient
> faux au moment de l'écriture** : le commit `f2ccd7d feat(B-21)` (13/08, 23:49 — AVANT
> l'arrivée du gel, sous la décision alors en vigueur « découpler et recalibrer ») a décloisonné
> l'exposant, câblé `runHoursPerWeekOf(plan)` dans le pont (le volume de course MESURÉ sur le
> plan livré, la résolution que §7 recommandera plus tard), et — écart avec la décision de
> l'époque — **abandonné la recalibration de `TRI_RUN` après l'avoir mesurée quasi inerte**
> (89,1 % des tri et 99,3 % des duathlon vivent au plancher de la table d'ancrages) au profit
> d'un **ancrage nouveau `[1,5 h → 1,15]`**, prolongé à la pente du segment le plus bas.
> Cet ancrage est une affirmation de modèle posée SANS arbitrage du fondateur — signalée ici
> pour décision : la conserver (avec sa justification mesurée) ou la retirer. Les mesures de ce
> rapport (bandes, legs prédits) ont toutes été prises SUR l'état réel du code, B-21 compris :
> les chiffres tiennent, c'est leur CADRE qui était faux. Cause de la faute : le travail du
> tour interrompu n'était plus dans mon contexte résumé — j'ai décrit ma mémoire au lieu de
> relire le dépôt, la faute exacte que §0 m'a fait traquer chez les autres.


---

## 2.0 — La table exigée : bande `rn.mara` des triathlètes vs témoin course

Mesurée sur les plans ÉMIS (seuil 4'15/km partout, allures relevées dans le `det` des séances) :

| profil | bande `rn.mara` AFFICHÉE | ratio /seuil | plancher mordu ? |
|---|---|---|---|
| tri 70.3 · 10 h total | **4'35–4'48/km** | 1,078–1,129 | non |
| tri Full · 15 h total | **4'35–4'48/km** | 1,078–1,129 | non |
| duathlon PM | ⚠ ligne RECTIFIÉE — voir sous la table | — | — |
| coureur marathon · 10 h *(témoin)* | **4'28–4'38/km** | 1,051–1,090 | **OUI** |

> **⚠ Rectification de la ligne duathlon (14/08, en exécutant B-25).** Ma sonde confondait
> « aucune séance » avec « aucune allure parsée » : le brick **« R1 → vélo (pré-fatigue) »**
> émet BIEN un step `rn.mara` (« cours le R1 à l'allure de course ») — son `det` rend
> « 18min CAP @ **allure cible** », sans chiffre, donc ma regex d'allure ne matchait pas et
> j'ai publié « aucune séance émise ». Le fondateur avait raison de l'interdire comme
> conclusion (§10). Deux constats en le regardant en face : (1) le R1 du duathlon porte la
> même question que le tri — quelle allure vaut pour un R1 de 10 km couru FRAIS ? — mais avec
> DEUX legs de sens différents (R1 frais, R2 pré-fatigué), c'est le chantier symétrique de
> B-25, pas couvert par lui ; (2) le step porte `intensity=[object Object]` — `intOf("rn.mara")`
> rend un objet casté en string, défaut antérieur, enregistré pour la table de traçabilité 2.1.

### Verdict sur la question P0

**Les lignes tri ne rendent PAS la bande du témoin** — le scénario redouté (« un triathlète
reçoit la bande du coureur à 110 km/semaine ») ne se produit pas : B-22 est câblé
`sport === "run" && format === "marathon"`, le tri reçoit la bande STATIQUE de `ZDEF`.

**Mais la mesure expose un défaut du même rang, et il est pire.** Ma propre affirmation de
B-22 (« `rn.mara` n'est prescrit qu'au marathon ») était vraie du seul module course :
`sports/tri/index.ts:52,59,164` prescrivent `rn.mara` — des séances nommées **« Allure course
(tri) : l'allure de course du jour J »**. Confrontées au prédicteur du MÊME profil :

| format | bande prescrite (« l'allure du jour J ») | leg course PRÉDIT par le même moteur | écart |
|---|---|---|---|
| 70.3 | 4'35–4'48/km (1,078–1,129) | 4'42–4'59/km (1,104–1,171) | prescription plus rapide, chevauchement partiel |
| **Full** | 4'35–4'48/km (1,078–1,129) | **5'21–5'41/km (1,260–1,338)** | **46–53 s/km trop rapide** |

Une séance qui se nomme « l'allure de course du jour J » prescrit, sur Ironman, une allure que
le même moteur affirme intenable ce jour-là. **C'est le crime exact d'O-11** (« Rappel
race-pace » vélo 15 % au-dessus de la puissance du jour J), que **R20.5 n'a corrigé que côté
vélo** (`raceBikeBand`) et **B-22 que côté course sèche** — le leg course du tri est le
troisième versant, jamais traité : une bande aveugle au FORMAT sur une grandeur qui en dépend
massivement (1,03 × seuil sur M → 1,30 sur Full).

**Non corrigé ici, délibérément** : c'est le périmètre de **B-04**, que l'arbitrage gèle
jusqu'aux réponses §3 (données) et interdit de conclure depuis des profils course — la mesure
ci-dessus est faite sur des profils TRI. Le correctif a son patron tout tracé
(`refs.runMara` par format depuis le prédicteur du tri, la mécanique `bikeRp`), et il devra
être traité AVEC B-21 (même lot, ordre de l'addendum).

---

## B-25 — livré, avec la vérification §5 et deux écarts à ta prévision

**Le correctif** : `raceRunBand()` dans le prédicteur (centre = ce que `predict()` émet — Riegel
× `TRI_RUN.fatigue`, exposant B-21 compris ; largeur = `RN_MARA_DEMI_LARGEUR` de B-22 — **zéro
constante nouvelle**, le contrat du ticket tient) ; substitution par `refs.runMara`, la mécanique
`bikeRp` reprise telle quelle. La circularité que ton §7 nommait est réelle (les heures de course
se mesurent sur le plan) : résolue par **une seule itération**, ta résolution sanctionnée — on
construit, on mesure, on reconstruit UNE fois ; `refs` ne pilote que du texte, la structure des
deux passes est identique.

**T-16c** (produit sport × format, de bout en bout : bande lue dans le `det` ÉMIS, leg lu dans
`predict()` du même profil) : **rouge avant sur 3 formats sur 4**, vert après, `attendu`
basculé dans le même commit.

**Écart n°1 avec ta prévision** (« essentiel sur Full, marginal 70.3, nul S/M ») : les QUATRE
formats bougent — 145 profils (Full 54, M 31, S 30, 70.3 30), un seul champ feuille
(`sessions[].det` ×1476). La bande statique était fausse dans **les deux sens** : trop RAPIDE
pour Full (l'écart que tu visais), mais trop LENTE de ~50 s/km pour S et M — un leg de 5-10 km
se court plus vite que « l'allure marathon » d'un coureur. Seul 70.3, le format sur lequel la
bande avait manifestement été calibrée, recouvrait déjà.

**Écart n°2 — un défaut dans ma propre passe, attrapé par le diff avant recapture** : ma
première écriture capturait l'état de troncature APRÈS la première `buildDays` — troncature
no-op, et la seconde passe DUPLIQUAIT les décisions (mesuré : 11 → 12 sur
`tri/Full/dispo-weekend`, +1 warning). Corrigé (capture AVANT toute passe), re-mesuré : plus
aucun écart de décisions ni de warnings.

**Vérification §5 (classe d'intensité)** : `zoneClass("rn.mara")` classe par SUFFIXE — aveugle
à la bande, comme tu le soupçonnais. Conséquence post-B-25 : sur **M**, la bande dérivée
(0,97–1,03 × seuil) est un effort AU SEUIL compté « modéré », quand `rn.thr` (1,00–1,05) compte
« dur ». Le précédent existe : `bk.rp` est classé PAR SA BANDE depuis R20.4 (`rpBand` passé à
`zoneClass`). Le fix symétrique (passer `runMara` à la classification) change le budget C26 de
la population tri — **rattaché au dossier V-08/B-02a comme demandé, non corrigé en silence**.

**Duathlon** : voir la rectification sous la table 2.0 — le R1 émet bien `rn.mara` (« allure
cible », sans chiffre), c'est le chantier symétrique de B-25 (deux legs, deux sens), pas couvert
par lui ; et son step porte `intensity=[object Object]`, défaut antérieur consigné pour 2.1.

---

## 2.0b — Les réponses §3

### §3.1 Distribution du golden

| `vol_max` déclaré | profils | part |
|---|---|---|
| **10** *(défaut du profil de base)* | **918** | **96,7 %** |
| 3 | 8 | 0,8 % |
| 6 | 8 | 0,8 % |
| 20 | 8 | 0,8 % |
| 12 | 7 | 0,7 % |

**Conclusion §3.3 : confirmée.** Le golden ne peut mesurer ni B-21 ni B-04 — 96,7 % de ses
profils partagent la valeur par défaut (famille A-2, quatrième occurrence). **Le premier
livrable de B-21 n'est pas un correctif : c'est l'enrichissement du golden en volumes de
course variés**, avec la passe dédiée que les précédents A-2 ont déjà établie comme forme.

### §3.2 Sémantique de `vol_max`

**La confusion redoutée n'existe pas.** Le chemin complet, aux trois points d'entrée :

- `bridge.ts:668` et `planGenerator.ts:3207` : `sport === "run" ? parseFloat(vol_max) : undefined`
  — hors course sèche, `riegelExponent` reçoit **`undefined`** et rend 1,06 par repli. Le total
  d'un triathlète n'est **jamais** passé comme des heures de course.
- En course sèche, `vol_max` est le volume déclaré d'un coureur mono-sport : l'approximation
  « total ≈ heures de course » y est raisonnable (au renfo près).

**Deux faiblesses réelles notées au passage** : `bridge.ts:976` (faisabilité) lit
`vol_recent` là où les deux autres lisent `vol_max` — deux sources pour « combien tu cours »,
à unifier dans B-21 ; et le paramètre est un PLAFOND demandé, pas un volume réel — le plan
livré serait la meilleure source (V-09 sait déjà le mesurer : médiane course des tri = 2,03 h).

---

## 2.0c — Provenance du plancher : requalifiée

`RN_MARA_RATIO_PLANCHER = 1.05` porte désormais dans le code : **`provenance: inherited`**
(souvenir de littérature du fondateur, requalifié par lui-même comme n'étant pas une source),
**statut PANSEMENT** (il masque la calibration manquante de `RIEGEL_ANCRES`, il ne la corrige
pas), **condition de sortie écrite** (à retirer quand `RIEGEL_ANCRES` sera recalibrée —
B-21/B-04). Enregistré en dette **O-34** avec son bloc `verify`.

---

## §5 — Le dossier des couleurs de discipline

- La règle est écrite en tête de `zenna-tokens.css` : *une couleur de discipline ne porte que
  le sens de sa discipline* — avec citation de **R27**, qui l'avait appliquée avant qu'elle
  soit énoncée (l'or légendaire refusé parce que `#ffd23d` EST `DISC.rn.ac`).
- **Z-11 est né rouge** (`npm run check:disc`) sur les deux dettes mesurées : la courbe
  Fitness en `var(--zn-swim)` (`plan-view.js`, `tab-today.js` — coexistence vérifiée,
  🎯 Aujourd'hui rend la pile de disciplines ET le graphe) et le dossier or (§4 n°3).
  Contrat du banc v6 : la dette connue n'échoue pas la CI, une **aggravation** oui
  (plafond d'usages de `--zn-swim` : 12, mesuré).
- **n°5 (fatigue = orange-2)** : non tranché, les deux options documentées à l'inventaire —
  relève de la DA, comme demandé.

## §6 — Les trois cliquets sont en CI (32 gates)

| gate | ce qu'il bloque | plafond initial |
|---|---|---|
| `check:tokens` (Z-01) | tout NOUVEAU littéral couleur/durée dans les CSS Zenna | today 20 hex · 5 durées ; tabs 50 · 9 |
| `check:dup` (Z-03) | toute COPIE nouvelle d'une valeur moteur | `_IFZ` = 3 (ne peut que descendre) |
| `check:hosts` (Z-05) | tout hôte requêté hors CSP | **0** — liste blanche LUE de la CSP, jamais recopiée |
| `check:disc` (Z-11) | tout nouvel usage non-disciplinaire d'une couleur de discipline | dette connue : 2 |

**Deux fautes d'instrument dans Z-05, corrigées avant commit et gardées écrites** : ma
première lecture de la CSP attrapait un *commentaire* qui précède la balise (liste blanche
vide → 65 faux rouges, `api.open-meteo.com` compris) ; ma deuxième comptait toute URL du code
et rougissait sur les **62 citations bibliographiques des Éducatifs** — du texte affiché,
jamais requêté. La détection est bornée aux contextes qui déclenchent un chargement
(`fetch`, `src=`, `@import`, `url()`, …), contre-preuve faite : un `fetch` vers un hôte hors
CSP rougit, retiré il verdit.

---

**Suite immédiate (ordre de l'arbitrage)** : 2.1 table de traçabilité (cas modèle `_IFZ`
acquis) · 2.2 no-op moteur avec SHA gelé · 2.3 cohérence affichage/calcul sur les 949 —
puis STOP de Phase 2.

---
---

# Réponse à ARBITRAGE_ANCRAGE_B21 (14/08/2026)

## §2.3 — Les trois vérifications de l'ancrage

**a) Sous 1,5 h : CLAMPÉ.** `riegelExponent` rend 1,15 plat pour tout h ≤ 1,5 (mesuré :
0,3 h → 1,15 · 0,5 → 1,15 · 1,5 → 1,15). Le plancher explicite exigé existe déjà — première
branche de la fonction, pas d'extrapolation folle possible.

**b) L'ancrage est ACTIF sur le golden.** Mesuré sur la grandeur réellement passée
(médiane des heures de course des semaines de charge, la sémantique de `runHoursPerWeekOf`) :
sur 294 plans tri/duathlon, **19 au clamp** (h ≤ 1,5 — ex. `tri/S/reprise/debutant` à 1,12 h),
**211 sur le segment [1,5 → 4]**, 64 au-dessus. Pas du code non testé en service.

**c) Le « 89-99 % au plancher » : à refaire sur l'ensemble stratifié.** Le constat a bien été
mesuré sur la population dont on sait qu'elle ne peut pas mesurer les effets volume-dépendants.
Consigné dans la requalification du code — le statut PANSEMENT est gaté dessus.

**§2.2 appliqué** : `RIEGEL_ANCRES` porte sa provenance complète dans le code (assertion de
modèle non validée · origine f2ccd7d · arbitrage fondateur 14/08 · PANSEMENT gaté sur
l'enrichissement · les vérifications a/b consignées).

## §3 — La mesure exigée : NON NÉGLIGEABLE, corrigé séance tenante

**61 profils tri S/M sur 61** portaient des minutes `rn.mara` au seuil ou plus vite comptées
« modéré » : S ~203 min/plan (~35 min/semaine concernée), M ~248 (~37) — 13 783 minutes mal
comptées sur le sous-ensemble. Ton critère de STOP déclenché → corrigé avant la Phase 2.3 :

**`zoneClass` classe `rn.mara` PAR SA BANDE** — le patron `bk.rp`/R20.4, même geste : la bande
définitive s'attache aux steps dans la 2ᵉ passe B-25 (`st.maraBand`, le seul endroit où elle
existe), la frontière est la borne lente de `rn.thr` (**1,05 — déjà déclarée dans ZDEF**, zéro
constante nouvelle ; recopiée dans loadModel parce que l'engine n'importe pas le renderer, et
**T-20 garde l'égalité des deux écritures**). En allure, plus petit = plus rapide : bande dure
si son bord rapide passe la frontière.

**Effet prouvé** : tri M, 5/5 séances `rn.mara` portent leur bande et comptent du dur. **Rayon
d'action sur les 949** : 145 profils (les mêmes que B-25), et les champs déplacés sont
UNIQUEMENT la comptabilité (`_v2.intensity.*`, repairs) — **aucune séance déclassée, aucune
minute de plan déplacée** : les plafonds C26 absorbent les minutes désormais comptées.
`audit:v1` vert · invariants 22×54 verts · v6 73 verts, 0 régression.

## §4 — T-20, et il a mordu trois fois en naissant

**La question directe (« que fait le classificateur d'un [object Object] ? ») a une réponse
MESURÉE : la question n'avait pas d'objet.** La classification passe par `st.zone`, jamais par
`intensity` — et le « [object Object] » n'existe pas dans l'app : c'était **ma sonde** qui
template-littéralisait le champ. Le contrat réel, relevé sur 2 589 steps : `intensity` est un
OBJET bande `{ref,lo,hi}` posé par `intOf()` (le cast `as unknown as string` ment sur le TYPE,
pas sur la valeur), ou une string (`"easy"` au déclassement C26c, `"aero"` au swimrun), ou
absent ; son unique consommateur est l'export JSON, où l'objet se sérialise proprement.
**Le membre n°3 de la famille était un artefact de mon instrument** — rectifié dans la table 2.0.

Trois morsures de T-20 en une naissance : (1) ma première écriture assertait « string » —
**265 rouges qui étaient 265 fautes de MON contrat** ; (2) reformulé, il a trouvé la string
`"aero"` du swimrun, troisième forme que personne n'avait relevée ; (3) il porte le garde
anti-dérive de la frontière 1,05 (loadModel vs ZDEF). Vert sur le contrat réel, `attendu: vert`.

## §7 — Confirmation

**Oui : `52db1e5` EST le commit B-25** — le SHA gelé l'inclut par identité. La baseline du
no-op portera aussi les correctifs postérieurs de ce jour (famille intensité) : le SHA de
référence effectif sera celui du commit de CE lot, noté au moment de la capture 2.2.

## §6 — La technique forensique, enregistrée

« Le format qui ne bouge pas est celui pour lequel la constante a été calibrée » — ajoutée
comme méthode au dossier des constantes `inherited` (elle a identifié 70.3 pour la bande
statique sans archéologie de commits).
