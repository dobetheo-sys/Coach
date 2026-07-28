// R4.9 — Contenu du jour : UNE carte quotidienne, y compris (surtout) les jours de repos.
// L'aléatoire porte sur le CONTENU, jamais sur la charge. Pondération contextuelle :
// repos → physiologie/anecdote ; veille de qualité → micro-défi interdit ; drapeau
// douleur → contenu récupération uniquement. Rotation déterministe par date (pas de
// reroll en re-rendant l'écran).
import { S } from "../state.js";

// ---- Bibliothèque d'anecdotes (histoire des sports d'endurance) — 90 entrées ----
const ANECDOTES = [
  "1904, marathon olympique de Saint-Louis : le « vainqueur » Fred Lorz avait fait 17 km en voiture. Le vrai gagnant, Thomas Hicks, courait dopé à la strychnine — l'antidopage n'existait pas.",
  "Emil Zátopek a gagné le 5000m, le 10000m ET le marathon aux JO de 1952. Il n'avait jamais couru de marathon avant.",
  "Le premier Ironman (Hawaï, 1978) est né d'un pari de bar : nageurs, cyclistes ou coureurs — qui sont les plus endurants ? 15 partants, 12 finishers.",
  "Kathrine Switzer a couru Boston en 1967 avec le dossard 261, alors que le marathon était interdit aux femmes. Un officiel a tenté de l'arracher de la course — elle a fini.",
  "La distance du marathon (42,195 km) vient des JO de Londres 1908 : on a allongé le parcours pour que l'arrivée soit sous la loge royale.",
  "Eddy Merckx a gagné 525 courses professionnelles. Son surnom : le Cannibale. Sa méthode : « Roule. Beaucoup. »",
  "Au premier Tour de France (1903), les coureurs réparaient eux-mêmes leurs vélos, de nuit, entre des étapes de 400 km.",
  "Gertrude Ederle, 1926 : première femme à traverser la Manche à la nage — en battant le record masculin de près de 2 heures.",
  "Abebe Bikila a gagné le marathon olympique de Rome (1960) pieds nus. Il a récidivé en 1964 — avec des chaussures, et un nouveau record du monde.",
  "Le « mur » du marathon vers le 30e km correspond à l'épuisement du glycogène : ~2000 kcal stockées, ~2500 dépensées. D'où le ravito.",
  "Julie Moss, Ironman 1982 : effondrée à 15 mètres de la ligne, elle a fini à quatre pattes. Cette image a fait exploser le triathlon mondial.",
  "Jeannie Longo a été championne de France de cyclisme sur une période de… 31 ans (1979 à 2011).",
  "Le record de l'heure cycliste a été détenu par Fausto Coppi pendant 14 ans (1942-1956), établi entre deux bombardements pendant la guerre.",
  "Paula Radcliffe a couru le marathon en 2h15'25 en 2003. Ce record féminin a tenu 16 ans.",
  "Eliud Kipchoge est passé sous les 2h au marathon en 2019 (1h59'40) — avec 41 lièvres en rotation et une flèche laser au sol pour l'allure.",
  "La Diagonale des Fous (Réunion) : 165 km, 10000m de D+. Les premiers finissent en ~24h, les derniers marchent près de 4 jours.",
  "Le canal de la Manche a été traversé à la nage pour la première fois en 1875 par Matthew Webb — enduit de graisse de marsouin, en brasse, en 21h45.",
  "Miguel Indurain avait un cœur de 7 litres de volume systolique et 28 pulsations/min au repos. La moyenne humaine : 60-80.",
  "Le triathlon est entré aux JO en 2000 à Sydney. Distance olympique : 1,5 km / 40 km / 10 km — le format M de ton app.",
  "En 1926, Violet Piercy devient officieusement la première femme chronométrée sur marathon : 3h40, seule sur la route, sans course officielle ouverte aux femmes.",
  "Le VO2max le plus élevé jamais mesuré : le cycliste Oskar Svendsen, 97,5 ml/kg/min. Un sédentaire moyen : 35-40.",
  "Steve Prefontaine n'a jamais perdu une course de plus d'un mile sur sa piste d'Eugene. Sa philosophie : « Le meilleur rythme est un rythme suicide. » (Ne l'imite pas.)",
  "Les Tarahumaras du Mexique courent des ultras en sandales de pneu recyclé, en buvant de la bière de maïs. Le livre Born to Run les a rendus célèbres.",
  "Aux 24h du Mans cycliste des années 1890, on inventa le « pacing » : des équipes entières de lièvres se relayaient devant un seul coureur.",
  "Le premier vainqueur du Tour, Maurice Garin, fut disqualifié l'année suivante : il avait pris le train.",
  "Sarah Thomas a nagé 4 fois la Manche SANS S'ARRÊTER en 2019 : 54 heures. Un an après un cancer du sein.",
  "Le marathon de Boston (1897) est le plus vieux marathon annuel du monde. Sa côte du 32e km s'appelle Heartbreak Hill — la colline crève-cœur.",
  "Beryl Burton a dominé le cyclisme féminin britannique 25 ans. Son record du CLM de 12h (1967) dépassait celui des hommes de 8 km.",
  "En course à pied, chaque foulée encaisse 2 à 3 fois ton poids de corps. Sur un marathon : ~25000 impacts par jambe. D'où la progressivité.",
  "Le premier maillot jaune de l'histoire (1919) fut choisi… parce que le journal L'Auto, organisateur, était imprimé sur papier jaune.",
  "Lynne Cox a nagé le détroit de Béring (5°C, sans combinaison) en 1987, entre USA et URSS, en pleine guerre froide. Les deux pays ont ouvert la frontière pour elle.",
  "Un peloton cycliste économise jusqu'à 40% d'énergie par l'aspiration. Seul le premier « paie plein tarif ».",
  "Kilian Jornet a monté et descendu le Cervin en 2h52. L'alpiniste moyen y passe deux jours.",
  "Le mile en moins de 4 minutes était jugé physiologiquement impossible. Roger Bannister l'a fait en 1954 — 46 jours après, un autre le battait. Barrière mentale.",
  "Chrissie Wellington n'a JAMAIS perdu un Ironman : 13 départs, 13 victoires (2007-2011).",
  "Le Vendée Globe se court en solitaire, sans escale, sans assistance. Les skippers dorment par tranches de 20 minutes pendant 3 mois.",
  "La Barkley Marathons (Tennessee) : 5 boucles de ~32 km, 60h max, parcours non balisé. En 40 ans, moins de 20 finishers.",
  "Ann Trason a gagné 14 fois la Western States 100 miles. Elle courait « pour voir ce qu'il y a au bout de la fatigue ».",
  "La FC max ne se dépasse pas : c'est un plafond physiologique. L'entraînement ne l'augmente pas — il augmente ce que tu fais EN DESSOUS.",
  "Aux JO antiques, l'épreuve reine d'endurance était le dolichos : ~4600m… couru nu dans la poussière d'Olympie.",
  "Pheidippidès, le messager de Marathon, aurait en réalité couru Athènes-Sparte : 246 km. La course Spartathlon refait ce trajet chaque année (record ~19h55).",
  "George Sheehan, cardiologue et philosophe de la course : « Chacun est un athlète. Certains sont juste en retard à l'entraînement. »",
  "Le cœur d'un athlète d'endurance pompe ~35 litres/min à l'effort max, contre 20 pour un sédentaire. Ça s'entraîne — lentement.",
  "En 1971, Adrienne Beames devient la première femme sous les 3h au marathon. Dix ans plus tôt, on affirmait que l'utérus « tomberait » au-delà de 800m.",
  "Le Tour de France 1926 : 5745 km, la plus longue édition. Étape moyenne : 340 km. Sur des vélos à 2 vitesses.",
  "Mark Allen a perdu 6 fois contre Dave Scott à Hawaï avant de gagner leur duel de légende, l'Iron War 1989 — 8h de course, 58 secondes d'écart.",
  "Le talon d'Achille du nageur : l'épaule. 2500 rotations de bras par heure de nage. La technique n'est pas un luxe, c'est une assurance.",
  "Jan Ullrich n'a gagné qu'un Tour mais fini 2e cinq fois — l'histoire retient les vainqueurs, les physiologistes retiennent sa constance.",
  "L'échappée la plus longue victorieuse du Tour moderne : Albert Bourlon, 253 km seul en 1947.",
  "Yiannis Kouros détient les records du monde de 24h (303 km), 48h et 6 jours. Son secret déclaré : « Je ne cours pas avec mon corps, mais avec mon esprit. »",
  "Une étude sur 55000 coureurs : courir 5-10 min par JOUR à allure lente réduit déjà la mortalité cardiovasculaire de 45%. Le volume n'est pas tout.",
  "Le drafting (aspiration) est interdit en Ironman : 12 mètres entre vélos. Toute la course s'en trouve changée — c'est un CLM déguisé.",
  "Grete Waitz a gagné 9 fois le marathon de New York. À son premier (1978), elle n'avait jamais couru plus de 20 km — record du monde à l'arrivée.",
  "Le « bonk » cycliste et le « mur » du marathonien sont le même phénomène : plus de glycogène. Les pros mangent 90-120g de glucides/heure pour l'éviter.",
  "Tom Simpson est mort sur le Ventoux en 1967, amphétamines dans les poches. Sa dernière phrase supposée : « Remettez-moi sur le vélo. » Le dopage tue.",
  "L'Enduroman relie Londres à Paris en triathlon : course jusqu'à Douvres, traversée de la Manche À LA NAGE, vélo jusqu'à l'Arc de Triomphe. Moins de 60 finishers.",
  "Le record du monde de planche (plank) : plus de 9h30. L'endurance n'est pas toujours affaire de kilomètres.",
  "Les coureurs kényans du Rift dominent le fond mondial. Point commun : 20-25% de leur volume seulement en intensité. Le reste ? Très, très facile.",
  "Jacques Anquetil, 5 Tours de France, s'entraînait « au feeling » et détestait les côtes. Le talent existe — l'entraînement le multiplie.",
  "La première femme à l'Ironman d'Hawaï, Lyn Lemaire (1979), était aussi championne de cyclisme. Elle finit 5e au général, hommes compris.",
  "Un maillot de bain en polyuréthane (2009) faisait gagner ~2%. 130 records du monde en un an. Interdit depuis — la technologie aussi se régule.",
  "Le premier marathon couru en moins de 2h30 date de 1925 ; en moins de 2h10, de 1967. Chaque génération repousse le « plafond » de la précédente.",
  "Les 6 marathons majeurs (Boston, Londres, Berlin, Chicago, New York, Tokyo) ont leur médaille commune : les Six Stars. Moins de 20000 finishers dans le monde.",
  "Le cycliste sur piste ne freine jamais : pas de frein sur un vélo de piste, et pas de roue libre. On apprend à ralentir avec les jambes.",
  "Pendant la Seconde Guerre mondiale, le vélodrome d'Hiver de Paris fut le théâtre de la rafle du Vél d'Hiv. Le sport n'est jamais hors de l'histoire.",
  "Haile Gebrselassie courait enfant 10 km aller-retour pour l'école, cartable sous le bras — son bras gauche a gardé cette position en course toute sa carrière.",
  "L'UTMB fait ~171 km et 10000m de D+ autour du Mont-Blanc. Les élites le bouclent en ~20h. La lanterne rouge a droit à 46h30 — et la même médaille.",
  "En natation, 80% de la propulsion vient des bras. Les jambes équilibrent surtout. C'est l'inverse de presque tous les autres sports d'endurance.",
  "Le squelette d'un coureur régulier est plus DENSE que celui d'un sédentaire : l'impact contrôlé renforce l'os. La dose fait le poison — et le remède.",
  "Ironman Hawaï se court dans les champs de lave de Kona : 35°C au sol, vent de face dans les deux sens (le mumuku). Les pros s'y préparent en sauna.",
  "Le plus vieux finisher du championnat du monde Ironman : Hiromu Inada, 85 ans (Kona 2018). Il a commencé le triathlon à 70 ans.",
  "Zátopek encore : il s'entraînait en bottes militaires dans la neige, en retenant sa respiration entre les arbres. Ne copie rien — retiens l'audace.",
  "Le cyclisme fut le premier sport à autoriser officiellement les femmes aux JO d'été modernes en athlétisme d'endurance… en 1984 seulement pour le marathon.",
  "Joan Benoit a gagné ce premier marathon olympique féminin (1984), 17 jours après une arthroscopie du genou.",
  "Le rameur olympique brûle ~36 kcal/min en course — l'une des dépenses les plus violentes du sport. Sur 2000m « seulement ».",
  "L'effet « négative split » : courir la seconde moitié plus vite. La plupart des records du monde de fond ont été établis ainsi. La patience paie littéralement.",
  "Les pistards japonais du keirin vivent en internat, sans téléphone, pendant leur formation. Leur école a un taux d'admission plus dur que la magistrature.",
  "Une dérive cardiaque de moins de 5% sur une sortie longue = bonne endurance de base. C'est mesurable avec n'importe quelle montre — et ça se construit en Z2.",
  "Le record de traversées de la Manche : Alison Streeter, 43 fois. Surnom : la Reine de la Manche.",
  "Sur ultra, on dort ou pas ? Courtney Dauwalter (reine de l'ultra) dort parfois 5 minutes sur le bord du sentier et repart gagner.",
  "Le premier vélo « safety » à deux roues égales (1885) a démocratisé le cyclisme — avant lui, le grand-bi tuait ses pilotes par-dessus le guidon.",
  "L'altitude idéale pour l'entraînement en hypoxie : 2000-2500m. En dessous, peu d'effet ; au-dessus, on récupère mal. Les Kényans y vivent en permanence.",
  "Le muscle cardiaque ne se fatigue jamais au sens musculaire : il ne connaît ni courbature ni crampe. Ton cœur finit chaque séance frais.",
  "Bernard Hinault a gagné Liège-Bastogne-Liège 1980 sous la neige, avec 9h de course et deux doigts gelés à vie. 80% du peloton avait abandonné à mi-course.",
  "La sueur ne refroidit que si elle s'évapore : par temps humide, elle coule sans refroidir. C'est pour ça que l'humidité est pire que la chaleur sèche.",
  "Miguel Indurain gagnait le Tour au contre-la-montre et « gérait » la montagne. Connaître sa force et s'y tenir : une leçon de plan d'entraînement.",
  "La première épreuve féminine de natation aux JO (1912) : les nageuses australiennes durent payer leur propre voyage. Fanny Durack gagna — record du monde.",
  "Un gramme de glycogène stocke 3g d'eau avec lui. La « perte de poids » des premiers jours de régime ou d'affûtage, c'est surtout de l'eau. Ne t'y trompe pas.",
  "Le peloton du Tour consomme ~6000 kcal/jour en montagne — l'équivalent de 11 repas. Manger EST une épreuve du Tour.",
  "Sifan Hassan a gagné le marathon de Londres 2023 en s'arrêtant DEUX fois (étirement, ravito raté) — puis a sprinté la dernière ligne droite. Rien n'est jamais plié.",
];

// ---- Physiologie vulgarisée, par phase du plan ----
const PHYSIO = {
  base: [
    "En phase de base, tes mitochondries se multiplient : ce sont les centrales énergétiques des muscles. Le volume FACILE est ce qui les fait proliférer — pas l'intensité.",
    "Le cœur s'agrandit en ce moment (vraiment) : le ventricule gauche gagne du volume avec l'endurance basse intensité. Plus de sang par battement = FC plus basse à effort égal.",
    "La capillarisation : ton corps construit de nouveaux micro-vaisseaux autour des fibres musculaires. Ce réseau se densifie sur des SEMAINES de Z2 — c'est maintenant.",
  ],
  dev: [
    "Les séances au seuil apprennent à ton corps à recycler le lactate comme carburant. Le lactate n'est pas un déchet : mal exploité, il déborde ; entraîné, il alimente.",
    "La VO2max se développe par les intervalles courts à haute intensité : le débit cardiaque maximal monte. Quelques minutes par semaine suffisent — d'où leur rareté dans ton plan.",
    "L'économie de gestes (course, coup de pédale, nage) progresse en phase de développement : à puissance égale, tu consommes moins. C'est un gain gratuit le jour J.",
  ],
  spec: [
    "La phase spécifique cale ton corps sur l'allure de course : les fibres recrutées, la gestion du carburant, même la perception de l'effort deviennent « spécifiques » au rythme cible.",
    "L'entraînement du tube digestif est réel : les récepteurs intestinaux s'adaptent à absorber plus de glucides/heure. Ça se travaille sur les longues — jamais le jour J.",
    "Ton cerveau étalonne l'allure cible : après des semaines de répétition, il « connaît » l'effort soutenable. La confiance du jour J est physiologique, pas magique.",
  ],
  peak: [
    "Semaine de pic : la charge est maximale, les adaptations sont commandées mais PAS encore livrées. La forme que tu sens n'est pas la forme que tu auras — elle arrive avec l'affûtage.",
    "La fatigue masque la forme : le modèle fitness-fatigue montre que tu es au plus haut de ta condition ET au plus haut de ta fatigue. L'affûtage va lever le voile.",
    "C'est la semaine où le sommeil rapporte le plus : la consolidation des adaptations passe par le sommeil profond. Chaque heure compte double.",
  ],
  taper: [
    "L'affûtage : le volume chute, la forme monte. La surcompensation a besoin de ces jours-là — tes muscles restockent, tes hormones se rééquilibrent, ta puissance remonte.",
    "Tu te sens bizarre, lourd, irritable pendant l'affûtage ? Classique : le corps en pleine restauration envoie des signaux confus. Ne rajoute RIEN, c'est le piège.",
    "Le glycogène musculaire se supercompense pendant l'affûtage : avec le volume en baisse et les glucides maintenus, tes réserves montent AU-DESSUS de la normale.",
  ],
  recup: [
    "Semaine de récup : la surcompensation a besoin de ces jours. La charge des 3 dernières semaines se transforme en adaptations MAINTENANT — pas pendant l'effort.",
    "Le sommeil profond libère l'hormone de croissance qui répare muscles et tendons. Une semaine de décharge bien dormie vaut une semaine d'entraînement.",
    "Baisser la charge périodiquement évite la stagnation : le corps s'adapte aux STRESS VARIÉS, pas au stress permanent. Ta semaine légère est un outil, pas une pause.",
  ],
};

// ---- Micro-défis techniques (jamais volumiques) ----
const CHALLENGES = [
  "Aujourd'hui pendant l'échauffement : compte ta cadence sur 30s (pieds ou pédales). Juste observer, sans corriger.",
  "Sur 5 minutes de ta séance : relâche consciemment les épaules et la mâchoire toutes les minutes. La tension parasite coûte de l'énergie.",
  "Défi respiration : 3 minutes en soufflant DEUX fois plus longtemps que tu n'inspires. À faire au calme ou en Z1.",
  "Pendant ta séance : bois par petites gorgées toutes les 10-12 minutes plutôt qu'une grande rasade à la fin.",
  "Concentre-toi 5 minutes sur la pose de pied (ou le coup de pédale rond, ou l'appui dans l'eau) : un seul point technique, pas deux.",
  "Regarde 50m devant toi (pas tes pieds) pendant toute la première moitié de séance. La posture suit le regard.",
  "Échauffement d'aujourd'hui : ajoute 2 minutes de mobilité hanches/chevilles. C'est le meilleur rapport temps/bénéfice de la prévention.",
  "Défi du jour : la première moitié de séance STRICTEMENT plus lente que la seconde. Le negative split est une compétence.",
  "Compte tes appuis (ou coups de bras) sur 25m/100m : essaie d'en faire UN de moins avec la même vitesse, en t'allongeant.",
  "Aujourd'hui : zéro écran pendant l'étirement/retour au calme. 5 minutes de sensations, c'est aussi de l'entraînement.",
  "Test de la conversation : en Z2, récite mentalement une phrase complète. Si tu ne peux pas la dire à voix haute, ralentis.",
  "Gainage post-séance : 3×30s de planche, en respirant NORMALEMENT (le gainage en apnée ne compte pas).",
  "Avant la séance : 30 secondes pour visualiser le déroulé complet, y compris le moment où ce sera dur. Le cerveau adore les répétitions générales.",
  "Pendant le retour au calme : note mentalement UNE chose réussie aujourd'hui. Tu la retrouveras dans ton feedback post-séance.",
  "Défi cadence (vélo) : 2 minutes à 100+ rpm sur petit braquet, souple. (Course : 20s de fréquence rapide sur place.)",
];

// Récupération (servi sous drapeau douleur — uniquement du contenu qui aide à guérir)
const RECOVERY_CONTENT = [
  "Douleur ≠ courbature : la courbature est diffuse, symétrique, s'estompe en bougeant. La douleur est localisée, précise, augmente à l'effort. La seconde impose l'arrêt — tu as bien fait.",
  "La cicatrisation des tissus suit son propre calendrier : tendon ~ semaines, os ~ mois. L'entraînement reprend APRÈS, pas pendant. Le plan t'attendra.",
  "Glace ou chaleur ? Douleur aiguë récente : froid. Raideur chronique : chaleur. Dans le doute (ou si ça dure) : un professionnel, pas un forum.",
  "Le repos forcé n'efface pas ta condition : l'endurance de base se maintient ~2 semaines sans perte notable. Tu as plus de marge que tu ne crois.",
  "Bouger sans charger : la marche, la mobilité douce et (souvent) la natation entretiennent la circulation qui répare — à valider selon ta zone douloureuse.",
];

// ---- Stat personnelle (générée depuis l'historique réel) ----
function personalStat(plan, todayISO) {
  const a = S.answers;
  const tests = Array.isArray(a.tests) ? a.tests : [];
  // évolution d'une référence si ≥2 mesures du même type
  for (const type of ["thrPace", "ftp", "css"]) {
    const ts = tests.filter((t) => t.type === type && isFinite(+t.value)).sort((x, y) => String(x.date || "").localeCompare(String(y.date || "")));
    if (ts.length >= 2) {
      const first = ts[0], last = ts[ts.length - 1];
      if (+first.value !== +last.value) {
        const f = (v) => type === "ftp" ? Math.round(v) + "W" : Math.floor(v / 60) + "'" + String(Math.round(v % 60)).padStart(2, "0");
        return "Ta référence " + (type === "ftp" ? "FTP" : type === "css" ? "CSS" : "allure seuil") + " : " + f(+first.value) + " le " + (first.date || "?") + " → " + f(+last.value) + " aujourd'hui. C'est ça, l'entraînement structuré.";
      }
    }
  }
  if (globalThis.EBV2 && globalThis.EBV2.progress) {
    try {
      const pg = globalThis.EBV2.progress(plan, a, todayISO);
      if (pg.doneMin > 0) return "Depuis le début du plan : " + (Math.round(pg.doneMin / 6) / 10) + "h d'entraînement réellement validées, " + pg.pctLoad + "% de la charge totale. Chaque ✓ compte.";
    } catch (e) {}
  }
  return null;
}

function hashDate(dateISO, mod) {
  let h = 0;
  for (const c of dateISO + (S.activePlanId || "")) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return h % mod;
}

export function dailyContentHTML(plan, todayISO) {
  const pf = S.answers.painFlag;
  let kind, icon, title, body;
  const day = plan.weeks.flatMap((w) => w.days).find((d) => d.date === todayISO);
  const isRest = !day || day.sessions.every((s) => s.d === "rs");
  // veille de séance de qualité ? (micro-défi interdit la veille de qualité)
  const tomorrow = new Date(new Date(todayISO + "T00:00:00Z").getTime() + 864e5).toISOString().slice(0, 10);
  const dayT = plan.weeks.flatMap((w) => w.days).find((d) => d.date === tomorrow);
  const hardTomorrow = !!(dayT && dayT.sessions.some((s) => (s.steps || []).some((st) => st.role === "body" && typeof st.zone === "string" && [".vo2", ".thr", ".speed", ".css"].some((z) => st.zone.endsWith(z)))));

  if (pf && pf.active) {
    kind = "recup"; icon = "🩹"; title = "Pendant que ça répare";
    body = RECOVERY_CONTENT[hashDate(todayISO, RECOVERY_CONTENT.length)];
  } else {
    // rotation déterministe par date ; pondération contextuelle (spec §10)
    const roll = hashDate(todayISO, isRest ? 3 : hardTomorrow ? 3 : 4); // 4e type (défi) exclu si repos… non : repos → physio/anecdote/stat ; veille qualité → pas de défi
    const phase = (day && day.phaseId) || (plan.weeks.find((w) => w.days.some((d) => d.date >= todayISO)) || plan.weeks[0]).phase.id;
    const isRecupW = plan.weeks.some((w) => w.isRecup && w.days.some((d) => d.date === todayISO));
    const physioPool = PHYSIO[isRecupW ? "recup" : phase] || PHYSIO.base;
    if (roll === 0) { kind = "anecdote"; icon = "📜"; title = "Petite histoire d'endurance"; body = ANECDOTES[hashDate(todayISO + "a", ANECDOTES.length)]; }
    else if (roll === 1) { kind = "physio"; icon = "🔬"; title = "Ce que ton corps fabrique en ce moment"; body = physioPool[hashDate(todayISO + "p", physioPool.length)]; }
    else if (roll === 2) {
      const stat = personalStat(plan, todayISO);
      if (stat) { kind = "stat"; icon = "📊"; title = "Ta stat du jour"; body = stat; }
      else { kind = "anecdote"; icon = "📜"; title = "Petite histoire d'endurance"; body = ANECDOTES[hashDate(todayISO + "a", ANECDOTES.length)]; }
    } else { kind = "defi"; icon = "🎯"; title = "Micro-défi technique (zéro volume en plus)"; body = CHALLENGES[hashDate(todayISO + "c", CHALLENGES.length)]; }
  }
  return '<details class="load-card" open><summary class="load-title">' + icon + " " + title + '</summary><div class="load-sub" style="margin-top:6px;font-size:13px;line-height:1.55">' + body + "</div></details>";
}
