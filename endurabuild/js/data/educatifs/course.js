// Données Éducatifs — Course à pied. Contenu repris intégralement de `educatifs_course.html`.
// Module volontairement le plus léger : la littérature ne soutient qu'un seul levier
// technique (la cadence).
//
// + section « Vocabulaire de séance » (ajoutée par ce lot, pas dans la maquette d'origine) :
// `src/engine/eduLibrary.ts` (RUN_DRILLS — intouché, il alimente le texte des notes de
// séance) nomme des gestes — strides, gammes, foulées bondissantes — qu'AUCUN bloc de la
// maquette course ne couvre (elle ne parle que de cadence/métriques/volume/renfo). Sans cette
// section, un terme que le générateur imprime dans une note de séance ne serait plus expliqué
// nulle part dans l'app. Rendue depuis `EBV2.eduLibrary` (R11.1 — jamais une resaisie du texte).

export const course = {
  discipline: "course",
  libelle: "Course",
  couleur: "--edu-course",
  formats: ["triathlon", "duathlon", "trail", "course"],
  intro: {
    titre: "Course à pied — un seul vrai levier",
    chapeau: "Le module le plus court des quatre, et c'est le résultat d'une vérification, pas d'un manque de travail.",
    encart: {
      titre: "Pourquoi il y a si peu de contenu ici",
      paragraphes: [
        "La natation est un sport où la technique domine tout. La course à pied, non. C'est un geste que ton corps a automatisé depuis l'enfance, et il l'a globalement bien fait.",
        "<b>Corriger l'attaque du pied ?</b> Une revue systématique sur les facteurs de risque de blessure a examiné les interventions modifiant le type de pose du pied : une seule des deux études trouve un bénéfice, et les deux ont une conception médiocre et un niveau de preuve très faible. Ce n'est pas suffisant pour te faire changer un geste que tu répètes des milliers de fois.",
        "<b>Faire des éducatifs pour changer ta foulée ?</b> Rien n'indique que les adaptations obtenues par le travail de renforcement ou de pliométrie se traduisent par des modifications de la biomécanique de course.",
        "<b>Ce qui marche vraiment</b>, en revanche, est bien documenté : le volume, l'intensité bien répartie, et le renforcement musculaire — dont l'effet sur l'économie de course est supérieur à celui de la pliométrie, particulièrement avec des charges lourdes.",
        "Reste un seul réglage technique réellement soutenu par les données : la cadence. Le reste de ce module porte sur la lecture de tes indicateurs et sur la progression de ta charge — deux sujets où les idées reçues coûtent plus cher qu'un défaut de foulée.",
      ],
    },
  },
  sections: [
    {
      id: "cadence", numero: null, titre: "La cadence", accroche: "Le seul réglage soutenu par les données",
      icone: "🔁", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Ce que ça change",
          paragraphes: [
            "Une revue systématique de 18 études conclut qu'une augmentation modérée de la cadence — de l'ordre de <b>5 à 10 %</b> — produit des effets biomécaniques constants : forces de réaction au sol réduites, taux de charge plus bas, foulée raccourcie, meilleur alignement du membre inférieur.",
            "Et surtout, sans dégrader le coût énergétique — parfois même en l'améliorant légèrement. C'est rare : la plupart des modifications techniques coûtent de l'efficacité au moins temporairement.",
            "Un effet protecteur est suggéré sur la douleur fémoro-patellaire et les fractures de fatigue du tibia. Les auteurs restent prudents : petits effectifs, suivis courts.",
          ],
        },
        { type: "schema", ref: "course-cadence" },
        {
          type: "test", titre: "Trouver ta cadence actuelle",
          paragraphes: [
            "En footing facile, une fois échauffé, compte tes appuis pendant 30 secondes et multiplie par deux. Recommence trois fois sur la sortie et garde la moyenne. Ta montre le fait aussi, mais compter une fois soi-même évite de dépendre d'un capteur mal calibré.",
            "<b>Ta cible est ta valeur actuelle + 5 %.</b> Pas 180. Le chiffre de 180 vient d'observations sur des coureurs élites en compétition et ne constitue pas une cible universelle : pour quelqu'un qui court à 155, viser 180 d'emblée est une modification massive, pas un ajustement.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Métronome sur portions courtes", detail: "Règle un métronome ou la vibration de ta montre sur ta cible. 5×2 min à cette cadence en footing facile, récupération à cadence libre entre chaque. Inutile de tenir toute la sortie." },
            { nom: "Progression sur plusieurs semaines", detail: "Reste à +5 % pendant trois à quatre semaines avant d'envisager davantage. La cadence est une habitude motrice ; elle se déplace lentement et revient vite si on force." },
            { nom: "Contrôle en fin de sortie", detail: "La cadence chute naturellement avec la fatigue. Vérifie ta valeur sur le dernier tiers d'une sortie longue : c'est là que la foulée s'allonge et que les impacts augmentent." },
            { nom: "Côtes courtes", detail: "6×20 s en côte à 6-8 %, en cherchant la fréquence plutôt que l'amplitude. La pente impose naturellement des appuis rapprochés, ce qui rend la sensation plus facile à trouver." },
          ],
        },
        {
          type: "warn",
          texte: "Ne vise pas 180 parce que tu l'as lu quelque part. La cadence dépend de ta taille, de ta longueur de jambe et de ton allure — elle augmente naturellement quand tu accélères. Une cible fixe appliquée à toutes les allures n'a pas de sens.",
        },
        {
          type: "secu",
          texte: "Modifier sa cadence redistribue les contraintes : moins sur le genou et le tibia, davantage sur le mollet et le tendon d'Achille. Si tu as un antécédent de tendinopathie achilléenne, progresse encore plus lentement et surveille les 48 h suivant les premières séances.",
        },
      ],
      sources: [
        { texte: "The Influence of Running Cadence on Biomechanics and Injury Prevention — revue systématique de 18 études : une hausse de 5 à 10 % réduit les forces d'impact et les taux de charge sans coût métabolique.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12440572/", type: "reference" },
      ],
    },
    {
      id: "metriques", numero: null, titre: "Les métriques de ta montre", accroche: "Lesquelles agir, lesquelles ignorer",
      icone: "⌚", prerequis: null, horsSequence: true, preuve: "terrain",
      contenu: [
        {
          type: "texte", titre: "Le piège",
          paragraphes: [
            "Ta montre affiche six indicateurs après chaque sortie. La plupart <b>corrèlent</b> avec l'économie de course — mais corréler n'est pas être actionnable. Les bons coureurs ont une oscillation verticale basse ; ça ne veut pas dire que baisser la tienne fera de toi un bon coureur.",
            "Le risque est concret : on peut améliorer un chiffre en dégradant sa course. Raccourcir exagérément la foulée fait baisser l'oscillation verticale tout en réduisant la force produite à chaque appui. Le chiffre s'améliore, la performance non.",
          ],
        },
        {
          type: "table", titre: "Ce que valent les indicateurs",
          lignes: [
            { niveau: "ok", cle: "Cadence", valeur: "Le seul indicateur à la fois bien corrélé, facilement mesurable et modifiable volontairement. C'est celui à suivre." },
            { niveau: "ok", cle: "Équilibre du temps de contact", valeur: "Un déséquilibre marqué entre gauche et droite signale une asymétrie réelle — faiblesse, raideur, compensation après blessure. Utile comme signal d'alerte, à faire évaluer plutôt qu'à corriger seul." },
            { niveau: "mid", cle: "Temps de contact au sol", valeur: "Corrélé à l'économie à allure donnée, mais dépend fortement de la vitesse. Ne compare que des sorties à allure comparable. Difficile à modifier directement." },
            { niveau: "mid", cle: "Ratio vertical", valeur: "Meilleur prédicteur que l'oscillation seule, car il rapporte le rebond à la longueur de foulée. Utile suivi sur plusieurs mois à allure constante, inutile séance par séance." },
            { niveau: "no", cle: "Oscillation verticale", valeur: "Varie avec l'allure, le terrain et la fatigue ; monte normalement en fin de sortie longue. Difficile à modifier volontairement sans dégrader autre chose. À lire, pas à cibler." },
            { niveau: "no", cle: "Longueur de foulée", valeur: "Calculée à partir de la cadence et de l'allure : elle n'apporte pas d'information indépendante. Suis la cadence à la place." },
          ],
        },
        {
          type: "texte", titre: "Comment les lire",
          paragraphes: [
            "Trois règles suffisent. Ne compare jamais deux sorties d'allures différentes : presque toutes ces valeurs varient avec la vitesse. Regarde des tendances sur plusieurs mois, pas des écarts d'une séance à l'autre. Et n'agis que sur la cadence — les autres se déplaceront d'elles-mêmes si ta condition s'améliore.",
            "La dégradation conjointe de plusieurs indicateurs en fin de sortie longue — oscillation qui monte, temps de contact qui s'allonge, cadence qui baisse — est une réponse normale à la fatigue, pas un défaut technique.",
          ],
        },
        {
          type: "warn",
          texte: "L'erreur la plus fréquente est de traiter ces chiffres comme une note. Ce sont des descriptions de ce que tu fais, pas des objectifs. Un coureur qui optimise son tableau de bord au lieu de son entraînement progresse moins vite qu'un coureur qui ne regarde rien.",
        },
      ],
      sources: [
        { texte: "Fellrnr, synthèse des running dynamics — la cadence est l'indicateur le plus utile et le plus facilement modifiable ; l'oscillation verticale doit être interprétée avec prudence car une partie du mouvement vertical est balistique et irréductible.", url: "https://fellrnr.com/wiki/Running_Dynamics", type: "reference" },
        { texte: "Baseline — le piège de l'oscillation verticale : on peut la réduire en raccourcissant excessivement la foulée, donc en dégradant la mécanique.", url: "https://www.baselineathlete.com/blog/running-form-cadence-vertical-oscillation", type: "reference" },
        { texte: "the5krunner — l'oscillation verticale dépend de l'allure et augmente avec la fatigue ; les valeurs absolues des capteurs grand public ne sont pas validées individuellement.", url: "https://the5krunner.com/garmin-features/running-dynamics/vertical-oscillation/", type: "reference" },
        { texte: "Note de méthode : les relations décrites ici sont corrélationnelles et souvent issues de sources non évaluées par les pairs. Le badge reflète cette incertitude.", url: null, type: "note" },
      ],
    },
    {
      id: "volume", numero: null, titre: "La progression du volume", accroche: "Ce n'est pas la règle des 10 %",
      icone: "📈", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "La règle que tout le monde cite",
          paragraphes: [
            "Ne jamais augmenter son kilométrage hebdomadaire de plus de 10 %. C'est la consigne la plus répétée de la course à pied — et elle ne vient d'aucune étude fondatrice. Elle est apparue dans des ouvrages des années 1980 et s'est installée parce qu'elle est facile à retenir.",
            "La première tentative sérieuse de la tester, chez des coureurs débutants, n'a trouvé <b>aucune différence</b> de taux de blessure entre ceux qui la suivaient et ceux qui suivaient un programme moins structuré.",
          ],
        },
        {
          type: "texte", titre: "Ce que montre une étude de grande ampleur",
          paragraphes: [
            "Une étude prospective sur 18 mois a suivi 5 205 coureurs dans 87 pays, soit 588 071 séances enregistrées par montre. Plus de 1 800 blessures ont été rapportées, en grande majorité de surcharge.",
            "Elle a comparé trois indicateurs : la variation de kilométrage d'une semaine à l'autre, le rapport charge aiguë sur charge chronique, et la distance d'une séance rapportée à la sortie la plus longue des 30 derniers jours.",
            "<b>Les deux premiers n'avaient quasiment aucune valeur prédictive.</b> Le troisième, si. Autrement dit : la blessure ne vient pas d'une montée en charge progressive un peu trop rapide, elle vient le plus souvent d'<b>une seule sortie trop ambitieuse</b>.",
          ],
        },
        {
          type: "texte", titre: "Ce qu'il faut en retenir",
          paragraphes: [
            "Une moyenne hebdomadaire peut être parfaitement raisonnable et masquer une séance qui fait le double de ta plus longue sortie du mois. C'est cette séance-là qui te blesse, pas la pente de ta courbe.",
            "Deux conséquences pratiques. La sortie longue se compare à <b>ta propre sortie longue récente</b>, pas à un pourcentage de ton volume. Et après une coupure — vacances, maladie, blessure — ta référence des 30 derniers jours a chuté : reprendre à « ce que tu faisais avant » est précisément le scénario à risque.",
            "À l'inverse, un coureur à faible volume dispose de beaucoup plus de marge de progression qu'un coureur à volume élevé. Appliquer 10 % à quelqu'un qui court 15 km par semaine est inutilement restrictif.",
          ],
        },
        {
          type: "renvoi", titre: "Ton plan surveille ça pour toi",
          texte: "La progression de charge et le rapport entre ta prochaine sortie longue et tes sorties récentes sont gérés par le moteur du plan. Tu n'as pas à faire ce calcul : c'est précisément le rôle de la génération de plan et du recalcul sur fenêtre glissante. Ce bloc existe pour que tu comprennes <b>pourquoi</b> le plan refuse parfois une sortie qui te paraît raisonnable.",
        },
        {
          type: "warn",
          texte: "Ne lis pas ça comme une autorisation à augmenter vite. La direction reste juste — une progression graduelle est plus sûre qu'un bond — mais l'indicateur à surveiller n'est pas le total de la semaine, c'est la séance la plus longue. Note aussi que le rapport charge aiguë sur charge chronique reste débattu dans la littérature : plusieurs travaux lui trouvent peu de valeur prédictive.",
        },
        {
          type: "secu",
          texte: "Toute reprise après blessure sort du cadre de ce bloc. Les paramètres de progression y sont différents et dépendent de la structure lésée : c'est du ressort d'un professionnel de santé, pas d'une règle générale.",
        },
      ],
      sources: [
        { texte: "Étude prospective sur 5 205 coureurs et 588 071 séances (BJSM) : la variation hebdomadaire de kilométrage et le rapport charge aiguë/chronique n'ont montré presque aucune valeur prédictive ; la distance d'une séance rapportée à la plus longue des 30 jours précédents, si.", url: "https://runnersconnect.net/injury-prevention/", type: "reference" },
        { texte: "Synthèse de l'étude et de ses implications : les blessures résultent souvent d'une sortie trop ambitieuse plutôt que d'une accumulation progressive.", url: "https://marathonhandbook.com/the-10-rule-new-study-suggests-weve-been-doing-it-wrong-this-whole-time/", type: "reference" },
        { texte: "NorthLine — la règle des 10 % ne provient d'aucune étude fondatrice ; Buist et al. (2008) n'ont trouvé aucune différence de taux de blessure chez des débutants la suivant ou non.", url: "https://winsport.us/blog/ten-percent-rule-running-mileage", type: "reference" },
        { texte: "POGO Physio — la règle des 10 % manque de preuves scientifiques et relève d'une orientation plutôt que d'une règle.", url: "https://www.pogophysio.com.au/blog/the-10-rule-does-it-hold-true/", type: "reference" },
      ],
    },
    {
      id: "reste", numero: null, titre: "Ce qui compte vraiment", accroche: "Et qui ne se travaille pas ici",
      icone: "🏋️", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "L'honnêteté sur les proportions",
          paragraphes: [
            "Si tu cherches à courir plus vite, l'ordre des priorités est : la régularité de l'entraînement, la répartition des intensités, la charge progressive, puis le renforcement musculaire. La technique de foulée arrive loin derrière.",
            "Ce n'est pas une opinion de coach : c'est ce que montrent les données quand on compare l'effet des différentes interventions.",
          ],
        },
        {
          type: "texte", titre: "Le renforcement",
          paragraphes: [
            "Une méta-analyse portant sur 22 études conclut que le renforcement <b>lourd</b> améliore l'économie de course davantage que la pliométrie, l'effet étant plus marqué avec des charges proches du maximum et sur des programmes de 10 à 14 semaines.",
            "C'est le levier le plus rentable en dehors de la course elle-même — et il ne demande aucune modification de ta foulée.",
          ],
        },
        {
          type: "renvoi", titre: "Le module musculation",
          texte: "Le travail de force est traité dans son propre module, indépendant du moteur d'entraînement, avec ses trois axes santé, force et volume. C'est là qu'il faut aller, pas ici.",
        },
        {
          type: "warn",
          texte: "Attention à la lecture inverse : cela ne veut pas dire que la technique n'existe pas, mais que les gains techniques en course sont lents, incertains et difficiles à obtenir seul. Le temps investi rapporte davantage ailleurs.",
        },
      ],
      sources: [
        { texte: "Heavy Resistance Training Versus Plyometric Training for Improving Running Economy — méta-analyse de 22 études : supériorité du renforcement lourd, effet accru avec des charges élevées.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9653533/", type: "reference" },
        { texte: "Burke et al. (2021), Risk Factors for Injuries in Runners — les interventions modifiant la pose du pied reposent sur des études de conception médiocre et un niveau de preuve très faible.", url: "https://journals.sagepub.com/doi/10.1177/23259671211020283", type: "reference" },
        { texte: "Sports Biomechanics — absence de preuve d'un transfert des adaptations neuromusculaires vers la biomécanique de course.", url: "https://www.tandfonline.com/doi/full/10.1080/14763141.2023.2200403", type: "reference" },
      ],
    },
    {
      // Section ajoutée par ce lot (absente de la maquette) — voir le commentaire d'en-tête.
      id: "vocabulaire", numero: null, titre: "Vocabulaire de séance", accroche: "Ce que ton plan nomme déjà",
      icone: "📖", prerequis: null, horsSequence: true, preuve: null,
      // Pas de `contenu` statique : rendu dynamiquement par le renderer depuis
      // `EBV2.eduLibrary` (clé "rn") — un seul texte, jamais une resaisie (R11.1).
      contenuDynamique: "eduLibrary:rn",
      sources: [{ texte: "Vocabulaire identique à celui que le générateur utilise dans les notes de séance (`src/engine/eduLibrary.ts`, RUN_DRILLS) — la source est le moteur lui-même.", url: null, type: "note" }],
    },
  ],
};
