# HANDOFF R14 — Corrections design visuel + fusion Semaine/Plan + réactivation swimrun

*Renumérote en R-suivant si un handoff R14 existe déjà côté repo — ceci suit la suite de R13 (audit sécurité/science du sport/rétention du 31/07).*

## Contexte

Fait suite à l'audit visuel onglet par onglet du build `EnduraBuild-standalone-6.html` (01/08/2026). Trois décisions produit ont été actées par Théo — **ne pas les re-questionner, les implémenter tel quel** :

1. **Swimrun** : réactivé et assumé officiellement comme sport à part entière.
2. **Semaine + Plan** : fusionnés en un seul onglet.
3. **Périmètre de ce handoff** : tout — fixes rapides + restructuration Profil + échelle typographique.

## Note méthodologique — IMPORTANT

Cet audit a été fait en décompilant le bundle `standalone-6.html` (23 modules embarqués en base64, extraits et décodés), pas depuis le repo `src/`. Les chemins ci-dessous (`js/ui/tab-profile.js`, `js/state.js`, etc.) reprennent la structure logique vue dans le bundle. **Vérifie le préfixe réel dans le repo** (`src/js/...` ou autre) avant d'appliquer — la commande `npm run build:app` mentionnée dans `app.js` confirme qu'il existe un `src/` séparé du bundle. Les noms de fonctions/variables cités (ex. `renderTabProfile`, `ANSWER_SCHEMA`, `TABS`) sont eux garantis exacts, extraits du vrai code.

Toute correction doit être faite dans `src/`, jamais dans le bundle standalone directement (il est régénéré au build et toute modif locale y serait écrasée).

---

## R14.1 — Contraste : `#777` codé en dur

**Constat :** 13 occurrences de `color:#777` en style inline dans `js/ui/*.js` (métadonnées : dates du journal, notes de badges, annotations de source). Contraste mesuré : 3.74:1 sur fond crème (`--bg`), 4.48:1 sur fond blanc (`--bg3`) — sous le seuil AA de 4.5:1 dans les deux cas. `--muted` (déjà dans le design system) est à 5.6–8.6:1 sur les mêmes fonds.

**Fix :** remplacer chaque `color:#777` par `color:var(--muted)`.

**Vérification :** `grep -rn "color:#777" src/js/` doit retourner 0 résultat après fix.

---

## R14.2 — Label manquant : champ FC au réveil

**Fichier :** `js/ui/checkin.js`, la ligne qui génère `<span>FC au réveil (optionnel)</span><input type="number" id="ckHr" ...>`.

**Constat :** le `<span>` n'est pas un `<label>`, aucun `aria-label` sur l'input — invisible pour un lecteur d'écran. Le reste du fichier utilise déjà `<label>` ailleurs (incohérence interne, pas un pattern à réinventer).

**Fix :** envelopper dans `<label>...</label>` en suivant exactement le pattern déjà utilisé dans `tab-profile.js` (`row()`, ligne ~456) : `<label style="..."><span>FC au réveil (optionnel)</span><input .../></label>`.

**Vérification :** l'input `ckHr` doit avoir un ancêtre `<label>` ou un `aria-label`.

---

## R14.3 — Bouton export "HTML" en rouge plein

**Fichier :** `js/ui/tab-plan-general.js` (ou le module qui rend le bloc export — chercher le bouton libellé "HTML" à côté de "AGENDA (.ICS)" / "JSON" / "PNG").

**Constat :** seul bouton d'export en `background:var(--acc)` (rouge), les trois autres sont neutres. Le rouge est utilisé ailleurs dans l'app pour les états d'erreur (`border-color:#c0392b` dans les écrans d'échec de génération) — un bouton d'export en rouge peut se lire comme une alerte.

**Fix :** aligner visuellement sur les 3 autres boutons d'export (neutre/blanc, bordure `--ink`).

**Vérification visuelle** (voir méthode en fin de document).

---

## R14.4 — Pastilles de phase tronquées sur mobile

**Constat :** à 390px de large (mobile standard), "SPÉCIFIQUE" et "PEAK" tronquent en "SPÉCIFIQ…" et "P…" dans la frise à 5 colonnes (Base/Développement/Spécifique/Peak/Affûtage).

**Fix — à choisir en implémentant, pas de préférence forte de mon côté :**
- (a) abréger les libellés (ex. "SPÉ." / "PEAK" / "AFFÛT.") avec le nom complet au tap/hover, ou
- (b) passer en grille 2 colonnes + wrap sur mobile plutôt que 5 colonnes forcées.

**Vérification :** aucune troncature visible à 390px de large.

---

## R14.5 — Raccourci "semaine en cours"

**Constat :** sur un plan de 59 semaines, atteindre la semaine en cours depuis le haut de l'onglet demande de scroller devant badges + "pourquoi" + frise + graphique.

**Fix :** ajouter un lien/bouton "Aller à la semaine en cours" ancré en haut de la frise de phases (ou juste avant le calendrier), qui scroll jusqu'à la carte "SEMAINE N" correspondant à la semaine calendaire réelle (même logique que `todayISO()` déjà utilisée ailleurs pour ancrer la date du jour).

---

## R14.6 — Nutrition : pavé de texte macros

**Fichier :** `js/ui/tab-nutrition.js`.

**Constat :** le paragraphe sur la répartition protéines/lipides/glucides (6+ lignes enchaînées) se lit comme un mur sur mobile.

**Fix :** reformater en 3 lignes compactes (une par macro : protéines ~100-140 g/j, lipides ~60-140 g/j, glucides ~415-580 g/j) plutôt qu'une phrase continue. Garder la source (Burke 2011, ACSM/ISSN) et le disclaimer "estimation, pas une consigne" intacts — c'est le bon texte, juste la mise en forme à revoir.

---

## R14.7 — Profil : replier les blocs secondaires

**Fichier :** `js/ui/tab-profile.js`, fonction `renderTabProfile` (ligne 441).

**Constat :** page à défilement unique de 15 sections. Éditer sa FTP demande de traverser tout le reste.

**Proposition de répartition** (le mécanisme `<details>` existe déjà dans le fichier pour "Conseils personnalisés" — ligne ~549, à répliquer) :

| Bloc | Reste ouvert | Replié par défaut |
|---|---|---|
| Avatar / niveau / XP | ✅ | |
| Sélecteur de plans | ✅ | |
| Échéance + courses intermédiaires | ✅ | |
| Résumé (intention/objectif/niveau/dispo/blessures) | ✅ | |
| ⚙ Références d'entraînement (éditable) | ✅ | |
| 🏅 Records personnels | | ✅ |
| Badges | | ✅ |
| Efficience | | ✅ |
| Retest planner | à trancher toi-même (actionnable → tentant de le garder ouvert) | |
| 💾 Sauvegarde | | ✅ |
| 📒 Journal d'évolution | | ✅ |
| Import FIT + Strava | ouvert **si pas encore connecté** (c'est un CTA), replié si déjà connecté | conditionnel |
| Conseils personnalisés | déjà replié — inchangé | |

**Vérification :** au chargement, la page tient en moins de la moitié du scroll actuel avant d'atteindre les boutons "Modifier"/"Changer de sport".

---

## R14.8 — Échelle typographique : 21 → 6-8 tailles

**Fichier :** `styles.css` (feuille de style principale).

**Constat :** 21 valeurs de `font-size` distinctes, dont 4 sous le pixel (7.5px / 8.5px / 11.5px / 12.5px) — accumulation non délibérée, pas une échelle.

**Fix — c'est le chantier le plus risqué de ce lot, à traiter séparément des autres (commit isolé) :**
1. Lister tous les usages actuels par contexte (titre de carte, eyebrow, corps de texte, métadonnée, bouton…).
2. Proposer une échelle à 6-8 paliers ronds (ex. 11 / 12 / 13 / 15 / 17 / 20 / 26 / 38px — à ajuster selon ce que la liste réelle révèle) qui couvre tous les rôles identifiés sans les confondre visuellement.
3. Remapper chaque usage vers le palier le plus proche, un rôle à la fois (pas un remplacement global aveugle — deux rôles peuvent partager une taille actuelle par accident et doivent rester distincts).
4. Repasser les captures des 4 onglets (voir méthode de vérification) après coup pour confirmer qu'aucune hiérarchie visuelle ne s'est aplatie.

**Vérification :** `grep -o 'font-size:[0-9.]*px' src/styles.css | sort -u | wc -l` doit retourner ≤ 8.

---

## R14.9 — Fusion Semaine + Plan (le plus gros morceau)

**Décision actée :** un seul onglet à la place des deux. **Hypothèse de travail (à confirmer avec Théo avant de coder, pas un fait acquis) : l'identité "🗓 Plan" survit**, celle de "📅 Semaine" disparaît — parce que Plan porte déjà la vue d'ensemble complète (saison, phases, décisions, exports) alors que Semaine n'ajoute qu'un recentrage. Si Théo préfère l'inverse ou un nouveau nom, ajuster avant d'implémenter.

**Étapes :**
1. **Diffuser** `js/ui/tab-week.js` contre `js/ui/tab-plan-general.js` pour identifier précisément ce que Semaine fait et que Plan ne fait pas (candidats probables au vu du code déjà lu : coche ✓ de séance faite, échange de deux jours de la semaine — `applyDaySwaps` existe déjà dans `js/ui/tabs.js`, `S.answers.daySwaps`). Ne pas supposer, vérifier dans le code réel.
2. **Avant de supprimer `tab-week.js`**, grep `from "eb:/js/ui/tab-week.js"` (ou `from "js/ui/tab-week.js"` selon le repo) dans tout le codebase — si d'autres modules importent des fonctions de ce fichier (ex. `tab-today.js` pourrait réutiliser un rendu de "séance du jour"), extraire ces fonctions partagées avant suppression plutôt que les perdre.
3. Porter les affordances actionnables (coche, échange de jour) sur le calendrier de `tab-plan-general.js`, pour la semaine affichée à chaque instant — pas seulement une "semaine courante" isolée.
4. Retirer l'entrée `"week"` du tableau `TABS` dans `js/ui/tabs.js` (actuellement 5 entrées, lignes 18-24) :
   ```js
   const TABS = [
     ["profile", "\u{1F4CB}", "Profil", renderTabProfile],
     ["general", "\u{1F5D3}", "Plan", renderTabPlanGeneral],
     ["today", "\u{1F3AF}", "Aujourd'hui", renderTabToday],
     ["week", "\u{1F4C5}", "Semaine", renderTabWeek],   // ← à retirer
     ["nutrition", "\u{1F957}", "Nutrition", renderTabNutrition],
   ];
   ```
5. Supprimer `js/ui/tab-week.js` seulement après l'étape 2 (fonctions partagées déjà extraites).

**Acceptance criteria :**
- `TABS.length === 4`.
- Aucune erreur console au chargement ni en naviguant entre les 4 onglets.
- Depuis l'onglet "Plan" fusionné : possible de cocher une séance faite ET de voir la vue d'ensemble (phases/décisions/export) sans changer d'onglet.
- Aucun import cassé vers `tab-week.js` (le fichier n'existe plus, ou plus rien ne le référence).

**À faire dans un commit séparé** des items R14.1–R14.8 — c'est le changement le plus structurel, le plus simple à isoler s'il faut revenir en arrière.

---

## R14.10 — Swimrun : réactivation officielle

**Constat :** le swimrun est déjà pleinement câblé dans ce build (sélecteur de sport, validation dédiée dans `steps.js`, table complète dans `config.js`) — il n'y a probablement **rien à coder** pour "l'activer". Le travail ici est de vérification et de nettoyage, pas de développement :

1. Chercher dans tout le codebase (UI + copie/textes) toute trace de messaging impliquant que le swimrun est désactivé, en beta cachée, ou "bientôt disponible" — et le retirer si trouvé.
2. Mettre à jour tout commentaire de code qui référence encore un "retrait par flag" du swimrun (si un tel commentaire existe dans `config.js` ou ailleurs), pour refléter la décision actuelle.
3. **Rappel de contexte** (audit du 30/07, à vérifier si toujours d'actualité) : le swimrun avait le taux de "profil propre" le plus bas des trois sports ajoutés en V2 (78% contre 87% trail / 97% duathlon), avec des items résiduels R5.1–R5.6 encore ouverts à cette date, dont au moins un spécifique au swimrun (inversion de la répartition nage/course, caps d'eau libre traités en booléen plutôt qu'en limite numérique). Maintenant que le swimrun est assumé comme sport officiel — pas un ajout secondaire — ces items méritent d'être vérifiés/clos en priorité si ce n'est pas déjà fait, cohérent avec le principe déjà établi : "un plan faux est plus dangereux que pas de plan."

**Acceptance criteria :** aucune trace de "désactivé/indisponible" pour swimrun dans l'UI ; les items R5.1–R5.6 connus liés au swimrun sont soit déjà clos (à confirmer par un re-run de l'audit existant), soit explicitement priorisés dans un suivi séparé.

---

## Méthode de vérification visuelle suggérée

Pour repasser les captures des 4 onglets après coup sans device réel : servir les fichiers statiques en local (`python3 -m http.server`), réécrire les imports `eb:/` en chemins absolus (`/js/...`) le temps du test pour éviter les soucis de import map avec un schéma custom, seed `localStorage["eb_state_v2"]` avec un profil de test valide (`sport:"tri", answers:{format:"Full", vol_max:13, ...}`), puis Playwright headless (`chromium.launch`) + `page.screenshot({fullPage:true})` par onglet via `setTab(id)`. C'est la méthode utilisée pour produire les captures de l'audit du 01/08 — fonctionne sans device, sans compte, sans réseau sortant.

---

## Ordre d'exécution recommandé

1. R14.1, R14.2, R14.3, R14.6 (fixes mécaniques, bas risque, un seul commit)
2. R14.5 (petit ajout, bas risque)
3. R14.4 (à trancher en implémentant)
4. R14.7 (Profil — restructuration modérée, un commit dédié)
5. R14.10 (swimrun — vérification, pas de dev)
6. R14.8 (typo — commit isolé, repasser les captures après)
7. R14.9 (fusion Semaine/Plan — le plus gros, en dernier, commit dédié, confirmer l'identité survivante avec Théo avant de coder)
