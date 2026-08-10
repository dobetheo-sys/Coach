// Données Éducatifs — Enchaînements. Contenu repris intégralement de
// `educatifs_enchainements.html`. Module transverse, ne duplique aucun contenu des quatre
// disciplines : ne traite que ce qui n'existe que dans l'enchaînement.
//
// La section `duathlon` n'est affichée que pour le format duathlon — le brief parle de
// « format », mais dans ce dépôt `format` est la distance de course (ex. « 10k », « Full »),
// pas la discipline pratiquée : c'est `S.sport === "duathlon"` qu'il faut lire (confirmé par
// exploration de `config.js`/`state.js`/`bridge.ts`). Le filtre vit dans `registry.js`
// (`sectionsFor`), pas ici — ce fichier reste une donnée pure.

export const enchainements = {
  discipline: "enchainements",
  libelle: "Enchaînements",
  couleur: "--edu-enchainements",
  formats: ["triathlon", "duathlon"],
  intro: {
    titre: "Enchaînements — ce que le cumul change",
    chapeau: "Ce module ne répète pas les disciplines. Il ne traite que ce qui n'existe nulle part ailleurs : le passage de l'une à l'autre.",
    encart: {
      titre: "Ce module ne remplace pas les autres",
      paragraphes: [
        "Pour nager, pédaler ou courir, va dans les onglets correspondants. Le contenu technique y est, et il ne change pas parce que tu enchaînes.",
        "Ce qui change, en revanche, est réel et mesuré : <b>courir après avoir pédalé coûte de 1,6 à 11,6 % d'énergie en plus</b> que courir frais, selon ton niveau. C'est ça, et les transitions, qui n'existent que dans les formats enchaînés.",
        "Les blocs affichés dépendent du format déclaré dans ton profil.",
      ],
    },
  },
  sections: [
    {
      id: "t2", numero: null, titre: "Les transitions", accroche: "Le temps le moins cher de la course",
      icone: "🔀", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte", titre: "Statut de ce bloc",
          paragraphes: [
            "Il n'existe quasiment pas de littérature scientifique sur l'optimisation des transitions. Ce qui suit vient de la pratique et de l'enseignement, et c'est signalé comme tel.",
            "L'argument reste simple : c'est le seul segment d'une course où l'on gagne du temps sans aucune condition physique supplémentaire.",
          ],
        },
        { type: "schema", ref: "ench-t2" },
        {
          type: "texte", titre: "Le principe",
          paragraphes: [
            "Une transition rapide n'est pas une transition exécutée vite. C'est une transition qui contient <b>moins d'étapes</b>. La précipitation fabrique des erreurs ; la suppression d'étapes, non.",
            "Fais la liste écrite de tout ce que tu comptes faire entre l'arrivée et le départ, puis demande-toi pour chaque ligne : est-ce que je peux la supprimer, ou la faire ailleurs ?",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Répéter à froid", detail: "À l'entraînement, pose ton matériel comme le jour J et répète la séquence complète cinq fois de suite, sans effort préalable. Tu cherches l'automatisme, pas la vitesse." },
            { nom: "Répéter fatigué", detail: "Puis la même séquence en fin de séance, essoufflé. C'est une situation différente : les doigts sont maladroits et la mémoire courte se dégrade. Ce qui marche frais échoue souvent fatigué." },
            { nom: "Le repérage", detail: "Le jour de la course, marche jusqu'à ton emplacement depuis l'entrée et depuis la sortie. Compte les rangées. Chercher son vélo est la perte de temps la plus fréquente et la plus évitable." },
            { nom: "La sortie d'eau", detail: "Enchaîner 200 m de nage puis une course immédiate. Sortir de l'horizontale déclenche un vertige et une accélération cardiaque brutale : ça s'habitue." },
          ],
        },
        {
          type: "table", titre: "Ce qui vaut le coup",
          lignes: [
            { niveau: "ok", cle: "Supprimer les chaussettes", valeur: "Gain net si tu t'y es entraîné pieds nus. À tester longuement : sur longue distance, l'ampoule coûte plus que les secondes gagnées." },
            { niveau: "ok", cle: "Lacets élastiques", valeur: "Aucun inconvénient, gain systématique. La modification la plus rentable." },
            { niveau: "ok", cle: "Dossard porté sous la combinaison", valeur: "Supprime une étape entière, si le règlement l'autorise." },
            { niveau: "mid", cle: "Chaussures déjà fixées aux pédales", valeur: "Gain réel mais technique : à ne tenter qu'après un entraînement sérieux, sinon la chute annule tout." },
            { niveau: "no", cle: "Se sécher, se recoiffer, boire longuement", valeur: "Fais-le sur le vélo, pas à l'arrêt." },
          ],
        },
        {
          type: "warn",
          texte: "Ne découvre jamais un changement de matériel le jour de la course. Une transition optimisée mais jamais répétée est plus lente qu'une transition ordinaire maîtrisée.",
        },
        {
          type: "secu",
          texte: "Respecte les zones de montée et descente du vélo, et le port du casque attaché avant de toucher le vélo. Ces règles ne sont pas administratives : la zone de transition est l'endroit d'une course où se produisent le plus de collisions.",
        },
      ],
      sources: [{ texte: "Aucune source scientifique retenue pour ce bloc : l'optimisation des transitions relève de la pratique et n'a pas fait l'objet d'études publiées à notre connaissance.", url: null, type: "note" }],
    },
    {
      id: "brick", numero: null, titre: "L'enchaînement vélo-course", accroche: "Les jambes de coton ne sont pas un mythe",
      icone: "🧱", prerequis: null, horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "texte", titre: "Ce qui se passe vraiment",
          paragraphes: [
            "Courir après avoir pédalé coûte plus cher que courir frais, et c'est mesuré. L'augmentation du coût énergétique de la course lors de la transition varie de <b>1,6 à 11,6 %</b> selon le niveau de l'athlète — plus tu es entraîné, moins tu perds.",
            "Sur un test de terrain, la distance couverte en 12 minutes de course maximale après vélo était en moyenne <b>195 m inférieure</b> à celle d'une course isolée.",
            "Fait notable : la plupart des paramètres biomécaniques restent inchangés. La modification la plus constamment observée est une <b>inclinaison du buste vers l'avant</b> plus marquée. Ce n'est donc pas ta foulée qui s'effondre : c'est un ensemble de perturbations physiologiques et sensorimotrices.",
          ],
        },
        {
          type: "texte", titre: "La fenêtre critique",
          paragraphes: [
            "La coordination neuromusculaire se rétablit sur les <b>dix à quinze premières minutes</b> de course. Les cinq premières sont les plus difficiles : effort perçu maximal, coordination minimale, fréquence cardiaque qui grimpe.",
            "Conséquence directe sur l'allure : partir à l'allure cible dès la première minute est le meilleur moyen d'exploser. Les premières minutes se courent sous l'allure visée, et on remonte une fois la coordination revenue.",
          ],
        },
        {
          type: "texte", titre: "Ce que l'entraînement change",
          paragraphes: [
            "Les séances d'enchaînement produisent une adaptation identifiée : elles améliorent l'adaptabilité du comportement du genou lors du passage vélo-course, ce qui favorise l'adoption plus rapide d'une mécanique de course efficace.",
            "Un travail a montré que le cyclisme dégrade le cycle étirement-détente du muscle, mécanisme important pour courir — mais que les athlètes pratiquant davantage d'enchaînements subissent moins cette dégradation.",
            "Autre point utile : la transition vélo-course induit <b>moins de fatigue musculaire</b> qu'une course isolée de durée équivalente. Pour un athlète qui doit augmenter son volume de course sans multiplier les impacts, plusieurs courses courtes après vélo sont une option moins traumatisante qu'une sortie longue.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Enchaînement court", detail: "10 à 15 min de course juste après une sortie vélo, à allure modérée. C'est le format le plus rentable : il couvre exactement la fenêtre où la coordination se rétablit." },
            { nom: "Enchaînements répétés", detail: "Alterner 15 min de vélo et 5 min de course, trois à quatre fois. Tu multiplies les transitions dans une seule séance, ce qui est l'objectif recherché." },
            { nom: "Allure de course, pas allure de test", detail: "Cours à l'allure que tu vises en course, jamais plus vite. L'intérêt de l'exercice est la sensation de transition, pas la performance sur 5 km." },
            { nom: "Fin de vélo relâchée", detail: "Baisse la puissance et remonte légèrement la cadence sur les dernières minutes de vélo. C'est cohérent avec ce que montrent les études sur la cadence et la régularité : ce que tu épargnes en fin de vélo, tu le retrouves en course." },
          ],
        },
        {
          type: "renvoi", titre: "Ton plan place ces séances",
          texte: "La fréquence des enchaînements et leur position dans la semaine relèvent du moteur du plan. Ce bloc explique ce qu'ils produisent, pas quand les faire.",
        },
        {
          type: "warn",
          texte: "L'erreur classique est de faire des enchaînements trop longs et trop rares. La perturbation à entraîner se joue dans le premier quart d'heure : dix courses de quinze minutes après vélo valent mieux que trois courses d'une heure.",
        },
      ],
      sources: [
        { texte: "Physiological and biochemical adaptations to the cycle to run transition in Olympic triathlon — augmentation du coût énergétique de la course de 1,6 à 11,6 % selon le niveau ; la plupart des paramètres biomécaniques restent inchangés, l'inclinaison du buste vers l'avant étant l'observation la plus significative ; la transition induit moins de fatigue musculaire qu'une course isolée.", url: "https://www.researchgate.net/publication/12277606_Physiological_and_biochemical_adaptations_to_the_cycle_to_run_transition_in_Olympic_triathlon_Review_and_practical_recommendations_for_training", type: "reference" },
        { texte: "Effects of Cycling on Subsequent Running Performance — la performance sur 12 min de course maximale après vélo diminue significativement, avec 195 m parcourus en moins qu'en course isolée.", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6572577/", type: "reference" },
        { texte: "Training for the bike to run transition in triathlon — les séances d'enchaînement améliorent l'adaptabilité du comportement du genou lors de la transition.", url: "https://www.researchgate.net/publication/258218375_TRAINING_FOR_THE_BIKE_TO_RUN_TRANSITION_IN_TRIATHLON", type: "reference" },
        { texte: "Triathlon Science, citant Takahashi (2020) — le cyclisme dégrade le cycle étirement-détente ; les athlètes pratiquant davantage d'enchaînements en subissent moins l'effet. Récupération de la coordination sur 10 à 15 min.", url: "https://triathlonscience.com/get-your-brick-on-boost-your-triathlon-performance-with-brick-training/", type: "reference" },
      ],
    },
    {
      // N'apparaît que pour le format duathlon (filtré par registry.js).
      id: "duathlon", numero: null, titre: "Le duathlon", accroche: "Le piège est au premier segment",
      icone: "🔂", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte", titre: "Ce qui change par rapport au triathlon",
          paragraphes: [
            "Le duathlon commence par une course à pied, et c'est toute la difficulté. En triathlon, la natation limite naturellement l'intensité de départ : on ne peut pas s'y mettre dans le rouge très longtemps. En duathlon, rien ne te retient.",
            "Le premier segment se court donc sensiblement en dessous de ce dont tu te sens capable. C'est contre-intuitif au moment où l'on est frais et entouré, et c'est la première cause d'effondrement sur le second segment de course.",
          ],
        },
        {
          type: "texte", titre: "La seconde course",
          paragraphes: [
            "Tout ce qui est décrit dans le bloc enchaînement s'applique, avec une différence : tes jambes ont déjà couru. La dégradation se cumule, et la fenêtre difficile des premières minutes est vécue avec une fatigue préalable.",
            "C'est ce qui justifie de travailler spécifiquement l'ordre course-vélo-course, et pas seulement le vélo-course du triathlon.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Le format complet en miniature", detail: "Une fois toutes les deux à trois semaines : 15 min de course, 30 min de vélo, 10 min de course. Les proportions comptent plus que les durées." },
            { nom: "Discipline d'allure au départ", detail: "Sur le premier segment, impose-toi une allure plafond et tiens-la même si le groupe part devant. C'est un exercice mental autant que physique ; il se répète." },
            { nom: "Double transition", detail: "Le duathlon a deux transitions, dont une course-vélo que le triathlon ne connaît pas. Elle se répète comme les autres." },
          ],
        },
        {
          type: "warn",
          texte: "Peu de littérature spécifique existe sur le duathlon : ce bloc extrapole depuis les travaux sur la transition vélo-course du triathlon et depuis la pratique. Traite-le comme une orientation, pas comme un protocole établi.",
        },
      ],
      sources: [{ texte: "Aucune source spécifique au duathlon retenue. Le contenu extrapole depuis la littérature sur la transition vélo-course en triathlon, citée dans le bloc précédent.", url: null, type: "note" }],
    },
  ],
};
