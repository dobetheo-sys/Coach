# ZENNA — Spécification exacte, onglet par onglet
Description littérale de `zenna-maquette-v4-audit-experts.html` — ordre exact des blocs, contenu exact, classes exactes. But : que Claude Code compare bloc par bloc à l'existant et fasse trois choses par onglet : **supprimer** ce qui n'a pas d'équivalent ici, **modifier** ce qui existe mais diverge, **ajouter** ce qui manque. Aucune interprétation à faire — tout est décrit dans l'ordre où ça apparaît à l'écran.

Convention : chaque bloc est numéroté dans l'ordre vertical. `rN` = délai d'entrée en stagger (r1 = premier, r8 = dernier) — l'ordre des `rN` EST l'ordre d'apparition, à respecter dans l'app.

---

## Onglet 1 — 📋 PROFIL

1. **[r1] Carte identité.** Titre de carte "PROFIL — TRIATHLON" / lien "MODIFIER" à droite. Contenu : avatar carré (tuile coupée `clip-path`, fond dégradé orange, initiale) à gauche ; à droite le prénom en Bebas 23px, la ligne "🏆 MENEUSE : [discipline] · NIV [X]", puis **3 jauges** (une par discipline) : icône + nom + "NIV X/30" (coloré par discipline : natation=bleu, vélo=orange, course=or) + barre de progression remplie en largeur %. Entre la jauge vélo et course : une ligne "PROCHAIN : [récompense] · ENCORE [X] XP". Sous le bloc : note "Modifie une valeur : le plan est régénéré et le changement est consigné dans ton journal d'évolution."
2. **[r2] Carte Strava.** Titre "🔗 STRAVA" / statut "CONNECTÉ" en cyan à droite. Note : "Dernier import : il y a X jours · N activités synchronisées. FIT/GPX/TCX importables sans compte tiers."
3. **[r3] Repliable "🏁 TA COURSE".** Fermé par défaut. Contenu en lignes clé-valeur (`kv`) : ÉPREUVE, DATE, OBJECTIF (coloré orange-tint), TERRAIN.
4. **[r4] Repliable "⚙ RÉFÉRENCES D'ENTRAÎNEMENT"**, avec un petit badge "PILOTE TON PLAN" à côté du titre (fond orange, texte noir). Lignes `kv` : FTP (orange-tint), ALLURE SEUIL, CSS NATATION (cyan), VOLUME MAX, VOLUME RÉCENT, POIDS → CIBLE, ANTÉCÉDENT (coloré rouge `--z5` si pertinent).
5. **[r5] Carte rappel.** Titre "🔔 RAPPEL QUOTIDIEN" / heure+statut en cyan à droite ("6H30 · ACTIF"). Note : "Une notification par jour, jamais plus — l'heure se règle ici, pas dans Aujourd'hui."
6. **[r6] Repliable "🏅 RECORDS PERSONNELS".** Lignes `kv` par record (distance/effort → valeur + date). Note en bas : "Un record se gagne, il ne se perd pas — on garde la meilleure valeur jamais atteinte."
7. **[r7] Repliable "🏅 BADGES GAGNÉS · N"** (le nombre dans le résumé du repliable fermé). Contenu : rangée de pastilles (`badge-pill`) avec emoji + libellé.
8. **[r8] Repliable "📒 JOURNAL D'ÉVOLUTION".** Lignes `kv` datées, une par changement de référence (ex. "FTP 220 → 227 W").

**Rien après le journal d'évolution — c'est la fin de l'onglet.**

---

### Motion — Profil
Chaque bloc listé ci-dessus porte déjà son délai d'entrée dans son numéro : **le rN entre crochets EST la classe `.rise rN` à poser sur ce bloc précis**, pas une note à part. Bloc 1 → `rise r1`, bloc 2 → `rise r2`, etc., jusqu'à `r8`.
Effets spécifiques à cet onglet, au-delà du stagger :
- **Barres de jauge** (les 3 barres de niveau par discipline) : `grow-x` — se remplissent de 0 à leur largeur finale à l'entrée, avec un `animation-delay` décalé entre les 3 (~80ms d'écart) pour qu'elles ne se remplissent pas toutes en même temps.
- **Avatar** : `zenna-pulse` léger au repos (halo qui respire), tap → `ease-spring` (scale .93).
- Aucun autre effet — les repliables utilisent uniquement le chevron qui pivote (`transition:transform` sur `.chev`, 420ms), commun à tous les onglets.

## Onglet 2 — 🗓 PLAN

1. **[r1] Carte titre.** "PLAN GÉNÉRAL — [discipline]" en en-tête de carte, puis titre Bebas 22px "TA SAISON EN UN COUP D'ŒIL", puis note : "[N] semaines en semaines de 7 jours, volume [min]h → [max]h. Mésocycles 25 j : 10+10 charge / 5 décharge."
2. **[r2] Bloc décompte** (`count-hero`, carte distincte de la précédente). Très grand chiffre Bebas 52px orange-tint "J−[N]". Sous-titre mono : "AVANT [ÉPREUVE] · [DATE]". Ligne de progression : "Semaine X / N · Y % de la charge accomplie" + barre de progression remplie. Bouton "📤 PARTAGE" en bas.
3. **[r3] Frise de phases** (`ph-line`, PAS dans une carte — élément plein-largeur seul). 5 segments proportionnels à leur durée (flex-grow = nb de semaines) : REPRISE, BASE, DÉV., SPÉ., AFF. — chacun avec son nom + sa durée en semaines. Le segment en cours a la classe `now` (bordure orange, fond teinté, rayures animées). Les segments passés ont la classe `done` (opacité réduite). Chaque segment est cliquable (affiche une explication).
4. **[r4] Repliable "🎯 PRÉDICTION DE COURSE"**, résumé fermé affichant le temps total estimé (ex. "· 5H24 ± 12'"). Contenu : une ligne `kv` par discipline (temps, coloré par discipline) + note explicative.
5. **[r5] Repliable "⚡ RÉPARTITION DES INTENSITÉS"**, résumé "· 85/15". Contenu : barre horizontale à deux segments proportionnels (facile vs intense, couleurs `--z2`/`--z4`) + note "Polarisé — l'intensité se gagne en la raréfiant."
6. **[r6] Carte volume.** Titre "VOLUME · N SEMAINES" / "1 BARRE = 1 SEM" à droite. Corps : histogramme d'une barre par semaine (hauteur = volume, couleur : gris = normal, violet = récup, orange = semaine en cours). Légende sous le graphique.
7. **[r7] Carte semaine en cours.** En-tête "SEMAINE EN COURS · S[N]" + plage de dates + phase. Note : "La grille complète et la coche vivent ici et dans 📅 Semaine — même dessin, même geste, jamais deux comportements." Bouton "📅 OUVRIR LA SEMAINE" qui bascule sur l'onglet Semaine. **Pas de grille de jours recopiée ici — seulement ce résumé + le lien.**
8. **[r8] Repliable "🧭 POURQUOI CE PLAN + DÉCISIONS DU MOTEUR".** Lignes `kv`, une par décision nommée (ex. "NATATION ×3/SEM → DÉBUTANT — LA FRÉQUENCE PRIME"). Note : "Chaque décision est nommée et traçable — c'est le contre-positionnement du produit."
9. **[r8, même palier] Rangée de deux boutons** en bas : "VOIR TOUT LE PLAN" (doré) + "📅 AGENDA" (export .ics).

---

### Motion — Plan
Même règle : `[rN]` = `.rise rN` sur ce bloc.
- **J−[N]** (bloc 2) : count-up depuis 0 jusqu'à la valeur finale à l'entrée de l'onglet (~640ms, easing `--ease-enter`) — pas un chiffre statique, il se compte à l'écran à chaque fois qu'on ouvre Plan.
- **Barre de progression** (`prog-fill`, bloc 2) : `grow-x`, se remplit à sa largeur finale à l'entrée.
- **Frise de phases** (bloc 3) : chaque segment `grow-x` à l'entrée (largeur finale = sa durée proportionnelle) ; le segment `.now` porte en plus des rayures animées en boucle continue (`background-position` qui défile lentement, ~3.6s par cycle) — c'est le seul effet permanent, pas juste à l'entrée.
- **Barre d'intensités** (bloc 5, dans le repliable) : `grow-x` sur les 2 segments, décalés (~120ms d'écart) — se joue à l'ouverture du repliable, pas seulement à l'entrée de l'onglet (le repliable est fermé par défaut).
- **Histogramme de volume** (bloc 6, 40 barres) : chaque barre `grow-y` (hauteur 0 → finale), délai croissant très court par barre (~14ms × index) pour un effet de vague de gauche à droite.
- Tap sur un segment de phase ou une barre : pas de `ease-spring` (ce sont des éléments fins, un scale serait disgracieux) — juste le `toast()` d'explication.

## Onglet 3 — 🎯 AUJOURD'HUI (central)

### État A — avant le check-in (portillon, obligatoire, 1×/jour)
1. **[r1] Carte "POINT DU JOUR"**, résumé "1 / 2" à droite. Contenu : diapositive de question (coach + options en pastilles + éventuel champ optionnel) + points de progression sous la carte.
2. **[r2] Carte "🤒 UN SOUCI AUJOURD'HUI ?"** Bouton "DÉCLARER UNE MALADIE / DOULEUR".

**Rien d'autre n'est visible tant que le check-in n'est pas fait — aucune séance, aucun graphique.**

### État B — après le check-in (le contenu réel de l'onglet)
1. **[r1] Héros du jour** (`hero`, fond dégradé orange plein, `clip-path:var(--cut-hero)` — la seule carte de tout l'onglet à ne PAS avoir de fond sombre). Contenu, dans l'ordre :
   - Ligne du haut : eyebrow "AUJOURD'HUI · [jour] [date]" à gauche ; à droite, sur la même ligne, le chip de verdict ("🟢 MAINTENUE") **et** l'anneau de forme du jour (SVG, % au centre, libellé "FORME").
   - Titre Bebas skewed, grande taille : nom de la séance ("SORTIE SEUIL").
   - Métrique : grand chiffre Bebas + unité ("45 MIN") — **absente si 0 ou non pertinente** (ex. jour de repos).
   - Sous-titre : détail court (zones, cible, lieu).
   - Ligne "pourquoi" avec 💡 : la justification en une phrase.
   - Chip discipline en bas ("🚴 CYCLISME").
2. **[r2] Carte "LE DÉTAIL DE LA SÉANCE"**, résumé "OUVERT D'OFFICE" (= ouverte par défaut, pas un repliable fermé). Contenu : barre de zones segmentée (largeur proportionnelle à la durée de chaque bloc, couleur = zone d'intensité) + légende sous la barre (échauffement / corps / retour au calme). **Cette carte est SÉPARÉE du héros — le héros ne contient jamais ce détail.**
3. **[r3] Bloc micro-défi** (`defi`, PAS un repliable, PAS une carte `.card` générique — sa propre classe avec icône à gauche). Étiquette "MICRO-DÉFI DU JOUR" en or, puis le texte du défi. **Absent les jours de repos, la veille d'une séance de qualité, ou sous drapeau douleur.**
4. **[r4] Carte de validation.** Titre "VALIDER MA JOURNÉE · [date]". Bouton primaire pleine largeur avec icône de coche (SVG qui se dessine à la validation) + libellé qui change après validation ("VALIDER : [séance]" → "[séance] VALIDÉE — BRAVO"). Sous le bouton, une fois validé : chip "🔥 SÉRIE : N JOURS D'AFFILÉE" (masqué avant validation).
5. **[r5] Carte nutrition réduite.** Titre "🥗 NUTRITION DU JOUR" / "VERSION RÉDUITE" à droite. Deux repliables fermés à l'intérieur : "🥤 RAVITAILLEMENT" (résumé avec g/h, ml/h, température — la température affiche un shimmer tant qu'elle n'est pas arrivée) et "🔥 DÉPENSE ESTIMÉE" (résumé en kcal, renvoie vers Outils › Nutrition pour le détail).
6. **[r6] Carte "TA PRÉPARATION".** Titre / "CHARGE ESTIMÉE" à droite. Graphique SVG à 3 courbes (Fitness/Fatigue/Forme) avec aire remplie sous la courbe de fitness, ligne verticale + point pulsé "tu es ici" à la date du jour. Légende sous le graphique. Note : "Séances cochées : X / Y (Z %). La forme remonte à l'affûtage — c'est le but."
7. **[r7] Repliable "🤖 ADAPTATIONS QUOTIDIENNES"**, résumé "· N CHECK-INS · N AJUSTEMENTS". Lignes `kv` datées avec pastille verdict (🟢/🟠/🔴) + libellé de la décision. Note explicative sur la différence avec un plan PDF statique.
8. **[r8] Bouton "↻ REFAIRE MON POINT DU JOUR"** en bas de tout, pleine largeur, style secondaire.

**Ce qui NE doit PAS apparaître dans cet onglet** (déplacé ailleurs par décision produit documentée) : prédiction de course, répartition des intensités, volume — ces trois vivent dans 🗓 Plan. "Régularité d'avancement" et "suivre ma séance en direct" : supprimés du produit, ne doivent réapparaître nulle part.

---

### Motion — Aujourd'hui
**C'est l'onglet le plus riche en motion de toute l'app — et celui où le stagger `.rise rN` a été constaté totalement absent (0 occurrence vs 6-7 dans Nutrition/Plan). Priorité de correction n°1.** Même règle de base : `[rN]` sur chaque bloc listé plus haut, États A et B tous les deux.

**État A (portillon check-in) :**
- Changement de diapo (1/2 → 2/2) : glissement horizontal entrant (`translateX(26px)→0`, ~420ms, `--ease-enter`), pas un simple remplacement de contenu.
- Points de progression : le point courant change de couleur/état sans animation de saut, juste une transition de couleur (420ms).
- Verdict final (après la 2e réponse) : tamponné — `scale(1.25→0.97→1)` + légère rotation, effet "stamp" (~450ms, easing à rebond).

**État B (contenu du jour) :**
- **Héros** (bloc 1) : `hero-orb` respire en boucle (`zenna-pulse`, ~2.4s/cycle) tant que l'onglet est affiché — effet permanent, pas juste à l'entrée.
- **Anneau de forme** (dans le héros) : `stroke-dashoffset` de 100% à sa valeur finale (~1100ms, `--ease-enter`, léger délai de 350ms avant de démarrer pour laisser le héros apparaître d'abord) ; le chiffre au centre fait un count-up synchronisé.
- **Métrique du héros** ("45 MIN") : count-up depuis 0.
- **Barre de zones** (bloc 2, détail séance) : chaque segment `grow-x`, délais échelonnés (~100ms d'écart) dans l'ordre des blocs de la séance.
- **Bouton de validation** (bloc 4) : au clic, la coche SVG se dessine (`stroke-dashoffset` 22→0, ~420ms) — un seul déclencheur, celui du bouton natif, jamais un second chemin ailleurs (CTA collant y compris : il redéclenche ce même bouton, ne duplique jamais l'effet). Confettis + XP flottant au même moment.
- **CTA collant** "Valider" (hors liste des blocs numérotés — apparaît en survol, hors flux) : apparition/disparition liée au scroll (`opacity`+`translateY`, 420ms), jamais un second mécanisme de validation.
- **Météo** (dans le repliable ravitaillement) : shimmer tant que la donnée n'est pas arrivée, puis fade-in (`opacity`+`translateY(4px)→0`, ~360ms) au moment où elle arrive.
- **Graphique de charge** (bloc 6) : les 3 courbes se tracent progressivement (`stroke-dashoffset`, longueur totale → 0, ~1080ms chacune, délais échelonnés de ~240ms entre les 3) à l'entrée de l'onglet. Le point "tu es ici" pulse en boucle continue (`scale`+`opacity`, ~1.9s/cycle).

## Onglet 4 — 📅 SEMAINE

1. **[r1, carte unique — tout l'onglet tient dans une seule carte].**
   - En-tête : titre Bebas "📅 TA SEMAINE · S[N]" + plage de dates et phase à droite.
   - **Anneaux de complétion par discipline** (`disc-rings`) : un mini-anneau + compteur "fait/prévu" par discipline pratiquée cette semaine.
   - **Ligne de distances** (`dist-line`) : un total par discipline, coloré, avec le temps associé ("🏊 2,0 km · 2h00").
   - **Grille des jours** (`weekGrid`) : liste compacte, un jour par ligne. Chaque ligne : badge jour/date, icône discipline (tuile coupée, couleur du jour), titre de la séance + spécification courte, bouton échange (⇄), bouton validation (cercle vide → coche pleine cyan une fois validé).
   - Légende sous la grille : "⇄ POUR ÉCHANGER DEUX JOURS · ○ POUR VALIDER UNE SÉANCE".
   - Bilan : ligne "X/Y séances validées · Zh au programme · N % en facile" + barre de progression (dégradé cyan).
   - Rangée de navigation en bas : "← S[N-1]" / "⌖ CETTE SEMAINE" (doré, désactivé si déjà sur la semaine en cours) / "S[N+1] →".

**Un seul geste de coche, partagé avec Aujourd'hui** : valider ici coche aussi le bouton de validation d'Aujourd'hui si c'est le jour courant, et inversement. Jamais deux mécanismes différents.

---

### Motion — Semaine
- Bloc unique `[r1]` : `.rise r1` sur la carte entière (pas de sous-stagger par ligne de jour — la liste apparaît d'un bloc, elle n'a qu'un seul niveau de hiérarchie visuelle).
- **Anneaux de complétion par discipline** : `stroke-dashoffset` de 100% à leur valeur à l'entrée, délai échelonné (~120ms) entre les disciplines.
- **Coche de validation** par jour : au clic, remplissage instantané (pas de dessin SVG ici, contrairement à Aujourd'hui — c'est un cercle qui se remplit en couleur unie, `background-color` + `scale` bref) + confettis si c'est le jour du jour.
- **Bouton échange (⇄)** : au premier tap (armement), `border-color`+`box-shadow` passent à l'accent or (420ms) ; le glyphe ne tourne pas, seul l'état visuel change.
- **Barre de bilan** (`bilanFill`) : `grow-x` à chaque changement (à l'entrée, et à chaque coche/décoche).

## Onglet 5 — 🧰 OUTILS

### Sélecteur de sous-onglet (toujours visible en haut)
Deux pastilles pleine largeur côte à côte : "🥗 NUTRITION" (active par défaut) / "📚 ÉDUCATIFS".

### Sous-onglet NUTRITION
1. **[r1] Carte d'intro.** "OUTILS · NUTRITION" en en-tête, titre Bebas "TON CARBURANT, EXPLIQUÉ", note : "Des estimations issues des consensus publiés — jamais un régime, jamais une cible d'apport. Ce qui compte : manger assez pour t'entraîner."
2. **[r2] Repliable "🔥 DÉPENSE ESTIMÉE DU JOUR"**, résumé en kcal, **ouvert par défaut**. Lignes `kv` : base + vie quotidienne, entraînement du jour (orange-tint), glucides (g/kg), protéines (g/kg). Note : "Photographie de la littérature, pas un menu ni une consigne."
3. **[r3] Repliable "🥤 RAVITAILLEMENT D'AUJOURD'HUI"**, résumé avec g/h et température, **ouvert par défaut**. Phrase d'intro en gras (nom de la séance + besoin), lignes `kv` (avant/pendant/après), note avec dépense kcal + effet météo.
4. **[r4] Carte du canal de vente** (`shop-card`) — voir spécification complète dans `ZENNA_SPEC_COMPLETE.md` §5 : segmented cadence hebdo/mensuel, détail de période, badges de confiance, sélecteurs goût/format, CTA daté, mention "service pas encore actif".

### Sous-onglet ÉDUCATIFS
1. **[r1] Carte d'intro.** "OUTILS · ÉDUCATIFS", titre Bebas "LA TECHNIQUE, PAR DISCIPLINE", note : "À consulter plutôt qu'à suivre — pioche selon la séance du jour."
2. **[r2, r3, r4…] Un repliable par discipline** (Natation ouvert par défaut, les autres fermés), chacun avec 2 lignes `kv` minimum (un point technique = un intitulé + son explication courte). **Autant de repliables que de disciplines pratiquées** — l'app réelle en a 6 (natation, vélo, course, trail, enchaînements, swimrun), la maquette n'en illustre que 3 à titre d'exemple : suivre le même patron pour les 3 manquants.

---

### Motion — Outils
- `[rN]` par bloc, dans les deux sous-onglets indépendamment (changer de sous-onglet rejoue le stagger du sous-onglet affiché).
- **Changement de sous-onglet** (Nutrition ↔ Éducatifs) : pas de glissement horizontal — simple fade du contenu (le sélecteur lui-même n'anime que son fond actif, transition de couleur 420ms).
- **Canal de vente** : segmented control à pilule glissante (`left` en `%`, transition ~360ms, `ease-spring`) ; lignes de période en stagger propre à la carte à chaque changement de cadence (~90ms d'écart par ligne) ; total en count-up à chaque recalcul (pas seulement à l'entrée) ; activation → confettis + CTA qui bascule en "✓ ACTIVÉ" (fond cyan) avant de révéler l'état actif ~800ms après.
- **Repliables éducatifs** : rien de spécifique au-delà du chevron commun à tous les onglets.

## Barre de navigation (tous onglets)
5 items, le 3e (Aujourd'hui) central et surélevé (`nav-item central`) : icône dans une tuile coupée (`clip-path`) légèrement remontée, fond dégradé orange quand actif. Les 4 autres items : icône SVG trait + libellé, pas d'emoji. Icônes exactes (voir maquette pour le tracé SVG complet) :
- Profil : silhouette (cercle + arc)
- Plan : calendrier/planning (rectangle + lignes)
- Aujourd'hui (central) : cible (cercles concentriques + point)
- Semaine : barres (3 rectangles de hauteurs différentes)
- Outils : grille (4 carrés)

---

## Méthode à suivre pour Claude Code

Pour chaque onglet ci-dessus :
1. Ouvrir le fichier de rendu réel de l'onglet correspondant.
2. Comparer bloc par bloc, dans l'ordre, à la liste numérotée ci-dessus.
3. Pour chaque bloc de la liste absent de l'app → **l'ajouter**, à la même position dans l'ordre.
4. Pour chaque bloc de l'app qui n'a pas de correspondance dans la liste → **le supprimer**, sauf s'il s'agit d'une exception déjà documentée (avatar SVG, fenêtre d'impression, `eb_state_v2`, nom PWA/licence — voir `ZENNA_SPEC_COMPLETE.md` §12.5 et l'historique du chantier).
5. Pour chaque bloc présent des deux côtés mais dont le contenu, l'ordre, ou le style diverge → **le modifier** pour correspondre à la description ci-dessus.
6. Répondre par onglet, pas globalement — "Profil : fait, voici le diff" plutôt qu'un rapport général en fin de chantier.

## Vérification motion — une commande par onglet

Pour éviter de revivre "0 occurrence de `.rise` dans tab-today.js" découvert après coup, exécuter et coller le résultat AVANT de déclarer un onglet fini :

```bash
grep -c "rise" js/ui/tab-profile.js js/ui/tab-plan-general.js js/ui/tab-today.js js/ui/tab-week.js js/ui/tab-outils.js js/ui/tab-nutrition.js js/ui/tab-educatifs.js
```

Chaque fichier doit remonter un nombre cohérent avec son nombre de blocs numérotés ci-dessus (Profil : 8, Plan : 9, Aujourd'hui : 8 par état, Semaine : 1, Outils : 4+4). Un fichier à 0 ou 1 (juste un commentaire) est un signal d'alerte immédiat, pas à découvrir trois tours plus tard.

---

## Éléments hors périmètre de la maquette — aucune référence à ce jour

Vérifié dans le code réel : ces six éléments existent dans l'app, fonctionnent, mais **n'ont jamais pu être comparés à quoi que ce soit** — la maquette ne les couvre pas. Ce ne sont pas des bugs constatés, ce sont des zones où personne n'a encore écrit ce qu'il faut viser. À traiter avant qu'un nouveau "ça ne ressemble à rien" surgisse dessus.

1. **Le questionnaire d'onboarding (13+ écrans).** `grep -c "questionnaire" maquette.html` → 0. Toute la séquence (choix du sport, sécurité, profil physique, capacité réelle, terrain) a été construite par Claude Code sans aucune référence visuelle — seulement les tokens généraux. Cohérent par chance jusqu'ici, mais jamais vérifié bloc par bloc comme les 5 onglets le sont maintenant. **À faire** : soit accepter que cette zone reste "tokens seuls, pas de spec fine" (choix légitime, mais à le dire explicitement), soit produire une maquette dédiée à l'onboarding.

2. **Les jauges du Profil supposent toujours 3 disciplines (natation/vélo/course), codées en dur.**
   ```js
   const JAUGES = [["natation","🏊","Natation"],["velo","🚴","Vélo"],["course","🏃","Course"]];
   ```
   Sur un plan mono-sport (Course seule, comme testé) ou bi-sport (duathlon), les jauges natation/vélo n'ont pas de sens pour un pur coureur. La maquette elle-même est construite pour un persona triathlon et ne montre jamais ce cas. **Question à trancher avec toi, pas juste à corriger** : les jauges doivent-elles s'adapter au(x) sport(s) réel(s) du plan, ou rester fixes à 3 comme "vision long terme" même si l'athlète n'en pratique qu'une aujourd'hui ?

3. **La modale de feedback RPE ("Comment c'était ?")** existe dans l'app (`feedbackModal`, session-life.js) — dial 1-10, ressenti, case douleur. La maquette n'a **aucune modale** : `validateSession()` y est un clic direct → confettis → toast, sans étape intermédiaire. Ce composant entier a été conçu sans référence et n'a jamais été confronté au système visuel (coupe angulaire, tokens, motion) de façon vérifiée.

4. **La modale "avatar en grand"** (`eb-modal`, zoom au tap sur l'avatar) — la maquette se contente d'un `toast()` au tap, jamais un vrai zoom. Le composant existe, fonctionne, mais aucune référence n'a jamais validé son habillage.

5. **Le point de rupture desktop** (`@media(min-width:1040px)`, présent dans le CSS réel) — la maquette est mobile uniquement, aucune version large n'a jamais été dessinée. Tout ce qui s'affiche au-delà de 1040px de large tourne depuis le début sans avoir été comparé à rien.

6. **Les images de partage** (story/carte, générées par `export.js`) — on sait qu'elles contiennent encore "ENDURABUILD" gravé en dur (signalé par Claude Code lui-même), mais leur habillage visuel complet (mise en page, typographie, ce qu'elles doivent montrer) n'a jamais été spécifié nulle part, juste le nom à corriger.

**Recommandation** : ne pas tout traiter d'un coup. Les points 3 et 5 sont les plus visibles au quotidien (la modale RPE apparaît à chaque validation de séance ; le desktop sert dès qu'on ouvre l'app sur un ordinateur) — à prioriser si tu veux fermer les trous les plus rentables en premier.
