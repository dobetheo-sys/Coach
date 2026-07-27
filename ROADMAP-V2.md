# Synthèse : Refonte V2 du moteur de plans d'entraînement

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
- Construire semaines de charge/décharge polarisées (85/15)
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

**Si score < 90 → régénérer automatiquement**

### Phase 4 : Dynamique Garmin (adaptation quotidienne)
**Input Garmin :**
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
- **Volume :** max 2h15 sauf préparation spécifique
- **Séances :** Seuil, VMA, easy, long
- **Risque :** limiter impact et blessure

#### Natation
- **Minimum conseillé :** 1500 m
- **Idéal :** 2000–3500 m
- **Technique :** plus courte seulement si objectif pédagogique clair

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

### Sprint 1 (Fondations)
1. **Moteur de raisonnement** 
   - Classe `TrainingReasoningEngine`
   - Matrice de contraintes
   - Analyse de profil athlète

2. **Générateur de séances**
   - Variété sport-spécifique
   - Différenciation intensités
   - Respect des interdictions

### Sprint 2 (Validation)
3. **Audit automatique**
   - Scoring de cohérence /100
   - Métriques de validation
   - Régénération automatique

4. **Intégration Garmin**
   - Architecture API-ready
   - Récupération HRV, sommeil, Body Battery
   - Adapter séances quotidiennes

### Sprint 3 (Enrichissement)
5. **Nutrition**
   - Macros auto-calculées
   - Glucides/heure pour longs efforts
   - Hydratation par température

6. **Dashboard analytique**
   - Graphiques intensités
   - Prédictions
   - Prédiction performances

### Sprint 4 (Gamification & Partage)
7. **Gamification**
   - Badges et progression
   - Explications pédagogiques
   - Taux d'avancement

8. **Partage**
   - Export PNG/PDF
   - Intégration Instagram/Strava

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
- Logging des décisions du moteur
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
├── garmin/
│   ├── garminClient.ts             # API Garmin
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

## 🎓 Prochaines étapes
1. Valider cette architecture avec Claude Code
2. Commencer par Sprint 1 (moteur + générateur)
3. Tester avec profil athlète réel
4. Itérer rapidement sur feedback utilisateur
5. Ajouter Garmin dès que fondations stables
