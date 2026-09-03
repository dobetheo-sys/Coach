// REPÈRES ANATOMIQUES DU POINTAGE — la table, et rien d'autre.
//
// Elle est REPRISE TELLE QUELLE de `JOINT_POINT_HINTS` (`src/components/PostureCaptureFlow.jsx`
// du dépôt Bikefiting), comme le handoff l'exige : « reprendre tel quel ». Les hints existaient
// déjà dans le code et n'étaient jamais montrés pendant le geste — c'est le défaut que
// l'écran 2c corrige, pas un contenu à réécrire.
//
// Le `titre` est la SEULE chose ajoutée : le handoff demande « une reformulation courte du
// hint » en Poppins, le hint complet restant dans le paragraphe. Chaque titre est donc une
// coupe du hint, jamais une information nouvelle — si les deux divergeaient, l'écran dirait
// deux choses du même os.
export const REPERES = {
  épaule: {
    terme: "acromion",
    titre: "La pointe osseuse\nen haut de l’épaule",
    hint: "Acromion : la pointe osseuse en haut de l'épaule, à l'extrémité de la clavicule — pas le haut du bras.",
  },
  coude: {
    terme: "épicondyle latéral",
    titre: "La bosse osseuse\nsur l’extérieur du coude",
    hint: "Épicondyle latéral de l'humérus : la bosse osseuse sur le côté extérieur du coude, à hauteur de l'articulation.",
  },
  poignet: {
    terme: "styloïde radiale",
    titre: "La bosse du poignet,\ncôté pouce",
    hint: "Apophyse styloïde du radius : la bosse osseuse sur le côté du poignet, côté pouce.",
  },
  main: {
    terme: "2ᵉ métacarpien",
    titre: "La jointure\nà la base de l’index",
    hint: "2ᵉ métacarpien : la jointure à la base de l'index, sur le dessus de la main.",
  },
  hanche: {
    terme: "grand trochanter",
    titre: "La bosse osseuse\nsur le côté de la hanche",
    hint: "Grand trochanter : la bosse osseuse sur le côté de la hanche, sous la ceinture — pas le pli du short.",
  },
  genou: {
    terme: "épicondyle latéral",
    titre: "La bosse osseuse\nsur l’extérieur du genou",
    hint: "Épicondyle latéral du fémur : la bosse osseuse sur le côté extérieur du genou, à hauteur de l'articulation.",
  },
  cheville: {
    terme: "malléole latérale",
    titre: "La bosse osseuse\nsur l’extérieur de la cheville",
    hint: "Malléole latérale : la bosse osseuse sur le côté extérieur de la cheville.",
  },
};

// L'ORDRE DES POINTS EST UNE CHAÎNE ANATOMIQUE CONTINUE, et le dépôt d'origine explique
// pourquoi : l'écran de relecture relie les points consécutifs pour tracer la silhouette, sans
// table de correspondance séparée. Changer l'ordre casserait ce tracé en silence.
// Repris de `MANUAL_MEASURE_STEPS`, y compris la raison pour laquelle le bras n'est mesuré
// qu'au point mort haut : il ne rebouge pas significativement entre PMH et PMB.
export const ETAPES = {
  pmh: {
    titre: "point mort haut",
    consigne: "La pédale du côté filmé est tout en haut : cuisse la plus proche du buste.",
    points: ["main", "poignet", "coude", "épaule", "hanche", "genou"],
  },
  pmb: {
    titre: "point mort bas",
    consigne: "La pédale du côté filmé est tout en bas : jambe la plus tendue.",
    points: ["hanche", "genou", "cheville"],
  },
  aslr: {
    titre: "test de souplesse",
    consigne: "La jambe testée est le plus haut, genou tendu.",
    points: ["hanche", "genou", "cheville"],
  },
};

// ORDRE DE LECTURE DE L'ÉCRAN DE RÉFÉRENCE (t24b) — un numérotage FIXE, distinct de celui d'une
// étape de pointage. `ETAPES[x].points` ordonne une CHAÎNE anatomique continue (l'écran de
// relecture en dérive son tracé, et l'ordre ne doit jamais bouger) ; celui-ci ordonne une
// LISTE de référence, qu'on lit de haut en bas indépendamment de l'essai en cours — la main
// avant l'épaule n'aurait aucun sens dans une liste qu'on consulte au calme.
export const ORDRE_REFERENCE = ["épaule", "coude", "poignet", "main", "hanche", "genou", "cheville"];
