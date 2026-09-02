# 48 — Fiche 53 : point d'étape du registre, des gates et du corpus

**Date** : 02/09/2026 · **Fiche** : `53briefpointetaperegistre.md` · **Aucune ligne de moteur
écrite** — rapport de statut.

**Source** : `BUGS_OUVERTS.md` (12 200 lignes, 136 identifiants distincts), `scripts/batterie.mjs`,
`scripts/lotPhysio.mjs`, `scripts/monotonie.mjs`, `golden/hashes.json`, et l'exécution des gates
au commit `fed922e`.

---

# 1. Vue d'ensemble en un écran

| | |
|---|---|
| tickets distincts au registre | **136** |
| fermés / réfutés / sans objet | **~91** (67 %) |
| ouverts ou partiels | **~45** |
| gates de la batterie | **13** · **tous verts** |
| tests du banc `lotPhysio` | 33 verts · **24 rouges attendus, chacun avec son ticket** · 0 régression |
| dettes déclarées du gate de monotonie | **0** (registre vide depuis la fiche 52) |
| corpus golden | **1 074 profils** |
| combinaisons `audit:v1` | 459 · **0 violation dure** |

**Aucun gate n'est rouge, et aucune dette n'est masquée** : les 24 rouges de `lotPhysio` sont une
liste NOMMÉE (§6.3 du banc), et chaque rouge cite le ticket qui l'explique. C'est la forme que le
dépôt s'est donnée après O-9 (« un banc que rien ne lit vaut zéro ») : la dette est visible et
chiffrée, jamais absente.

---

# 2. Les gates — ce que chacun tient

| gate | ce qu'il vérifie | population | statut |
|---|---|---|---|
| `audit:v1` | les règles DURES du manifeste sur le générateur bundlé | **459 combinaisons** (+27 refus typés déclarés) | ✅ **0 violation dure** |
| `audit:invariants` | 22 propriétés toujours vraies d'un plan (dev ≤ pic, échauffement ≤ corps, la longue est la plus longue…) | **54 configurations** (7 sports × 3 enveloppes × 3 niveaux) | ✅ 22 × 54 |
| `audit:v6` | banc de régression externe à ID stables (audit du 29/07) | 75 tests | ✅ 75 verts · **1 dette connue** · 0 régression |
| `audit:v7` | banc externe multi-sport, OFAT + fuzz seedé, contre les PROMESSES et non l'auditeur | ~4 580 profils | ✅ trail 76 % · swimrun 88 % · duathlon 88 %, tous les checks dans leur budget |
| `audit:monotonie` | **aucune inversion** sur les axes déclarés du schéma (vol_max, level, history, allure, CSS, phase) | 1 628 comparaisons · 28 critères | ✅ **28 verts · 0 dette · 0 régression** |
| `audit:r13` | âge, CSS print, nage du tri mono-séance, semaine de course, épaule, plafonds de phase | — | ✅ |
| `audit:r14` | la prédiction PROJETÉE jour J (adhérence glissante, gain saturant, pacing jamais projeté) | — | ✅ |
| `audit:r14.1` | le gain s'indexe sur la distance au potentiel MESURÉ, jamais sur un adjectif déclaré | — | ✅ |
| `audit:r18` | le retour de TEST du fondateur (13 critères) + l'arbitrage R18.5 démontré à chaque exécution | 34 gabarits | ✅ |
| `golden:verify` | photographie au bit près de tous les plans du corpus | **1 074 profils** | ✅ 0 écart |
| `golden:bundle` | le BUNDLE livré rend la même chose que `src/` | 1 074 | ✅ 0 écart |
| `check:dates` | contrôle STATIQUE : refuse une fixture qui dérive une date depuis « maintenant » | — | ✅ |
| `lotPhysio` | 57 propriétés physiologiques et structurelles | corpus complet | ✅ 33 verts · 24 rouges **attendus** · 0 régression |

**Gates hors batterie** : `npm run test:e2e` (Playwright, job CI séparé), `check:app`, `check:sw`,
`check:spec`, et **`registry:check`** — volontairement hors CI, il rejoue les 151 blocs `verify`
du registre pour dire lesquels reproduisent encore.

### Évolutions notables

- **`audit:monotonie` est né à la fiche 47** avec 4 dettes déclarées (O-113, O-114, O-115 ×2).
  Les fiches 48, 50 et 52 les ont toutes payées : **son registre est vide pour la première fois**.
  Conséquence directe : toute inversion qui apparaîtra désormais est une **régression**, plus une
  dette.
- **`golden` est passé de 900 à 1 074 profils** au fil des angles morts fermés (A-2 : allures
  lentes, courses datées, volumes extrêmes, profil réel du fondateur, passes C30b et O-21b).
- **`audit:v1` mesurait le générateur MORT** sur 27 de ses 486 combinaisons jusqu'à R20.4 — il
  appelle désormais le moteur directement, d'où « 459 auditées + 27 refus déclarés ».

---

# 3. Les tickets ouverts, par thème

## 3.1 Sécurité — ce qui protège l'athlète

**Réglé, et gardé.** Drapeau médical (`enforceMedicalHold` : une PORTE dans les builders + un
FILET au point de convergence, après deux réouvertures), bornes d'âge croisées avec le FORMAT
(R15.7-C), garde IMC, borne d'âge de l'estimation énergétique (O-16), les quatre localisations de
blessure, la charge d'épaule bornée et **cliquetée sur le livré** (O-85 puis O-89), le plancher de
fréquence à trois niveaux, le plancher d'échauffement (C13c/d/e), les plafonds d'approche de
course (C28), l'acclimatation au froid bornée aux 8 dernières semaines (O-20.8).

**Aucun ticket de sécurité n'est ouvert.** Les gardes de sécurité ont chacune leur contre-preuve
(la garde d'épaule a fait rougir `B1` du banc v6 quand la fiche 48 a failli l'affaiblir — elle a
mordu au bon moment).

## 3.2 Précision physiologique — natation, allocation, doses

| ticket | statut | ce qu'il couvre |
|---|---|---|
| **O-83** | 🔴 ouvert, **priorité propre** | 92 plans de nage débutant livrent 2 à 5 séances de **15 min** pour 10 h déclarées. Chaque règle de la chaîne est défendable seule ; leur composition rend un plan qui n'entraîne personne. |
| **O-44** | ✅ fermé sur la mesure, **non livré** | plancher de durée de séance en nage : la mesure est faite (distribution bimodale, 36 débutants sur 36 concernés), la passe de regroupement n'est pas branchée. |
| **O-50** | 🔴 ouvert | le plancher de séance de nage (C24b) est exprimé en MÈTRES là où la contrainte est du TEMPS. |
| **O-46** | ✅ réfuté | `CAP_SWIM` n'est pas un plafond de séance mais d'un BLOC de la sortie longue — le ticket d'origine reposait sur une lecture fausse. |
| **O-74** | 🔴 ouvert, mesuré | les semaines de CHARGE du pic ne portent aucune nage seuil sur les profils `reprise`. |
| **O-76** | 🔴 ouvert, **cause non identifiée** | « Nage vitesse » perd sa SUBSTANCE : l'occurrence est protégée, la taille non. |
| **O-47** | 🔴 ouvert | le prédicteur suppose que toute nage de triathlon se fait en eau libre. |
| **O-90** | 🔴 ouvert | la qualité COULE là où le volume SATURE (mécanisme à attribuer par expérience contrôlée). |
| **O-91** | 🔴 ouvert | la sortie longue à pied du tri s'arrête en S22 — 20 semaines sans course longue avant un semi ; le leg course du tri n'a pas de C30. |

## 3.3 Cohérence structurelle — le chantier progression (fiches 46 → 52)

C'est le chantier le plus avancé, et il est **terminé sur son axe principal**.

| ticket | statut | résolution |
|---|---|---|
| **O-77** | ✅ fiche 48 | le plafond de séance suit la POSITION (`capScaleAtWeek`), plus l'ambition déclarée. |
| **O-113** | ✅ fiche 52 | la sortie longue cesse d'être le récepteur élastique — redistribution neutre en volume. |
| **O-114** | ✅ fiche 50 | la décharge se compare à la charge qui **PRÉCÈDE**, comme l'auditeur. 145 inversions sur 60 profils trail. |
| **O-115** | ✅ fiche 50 | même cause qu'O-114, fermé par le même correctif. |
| **O-116** | ✅ fiche 49 | la courbe annoncée était écrite AVANT les passes qui la défont — **14ᵉ occurrence** de la leçon d'ordre de passes. |
| **O-100** | 🔴 §1b confirmé | reste une inversion identifiée, scindée du ticket d'origine. |
| **O-72** | 🔴 ouvert, sortie mesurée | le MAXIMUM du plan est hors de la phase de pic (garde T-58 pose le plateau). |
| **O-21** | 🟡 3 mécanismes corrigés | inversion sur l'axe ALLURE, résidu ramené de +38,7 % à **+5,0 %**. |
| **O-43** | 🔴 **bloqué**, lot arrêté | le plafond structurel se nourrit de la conversion. La redécoupe a été écrite en trois temps, mesurée, et **arrêtée par la règle d'arrêt** (patch conservé). |
| **O-117** | 🟠 ouvert (fiche 52) | `CAP_LONG` est **morte** : les modules course et vélo doublent la table, et le `bnd` déclaré gagne avant la seule branche qui la lit. |

## 3.4 Interface et usage

| ticket | statut |
|---|---|
| **O-30** | ⏳ ouvert — les seuils XP 17-30 de l'avatar sont une extrapolation NON calibrée (dette déclarée, décision produit) |
| **O-31** | ⏳ ouvert — `#ff3d00` porte **trois** sens sur le même écran (marque · charge dure · vélo) ; arbitrage de vocabulaire |
| **O-65** | 🔴 ouvert — trois incohérences d'affichage |
| **O-71** | 🔴 ouvert — le journal des ✓ est adressé par ORDINAUX dans un plan régénéré |
| **O-86** | 🔴 ouvert, court — deux nombres d'interface qui ne disent pas leur portée |
| **O-59** | 🟡 qualifié — non reproduit en harnais ; une anomalie de navigation trouvée et corrigée |

## 3.5 Instrumentation et couverture

| ticket | statut |
|---|---|
| **A-2** | 🟡 mesuré, sonde livrée — le corpus couvre des FORMATS et des NIVEAUX, pas les BRANCHES des règles. `npm run couverture:golden` dérive les croisements réellement lus par le code (238 sur 2 080). **Six angles morts en un mois** ont été fermés par cette voie. |
| **O-49** | 🔴 ouvert, **gelé** — l'auditeur juge un plan contre une référence que ce plan n'a jamais visée |
| **O-80** | 🔴 ouvert, mécanique — le format de fixture a deux canaux et rien ne vérifie qu'une valeur atterrit dans le bon (ferme une classe à 4 occurrences) |
| **O-33** | ouvert — la traçabilité sourcé/heuristique de `projection.ts` n'est fiable qu'au niveau du chapeau |
| **T-27b** | ouvert — la seconde moitié du sceau n'est pas écrite : aucune fonction de diagnostic n'assert `_sealed` à l'entrée |

## 3.6 Performance et prédiction

Réglé : la prédiction connaît le plan qu'elle accompagne (R14), le gain s'indexe sur la marge
MESURÉE et non sur un adjectif (R14.1), le régime débutant existe (P11), le vélo a un chrono et le
triathlon un total avec transitions (PW), le raisonnement inverse ne construit rien (RV, gardé par
`RV-INVARIANT`).

Ouvert : **O-18** (le diagnostic RV ne connaît qu'un sport ; sa table de marge sature là où il sert
le plus — moitié (1) fermée, moitié (2) ouverte).

---

# 4. Les 24 rouges attendus de `lotPhysio` — ce qu'ils disent vraiment

Ce sont des propriétés **écrites rouges avant leur correctif**, conservées comme cliquets. Les
regrouper par famille est plus utile que les lister :

| famille | tests | ce qui manque |
|---|---|---|
| **classification d'intensité** | T-01, T-02, T-05 | trois classificateurs ne s'accordent pas encore sur toute zone ; une zone référencée n'existe pas toujours dans `ZDEF` |
| **bornes de dose et de volume** | T-03, T-04, T-11, T-30 | la longue et le temps dur n'ont pas encore de plafond indexé sur le volume ; des bornes inline subsistent |
| **nutrition et incertitude** | T-08, T-12, T-14, T-17, T-18 | les répétitions nutrition, les cibles glucidiques horaires et les fourchettes d'incertitude ne sont pas systématiques |
| **renforcement** | T-13 | aucun plan ne porte encore 2 blocs de renforcement par semaine |
| **traçabilité des gabarits** | T-10, T-21, T-22, T-09 | des littéraux numériques subsistent dans les messages ; des steps nomment une allure sans être zonés |
| **identité R20.2** | T-25, T-23 | `min(plafonds) === volPeak` ne tient pas encore partout (cause nommée : ce que le point fixe RETIRE n'est déclaré par aucun maillon) |
| **chantier en cours** | T-34 (O-43), T-44 (O-66), T-59, T-60 | chacun attaché à un ticket ouvert ci-dessus |

**Aucun de ces rouges n'est une régression** : le banc distingue « rouge attendu, listé avec son
ticket » de « régression », et il sort en erreur seulement sur la seconde.

---

# 5. Ce qui revient au fondateur — décisions en attente

1. **O-99 · `vol_max` propose une plage que la disponibilité déclarée rend inatteignable.**
   Marqué 🟠 ARBITRAGE : faut-il borner la plage proposée par le calendrier, ou continuer
   d'informer ? (O-17 penche pour informer.)
2. **O-101 · le doublage en course à pied.** La moitié « informer » est livrée ; **ouvrir le
   doublage hors triathlon est une décision d'entraînement**, pas un correctif.
3. **O-31 · l'orange `#ff3d00` porte trois sens.** Les trois issues touchent au VOCABULAIRE de la
   marque, pas à un défaut — aucune n'est neutre.
4. **O-30 · les seuils XP 17-30 de l'avatar.** Extrapolation non calibrée : soit on la calibre sur
   des données d'usage, soit on l'assume comme telle.
5. **O-83 · les plans de nage débutant à 15 min.** Chaque règle est défendable seule ; c'est leur
   COMPOSITION qui produit un plan inutilisable. Trancher demande de dire laquelle cède.
6. **O-117 · `CAP_LONG` doublée.** Faire dériver `durCaps.hi` de `CAP_LONG` demande de vérifier
   les cinq ajustements que les modules posent par-dessus (débutant C23, blessures pied et hanche,
   spécificité C30) — un lot court mais non trivial.
7. **V-08 / B-02a** — arbitrage ROUVERT depuis que la prémisse a été réfutée (P ∝ v³) : le
   reclassement de `sw.aero` ferait déborder 411 semaines sur C26d.
8. **H-2 (push serveur)** et **H-3 (conseil nutritionnel, bloqué sur avis diététicien)** :
   position confirmée, démarches humaines.

---

# 6. Santé du corpus

| | |
|---|---|
| profils golden | **1 074** |
| tri 207 · bike 183 · run 170 · duathlon 154 · swimrun 142 · swim 140 · trail 70 | + passes ciblées C30b (4) et O-21b (4) |
| rayon du dernier lot (fiche 52) | **327 profils** (run 109 · bike 94 · duathlon 92 · trail 32) |
| rayon fiche 50 | 943 profils (tous sports — un changement de définition) |
| rayon fiche 48 | 1 060 profils |

Les trois derniers rayons sont **larges et attendus** : les fiches 48, 50 et 52 ont chacune changé
une règle transverse (plafond positionnel, référence de décharge, part de la sortie longue). Le
golden a fait son travail — aucun de ces mouvements n'est passé sans être photographié.

---

# 7. Deux constats de méthode, trouvés en compilant ce rapport

**(a) Mon propre bloc `verify` d'O-117 est mal spécifié.** `registry:check` le range en
« ne reproduit plus » alors que le défaut est intact : les deux modules portent bien chacun leur
table `durCaps` (vérifié à la main, `grep -c` rend 1 et 1). Sa commande rend un COMPTE que le
vérificateur ne sait pas comparer à son `attendu`. C'est la **règle 17** dans sa forme exacte —
« un `grep` qui ne trouve plus son motif se lit comme un défaut réparé » — commise dans le bloc
écrit la veille pour la documenter. À corriger au prochain passage sur le registre.

**(b) `registry:check` a été mené à son terme, et il rend 6 blocs en échec.** Bilan complet :
**149 blocs joués · 106 reproduisent · 37 ne reproduisent plus · 6 commandes en échec**
(`O-109-piste1-retiree`, `O-105-min-brut`, `O-103-derive`, `alternance-facile2`, `O-45`, `O-69`).
Les « ne reproduisent plus » sont pour l'essentiel des tickets FERMÉS — comportement correct de
l'outil, mais il ne distingue pas « fermé, donc ne reproduit plus » de « ouvert, mais le bloc ne
sait plus le voir ». Un tri par statut DÉCLARÉ du ticket le rendrait lisible en un coup d'œil.

⚠ **Correction d'un chiffre que j'avais publié.** Une première version de ce rapport annonçait
« 39 / 19 / 4 sur 62 blocs » : c'était une exécution PARTIELLE prise pour le tout. Les nombres
ci-dessus sont ceux du run complet.

**(c) Le bloc `verify` d'O-69 échoue, et sa propre trace le contredit.** Il imprime
`S1@13h=9.1 S1@6h=6.5`, dont le lecteur tire un ratio de 1,40 — exactement le seuil exigé. Les
valeurs réelles sont **9,1 et 6,5333**, soit **1,3929**. **L'arrondi de la ligne de preuve masque
que le critère échoue.** Le fond n'est pas cassé : le plancher O-69 fait son travail (la semaine 1
passe de 6,5 h à 9,1 h quand la déclaration passe de 6 h à 13 h) ; c'est le SEUIL qui est épinglé
0,7 % trop haut. C'est le miroir de la faute nommée en T-38 v1 — un critère satisfait par une
valeur posée sur sa borne —, ici dans l'autre sens : **un critère qui rate sa borne d'un cheveu,
sous une trace arrondie qui affirme le contraire.** À réancrer sur la PROPRIÉTÉ (« la semaine 1
suit la déclaration récente ») plutôt que sur un ratio au centième.

---

# 8. Où en est le chantier, en une phrase

Le **chantier progression est terminé sur son axe principal** : les quatre inversions de monotonie
que le dépôt traînait (I13 niveau · O-21 allure · O-77 volume déclaré · O-93 phase) sont fermées,
le gate qui les surveille n'a plus aucune dette, et les 13 gates sont verts. Ce qui reste ouvert se
range en trois familles : **la natation débutant** (O-83, O-44, O-50 — la population la plus mal
servie), **l'allocation et le placement** (O-66, O-90, O-91, O-92 — le plan est sain mais mal
réparti), et **l'interface** (O-30, O-31, O-65, O-71, O-86 — aucun ne touche une séance).
