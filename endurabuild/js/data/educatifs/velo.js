// Données Éducatifs — Vélo. Contenu repris intégralement de `educatifs_velo.html`. Pas de
// paliers : le geste est contraint par la machine, pas de progression technique à débloquer.
// Recoupement `src/engine/eduLibrary.ts` (BIKE_DRILLS, intouché) : « force basse cadence » et
// « moulinage » sont déjà couverts mot pour mot par les exercices « Force à basse cadence » et
// « Vélocité » de la section cadence ci-dessous.

export const velo = {
  discipline: "velo",
  libelle: "Vélo",
  couleur: "--edu-velo",
  formats: ["triathlon", "duathlon", "cyclisme", "swimrun"],
  intro: {
    titre: "Vélo — position et pilotage",
    chapeau: "Pas d'éducatifs ici, et c'est volontaire : à vélo le geste est contraint par la machine. Ce qui se travaille, ce sont des réglages et des choix.",
    encart: {
      titre: "Pourquoi il n'y a pas de fiche « pédalage »",
      paragraphes: [
        "C'est le conseil le plus répandu du cyclisme amateur : pédaler rond, tirer sur la pédale en remontée, « essuyer de la boue sous la chaussure ». <b>Les mesures ne le confirment pas.</b>",
        "Une étude a comparé quatre techniques à 90 tr/min et 200 W : pédalage préféré, en cercle, en tirant, en poussant. Tirer sur la pédale rend bien le coup de pédale plus « efficace » au sens mécanique — mais coûte plus d'oxygène pour la même puissance.",
        "<b>62 %</b> d'efficacité mécanique en tirant (48 % en pédalage normal) contre <b>19,0 %</b> d'efficacité réelle en tirant (20,2 % en pédalage normal).",
        "La raison est anatomique : les muscles qui fléchissent la jambe pour tirer sont moins efficients que ceux qui poussent. Les conditions « en cercle » et « en poussant » ne se distinguent pas du pédalage spontané.",
        "Attention : cela ne veut pas dire que la cadence est un sujet vide. C'en est un, mais pas celui qu'on croit — voir le bloc qui lui est consacré plus bas.",
        "Ce qui reste, et qui change beaucoup : la position, la cadence, les pneus, la régularité et le pilotage.",
      ],
    },
    // Extension optionnelle au schéma (brief §2 : « … » — beaucoup de champs y sont
    // explicitement optionnels) : les deux sources qui étayent l'encart ci-dessus, jamais
    // attachées à une `section` puisque l'encart n'en est pas une. Sans ce champ, ces deux
    // citations n'auraient nulle part où vivre — une perte de contenu, pas une simplification.
    sources: [
      { texte: "Korff et al., Effect of pedaling technique on mechanical effectiveness and efficiency in cyclists — tirer sur la pédale augmente l'efficacité mécanique mais abaisse l'efficacité brute.", url: "https://pubmed.ncbi.nlm.nih.gov/17545890/", type: "reference" },
      { texte: "The relationship between cadence, pedalling technique and gross efficiency — l'efficacité brute diminue quand la cadence s'élève au-delà de la cadence librement choisie.", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3218268/", type: "reference" },
    ],
  },
  sections: [
    {
      id: "position", numero: null, titre: "La position", accroche: "Le seul vrai levier de performance",
      icone: "📐", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Ce que ça change",
          paragraphes: [
            "Au-delà de 25 km/h, la résistance de l'air représente plus de 80 % de ce que tu combats. À vitesse de contre-la-montre, on dépasse 90 %. C'est plus que tout le reste réuni — pneus, transmission, poids sur terrain plat.",
            "Conséquence directe : sur du plat, réduire ta surface frontale rapporte davantage que gagner des watts. C'est aussi pour ça que deux cyclistes de puissance identique peuvent terminer un parcours plat avec des temps très différents.",
          ],
        },
        { type: "schema", ref: "velo-position" },
        {
          type: "texte", titre: "Le compromis",
          paragraphes: [
            "Abaisser le buste réduit la traînée, mais réduit aussi la puissance maximale que tu peux produire. Les modèles montrent que l'angle optimal du buste <b>dépend de la vitesse</b> : plus tu vas vite, plus le gain aérodynamique l'emporte sur la perte de puissance.",
            "Autrement dit, la position d'un coureur élite à 45 km/h n'est pas la bonne position pour toi à 30 km/h. Copier une position vue en photo est le meilleur moyen de perdre des watts sans rien gagner.",
          ],
        },
        {
          type: "test", titre: "Comment tester la tienne",
          paragraphes: [
            "Il te faut un capteur de puissance. Choisis une portion plate, sans circulation, sans vent marqué, et fais un aller-retour pour annuler la pente et le vent résiduel.",
            "Roule à puissance constante — ton allure d'endurance, pas un sprint — et note la vitesse moyenne. Recommence avec l'autre position, dans les mêmes conditions, le même jour. Répète deux ou trois fois : une seule mesure ne vaut rien.",
            "<b>La position gagnante est celle qui va le plus vite à puissance égale.</b> Pas la plus basse, pas la plus jolie.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Test de tenue", detail: "Une position ne vaut que si tu la tiens. Fais 3×10 min dans la position visée, à ton allure de course. Si tu te redresses avant la fin, ou si ta puissance chute sur la dernière série, elle est trop agressive pour toi aujourd'hui." },
            { nom: "Progression du buste", detail: "Descends par petites étapes sur plusieurs semaines, jamais d'un coup. La mobilité des hanches et le gainage s'adaptent lentement — et c'est eux qui limitent, pas le matériel." },
            { nom: "Position tenue en fatigue", detail: "En fin de sortie longue, 2×5 min dans la position de course. C'est là que la vraie position se révèle : celle que tu tiens frais ne dit rien de celle du dernier tiers de course." },
          ],
        },
        {
          type: "warn",
          texte: "Ne cherche pas la position la plus basse possible. Trois choses la limitent, et aucune ne se voit sur une photo : ta mobilité de hanche, ta capacité à respirer buste fermé, et ta tolérance à tenir la position pendant toute la durée de ta course.",
        },
        {
          type: "texte", titre: "Et le réglage de la selle ?",
          paragraphes: [
            "Hauteur, recul, angle : c'est le domaine du bikefitting, traité par l'outil dédié. Ce bloc porte sur la position que tu <b>adoptes</b>, pas sur les réglages de la machine.",
            "Retiens juste l'ordre : un vélo mal réglé rend tout travail de position inutile, et parfois douloureux. Le réglage d'abord, l'aérodynamique ensuite.",
          ],
        },
        {
          type: "secu",
          texte: "En position basse, ton champ de vision se réduit et tes freins sont plus loin des mains. Ne l'adopte pas en peloton, en descente technique, ni en zone à circulation. Relève-toi dès que la lisibilité de la route diminue.",
        },
      ],
      sources: [
        { texte: "AeroX / Best Bike Split — au-delà de 25 km/h la traînée aérodynamique dépasse 80 % de la résistance totale, et 90 % et plus à vitesse de contre-la-montre.", url: "https://www.bestbikesplit.com/blog/cda-aerodynamic-drag-coefficient-cycling", type: "reference" },
        { texte: "Field-measured drag area is a key correlate of level cycling time trial performance — au-delà de 40 km/h sur le plat, plus de 90 % de la résistance est d'origine aérodynamique ; la puissance seule prédit mal la performance en contre-la-montre.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4540006/", type: "reference" },
        { texte: "Fintelman et al., Optimal cycling time trial position models — abaisser l'angle du buste réduit la traînée mais diminue la puissance maximale ; l'angle optimal dépend de la vitesse.", url: "https://www.sciencedirect.com/science/article/abs/pii/S0021929014001407", type: "reference" },
      ],
    },
    {
      id: "cadence", numero: null, titre: "La cadence", accroche: "Le paradoxe des 90 tr/min",
      icone: "🔁", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Le paradoxe",
          paragraphes: [
            "En laboratoire, la cadence qui consomme le moins d'oxygène par watt se situe autour de <b>60 à 80 tr/min</b>. Or les cyclistes entraînés choisissent spontanément <b>90 à 100 tr/min</b>. Chez des coureurs élites, la cadence choisie en compétition a été mesurée entre 89 et 95 tr/min, contre 70 à 80 pour leur cadence la plus économique.",
            "Ils ne se trompent pas. Ils optimisent simplement autre chose que l'oxygène.",
          ],
        },
        {
          type: "texte", titre: "Ce qu'ils optimisent",
          paragraphes: [
            "À puissance égale, tourner plus vite réduit la force nécessaire à chaque coup de pédale. Moins de force par coup, c'est moins de fatigue musculaire locale et une meilleure préservation des fibres rapides sur la durée. Le coût cardiovasculaire monte un peu ; le coût neuromusculaire baisse beaucoup.",
            "Le carburant suit la même logique : à cadence élevée, la dépense puise davantage dans les fibres lentes, oxydatives ; à cadence basse, elle recrute les fibres rapides, glycolytiques — celles dont on a le moins de réserve.",
            "<b>Sur un effort court, l'économie prime. Sur un effort long, la préservation musculaire prime.</b> C'est pour ça que les deux réponses coexistent dans la littérature sans se contredire.",
          ],
        },
        {
          type: "texte", titre: "Si tu enchaînes avec la course",
          paragraphes: [
            "En triathlon, la cadence vélo ne se juge pas seulement sur le vélo. Elle conditionne l'état de tes jambes au moment de descendre. Une cadence basse et une force élevée entament le capital musculaire qui te manquera ensuite : la cadence choisie a un effet mesuré sur le temps de course jusqu'à épuisement lors de la course qui suit.",
            "C'est l'argument le plus concret en faveur d'une cadence plutôt haute quand un enchaînement est prévu.",
          ],
        },
        {
          type: "texte", titre: "Ce qui fait bouger ton chiffre",
          paragraphes: [
            "<b>Le terrain.</b> En montée raide, descendre dans les 70 est normal et souvent nécessaire pour tenir la puissance. Vouloir garder 95 sur un 10 % n'est ni possible ni utile.",
            "<b>La fatigue.</b> La cadence optimale décroît à mesure que tu fatigues. En fin d'épreuve longue, elle chute naturellement de 5 à 10 tr/min — d'où l'intérêt d'un braquet qui te laisse encore produire de la puissance à ce moment-là.",
            "<b>Ton profil musculaire.</b> Deux cyclistes de même FTP peuvent avoir des cadences optimales séparées de 10 à 15 tr/min selon leur composition en fibres. Il n'existe donc pas de bon chiffre universel, mais un plateau large — grossièrement de 60 à 100 tr/min — à l'intérieur duquel le rendement varie peu.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Agilité de cadence", detail: "Sur une sortie facile : 6×2 min en alternant 70 et 100 tr/min à puissance constante. L'objectif n'est pas de trouver un chiffre mais d'être à l'aise dans toute la plage — les meilleurs cyclistes passent d'un régime à l'autre sans y penser." },
            { nom: "Force à basse cadence", detail: "5 à 10 min à 60-75 tr/min en tempo, sur du plat ou une pente douce. Travaille l'endurance musculaire. À doser : c'est exigeant pour les genoux, à éviter en cas d'antécédent." },
            { nom: "Vélocité", detail: "Courtes séquences à 100-120 tr/min en zone facile, sur home trainer de préférence. Améliore la coordination neuromusculaire. Si tu rebondis sur la selle, tu es au-dessus de ta plage utile : redescends." },
            { nom: "Répétition du braquet de course", detail: "Sur ta sortie longue, dernière heure : vérifie quelle cadence tu tiens réellement en étant fatigué, et si ton développement te permet encore de produire ta puissance cible. C'est le seul test qui compte pour le jour J." },
          ],
        },
        {
          type: "warn",
          texte: "Les deux erreurs symétriques : rouler systématiquement à 50-60 tr/min par principe, ce qui épuise le muscle, puise dans le glycogène des fibres rapides et charge les genoux — et forcer 120 tr/min sans base neuromusculaire, ce qui augmente le travail interne sans rien apporter. Au-delà de 100 tr/min, l'énergie dépensée à accélérer tes propres jambes commence à peser.",
        },
      ],
      sources: [
        { texte: "Data Driven Athlete, synthèse — la cadence librement choisie des cyclistes entraînés (90-100 tr/min) est nettement supérieure à la cadence la plus économique en oxygène (60-70 tr/min) ; l'écart s'explique par la réduction de la force par coup de pédale et de la fatigue neuromusculaire.", url: "https://www.datadrivenathlete.org/blog/optimal-cycling-cadence", type: "reference" },
        { texte: "PedalSci, revue — Lucia et al. (2001) sur l'écart entre cadence de compétition et cadence économique ; Ahlquist et al. (1992) sur la déplétion sélective du glycogène selon la cadence ; effet du profil en fibres sur la cadence optimale individuelle.", url: "https://pedalsci.com/science/cadence-optimal-cycling", type: "reference" },
        { texte: "CTS — bascule de la contrainte du muscle vers le système cardiovasculaire à cadence élevée ; référence à Vercruyssen et al. (2005), effet du choix de cadence sur le temps de course jusqu'à épuisement lors de la course qui suit.", url: "https://trainright.com/science-of-cycling-cadence-training/", type: "reference" },
        { texte: "The effects of crank power and cadence on muscle fascicle shortening velocity — au-delà de 100 tr/min, augmentation du travail interne lié à l'accélération des segments.", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10357033/", type: "reference" },
      ],
    },
    {
      id: "pneus", numero: null, titre: "Pneus et pression", accroche: "Le gain le moins cher, presque toujours raté",
      icone: "⚙️", prerequis: null, horsSequence: true, preuve: "terrain",
      contenu: [
        {
          type: "texte", titre: "Ce que tout le monde croit",
          paragraphes: [
            "Plus dur, plus rapide. C'est vrai sur un rouleau de laboratoire ou une piste en bois — et faux sur une route réelle.",
            "Deux pertes s'additionnent. La <b>déformation du pneu</b> baisse quand la pression monte : c'est ce que mesuraient les tests sur rouleaux. Mais l'<b>impédance</b> monte : un pneu trop dur ne s'écrase plus sur les aspérités, il rebondit dessus, et l'énergie part à secouer le vélo et le corps.",
          ],
        },
        {
          type: "texte", titre: "La pression de bascule",
          paragraphes: [
            "Chaque surface a une pression au-delà de laquelle la résistance totale <b>remonte</b>. Sur bon asphalte, elle a été observée autour de 115 psi ; sur revêtement dégradé, elle descend nettement plus bas — un même pneu peut être le plus rapide autour de 60 psi sur mauvaise route.",
            "Plus la route est rugueuse et le pneu étroit, plus cette bascule arrive tôt. Et le piège est sensoriel : une pression élevée <b>donne l'impression</b> d'aller plus vite, parce qu'on sent davantage la route.",
            "Si tu roules à 8 bar ou plus sur route ouverte, tu es très probablement du mauvais côté de la bascule.",
          ],
        },
        {
          type: "test", titre: "Trouver la tienne",
          paragraphes: [
            "Choisis une portion représentative de ton parcours de course, avec son revêtement réel — pas la plus lisse du secteur.",
            "Fais un aller-retour à puissance constante et note la vitesse moyenne. Recommence en descendant de 0,5 bar, mêmes conditions, même journée. Continue tant que la vitesse s'améliore. Quand elle cesse de progresser ou que le vélo devient flou en virage, tu es allé trop bas : remonte d'un cran.",
            "La bonne pression dépend de ton poids total en charge, de la largeur du pneu et du revêtement. Un chiffre trouvé chez quelqu'un d'autre ne transfère pas.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Contrôle hebdomadaire", detail: "Un pneu perd de la pression en permanence, et davantage en tubeless. Vérifie chaque semaine avec un manomètre — pas au pouce, qui ne distingue pas 5,5 de 7 bar." },
            { nom: "Adapter à la météo", detail: "Sous la pluie, descendre d'environ 0,3 à 0,5 bar augmente la surface de contact et l'adhérence. La perte de rendement est faible, le gain de confiance en descente ne l'est pas." },
            { nom: "Repère de largeur", detail: "Un pneu plus large permet une pression plus basse à confort égal, donc moins d'impédance. La croyance selon laquelle large = lent ne tient plus sur route réelle." },
          ],
        },
        {
          type: "warn",
          texte: "La pression maximale inscrite sur le flanc n'est pas une recommandation, c'est une limite de sécurité. Presque personne n'a intérêt à s'en approcher.",
        },
        {
          type: "secu",
          texte: "Trop bas expose au pincement de la chambre et rend le vélo imprécis en virage. En chambre à air, descends prudemment et par paliers. Vérifie aussi l'usure et les coupures : un pneu à la corde ne se rattrape par aucun réglage de pression.",
        },
      ],
      sources: [
        { texte: "Silca — théorie de la pression de bascule : en dessous, les pertes sont dominées par la déformation du pneu ; au-dessus, par l'impédance de surface.", url: "https://silca.cc/blogs/silca/part-4b-rolling-resistance-and-impedance", type: "reference" },
        { texte: "Slowtwitch, d'après les mesures de terrain d'Anhalt et Morrison — bascule observée autour de 115 psi sur route lisse, nettement plus bas sur revêtement dégradé.", url: "https://www.slowtwitch.com/cycling/tire-pressure-and-rolling-resistance/", type: "reference" },
        { texte: "Rene Herse Cycles — sur routes réelles, même lisses, les pressions élevées ne roulent pas plus vite.", url: "https://www.renehersecycles.com/myth-16-higher-tire-pressure-is-faster/", type: "reference" },
        { texte: "Note de méthode : ces données proviennent de tests de terrain et de laboratoires industriels, non d'études évaluées par les pairs. Les résultats sont convergents et reproductibles, mais la nature des sources justifie le badge « mesures de terrain » plutôt que « preuves solides ».", url: null, type: "note" },
      ],
    },
    {
      id: "regularite", numero: null, titre: "La régularité de puissance", accroche: "Ce que ta moyenne ne dit pas",
      icone: "📊", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Deux sorties identiques sur le papier",
          paragraphes: [
            "Deux cyclistes finissent à 200 W de moyenne. Le premier est resté quasiment plat. Le second a attaqué chaque bosse et s'est relâché dans chaque descente. Même moyenne, coût physiologique très différent.",
            "L'indicateur qui le capte est l'<b>indice de variabilité</b> : le rapport entre puissance normalisée et puissance moyenne. À 1,00 la sortie est parfaitement régulière ; les parties vélo de triathlon bien gérées se situent généralement entre 1,02 et 1,05.",
          ],
        },
        {
          type: "texte", titre: "Ce que ça coûte",
          paragraphes: [
            "À moyenne égale, une puissance variable élève significativement le lactate sanguin par rapport à un effort régulier. En triathlon, ce lactate arrive au moment précis où il faut descendre du vélo et courir.",
            "Une étude sur douze triathlètes entraînés a mesuré la conséquence : après une heure de vélo à puissance variable, le 9,3 km suivant était parcouru environ 42 s plus lentement qu'après la même heure à puissance constante — et l'écart se concentrait sur la première moitié de la course.",
          ],
        },
        {
          type: "texte", titre: "La nuance qui compte",
          paragraphes: [
            "Toute variation n'est pas coûteuse, et la littérature n'est pas unanime. Une étude a même trouvé une <b>amélioration</b> du temps de course jusqu'à épuisement après un vélo à puissance variable — mais avec des oscillations douces et lentes, de l'ordre de ±20 % toutes les 5 minutes.",
            "L'étude qui montre une dégradation utilisait au contraire des variations brutales et fréquentes, de 40 à 135 % de la puissance aérobie maximale sur des durées de 10 à 90 secondes.",
            "<b>Ce n'est donc pas la variation qui coûte, ce sont les à-coups.</b> Une ondulation lente autour de la cible est acceptable ; les pics courts au-dessus du seuil sont ce qui se paie.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Plafonner, pas moyenner", detail: "Sur sortie longue, fixe-toi un plafond à ne jamais dépasser plutôt qu'une moyenne à tenir. C'est le dépassement ponctuel qui coûte, pas la moyenne." },
            { nom: "Le test de la bosse", detail: "Sur une côte courte, garde la puissance cible au lieu de la subir : passe sur un braquet plus souple avant la pente, pas pendant. La tentation d'accélérer en montée est le premier générateur d'à-coups." },
            { nom: "Relancer en descente", detail: "L'autre moitié du problème : beaucoup produisent zéro watt en descente et compensent en montée. Continuer à pédaler doucement dans les portions descendantes lisse le profil sans coût perçu." },
            { nom: "Relecture d'après-séance", detail: "Regarde ton indice de variabilité après chaque sortie longue. Au-dessus de 1,10, cherche sur le graphique où sont les pics — il y en a rarement plus de trois ou quatre responsables." },
          ],
        },
        {
          type: "warn",
          texte: "Sur un parcours vallonné, viser un indice de 1,00 est impossible et contre-productif : tenir exactement la même puissance en montée et en descente demanderait de rouler absurdement fort dans les descentes. L'objectif est de supprimer les à-coups évitables, pas la variation imposée par le terrain.",
        },
        {
          type: "secu",
          texte: "Ce bloc relève de la stratégie de course, pas de la technique. Il suppose un capteur de puissance ; sans capteur, la fréquence cardiaque est un substitut imparfait, car elle réagit avec du retard et ne montre pas les pics courts.",
        },
      ],
      sources: [
        { texte: "Etxebarria et al. (2013), Int J Sports Physiol Perform — après une heure de vélo à puissance variable, le 9,3 km suivant est parcouru environ 42 s plus lentement qu'après un vélo à puissance constante ; une distribution de puissance très variable altère probablement la performance en course.", url: "https://www.researchgate.net/publication/258530497_Variability_in_Power_Output_During_Cycling_in_International_Olympic-Distance_Triathlon", type: "reference" },
        { texte: "Suriano et al. — résultat inverse avec des oscillations douces (±20 % toutes les 5 min) : temps de course jusqu'à épuisement amélioré. La contradiction apparente s'explique par l'amplitude et la fréquence des variations.", url: "https://pubmed.ncbi.nlm.nih.gov/16914374/", type: "reference" },
        { texte: "Best Bike Split — définition de l'indice de variabilité et repères usuels en triathlon (1,02 à 1,05 pour une partie vélo bien gérée).", url: "https://www.bestbikesplit.com/blog/variability-index-cycling-triathlon", type: "reference" },
      ],
    },
    {
      id: "pilotage", numero: null, titre: "Le pilotage", accroche: "Sécurité et vitesse conservée",
      icone: "🔄", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte", titre: "Statut de ce bloc",
          paragraphes: ["Contrairement à la position, le pilotage ne repose pas sur une littérature scientifique consolidée. Ce qui suit est le consensus d'enseignement des écoles de cyclisme — cohérent, largement partagé, mais non quantifié. Traite-le comme tel."],
        },
        {
          type: "texte", titre: "Le virage",
          paragraphes: ["Trois choses simultanément : le regard va loin vers la sortie du virage, pas sur la roue avant ; le poids appuie sur la pédale extérieure, en position basse ; et tout le freinage est déjà terminé avant l'entrée."],
        },
        { type: "schema", ref: "velo-virage" },
        {
          type: "drill",
          items: [
            { nom: "Virages à basse vitesse", detail: "Sur un parking fermé, enchaîne des virages lents : freiner avant, relâcher en courbe, relancer en sortie. La lenteur permet de sentir le transfert de poids sans risque." },
            { nom: "Freinage d'urgence", detail: "Toujours sur espace fermé : freine des deux leviers en reculant le bassin derrière la selle. Répète jusqu'à ce que le geste soit automatique — c'est un réflexe de sécurité, pas un exercice de performance." },
            { nom: "Descente en confiance", detail: "Mains en bas du cintre pour abaisser le centre de gravité et améliorer le contrôle des freins. Regard loin. Sur une descente que tu connais, augmente progressivement l'allure d'une sortie à l'autre." },
            { nom: "Transition en danseuse", detail: "30 s en danseuse toutes les 3 min en côte. Le but est la fluidité du passage, sans à-coup ni décrochage de vitesse — pas la puissance produite debout." },
          ],
        },
        {
          type: "warn",
          texte: "Le relâchement du haut du corps est ce qui se dégrade en premier quand on se crispe : mains légères, coudes souples. Un cintre serré transmet chaque irrégularité de la route au reste du corps et fatigue la nuque bien avant les jambes.",
        },
        {
          type: "secu",
          texte: "Tous les exercices de ce bloc se pratiquent sur un espace fermé à la circulation. Casque systématique. Ne teste jamais une limite d'adhérence sur route ouverte.",
        },
      ],
      sources: [{ texte: "Aucune source scientifique retenue pour ce bloc. Contenu issu du consensus d'enseignement, signalé comme tel dans le module.", url: null, type: "note" }],
    },
  ],
};
