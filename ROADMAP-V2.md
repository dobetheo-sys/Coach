# Synthèse : Refonte V2 du moteur de plans d'entraînement

> **Document amendé suite à la revue d'architecture (2026-07)** — les corrections sont
> intégrées en place et récapitulées dans la section « 📝 Amendements » en fin de document.

## 🎯 Vision globale
Transformer l'appli d'un simple remplisseur de calendrier en **coach IA intelligent** qui raisonne avant de générer, valide automatiquement et s'adapte aux données de récupération en temps réel.

---

## 🏗️ Architecture requise

### Phase 1 : Moteur de raisonnement (avant génération)
**Le moteur doit analyser et décider :**
- Objectifs (distance, chrono, A/B/C)
- Niveau athlète (FTP, VMA, seuil CAP, niveaux de natation)
- Contraintes (horaires, matériel, climat)
- Calendrier (compétitions, vacances, déplacements)
- Historique (blessures, récupération moyenne)
- Progressions maximales autorisées (par sport, par semaine)

**Output : Matrice de contraintes** → guide la génération

### Phase 2 : Génération cohérente
- Construire l'alternance semaines de charge/décharge (concept distinct de la répartition d'intensité)
- Répartition d'intensité **80/20** (pyramidale — chiffre canonique unique ; l'ancien « 85/15 polarisé » est abandonné car la bibliothèque de séances inclut Sweet Spot et tempo, incompatibles avec un modèle strictement polarisé)
- Respecter les contraintes de variété (pas 2 longues CAP d'affilée, etc.)
- Différencier intensités : facile / modérée / difficile
- Calculer calories/macros automatiquement

### Phase 3 : Audit automatique (scoring de cohérence)
**Score /100 vérifiant :**
- Progression volume (pas +10% / semaine)
- Ratio charge aiguë/chronique (sain)
- Respect des contraintes "interdites"
- Alternance charge/récupération
- Répartition 80/20 des intensités
- Risque blessure (charge jambes, impact CAP, etc.)

**Contraintes dures vs souples :** les règles de sécurité (drapeaux médicaux, interdictions
strictes, caps blessure) sont **bloquantes indépendamment du score** — un plan à 91/100 qui
viole le garde-fou médical est rejeté. Le score /100 ne pondère que les critères de qualité.

**Si score < 90 → réparation ciblée** (et non régénération aveugle) :
- L'audit renvoie les contrôles en échec et les semaines concernées ; le générateur corrige
  ces points précis. Une régénération aveugle avec un générateur déterministe reproduirait
  le même plan et le même score → boucle infinie par construction.
- Maximum d'itérations plafonné. Si les contraintes sont insatisfaisables (ex. 4h/sem
  déclarées pour un Full), afficher le meilleur plan obtenu **avec avertissements
  explicites** (« ce plan score 82 : ton volume disponible ne supporte pas cet objectif »).
  C'est un output de coaching précieux, pas un échec.
- **L'audit doit rester indépendant du générateur** : implémentation séparée, calcul
  bottom-up de la charge réellement prescrite (somme des minutes/mètres des séances,
  comme l'audit V1 de note.md). Sinon l'audit valide trivialement ses propres règles.

### Phase 4 : Dynamique readiness (adaptation quotidienne)

> ⚠️ **Risque produit — accès API Garmin non garanti :** HRV, Body Battery et Training
> Readiness passent par le Garmin Health API, un programme B2B sous agrément qui peut ne
> jamais être accordé à ce projet. Garmin Connect n'a pas d'API publique grand public.
> **Architecture : source de readiness enfichable** (`readinessSource`), 3 niveaux :
> 1. **Saisie manuelle (MVP)** — « comment as-tu dormi ? / FC du matin »
> 2. **Upload de fichiers FIT**
> 3. **API Garmin** si l'accès est accordé
>
> La logique d'ajustement ne dépend pas de la provenance des chiffres. Strava fournit les
> séances réelles effectuées (utile pour l'écart prévu/réel) mais ni HRV ni sommeil.
> « Recalcul chaque matin » signifie en pratique **recalcul à l'ouverture de l'appli**
> (pas de backend requis pour les Sprints 0–2 ; persistance localStorage d'abord).

**Input Garmin (ou source équivalente) :**
- HRV (7-day rolling avg)
- Sommeil (qualité, durée)
- Body Battery
- Training Readiness
- VO2Max, temps récupération
- Séances réelles effectuées

**Logique d'ajustement :**
- HRV basse + sommeil mauvais → remplacer VO2 par endurance
- Training Readiness très haute → garder séance qualité
- Body Battery faible → récupération active
- Écart séances prévues/réelles → recalculer fatigue accumulée

**Recalcul chaque matin** avec replanification dynamique

---

## 📋 Règles de génération

### Cyclage (par sport)

#### Vélo
- **Variété :** VO2Max, Sweet Spot, basse cadence, sprints, vélocité, Over/Under
- **Endurance :** longues sorties Z2, endurance spécifique Ironman
- **Réduction :** limiter place du seuil classique

#### CAP (Course à pied)
- **Volume :** max 2h15 sauf préparation spécifique — exceptions **encodées par format dans
  la matrice de contraintes** (marathon jusqu'à 3h, trail jusqu'à 4h30 : caps V1 validés
  par fuzzing), sinon l'auditeur flaggerait toute longue marathon/trail légitime
- **Séances :** Seuil, VMA, easy, long
- **Risque :** limiter impact et blessure

#### Natation
- **Minimum conseillé :** 1500 m — **non-débutants uniquement** : le débutant reste plafonné
  200–900m par sa technique (cap V1 validé, risque épaule) quel que soit le format visé
- **Idéal :** 2000–3500 m
- **Technique :** plus courte seulement si objectif pédagogique clair (cas explicite du
  palier débutant)

### Interdictions strictes
- ❌ Deux longues CAP consécutives
- ❌ Deux séances jambes exigeantes successives
- ❌ Deux sorties >2h rapprochées
- ❌ Semaines de récupération plus chargées que semaines normales

### Différenciation des intensités
- 🟢 **Facile** : Z1–Z2, récupération active
- 🟡 **Modérée** : Z3, tempo, endurance
- 🔴 **Difficile** : VO2Max, seuil, sprints, VMA

Les couleurs doivent refléter la charge réelle.

### Progressions
- Basées sur charge 4 dernières semaines
- Ratio aiguë/chronique
- Volume max autorisé (par sport)
- **Jamais +10% / semaine**
- Limiter augmentations trop importantes

---

## 🌡️ Intégrations externes

### Météo
- **Forte chaleur**
  - Vélo tôt le matin
  - Natation privilégiée
  - Réduction intensité CAP
- **Pluie** → adaptations surface
- **Canicule** → repos forcé ou intensité réduite

### Calendrier
- Vacances → adapter semaines
- Déplacements → recalibrer charge
- Compétitions → taper automatique
- Jours de repos imposés → intégrer

### Nutrition (auto-calculée)
- Calories journalières
- Glucides / Protéines / Lipides
- Hydratation
- Nutrition pendant les séances (glucides/heure)
- Stratégie de récupération post-effort

---

## 📊 Interface & Gamification

### Dashboard analytique
- Répartition intensités (graphique polar/barres)
- Évolution charge (tendance)
- Évolution volumes (par sport)
- Prédiction niveau de forme (CTL/ATL)
- Projection performance en compétition

### Séance interactive
- **Pourquoi** cette séance ? (objectif pédagogique)
- **Bénéfices** ? (gains attendus)
- **Impact** sur objectif final ?
- Badge, progression, XP
- Historique vs plan

### Partage
- Export PNG
- Export PDF
- Intégration Instagram
- Intégration Strava

---

## 🔄 Boucle de raisonnement

```
┌─────────────────────────────────────┐
│  Saisir profil athlète              │
│  (FTP, VMA, niveau nata, age, poids)│
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Analyser contraintes               │
│  - Calendrier (compétitions)        │
│  - Blessures/limites                │
│  - Niveau athlète                   │
│  - Horaires disponibles             │
│  - Matériel                         │
│  - Climat                           │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Calculer matrice de progression    │
│  - Volume max / sport               │
│  - Ratio charge aiguë/chronique     │
│  - Cycles polarisés (85/15)         │
│  - Semaines charge/décharge         │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Générer plan brut                  │
│  - Applique règles de variété       │
│  - Respecte interdictions           │
│  - Intègre nutrition                │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Auditer cohérence (score /100)     │
│  ✓ Progression volume               │
│  ✓ Ratio aiguë/chronique            │
│  ✓ Contraintes respectées           │
│  ✓ Alternance charge/récupération   │
│  ✓ Répartition 80/20                │
│  ✓ Risque blessure                  │
└────────────────┬────────────────────┘
                 ↓
        ┌────────────────┐
        │ Score < 90 ?   │
        └────┬───────┬───┘
             │ Oui   │ Non
             ↓       ↓
        [RÉGÉNÉRER] [AFFICHER]
             │           │
             └─────┬─────┘
                   ↓
        ┌─────────────────────────────────┐
        │  [QUOTIDIENNEMENT]              │
        │  Récupérer données Garmin       │
        │  - HRV (7j rolling)             │
        │  - Sommeil                      │
        │  - Body Battery                 │
        │  - Training Readiness           │
        │  - Séances réelles effectuées   │
        └────────────┬────────────────────┘
                     ↓
        ┌─────────────────────────────────┐
        │  Recalculer fatigue / readiness │
        │  - Charge accumulée             │
        │  - État de récupération         │
        │  - Marge d'entraînement         │
        └────────────┬────────────────────┘
                     ↓
        ┌─────────────────────────────────┐
        │  Adapter séances du jour        │
        │  si nécessaire                  │
        │  (remplacer, modifier, reporter)│
        └─────────────────────────────────┘
```

---

## 🚀 Priorisation pour implémentation

### Sprint 0 (Spec exécutable) — l'auditeur d'abord
0. **Auditeur de cohérence + modèle de charge, exécutés contre le buildPlan V1**
   - `loadModel` (quantification TSS-like par sport) + `coherenceScorer`
   - Harnais Node décrit dans note.md : extraction du `<script>`, eval indirect,
     parseurs qui **somment** réellement minutes/mètres des séances
   - Termine l'audit V1 interrompu : volume pic vs déclaré, part de la longue,
     suspects connus (BIKE sur-prescrit ?, SWIM/TRI sous-prescrits ?)
   - **L'auditeur devient la spec exécutable du générateur V2** : indépendant par
     construction, testé sur des plans réels avant qu'une ligne du générateur n'existe

### Sprint 1 (Fondations)
1. **Moteur de raisonnement** 
   - Classe `TrainingReasoningEngine`
   - Matrice de contraintes — **importe les caps V1 validés** (FIX cohérence, cap
     débutant nage, accommodations blessures, garde-fou médical) au lieu de les re-dériver
   - Analyse de profil athlète

2. **Générateur de séances**
   - Variété sport-spécifique
   - Différenciation intensités
   - Respect des interdictions
   - **Boucle de réparation ciblée** pilotée par l'auditeur du Sprint 0 (pas de
     régénération aveugle) + fallback « meilleur plan + avertissements »

### Sprint 2 (Adaptation)
3. **Adaptation readiness quotidienne**
   - `readinessSource` enfichable : saisie manuelle (MVP) → FIT → API Garmin si accès
   - Strava pour les séances réelles effectuées (écart prévu/réel)
   - Adapter séances quotidiennes (remplacer, modifier, reporter)
   - Persistance localStorage, recalcul à l'ouverture

### Différé (après que l'audit score ≥90 de façon consistante sur plans générés)
4. **Nutrition** — macros, glucides/heure, hydratation
   - ⚠️ Frontière du conseil diététique : étendre l'avertissement de note.md
     (« faire relire par un vrai coach ») à un(e) nutritionniste avant diffusion
5. **Dashboard analytique** — graphiques intensités, CTL/ATL (réutilise `loadModel`),
   prédiction performances
6. **Gamification** — badges, progression, explications pédagogiques
7. **Partage** — export PNG/PDF, intégration Instagram/Strava

---

## 💡 Principes de développement

### Philosophie du moteur
- ✅ Raisonner avant de générer
- ✅ Chaque décision justifiée et vérifiée
- ✅ Valider avant affichage
- ✅ S'adapter aux données réelles quotidiennement
- ✅ Pas de simple remplissage de calendrier
- ✅ Coach IA de haut niveau

### Code quality
- Architecture modulaire (séparation concerns)
- Types stricts (TypeScript)
- Tests unitaires par module
- **Tests par propriétés (stratégie centrale, pas annexe)** : généraliser le fuzzing V1
  (486 combinaisons, progression monotone) à tout l'espace d'entrée — pour chaque profil
  généré, asserter : progression monotone, aucune interdiction violée, charge sous les
  caps, alternance charge/récup respectée, audit ≥ seuil. C'est le meilleur actif
  d'ingénierie de la V1 ; le porter en V2 tel quel
- Logging des décisions du moteur — reprendre le format V1 `{id, what, val, why}` :
  chaque contrainte de la matrice porte sa provenance et sa justification
- Traçabilité des modifications

### UX
- Expliquer le "Pourquoi"
- Feedback immédiat
- Visualisations claires
- Progression gamifiée
- Adaptation invisible mais perceptible

---

## 📁 Structure fichiers attendue

```
src/
├── engine/
│   ├── reasoningEngine.ts          # Moteur de raisonnement
│   ├── constraintMatrix.ts         # Matrice de contraintes
│   ├── progressionCalculator.ts    # Calcul progressions
│   ├── loadModel.ts                # Quantification de charge (TSS-like) par sport
│   │                               #   FONDATION PARTAGÉE : progression +10%, ratio
│   │                               #   aiguë/chronique (audit) ET CTL/ATL (analytics)
│   │                               #   dépendent tous du même métrique → Sprint 0
│   └── ...
├── generator/
│   ├── sessionGenerator.ts         # Génération séances
│   ├── weekBuilder.ts              # Construction semaines
│   ├── variationRules.ts           # Règles de variété
│   └── ...
├── audit/
│   ├── coherenceScorer.ts          # Scoring /100
│   ├── validator.ts                # Validations
│   ├── regenerator.ts              # Régénération auto
│   └── ...
├── readiness/
│   ├── readinessSource.ts          # Interface enfichable (manuel / FIT / API)
│   ├── manualEntry.ts              # MVP : saisie manuelle
│   ├── garminClient.ts             # API Garmin (si accès accordé)
│   ├── dataAdapter.ts              # Adaptation données
│   ├── dailyAdjuster.ts            # Ajustements quotidiens
│   └── ...
├── nutrition/
│   ├── nutritionCalculator.ts      # Macros/calories
│   └── ...
├── analytics/
│   ├── dashboard.ts                # Dashboard
│   ├── predictions.ts              # Prédictions
│   └── ...
└── ...

tests/
├── engine/
├── generator/
├── audit/
└── ...
```

---

## 📝 Amendements (revue d'architecture, 2026-07)

Décisions actées lors de la revue, intégrées en place ci-dessus :

1. **Réparation ciblée, pas régénération** — un générateur déterministe re-produirait le
   même plan (boucle infinie) ; l'audit renvoie les échecs précis, le générateur les
   répare, avec plafond d'itérations et fallback « meilleur plan + avertissements »
2. **Audit indépendant du générateur** — implémentation séparée, calcul bottom-up de la
   charge prescrite ; sinon l'audit valide trivialement ses propres règles
3. **80/20 canonique** — l'ancien « 85/15 polarisé » est abandonné (contradictoire avec
   les séances Sweet Spot/tempo prescrites) ; distribution d'intensité et alternance
   charge/décharge sont deux contraintes distinctes
4. **Contraintes dures vs souples** — sécurité (médical, interdictions, blessures)
   bloquante hors score ; le /100 ne pondère que la qualité
5. **Minimum natation 1500m scoped non-débutants** — le cap technique débutant V1
   (200–900m) prime
6. **Caps CAP par format** — 2h15 générique, mais marathon 3h / trail 4h30 encodés dans
   la matrice (caps V1 validés)
7. **`loadModel` en fondation Sprint 0** — progression, ratio A:C et CTL/ATL dépendent
   du même métrique de charge
8. **Source readiness enfichable** — l'accès Garmin Health API (B2B, agrément) n'est pas
   garanti ; MVP en saisie manuelle, la logique d'ajustement est agnostique de la source
9. **Sprint 0 = auditeur d'abord, contre la V1** — termine l'audit interrompu de note.md
   et fournit la spec exécutable de la V2
10. **Nutrition/gamification/partage différés** — jusqu'à ce que les plans générés
    scorent ≥90 de façon consistante ; avis nutritionniste requis avant diffusion du
    module nutrition
11. **Persistance localStorage d'abord, pas de backend Sprints 0–2** — « recalcul chaque
    matin » = recalcul à l'ouverture de l'appli

---

## 🎓 Prochaines étapes
1. ~~Valider cette architecture avec Claude Code~~ ✅ Revue faite, amendements intégrés
2. ~~Sprint 0 (auditeur + loadModel contre la V1)~~ ✅ `npm run audit:v1` — spec exécutable, 486/486 vert
3. ~~Sprint 1 (moteur + générateur avec boucle de réparation)~~ ✅ `npm run audit:v2` —
   `TrainingReasoningEngine` + matrice de contraintes + générateur V1Plan-compatible,
   sonde de capacité V2.1, réparation ciblée démontrée (`npm run demo:repair`)
4. ~~Sprint 2 (moteur) : source readiness enfichable + ajusteur quotidien~~ ✅
   `src/readiness/` — verdict motivé verte/orange/rouge, remplacer/réduire/reposer,
   jamais de rattrapage, invariants assertés (`npm run demo:readiness`)
5. Brancher l'UI de Coach_Pro_V1.5.html sur le moteur V2 (générateur + readiness)
6. Tester avec profil athlète réel, itérer sur feedback utilisateur
