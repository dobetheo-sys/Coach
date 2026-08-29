# RÉCAPITULATIF — une ligne de fond par réponse

**Dernière mise à jour** : 24/08/2026 · **21 réponses**, de la fiche 00 à l'étape 0 du chantier.

Ce fichier ne remplace aucune synthèse : il donne, pour chaque réponse, **ce qui était demandé,
ce que la mesure a répondu, et ce qui a bougé dans le moteur**. La vérité vit dans
`BUGS_OUVERTS.md` et dans le code ; ceci est une table des matières qui porte les chiffres.

---

## Vue d'ensemble

| # | demandé | verdict mesuré | moteur | commit |
|---|---|---|---|---|
| **00** | le lien de la PWA | fiche de référence (déploiement, `sw.js`, cache) | — | `eaebfd7` |
| **01** | l'alternance `facile2` | **prémisse RÉFUTÉE** : le plan alterne déjà (paires 3,50 nages · impaires 2,13). La pièce pavait la seconde parité → **retirée** | byte-identique, patch conservé | `3a3deb6` |
| **02** | le plancher de fréquence | **2 condamne 64,2 %** des semaines de charge tri ; ce qui sépare n'est pas l'athlète mais le **budget** (0,0 % dès 8 séances). Trois niveaux livrés | livré (module + décision + C3 bornée) | `3a3deb6` |
| **03** | O-98 isolé ou consécutif ? les rouges non épinglés ? | **8 semaines à zéro, toutes ISOLÉES** (l'accident, pas le trou) · audit des 25 rouges attendus | mesures seules | `3a3deb6` |
| **04** | l'entrée de plan du débutant nageur | **22 semaines sans nage FERMÉES** (30 → 8) ; le test en S1 **ARRÊTÉ par C22** (+22 %, violation dure) | 2 gardes livrées, §2a retiré | `e3c44a0` |
| **05** | placement du test · franchissabilité | (b) réfuté par C22 · **(c) livré** : le test suit un créneau de nage, pas un numéro de semaine | livré | `60bbb8d` |
| **06** | `franchissable` est-il vacueux ? | **les deux prémisses RÉFUTÉES** : le verdict est consommé 14/14, et le `min()` de livrabilité est inerte 0/188 | mesures seules | `0711262` |
| **07** | faut-il merger ? | non pour `main` ; **`design/zenna` porte 16 commits non fusionnés** dont une police que V7 a abandonnée | rien touché | `46ba838` |
| **08** | le pic livré maximum sur 990 profils | max **16,00 h** (vélo seul) · **231/986** atteignent leur `vol_max` · **le plafond est structurel** : tous plafonds de séance neutralisés, p90 +0,03 h et les créneaux immobiles | mesure seule | `56d5a9a` |
| **09** | d'où vient « ≤ 3 doublés » ? | **ni constante ni dérivée de `dispo`** : le nombre de créneaux dont la branche `dbl` est ADDITIVE. `facile2` ne double jamais. **O-100 trouvé** | mesure seule | `2c8a20d` |
| **10** | O-100 est-il un artefact ? | **hypothèse RÉFUTÉE deux fois** : le plan livré reste en semaines de 7 dans les deux cas, et l'inversion **persiste** sur 10 j (18,63 contre 16,38) | mesure seule | `fd1f3dc` |
| **11** | dur/facile sur le cycle | **le cycle DILUE le dur** : −29 % de séances dures, −31 % de minutes dures, facile inchangé. Un seul créneau produit du dur, `dur1` | mesure seule | `296b642` |
| **12** | `dur` = dur ou = clé ? | **tranché : séance CLÉ.** `durLong` livre 0,0 % de dur sur les **sept** sports. **O-102 trouvé** : `facile2` livre du dur 34,5 % du temps | mesure seule | `2e8aaac` |
| **13** | la séquence du schéma de 10 | **cinq positions `dur` déclarées, une seule livrée** — et le schéma de 7 a le même ratio (3 → 1). Le levier est le REMPLISSAGE, pas le schéma | mesure seule | `1152ea0` |
| **14** | l'écart est-il d'une position ? | **non : 20 % des positions clés dérivent** (77-82 % contre 100 % à 7 j). Convertir `j5` ne suffit pas — **O-103 avant `j5`** | mesure seule | `ab5d74e` |
| **15** | permanent ou par phase ? | **permanent CONFIRMÉ** : la base ne porte **aucun VO2max** sur 14 499 semaines. **Spec du cycle écrite.** Deux gates rouges attribués à la DATE, pas au lot | spec (commentaire) + 2 instruments ancrés | `76c58e8` |
| **16** | un cliquet, un contrôle statique | **T-62** (zéro VO2max en base, contre-prouvé) · **`check:dates`, 12ᵉ gate**, 5 violations trouvées à l'écriture · **O-104 localisé : il ne touche pas la semaine d'avant course** | 2 gardes livrées | `1627bfd` |
| **17** | pourquoi le pic plafonne à 11,5 h ? | **`G_PLAFOND` n'y est pour rien** (plan byte-identique sous ×3,6, projection ×2,75). La chaîne : `min(20 ; 13 ; 14 ; 11,81)`, argmin = **le nombre de créneaux** | diagnostic seul | `5f0e9c8` |
| **18** | 10 j natif ou 7 j forcé ? | **les deux** : le cycle agit sur la ROTATION, le volume se compte en semaines de 7 (`Math.floor(i / 7)`). **Le cycle de 10 coûte 0,8 h de pic** | diagnostic seul | `7d28d03` |
| **19** | plan du chantier « unité = cycle » | 7 étapes livrables seules · **C22 : garder la pente quotidienne (+14,6 %/10 j)**, à valider · rayon **5 profils** sur 990 | feuille de route | `e0f3d2a` |
| **20** | le partage de la dérive O-103 | **non additif** : chevauchement = condition nécessaire (dérive 0 à 7 j), passes = mécanisme (elles tournent dans les deux états). **Gain de l'étape 5 ≈ 0** | mesure seule | `6d3c0a7` |

---

## Le fil : ce que les 21 réponses ont établi, dans l'ordre où ça s'emboîte

1. **Le pic plafonne, et ce n'est pas une constante** (08, 17). Neutraliser TOUS les plafonds de
   durée de séance déplace le p90 de **0,03 h**. Le maillon est `structurel` = créneaux × durée
   max, pas une table.
2. **Le levier est le CRÉNEAU, et il est calendaire** (09, 18). 7 jours, au plus 3 doublés — et
   le « 3 » n'est écrit nulle part : c'est le nombre de branches `dbl` **additives**.
3. **Le cycle de 10 jours n'aide pas, il coûte** (10, 11, 18). Il dilue le dur (−31 % de minutes
   dures), et le pic livré tombe de **12,32 à 11,52 h** quand on l'active.
4. **La cause est une unité** (13, 14, 18, 19). Le cycle pilote les créneaux, la semaine pilote
   le volume ; 20 % des positions clés n'arrivent pas où le schéma les pose.
5. **Et le partage est fait** (20) : le chevauchement est la condition nécessaire, les passes le
   mécanisme — donc le chantier 19 doit commencer par l'unité, pas par les passes.

---

## Les fautes d'instrument publiées (une par lot, ou presque)

| lot | la faute |
|---|---|
| 02 | ma première borne passait le BUDGET de la semaine — **inerte par construction** (le doublage n'ajoute pas de `GenDay`) |
| 02 | le module manquait au BUNDLE : `buildApp.mjs` maintient `ORDER` à la main, `audit:v1` l'a dit à 108 erreurs |
| 04 | annotation posée sur la ligne `attendu:` → **faux positif de règle 17 dans le correctif de règle 17** |
| 08 | `typeof a.vol_max === "number"` → **§2 à 0/0**, un zéro saturé : le corpus déclare en CHAÎNE |
| 15 | j'ai attribué 3 gates rouges à mon commentaire ; **ils étaient rouges sur `main`** — aujourd'hui est un lundi |
| 17 | ma sonde de projection rendait `NaN` : la moitié SENSIBILITÉ du jumeau manquait, corrigée avant publication |
| 20 | la passe VO2 de dev collait parfaitement aux 6 `dur2→dur1` — **neutralisée, la dérive ne bouge pas.** Passe exonérée, résidu publié |

---

## Ce qui est ouvert, et pour qui

| ticket | ce que c'est | qui décide |
|---|---|---|
| **O-99** | `vol_max` propose une plage inatteignable (20 h → 58 % livrés) | fondateur — informer plutôt que brider (O-17) |
| **O-100a** | `weekend` > `quotidienne` : modèle correct, **à DIRE** | fondateur — un message |
| **O-100b** | `semaine` > `quotidienne` : vrai défaut, confirmé | couvert par le chantier 19 |
| **O-101** | `doubles` posée à tous les sports, inerte hors tri · **plafond mono-sport jamais énoncé** (9,8 h en marathon) | fondateur |
| **O-102** | `facile2` étiqueté `facile` livre du dur **34,5 %** du temps | à traiter avec le chantier |
| **O-103 / O-104** | la dérive et la variance du volume par jour de course | **chantier 19, étapes 2-5** |
| **résidu** | 6 jours `dur2→dur1` sans producteur identifié (46 % de la dérive de `REEL`) | **à localiser avant l'étape 5** |
| **C22** | pente quotidienne (+14,6 %/10 j) ou +10 %/cycle | **fondateur — c'est une règle du manifeste** |

---

## État des gates au dernier commit

```
npm run batterie      12/12 verts
   audit:v1 459 à 0 · audit:invariants 22×54 · audit:v6 74 verts 0 régression · audit:v7
   audit:r13 · audit:r14 · audit:r14.1 · audit:r18
   golden:verify 990/990 · 0 écart · golden:bundle · lotPhysio 32 verts · 25 rouges attendus
   check:dates 12 bancs gardés · 0 violation
```
