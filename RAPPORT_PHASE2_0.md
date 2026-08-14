# Phase 2.0 — les mesures préalables exigées par l'arbitrage B-22

**Date** : 14/08/2026 · Répond à `ARBITRAGE_B22_PHASE2.md` §1-§3, §5, §6.

---

## 2.0 — La table exigée : bande `rn.mara` des triathlètes vs témoin course

Mesurée sur les plans ÉMIS (seuil 4'15/km partout, allures relevées dans le `det` des séances) :

| profil | bande `rn.mara` AFFICHÉE | ratio /seuil | plancher mordu ? |
|---|---|---|---|
| tri 70.3 · 10 h total | **4'35–4'48/km** | 1,078–1,129 | non |
| tri Full · 15 h total | **4'35–4'48/km** | 1,078–1,129 | non |
| duathlon PM | *(aucune séance `rn.mara` émise — le R2 s'entraîne sur d'autres zones)* | — | — |
| coureur marathon · 10 h *(témoin)* | **4'28–4'38/km** | 1,051–1,090 | **OUI** |

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
