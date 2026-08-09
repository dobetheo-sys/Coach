// Données Éducatifs — Natation (lot R26, voir CLAUDE.md). Contenu repris intégralement (sans
// reformulation) de `educatifs_natation_FINAL.html`. Seule discipline à utiliser la progression
// par paliers (schéma unifié §2 du brief : `prerequis` chaîne p1→p2→p3, `horsSequence` sort une
// section de la barre de progression sans la retirer du contenu).
//
// Rétro-équipement du badge de preuve (§2 du brief, proposition validée) : paliers 1-3 et
// eau libre en `forte`, entretien et battement en `terrain` (consensus de terrain, non
// quantifié dans les sources natation).
//
// Recoupement avec `src/engine/eduLibrary.ts` (SWIM_DRILLS, glossaire lié au générateur —
// intouché, l'engine en dépend) : « rattrapé » ≈ palier 3 « Une main attend l'autre »,
// « poings fermés » = palier 3 « Poing fermé » (mot pour mot), « battements planche » ≈
// annexe « Et le battement ? » (planche mentionnée dans son propre entretien, 2 séries/mois).
// Les trois gestes sont donc déjà couverts ici — aucune section de secours nécessaire.

export const natation = {
  discipline: "natation",
  libelle: "Natation",
  couleur: "--edu-natation",
  formats: ["triathlon", "natation", "swimrun"],
  intro: {
    titre: "Natation — les 4 paliers",
    chapeau: "Chaque palier commence par un test simple qui te dit s'il te concerne, et se termine par un repère chiffré qui te dit quand passer au suivant. Tu avances dans l'ordre : un défaut en amont bloque tout ce qui vient après.",
    encart: {
      titre: "Ton chiffre de base",
      paragraphes: [
        "Compte tes bras sur une longueur de 25 m — chaque fois qu'une main entre dans l'eau — et chronomètre en même temps. Note les deux à chaque test.",
        "Ce couple est ton indicateur d'efficacité : <b>moins de bras pour un temps égal ou meilleur</b> signifie que tu progresses. Si le compte baisse mais que le temps se dégrade, tu glisses au lieu de nager, et ce n'est pas un progrès.",
        "Ne compare pas ton chiffre à celui d'un autre nageur : il dépend de la taille, de l'envergure et de la morphologie. Il n'a de sens que rapporté à ta propre évolution.",
      ],
    },
  },
  sections: [
    {
      id: "p1", numero: 1, titre: "Rester à plat", accroche: "Le plus rentable de très loin",
      icone: "📐", prerequis: null, horsSequence: false, preuve: "forte",
      contenu: [
        {
          type: "test",
          titre: "Ce palier te concerne-t-il ?",
          paragraphes: ["Deux longueurs de 25 m chronométrées : une en nageant normalement, une avec un pull-buoy entre les cuisses <b>sans battre des jambes</b>. Compare les temps."],
        },
        {
          type: "seuils",
          lignes: [
            { niveau: "r", cas: "Nettement plus rapide avec le pull-buoy", consequence: "Tes jambes sont probablement basses et une part de ton effort sert à les traîner. Ce palier est ta priorité." },
            { niveau: "o", cas: "Un peu plus rapide", consequence: "Marge de progression modérée. Le travail reste utile." },
            { niveau: "g", cas: "Temps proches", consequence: "Ta position est correcte, tu peux passer au palier suivant." },
            { niveau: "g", cas: "Plus lent avec le pull-buoy", consequence: "Position déjà acquise et battement propulsif. Ce palier ne te concerne pas." },
          ],
        },
        {
          type: "texte", titre: "Pourquoi",
          paragraphes: ["Le pull-buoy fait flotter tes jambes artificiellement. Si ça change beaucoup, c'est que la position les laissait descendre. Compare tes propres écarts d'une séance à l'autre plutôt que de chercher une valeur seuil : c'est la tendance qui t'informe."],
        },
        { type: "schema", ref: "nat-p1" },
        {
          type: "texte", titre: "Ce que tu cherches à sentir",
          paragraphes: ["L'appui sur le haut de la poitrine, comme si tu appuyais sur un ballon pour l'enfoncer. La tête ne se place pas : elle se laisse dans le prolongement du dos."],
        },
        {
          type: "drill",
          items: [
            { nom: "La coulée", detail: "Pousse au mur, bras le long du corps, sans bouger. Regarde jusqu'où tu vas avant de t'arrêter. 4 fois. Tu cherches la distance, pas la vitesse." },
            { nom: "Pull-buoy, puis sans", detail: "4×50 m avec le pull-buoy en pensant « j'appuie sur la poitrine ». Puis 2×50 m sans, en cherchant la même sensation." },
          ],
        },
        {
          type: "warn",
          texte: "Rentrer le menton dans la poitrine pour faire remonter les jambes. Ça bloque le cou et rend la respiration impossible. La nuque reste longue.",
        },
        {
          type: "texte", titre: "Quand passer au suivant",
          paragraphes: ["Refais le test sur trois séances : l'écart avec et sans pull-buoy se resserre nettement et reste stable."],
        },
      ],
      sources: [
        { texte: "Effect of the Swimmer's Head Position on Passive Drag — une tête basse ou alignée réduit la traînée passive de 4 à 5,2 %, et jusqu'à 10,4-10,9 % bras tendus au-dessus de la tête.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4723180/", type: "reference" },
        { texte: "Passive Drag in Young Swimmers — la traînée croît au moins avec le carré de la vitesse.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7142561/", type: "reference" },
      ],
    },
    {
      id: "p2", numero: 2, titre: "Respirer sans se redresser", accroche: "Chaque respiration ratée casse ta position",
      icone: "📐", prerequis: "p1", horsSequence: false, preuve: "forte",
      contenu: [
        {
          type: "test",
          titre: "Ce palier te concerne-t-il ?",
          paragraphes: [
            "Deux longueurs de 25 m en comptant tes bras : une en respirant tous les 4 bras, une en respirant tous les 2 bras.",
            "Si tu ne peux pas tenir 25 m en respirant tous les 4 bras, ne fais pas le test : ce palier te concerne, commence directement les exercices.",
          ],
        },
        {
          type: "seuils",
          lignes: [
            { niveau: "r", cas: "Beaucoup plus de bras en respirant souvent", consequence: "Chaque respiration te coûte de la vitesse. Ce palier est ta priorité." },
            { niveau: "o", cas: "Léger écart", consequence: "Correct, mais améliorable." },
            { niveau: "g", cas: "Compte quasi identique", consequence: "La respiration est intégrée au mouvement." },
          ],
        },
        {
          type: "texte", titre: "Pourquoi",
          paragraphes: ["Deuxième signal, souvent plus parlant que le compte : si tu finis essoufflé alors que ton cœur est bas, tu ne souffles pas assez sous l'eau. Le problème n'est pas de manquer d'air, c'est de garder l'air usagé."],
        },
        { type: "schema", ref: "nat-p2" },
        {
          type: "texte", titre: "Ce que tu cherches à sentir",
          paragraphes: ["Tu souffles en continu sous l'eau. La bouche s'ouvre uniquement pour prendre de l'air, jamais pour en évacuer."],
        },
        {
          type: "debat", titre: "2 temps ou 3 temps ?",
          texte: "Les deux écoles existent et les deux ont raison sur leur terrain.<br><br><b>Tous les 3 bras</b> alterne les côtés et construit une nage symétrique. C'est pour ça que c'est enseigné, et c'est un excellent réglage de travail.<br><br><b>Tous les 2 bras</b> apporte plus d'oxygène. À intensité élevée, respirer moins souvent devient limitant pour beaucoup de nageurs.<br><br>La recommandation qui fait consensus : s'entraîner en bilatéral, courir en unilatéral du côté fort. L'important n'est pas la cadence choisie mais que les <b>deux côtés</b> restent utilisables.",
        },
        {
          type: "drill",
          items: [
            { nom: "Une lunette dans l'eau", detail: "4×25 m avec cette seule consigne. Si les deux lunettes sortent, tu lèves la tête." },
            { nom: "Bulles sonores", detail: "2×50 m en soufflant assez fort sous l'eau pour t'entendre. Tu vérifies que rien n'est retenu." },
            { nom: "Des deux côtés", detail: "6×50 m en respirant tous les 3 bras. Ça t'oblige à alterner droite et gauche." },
          ],
        },
        {
          type: "warn",
          texte: "Confondre l'outil et l'objectif. Respirer tous les 3 bras sert à construire une nage symétrique : c'est un mode de travail, pas une obligation permanente. Ce que tu cherches, c'est de savoir respirer des deux côtés — pas de t'imposer une cadence unique en toute circonstance.",
        },
        {
          type: "texte", titre: "Quand passer au suivant",
          paragraphes: ["Ton compte de bras varie peu selon que tu respires souvent ou non, et ça vaut des deux côtés."],
        },
      ],
      sources: [
        { texte: "Barden & Barber (2022), Sensors — la respiration accentue significativement le roulis de hanche du côté respiré.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8950838/", type: "reference" },
        { texte: "Sports Performance Bulletin — réduire la fréquence respiratoire limite la perturbation mécanique, mais abaisse la fréquence respiratoire autour de 20 cycles/min en 1:3.", url: "https://www.sportsperformancebulletin.com/training/techniques/swimming-performance-is-bilateral-breathing-a-must", type: "reference" },
      ],
    },
    {
      id: "p3", numero: 3, titre: "Attraper l'eau", accroche: "Là seulement ça vaut le coup de s'occuper des bras",
      icone: "📐", prerequis: "p2", horsSequence: false, preuve: "forte",
      contenu: [
        {
          type: "test",
          titre: "Ce palier te concerne-t-il ?",
          paragraphes: ["Pull-buoy entre les cuisses, pas de battement, bras tendus devant toi. Fais de petits balayages latéraux avec les mains — dehors, dedans, dehors — en inclinant la paume à chaque changement de sens. Essaie d'avancer avec ça seul. Le détail du geste est décrit plus bas."],
        },
        {
          type: "seuils",
          lignes: [
            { niveau: "r", cas: "Tu n'avances pas ou tu recules", consequence: "Ta main glisse sans rien accrocher. Ce palier est ta priorité." },
            { niveau: "g", cas: "Tu avances, même lentement", consequence: "Tu accroches l'eau." },
          ],
        },
        {
          type: "texte", titre: "Pourquoi",
          paragraphes: ["Deuxième signal : où sens-tu l'effort en nageant ? Dans l'épaule et le triceps, tu pousses l'eau vers le bas. Dans le dos, tu la tires vers l'arrière — c'est ce qu'on cherche."],
        },
        { type: "schema", ref: "nat-p3" },
        {
          type: "texte", titre: "Ce que tu cherches à sentir",
          paragraphes: ["La pression sur la paume et tout l'avant-bras, tôt, dès que la main est devant ta tête. Pas au dernier moment près de la hanche."],
        },
        {
          type: "drill",
          items: [
            { nom: "Le balayage", schemaRef: "nat-balayage", detail: "4×25 m, pull-buoy, sans battement.<br><br><b>Position :</b> bras tendus devant, coudes légèrement plus hauts que les mains, sous la surface.<br><br><b>Le mouvement :</b> les mains s'écartent puis se rapprochent, sur une trentaine de centimètres. C'est petit et rapide — plusieurs allers-retours par seconde, pas de grands gestes lents.<br><br><b>Le point clé :</b> à chaque changement de sens, tu bascules le poignet. Quand la main part vers l'extérieur, le pouce s'incline légèrement vers le bas. Quand elle revient vers l'intérieur, le pouce s'incline vers le haut. La paume pousse toujours l'eau <b>vers l'arrière</b>, jamais sur le côté.<br><br><b>L'image :</b> tu étales du beurre sur une tartine, ou tu lisses une nappe des deux mains. Ce n'est pas un essuie-glace : un essuie-glace reste à plat, ta main non.<br><br><b>Le repère :</b> quand c'est juste, tu sens une pression continue sous la paume et tu avances lentement. Si tu ne sens rien, ta main est restée à plat." },
            { nom: "Poing fermé", detail: "4×25 m poings serrés. Sans main, l'avant-bras est obligé de travailler. Quand tu rouvres, tu sens l'eau d'un coup." },
            { nom: "Une main attend l'autre", detail: "4×25 m où une main reste devant jusqu'à ce que l'autre la rejoigne. Ça ralentit et rend le geste conscient." },
          ],
        },
        {
          type: "warn",
          texte: "Sur le dernier exercice, laisser la main qui attend devenir molle. Elle reste en appui, elle continue de pousser l'eau.",
        },
        {
          type: "texte", titre: "Quand passer au suivant",
          paragraphes: ["Tu avances en balayage seul, sans battement, sur une distance qui progresse d'une séance à l'autre. Et tu sens l'effort dans le dos plutôt que dans l'épaule."],
        },
      ],
      sources: [
        { texte: "U.S. Masters Swimming — la godille développe la perception de la pression et l'avant-bras vertical précoce ; l'orientation de la paume détermine la direction.", url: "https://www.usms.org/fitness-and-training/articles-and-videos/articles/teaching-hand-pitch-with-scull-drills", type: "reference" },
        { texte: "Arm Propulsion in Front Crawl Stroke — 87 à 90 % de la propulsion vient des membres supérieurs.", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11768475/", type: "reference" },
      ],
    },
    {
      id: "p4", numero: "EL", titre: "Viser en eau libre", accroche: "Si ta course se déroule en milieu naturel",
      icone: "📐", prerequis: "p2", horsSequence: true, preuve: "forte",
      contenu: [
        {
          type: "secu",
          texte: "<b>Ne nage jamais seul.</b> Va avec quelqu'un, ou dans un site surveillé, et préviens une personne à terre de ton itinéraire et de ton heure de retour.<br><br><b>Entre dans l'eau progressivement.</b> Ne saute jamais : sous 15 °C, l'immersion brutale déclenche un choc thermique qui perturbe la respiration et la motricité. Attends que ta respiration soit calme avant de nager.<br><br><b>Rends-toi visible.</b> Bonnet de couleur vive et bouée de traction — elle te signale et te sert d'appui si tu fatigues.<br><br><b>Emporte un moyen d'appel</b> dans une pochette étanche.<br><br><b>Nage parallèlement à la rive</b>, pas vers le large, et garde ton point de sortie en vue.<br><br><b>En cas de difficulté :</b> mets-toi sur le dos, oreilles immergées, bras et jambes écartés, et laisse ta respiration se calmer avant d'agir. Ne lutte pas.<br><br>Vérifie que la baignade est autorisée sur le site.",
        },
        { type: "schema", ref: "nat-p4" },
        {
          type: "test",
          titre: "Ce palier te concerne-t-il ?",
          paragraphes: ["En bassin : un 50 m normal chronométré, puis un 50 m en levant les yeux pour viser tous les 6 bras. Compare."],
        },
        {
          type: "seuils",
          lignes: [
            { niveau: "r", cas: "Écart important", consequence: "Chaque visée casse ta position. Sur une course, le coût s'additionne sur plusieurs dizaines de visées." },
            { niveau: "o", cas: "Écart modéré", consequence: "Perfectible, travaille le timing." },
            { niveau: "g", cas: "Temps proches", consequence: "Visée intégrée au mouvement." },
          ],
        },
        {
          type: "texte", titre: "Pourquoi",
          paragraphes: ["C'est le seul palier qui ne corrige pas un défaut de nage mais ajoute une compétence. Il s'ouvre dès le palier 2 validé : apprendre à viser droit ne dépend pas de la qualité de ta prise d'appui."],
        },
        {
          type: "texte", titre: "Ce que tu cherches à sentir",
          paragraphes: ["Les yeux sortent à peine, comme un crocodile. Le menton reste bas. La visée se fait sur l'appui de la main qui vient d'entrer devant — c'est elle qui te soutient."],
        },
        {
          type: "drill",
          items: [
            { nom: "Viser puis respirer", detail: "4×50 m : yeux devant tous les 6 bras, puis tête sur le côté pour respirer dans la foulée. Un seul mouvement continu, jamais deux temps." },
            { nom: "Nager sans mur", detail: "En eau libre ou en longeant le bassin sans pousser : 3×3 min continues. Sans mur pour repartir, l'allure et la respiration se gèrent autrement." },
            { nom: "Combinaison en piscine", detail: "Si ta course se nage en combinaison et que le bassin l'autorise : une séance en combi avant l'échéance. Les jambes remontent, les épaules sont contraintes, l'amplitude change. Ça se découvre à l'entraînement, pas le jour J." },
          ],
        },
        {
          type: "warn",
          texte: "Viser trop souvent par anxiété. Tous les 6 à 10 bras suffit en eau calme, davantage si c'est agité. Et repère un point haut derrière la bouée (arbre, bâtiment) : une bouée à ras de l'eau est invisible entre deux vagues.",
        },
        {
          type: "texte", titre: "Quand passer au suivant",
          paragraphes: ["L'écart entre 50 m normal et 50 m avec visée devient faible. Et tu enchaînes une sortie en eau libre continue, dans les conditions de sécurité ci-dessus."],
        },
      ],
      sources: [
        { texte: "U.S. Masters Swimming — relever la tête fait plonger les hanches et augmente la traînée ; technique dite des « yeux de crocodile ».", url: "https://www.usms.org/fitness-and-training/articles-and-videos/articles/maximizing-open-water-sighting-efficiency", type: "reference" },
        { texte: "Swim England — méthode d'apprentissage progressif de la visée.", url: "https://www.swimming.org/openwater/practise-open-water-sighting/", type: "reference" },
        { texte: "RNLI — consignes de sécurité en eau libre (ne jamais nager seul, choc thermique, bouée, Float to Live).", url: "https://rnli.org/water-safety/choose-your-activity/open-water-swimming", type: "reference" },
      ],
    },
    {
      id: "materiel", numero: null, titre: "Le matériel", accroche: "Ce qui aide vraiment, et ce qui attend",
      icone: "🎒", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte",
          paragraphes: [
            "<b>Le tuba frontal — l'achat qui change tout.</b> Il supprime la respiration comme variable : tu peux travailler ta position et ta prise d'appui sans que le geste soit cassé toutes les 3 secondes. Pour quelqu'un qui apprend seul, c'est de loin l'outil le plus rentable.",
            "<b>Le pull-buoy.</b> Indispensable pour les tests des paliers 1 et 3. 10 €.",
            "<b>La planche.</b> Utile pour le peu de battement à entretenir. Facultative.",
            "<b>Les plaquettes.</b> À réserver aux paliers acquis. Elles amplifient la force transmise à l'épaule : sur un geste encore mal construit, elles accélèrent surtout le risque de blessure.",
          ],
        },
      ],
      sources: [{ texte: "Aucune source scientifique retenue pour ce bloc de conseils matériel — pratique convergente des maîtres-nageurs.", url: null, type: "note" }],
    },
    {
      id: "blocage", numero: null, titre: "Si tu bloques sur un palier", accroche: "Trois échecs ne veulent pas dire « travailler plus »",
      icone: "🧭", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte",
          paragraphes: ["Trois échecs consécutifs au test de sortie ne veulent pas dire qu'il faut travailler plus. Dans l'ordre :"],
        },
        {
          type: "drill",
          items: [
            { nom: "1. Vérifie le palier précédent", detail: "Un défaut réapparu en amont bloque tout l'aval. Refais le test d'entrée du palier d'avant." },
            { nom: "2. Filme-toi", detail: "Un téléphone en pochette étanche posé au fond, ou quelqu'un qui filme depuis le bord. Trente secondes de vidéo valent dix séances de sensations." },
            { nom: "3. Une leçon, pas un abonnement", detail: "Un seul cours particulier avec un maître-nageur, en lui montrant le test qui bloque. C'est le meilleur rapport temps/progrès quand on apprend seul — et ça ne remet pas en cause ton autonomie." },
          ],
        },
      ],
      sources: [{ texte: "Aucune source scientifique retenue pour ce bloc — pratique convergente des maîtres-nageurs.", url: null, type: "note" }],
    },
    {
      id: "placement", numero: null, titre: "Où placer les éducatifs dans ta séance", accroche: "Un éducatif se travaille frais",
      icone: "🗓", prerequis: null, horsSequence: true, preuve: "consensus",
      contenu: [
        {
          type: "texte",
          paragraphes: ["Un éducatif se travaille <b>frais</b>. Fatigué, tu répètes le geste que tu veux corriger et tu l'ancres au lieu de le défaire."],
        },
        {
          type: "drill",
          items: [
            { nom: "Après l'échauffement, avant le corps de séance", detail: "10 à 15 min, soit 400 à 600 m. C'est le créneau principal." },
            { nom: "Une seule consigne à la fois", detail: "Deux consignes simultanées = zéro consigne. Tu sors du bassin avec une seule chose en tête." },
            { nom: "Deux séances sur trois", detail: "La troisième reste une séance de volume pur, sans réflexion technique. Nager mal parfois fait partie du processus." },
            { nom: "25 m d'éducatif, puis 25 m nage normale", detail: "Le transfert est la partie qui compte. Un éducatif jamais réinjecté dans la nage complète ne sert à rien." },
          ],
        },
      ],
      sources: [{ texte: "Aucune source scientifique retenue pour ce bloc — principe d'apprentissage moteur général, pas de source natation spécifique.", url: null, type: "note" }],
    },
    {
      id: "entretien", numero: null, titre: "Après les paliers — entretien", accroche: "Ce qui prévient les défauts qui reviennent",
      icone: "🔧", prerequis: null, horsSequence: true, preuve: "terrain",
      contenu: [
        {
          type: "drill",
          items: [
            { nom: "Rouler sur le côté", detail: "Signal d'alerte : une épaule qui chauffe avant l'autre, ou tu dévies toujours du même côté en eau libre. 4×50 m battements sur le côté, un bras devant, bascule tous les 6 battements." },
            { nom: "Faire baisser ton compteur", detail: "8×25 m en enlevant un bras toutes les deux longueurs, même temps. Ton plancher, c'est quand le chrono se dégrade." },
          ],
        },
      ],
      sources: [{ texte: "Aucune source scientifique retenue pour ce bloc — pratique convergente des maîtres-nageurs.", url: null, type: "note" }],
    },
    {
      id: "battement", numero: null, titre: "Et le battement ?", accroche: "Moins prioritaire qu'on ne le croit, et c'est volontaire",
      icone: "🦵", prerequis: null, horsSequence: true, preuve: "terrain",
      contenu: [
        {
          type: "texte",
          paragraphes: [
            "Moins prioritaire qu'on ne le croit, et c'est volontaire. Les études situent la contribution du battement à la propulsion en crawl autour de 10 à 13 %, l'essentiel venant des bras — certaines méthodes de mesure donnent des valeurs plus élevées, mais toutes convergent sur le rôle secondaire des jambes. Sur longue distance, un battement puissant consomme beaucoup d'oxygène pour un gain de vitesse faible. En triathlon, cet oxygène manque ensuite aux jambes sur le vélo, et en combinaison la flottaison est déjà assurée.",
            "Le battement doit surtout <b>ne pas freiner</b> : amplitude faible, mouvement parti de la hanche, chevilles relâchées. Deux séries de 4×25 m avec une planche par mois suffisent à l'entretenir.",
            "Si tes cuisses brûlent en nageant, tu bats trop fort. Et si tes jambes coulent, ça se règle au palier 1, pas en battant plus fort.",
            "Sur courte distance ou en nage pure sans combinaison, le battement redevient propulsif et mérite un travail dédié.",
          ],
        },
      ],
      sources: [
        { texte: "Relative Contribution of Arms and Legs in 30 s Fully Tethered Front Crawl — mesure de force en nage attachée, répartition bras/jambes 70/30 (H) et 67/33 (F).", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4619838/", type: "reference" },
        { texte: "Étude PubMed 27052972 — environ 11 % de gain de vitesse apporté par le battement chez des nageurs élites, coût métabolique équivalent entre nage complète et bras seuls à fréquence préférentielle.", url: "https://pubmed.ncbi.nlm.nih.gov/27052972/", type: "reference" },
      ],
    },
  ],
};
