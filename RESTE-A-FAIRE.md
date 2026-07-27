# Reste à faire — état au 27/07/2026

Avancement global : **~90 %** de la vision (`note.md` + `ROADMAP-V2.md`).
Le noyau critique (priorités 1-4 du manifeste : santé, blessures, régularité, progression)
est à **100 %**, mécanisé et gardé vert par la CI (6 contrôles sur chaque push).

## ✅ Fait (rappel en une ligne chacun)

Moteur V2 complet (raisonne → génère → audite → répare) · 486/486 profils verts ·
affûtage garanti ≥40 % · promesses calibrées (sonde de capacité) · répartition 80/20
mécanisée · adaptation quotidienne (readiness + météo Open-Meteo) · boucle prévu/réel
depuis les ✓ · prédiction de course (Riegel/CSS/%FTP, fourchettes) · historique
prévu vs réel · streak + avancement + badges · UI branchée sur le moteur (bundle
auto-testé, legacy en repli) · docs (CLAUDE/ARCHITECTURE/ROADMAP) · CI 6 gardes.

## 👤 À TOI — personne d'autre ne peut le faire

| Action | Pourquoi |
|---|---|
| **Merger la PR #2** | Tout le travail vit sur la branche `claude/claude-md-documentation-2hfuxx` — tant qu'elle n'est pas mergée, `main` reste l'ancienne version. CI verte, PR propre, prête. |
| **Tester avec ton profil réel** | Ouvrir `Coach_Pro_V1.5.html`, générer ton plan tri avec tes vrais seuils (FTP/allure/CSS), cocher tes séances une semaine, essayer « Forme du jour ». C'est l'étape 6 de la roadmap et le seul vrai juge. |
| **Avis nutritionniste** | Le module nutrition est volontairement bloqué tant qu'un(e) pro n'a pas validé l'approche (calories/macros/glucides-heure). Sans ça, on ne le code pas. |
| **Décision infra pour Strava** | L'import automatique demande un relais OAuth (mini-backend ou service type Cloudflare Worker). À toi de dire si tu veux héberger ça — sinon on reste sur les ✓ manuels, qui marchent. |

## 🔧 Reste côté code — par ordre recommandé

| # | Chantier | Effort | Bloqué par | Détail |
|---|---|---|---|---|
| 1 | **Export PNG / partage** | Petit | rien | Canvas depuis la semaine ou le plan rendu, bouton « partager ». L'export HTML/ICS/JSON existe déjà. |
| 2 | **Import Strava automatique** | Moyen | ta décision infra | Le contrat `CompletedSession` est prêt (les ✓ l'utilisent déjà) ; il ne manque que le relais OAuth. Strava couvre les séances réalisées, PAS le sommeil/HRV (qui restent en saisie manuelle). |
| 3 | **Source FIT (upload fichier)** | Moyen | rien | Parser le format FIT en zéro-dépendance est faisable mais dense. Alternative : accepter l'export CSV/GPX. Slot déjà prévu dans `ReadinessSource`. |
| 4 | **Nutrition** | Moyen | avis nutritionniste | Calories, macros, glucides/heure sur les longues, hydratation par température (la météo est déjà là). Architecture prévue (`src/nutrition/` dans la roadmap). |
| 5 | **API Garmin (HRV/sommeil auto)** | Moyen | agrément Garmin Health API (B2B, non garanti) | La logique est prête et agnostique de la source — si l'accès arrive un jour, c'est un adaptateur à écrire, rien d'autre. |
| 6 | **Célébrations « moment »** | Petit | rien | Veille de course, fin d'affûtage — notifications visuelles ponctuelles (les badges durables existent). |
| 7 | **Vue 10 jours (cycles use10)** | Petit | rien | Le moteur gère les cycles de 10 jours (dispo quotidienne) ; vérifier le rendu UI de bout en bout sur ce mode — moins testé que le 7 jours. |

## 🧹 Dettes techniques assumées (documentées, pas urgentes)

- **Générateur legacy dans le HTML** : gelé, sert de repli si le bundle manque. Ne plus le
  faire évoluer ; le supprimer un jour quand le moteur V2 aura tourné en réel sans accroc.
- **Écart de métrique récup inter-blocs** : l'auditeur compte la récup entre répétitions,
  le générateur non — documenté dans ARCHITECTURE.md, ne PAS « corriger ».
- **Prédiction vélo sans chrono** : choix assumé (le chrono dépend du parcours) ; si un jour
  on collecte distance + D+ du parcours, un chrono devient possible.

## 📏 Règles d'entretien (pour toute session future)

1. Toute modification de `src/` → `npm run build:app` (sinon `check:app` rouge en CI).
2. Toute modification du générateur → les 4 audits/démos doivent rester verts.
3. Tout invariant nouveau → identifiant `Cn`/`R3.x`/`V2.x` + scorer + registre ARCHITECTURE.md.
4. Mesurer avant de corriger — l'auditeur dit qui viole quoi.
5. `note.md` prime sur tout, y compris ce fichier.
