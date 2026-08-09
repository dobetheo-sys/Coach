// Données Éducatifs — Trail. Contenu repris intégralement de `educatifs_trail.html`.
// Recoupement `src/engine/eduLibrary.ts` (TRAIL_DRILLS, intouché) : « montée en VAM » et
// « marche rapide bâtons » sont déjà couverts par la section « Courir ou marcher » (technique
// de montée) et « Les bâtons » ; « descente en contrôle » par la section « La descente ».

export const trail = {
  discipline: "trail",
  libelle: "Trail",
  couleur: "--edu-trail",
  formats: ["swimrun", "trail"],
  intro: {
    titre: "Trail — pente et descente",
    chapeau: "Ici, ce qui se travaille n'est pas la foulée mais les décisions : quand marcher, comment descendre, et ce que ça coûte à tes muscles.",
    encart: {
      titre: "Le trail ne se joue pas sur la foulée",
      paragraphes: [
        "Sur le plat, ta foulée est automatisée et il y a peu à corriger. En montagne, le terrain change tellement vite qu'aucun geste fixe ne tient : chaque appui est différent du précédent.",
        "Ce qui distingue les bons traileurs relève d'autre chose : <b>savoir quand cesser de courir</b>, <b>encaisser la descente sans détruire ses cuisses</b>, et gérer le terrain technique. Ces trois choses s'entraînent et se mesurent.",
        "Un chiffre pour situer l'enjeu : courir sur le plat coûte environ 3,4 joules par kilo et par mètre. À 45 % de pente, ce coût atteint près de 19. C'est presque six fois plus — aucune correction technique ne compensera une mauvaise décision de pente.",
      ],
    },
  },
  sections: [
    {
      id: "pente", numero: null, titre: "Courir ou marcher", accroche: "La décision qui coûte le plus cher",
      icone: "📐", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Ce que mesurent les données",
          paragraphes: [
            "Les travaux de référence ont mesuré le coût énergétique de la marche et de la course sur des pentes allant de −45 à +45 %. Pour la course : environ <b>3,4 J/kg/m</b> sur le plat, <b>18,9</b> à +45 %. En descente, le coût descend à un minimum d'environ <b>1,7</b> vers −20 %, puis remonte à <b>3,9</b> à −45 %.",
            "Deux enseignements. La montée raide coûte un ordre de grandeur de plus que le plat. Et la descente très raide n'est pas gratuite : freiner consomme.",
          ],
        },
        { type: "schema", ref: "trail-cout" },
        {
          type: "texte", titre: "Le seuil de bascule",
          paragraphes: [
            "Au-delà d'environ <b>15 à 20 %</b> de pente, le coût d'une marche soutenue rejoint ou passe sous celui d'une course lente. Sur des pentes de 16 à 39 degrés, la marche a été mesurée en moyenne environ <b>8,5 % moins coûteuse</b> que la course.",
            "Le repère de terrain est plus simple encore : si ton allure de course en montée descend à une vitesse que tu tiendrais en marchant vite avec moins d'effort, marche. Ce n'est pas un renoncement, c'est le calcul juste.",
            "Sur le plat, la bascule spontanée marche-course se situe autour de 2,1 m/s. Ce seuil descend à mesure que la pente augmente et que le terrain devient technique.",
          ],
        },
        {
          type: "texte", titre: "Ce que la courbe ne dit pas",
          paragraphes: [
            "Ces mesures ont été faites sur tapis roulant, surface lisse et régulière. Le terrain technique — cailloux, racines, boue — ajoute un coût de stabilisation latérale indépendant de la pente. Les allures réelles en sentier technique sont couramment <b>10 à 20 % plus lentes</b> que ce que prédit un modèle basé sur la seule pente.",
            "C'est aussi la limite de toute allure ajustée à la pente : elle ne connaît que le dénivelé, pas le sol.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Répétitions de marche rapide", detail: "Sur une pente très raide, 5 à 8 fois 3 min de marche à l'intensité maximale que tu peux tenir, récupération en redescendant lentement. La marche rapide est une compétence : elle se travaille, sinon elle est maladroite le jour où la pente t'y force." },
            { nom: "Bascule consciente", detail: "Sur tes sorties, dès que la pente dépasse ton seuil, passe délibérément en marche au lieu de subir la transition. L'objectif est d'automatiser la décision plutôt que de la prendre à bout de souffle." },
            { nom: "Technique de montée", detail: "Buste incliné depuis les chevilles et non depuis la taille, appui des mains sur les cuisses pour transmettre de la force, pas courts et cadence constante. Pense à un train régulier, pas à des bonds." },
          ],
        },
        {
          type: "warn",
          texte: "Vouloir courir toutes les montées est l'erreur la plus coûteuse du trail. Le temps gagné en haut se paie largement dans les kilomètres suivants — et sur les longues distances, il se paie surtout en descente, là où la fatigue accumulée fait perdre le plus de vitesse.",
        },
      ],
      sources: [
        { texte: "Minetti et al. (2002), J Appl Physiol — coût énergétique de la marche et de la course de −45 à +45 % : course à 3,40 J/kg/m sur le plat, 18,93 à +45 %, minimum de 1,73 vers −20 % et remontée à 3,92 à −45 %.", url: "https://journals.physiology.org/doi/full/10.1152/japplphysiol.01177.2001", type: "reference" },
        { texte: "Live for the Outdoors, synthèse — sur des pentes de 16 à 39 degrés, la marche coûte en moyenne environ 8,5 % de moins que la course.", url: "https://www.livefortheoutdoors.com/trail-running/training/run-or-walk-hills/", type: "reference" },
        { texte: "CTS — la bascule spontanée marche-course se situe autour de 2,1 m/s sur le plat et s'abaisse quand la pente et la technicité augmentent.", url: "https://trainright.com/run-walk-hill/", type: "reference" },
        { texte: "TrailMath — le terrain technique ajoute un coût indépendant de la pente ; les allures réelles en sentier technique sont 10 à 20 % plus lentes que la prédiction par la pente seule.", url: "https://trailmath.run/tools/gap-calculator", type: "reference" },
      ],
    },
    {
      id: "descente", numero: null, titre: "La descente", accroche: "Un sujet de tolérance autant que de geste",
      icone: "⛰️", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Pourquoi elle abîme",
          paragraphes: [
            "En descente, tes quadriceps travaillent en freinant : ils se contractent en s'allongeant. Ce mode sollicite fortement la structure du muscle et provoque des dommages mesurables — élévation de la créatine kinase, perte de force maximale, courbatures.",
            "Après une séance de descente, les marqueurs de dommage musculaire mettent environ <b>quatre jours</b> à revenir à la normale, et la perte de capacité à produire de la force rapidement persiste sur les 72 heures suivantes.",
          ],
        },
        {
          type: "texte", titre: "La bonne nouvelle",
          paragraphes: [
            "Cette tolérance s'entraîne, et l'adaptation est remarquablement efficace. Une étude sur quatre sorties de trail espacées d'une semaine a mesuré une atténuation progressive de la perte de force : d'environ <b>18 % après la première sortie à environ 3 % après la quatrième</b>.",
            "Chez des traileurs expérimentés, ceux qui pratiquaient habituellement des répétitions en descente présentaient une créatine kinase plus basse et conservaient mieux leur force qu'un groupe comparable.",
            "L'effet protecteur dure plusieurs semaines. C'est pourquoi une séance de descente marquée toutes les deux semaines suffit largement — l'ajouter chaque semaine n'apporte pas plus et coûte de la récupération.",
          ],
        },
        { type: "schema", ref: "trail-descente" },
        {
          type: "texte", titre: "Ce que tu cherches",
          paragraphes: [
            "Le regard porte loin, trois à quatre mètres devant, et non sur tes pieds. Il balaie les appuis à venir plutôt que celui en cours : en descente, tu choisis toujours l'appui d'après.",
            "Les appuis sont courts et fréquents. Un appui prolongé laisse à la cheville le temps de chercher son équilibre sur un sol instable — c'est exactement ainsi qu'on se tord une cheville.",
            "Le buste reste dans l'axe de la pente. Se pencher en arrière est le réflexe naturel, et c'est le plus coûteux : la jambe part devant, le talon freine, le genou encaisse.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Répétitions en descente", detail: "6 à 8 fois 30 à 60 s sur une descente roulante et connue, remontée en marche. Toutes les deux semaines suffit. Commence court : le premier vrai signal arrive 24 à 48 h après." },
            { nom: "Progressivité sur la technicité", detail: "Augmente d'abord la longueur sur terrain facile, puis la technicité à longueur constante. Jamais les deux en même temps." },
            { nom: "Renforcement excentrique", detail: "Descentes de step contrôlées sur 3 à 4 s, fentes bulgares lentes, soulevés de terre unilatéraux en insistant sur la phase de descente. C'est le complément du travail en descente, à faire hors sortie." },
            { nom: "Descente en fin de sortie longue", detail: "Une fois de temps en temps, place une descente technique en fin de sortie. C'est la situation de course : descendre frais ne dit rien de ta capacité à descendre fatigué." },
          ],
        },
        {
          type: "renvoi", titre: "Ton plan gère l'espacement",
          texte: "L'écart entre deux séances de descente marquées et la place du dénivelé négatif dans la semaine relèvent du moteur du plan. Ce bloc explique pourquoi il refuse parfois d'enchaîner deux sorties chargées en descente : la récupération de ce type de dommage se compte en jours, pas en heures.",
        },
        {
          type: "warn",
          texte: "L'erreur classique est de traiter la descente comme de la récupération parce que le cœur y est bas. Le coût cardiovasculaire est faible, le coût musculaire est élevé. C'est le type d'effort où les sensations pendant l'effort informent le moins bien sur la charge réelle.",
        },
        {
          type: "secu",
          texte: "Ne travaille jamais la vitesse en descente sur un sentier que tu ne connais pas. La reconnaissance d'abord, l'allure ensuite. Et en cas d'antécédent au genou ou de tendinopathie rotulienne, la progression en descente doit être validée par un professionnel de santé.",
        },
      ],
      sources: [
        { texte: "Downhill running increases markers of muscle damage — élévation de la créatine kinase, perte de force maximale et altération de la phase tardive de production de force pendant 72 h, récupération complète des marqueurs en 4 jours.", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11129977/", type: "reference" },
        { texte: "A single bout of downhill running attenuates subsequent level running-induced fatigue — citant Easthope et al. : atténuation progressive de la perte de force isométrique, d'environ 18 % après la première sortie à environ 3 % après la quatrième.", url: "https://www.nature.com/articles/s41598-020-76008-2", type: "reference" },
        { texte: "Downhill Running-Induced Muscle Damage in Trail Runners — les athlètes pratiquant habituellement des répétitions en descente montrent une créatine kinase plus basse et une meilleure conservation de la force.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12846201/", type: "reference" },
        { texte: "Higher Running — l'effet protecteur persiste plusieurs semaines, ce qui justifie un espacement de l'ordre de deux semaines entre séances de descente marquées.", url: "https://higherrunning.com/the-repeated-bout-effect-eccentric-loading/", type: "reference" },
      ],
    },
    {
      id: "batons", numero: null, titre: "Les bâtons", accroche: "Pas ce que tu crois",
      icone: "🥢", prerequis: null, horsSequence: true, preuve: "terrain",
      contenu: [
        {
          type: "texte", titre: "Ce qu'ils ne font pas",
          paragraphes: [
            "L'argument habituel est l'économie d'énergie. Les études ne le confirment pas : en montée, les bâtons ne font généralement <b>économiser aucune énergie</b>, ou seulement une quantité marginale. Ils transfèrent une partie du travail vers le haut du corps, et ce travail consomme aussi de l'oxygène.",
            "Ma première version de ce module présentait les bâtons comme un gain de propulsion. C'était faux, et c'est corrigé ici.",
          ],
        },
        {
          type: "texte", titre: "Ce qu'ils font vraiment",
          paragraphes: [
            "Deux bénéfices réels. D'abord la performance en effort maximal : sur une pente d'un peu moins de 20 degrés, les coureurs équipés étaient environ <b>2,5 % plus rapides</b>.",
            "Ensuite, et c'est le point décisif sur longue distance : le report d'une partie de la charge des jambes vers les bras réduit la fatigue et les dommages musculaires des membres inférieurs. Sur une épreuve longue, ce que tu économises dans les cuisses en montée, tu le retrouves en descente.",
            "S'y ajoute un gain d'équilibre sur terrain instable, difficile à quantifier mais réel.",
          ],
        },
        {
          type: "table", titre: "Quand ils servent",
          lignes: [
            { niveau: "ok", cle: "Épreuve longue, fort dénivelé", valeur: "Bénéfice net probable, principalement par préservation musculaire." },
            { niveau: "ok", cle: "Pentes très raides, au-delà d'environ 20 degrés", valeur: "C'est le domaine où ils apportent le plus." },
            { niveau: "mid", cle: "Effort maximal sur montée courte", valeur: "Gain de vitesse modeste mesuré, autour de 2,5 %." },
            { niveau: "no", cle: "Terrain roulant, faible dénivelé", valeur: "Peu ou pas d'intérêt ; encombrement et coût en oxygène sans contrepartie." },
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Apprendre avant de courir", detail: "Commence au moins deux mois avant l'échéance, une sortie longue par semaine minimum. Des bâtons mal maîtrisés coûtent plus qu'ils ne rapportent — et le jour de course est le pire moment pour les découvrir." },
            { nom: "Varier les techniques", detail: "Double poussée simultanée, alternée, ou en pas allongé. Chacune convient à une pente et à un rythme différents ; il faut les trois." },
            { nom: "Préparer le haut du corps", detail: "Le report de charge suppose que les bras suivent. Un peu de renforcement du haut du corps en amont rend la transition beaucoup plus confortable." },
            { nom: "Le rangement", detail: "S'entraîner à les déplier et replier en mouvement. Sur une course avec alternance de montées et de portions roulantes, le temps perdu à les manipuler peut annuler le bénéfice." },
          ],
        },
        {
          type: "warn",
          texte: "Vérifie le règlement de ton épreuve : certaines interdisent les bâtons ou en restreignent l'usage à des sections définies.",
        },
      ],
      sources: [
        { texte: "Synthèse Koop / Giovanelli — les bâtons ne font économiser aucune énergie en montée, ou une quantité marginale ; les coureurs équipés étaient environ 2,5 % plus rapides sur un effort maximal à une pente d'un peu moins de 20 degrés.", url: "https://trainright.com/science-trekking-poles-trail-running-ultrarunning/", type: "reference" },
        { texte: "Outside — revue des travaux récents sur les bâtons en trail.", url: "https://www.outsideonline.com/health/training-performance/trekking-pole-research-2023/", type: "reference" },
        { texte: "Freetrail — usage recommandé au-delà d'environ 20 degrés pour économiser l'énergie musculaire ; apprentissage à démarrer plusieurs mois avant l'échéance, avec plusieurs techniques à maîtriser.", url: "https://freetrail.com/climb-the-mountain-when-to-run-hike-or-pole/", type: "reference" },
      ],
    },
  ],
};
