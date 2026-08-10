// Données Éducatifs — Swimrun. Contenu repris intégralement de `educatifs_swimrun.html`.
// Aucune littérature scientifique spécifique au swimrun : les trois sections portent TOUTES
// le badge `consensus` (le maquette le dit explicitement — c'est un choix éditorial du
// contenu, pas une omission).

export const swimrun = {
  discipline: "swimrun",
  libelle: "Swimrun",
  couleur: "--edu-swimrun",
  formats: ["swimrun"],
  intro: {
    titre: "Swimrun — tout porter, tout le temps",
    chapeau: "Nager en chaussures, courir en combinaison, sans jamais rien déposer. Ce module ne traite que ce qui n'existe ni en natation ni en trail.",
    encart: {
      titre: "Un module honnête sur ce qu'il vaut",
      paragraphes: [
        "Le swimrun est un sport jeune, et il n'existe pratiquement aucune littérature scientifique le concernant. Tout ce module repose sur la pratique des coureurs, des organisateurs et des équipementiers.",
        "Nous l'affichons quand même, parce que cette connaissance est réelle et convergente — mais <b>tous les blocs portent le badge le plus faible</b>, et aucun chiffre n'y est présenté comme une mesure.",
        "Pour la technique de nage et la technique de descente, va dans les modules natation et trail. Ici, uniquement ce que le swimrun change.",
      ],
    },
  },
  sections: [
    {
      id: "materiel", numero: null, titre: "Tout se porte, tout le temps", accroche: "La contrainte qui définit le sport",
      icone: "🎒", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte", titre: "Statut de ce module",
          paragraphes: ["Le swimrun est un sport récent et peu étudié. Presque tout ce qui suit vient de la pratique des coureurs et des organisateurs, pas de la littérature scientifique. C'est signalé sur chaque bloc, et il faut le lire comme une orientation solide plutôt que comme une démonstration."],
        },
        {
          type: "texte", titre: "La règle qui commande tout",
          paragraphes: [
            "Il n'y a pas de zone de transition. Tout ce que tu emportes au départ, tu le portes jusqu'à l'arrivée : dans l'eau comme sur les sentiers.",
            "Conséquence : chaque pièce de matériel doit fonctionner dans les deux milieux. Tu nages en chaussures de course et tu cours en combinaison. Aucun compromis n'est neutre, et une erreur dans une seule catégorie transforme une épreuve gérable en calvaire.",
          ],
        },
        {
          type: "table", titre: "Le matériel",
          lignes: [
            { niveau: "ok", cle: "Pull buoy", valeur: "Considéré comme essentiel par la plupart des pratiquants. Compense la traînée des chaussures et épargne les jambes. Les épreuves ÖTILLÖ en limitent les dimensions à 32×30×15 cm ; vérifie le règlement de ton épreuve." },
            { niveau: "ok", cle: "Chaussures qui drainent", valeur: "Empeigne en mesh, accroche sur surfaces mouillées, maintien suffisant pour ne pas les perdre en nageant. Tes chaussures de trail actuelles peuvent suffire pour commencer." },
            { niveau: "ok", cle: "Combinaison", valeur: "Souvent plus fine que celle de triathlon, parfois à jambes amovibles, avec zip avant pour respirer pendant les portions de course. Une combinaison classique dépanne en eau froide." },
            { niveau: "mid", cle: "Plaquettes", valeur: "Renforcent la traction mais demandent de l'entraînement. Commence petit et augmente la taille progressivement : trop grandes, elles ralentissent. Sur les traversées courtes, le temps de les installer peut dépasser le gain." },
            { niveau: "mid", cle: "Corde de liaison", valeur: "Environ 3 m, élastique. Assez longue pour ne pas être collé aux pieds du coéquipier, assez courte pour rester dans son sillage." },
            { niveau: "ok", cle: "Protège-tibias", valeur: "Beaucoup les jugent indispensables après une première course : rochers, coquillages et débris immergés entaillent les jambes." },
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Le système de portage avant tout", detail: "Où va le pull buoy pendant la course ? Où vont les plaquettes pendant les portions courtes ? Ce sont les questions qui décident de ta course, et elles se résolvent à l'entraînement, jamais le jour J." },
            { nom: "Une sortie complète en tenue", detail: "Au moins une séance en conditions réelles avec tout le matériel, plusieurs semaines avant l'épreuve. C'est là qu'apparaissent les frottements, les sangles mal placées et les objets qui se perdent." },
            { nom: "Fixations à dégagement", detail: "Préfère des plaquettes dont les attaches se libèrent sous contrainte : une plaquette accrochée à un obstacle ou à un autre nageur peut hyperextendre les doigts." },
          ],
        },
        {
          type: "warn",
          texte: "Les règlements varient beaucoup d'une épreuve à l'autre : matériel obligatoire, dimensions du pull buoy, catégories solo ou par équipe. Lis le règlement de ton épreuve avant d'acheter quoi que ce soit.",
        },
        {
          type: "secu",
          texte: "Le sifflet est obligatoire sur beaucoup d'épreuves et doit rester accessible. C'est un équipement de sécurité, pas une formalité : sur une traversée, c'est ton seul moyen de signaler une difficulté.",
        },
      ],
      sources: [
        { texte: "Löw Tide Böyz, guide matériel — le pull buoy compense la traînée des chaussures ; ÖTILLÖ limite ses dimensions à 32×30×15 cm, norme adoptée par la plupart des épreuves internationales ; corde de liaison d'environ 3 m.", url: "https://lowtideboyz.com/swimrun-gear-a-complete-guide", type: "reference" },
        { texte: "Prommer — la règle du « tout porter » comme contrainte définissant le choix du matériel ; attaches de plaquettes à dégagement pour éviter les blessures ; plaquettes parfois gardées dans la combinaison sur les traversées courtes.", url: "https://prommer.net/en/training/swimrun/gear/", type: "reference" },
        { texte: "Triathlete — retours de pratiquants sur le pull buoy attaché à la cuisse ou à la taille, et sur la longueur de corde adaptée.", url: "https://www.triathlete.com/training/race-tips/swimrun-tips/", type: "reference" },
        { texte: "Zone3 — vue d'ensemble du matériel et de la contrainte de portage.", url: "https://zone3.com/en-us/blogs/inside-zone3/a-beginners-guide-to-swimrun", type: "reference" },
      ],
    },
    {
      id: "nager", numero: null, titre: "Nager en chaussures", accroche: "Ta nage de piscine ne s'applique plus",
      icone: "🏊", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte", titre: "Ce qui change",
          paragraphes: [
            "Des chaussures aux pieds créent une traînée importante et tirent les jambes vers le bas. L'effet s'aggrave sur les traversées longues, à mesure que la fatigue s'installe.",
            "D'où le rôle du pull buoy : il relève le bas du corps, réduit la traînée, et rend le battement <b>inutile</b>. Ce n'est pas un aveu de faiblesse, c'est le choix tactique du sport — tes jambes servent à courir.",
          ],
        },
        { type: "schema", ref: "sr-traine" },
        {
          type: "texte", titre: "Ce que ça implique pour ta technique",
          paragraphes: [
            "La propulsion devient presque entièrement affaire de bras. Le travail de prise d'appui décrit dans le module natation prend donc encore plus de poids ici qu'en triathlon.",
            "En revanche, le travail de position corporelle perd de son importance : le pull buoy fait ce que ta position ferait. Et le battement, déjà secondaire en triathlon, devient franchement contre-productif.",
            "La visée reste indispensable — les traversées sont rarement balisées comme un parcours de triathlon.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Séance en chaussures", detail: "Si ta piscine l'autorise, ou en eau libre : 6×100 m en chaussures avec pull buoy. Rien ne remplace la sensation réelle, et elle surprend la première fois." },
            { nom: "Nage bras seuls", detail: "Une part importante de ton volume natation peut se faire pull buoy, sans battement : c'est la situation de course. Ce qui serait un raccourci en natation pure est ici spécifique." },
            { nom: "Progression des plaquettes", detail: "Commence avec de petites plaquettes et augmente lentement. Trop grandes trop tôt, elles ralentissent et exposent l'épaule." },
            { nom: "Entrées et sorties d'eau", detail: "Répète l'enchaînement course-entrée-nage-sortie-course sur rive glissante. C'est le moment le plus technique et le plus risqué de l'épreuve, et personne ne le travaille." },
          ],
        },
        {
          type: "renvoi", titre: "Les fondamentaux restent dans le module natation",
          texte: "Position, respiration, prise d'appui et visée sont traités là-bas. Ce bloc ne décrit que ce que le swimrun modifie.",
        },
        {
          type: "warn",
          texte: "Ne découvre pas les plaquettes en course. Elles augmentent nettement la charge sur l'épaule, et la combinaison contraint déjà l'amplitude : la combinaison des deux est la cause la plus fréquente de douleur d'épaule chez les débutants.",
        },
      ],
      sources: [
        { texte: "Envol Swimrun — le pull buoy compense la traînée des chaussures et rend le battement inutile, ce qui préserve les jambes pour la course ; progression recommandée sur la taille des plaquettes.", url: "https://envolcoaching.net/beginners-guide-to-swimrun/", type: "reference" },
        { texte: "Prommer — le pull buoy remplit deux fonctions : réduire la traînée des jambes et des chaussures, et laisser les jambes se reposer pendant les portions nagées.", url: "https://prommer.net/en/training/swimrun/what-is-swimrun/", type: "reference" },
        { texte: "Swimrun Australia — les chaussures restent aux pieds pendant toute l'épreuve ; les plaquettes demandent un apprentissage préalable.", url: "https://swimrun.com.au/swimrun-basics/", type: "reference" },
      ],
    },
    {
      id: "courir", numero: null, titre: "Courir en combinaison", accroche: "Mouillé, chargé, et rarement sur du plat",
      icone: "👟", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte", titre: "Les trois contraintes",
          paragraphes: [
            "<b>La chaleur.</b> Courir en néoprène élève très vite la température corporelle. C'est la raison d'être des combinaisons à zip avant et à jambes amovibles : pouvoir ouvrir en courant et refermer avant la traversée suivante.",
            "<b>Le poids et l'eau.</b> Chaussures gorgées, matériel porté : la foulée est plus lourde et l'appui moins précis qu'en trail classique.",
            "<b>Le terrain.</b> Les portions de course se déroulent souvent sur rochers, racines et sol glissant, avec des jambes qui viennent de sortir de l'horizontale.",
          ],
        },
        {
          type: "texte", titre: "La transition eau-terre",
          paragraphes: [
            "Sortir de l'eau et courir immédiatement provoque un vertige et une accélération cardiaque marqués : le corps passe de l'horizontale à la verticale, et les jambes n'ont presque pas travaillé pendant la nage.",
            "Les premières foulées sont donc les plus instables, sur le terrain le plus glissant de tout le parcours. C'est là que se produisent la plupart des chutes.",
          ],
        },
        {
          type: "drill",
          items: [
            { nom: "Enchaînements courts et répétés", detail: "Sur un plan d'eau bordé de sentier : 6 à 8 fois 200 m de nage suivis de 400 m de course. Tu multiplies les transitions, qui sont le vrai objet de l'entraînement." },
            { nom: "Course en combinaison", detail: "Au moins deux ou trois sorties en néoprène avant l'épreuve, pour découvrir la chaleur, les frottements et la gêne à l'épaule. Toujours en conditions où tu peux t'arrêter." },
            { nom: "Gestion de la fermeture", detail: "Répète l'ouverture et la fermeture du zip en courant, avec les mains froides et éventuellement les plaquettes encore aux poignets." },
            { nom: "Trail technique fatigué", detail: "Le module trail s'applique intégralement ici. Ajoute simplement la contrainte d'arriver sur le sentier en sortant de l'eau." },
          ],
        },
        {
          type: "renvoi", titre: "La descente et le terrain technique sont dans le module trail",
          texte: "Gestion de pente, technique de descente et progressivité de la charge excentrique y sont traités avec leurs sources. Rien ne change ici, sinon les conditions d'arrivée sur le sentier.",
        },
        {
          type: "warn",
          texte: "Les frottements du néoprène sont le problème le plus banal et le plus handicapant : cou, aisselles, intérieur des cuisses. Ils se règlent avec un lubrifiant appliqué avant le départ, et se découvrent à l'entraînement — jamais au kilomètre 20.",
        },
        {
          type: "secu",
          texte: "En équipe, la règle est de rester ensemble et de se surveiller mutuellement : c'est la raison d'être du format à deux, pas une contrainte administrative. En eau froide, l'hypothermie s'installe insidieusement — perte de dextérité, confusion. Sortir tôt vaut mieux que finir.",
        },
      ],
      sources: [
        { texte: "Swimrun Australia — le bonnet peut être retiré entre les traversées ; les combinaisons courtes suffisent en eau tempérée.", url: "https://swimrun.com.au/swimrun-basics/", type: "reference" },
        { texte: "Prommer — combinaisons swimrun en néoprène plus fin, jambes courtes ou amovibles, conçues pour la double contrainte nage et course.", url: "https://prommer.net/en/training/swimrun/gear/", type: "reference" },
        { texte: "Zone3 — chaussures à drainage rapide et bonne accroche sur surfaces glissantes comme critère central.", url: "https://zone3.com/en-us/blogs/inside-zone3/a-beginners-guide-to-swimrun", type: "reference" },
        { texte: "Note de méthode : aucune littérature scientifique spécifique au swimrun n'a été retenue. L'ensemble du module repose sur la pratique des coureurs, des organisateurs et des équipementiers.", url: null, type: "note" },
      ],
    },
  ],
};
