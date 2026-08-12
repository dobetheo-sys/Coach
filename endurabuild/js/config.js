// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { S } from "./state.js";
import { branch, opt } from "./ui/steps.js";

const SPORTS = {
  tri: {
    nom:"Triathlon", ico:"🔺", accent:"#ff3b30",
    pitch:"Trois disciplines, un chrono. Le plan le plus complexe à équilibrer.",
    formats:[["S","Sprint (750m/20k/5k)"],["M","Olympique (1.5/40/10)"],["70.3","Half (1.9/90/21)"],["Full","Ironman (3.8/180/42)"]],
    minWeeks:{S:8,M:12,"70.3":20,Full:36},
    disciplines:["sw","bk","rn"]
  },
  duathlon: {
    nom:"Duathlon", ico:"🏃🚴", accent:"#c2410c",
    pitch:"Course, vélo, course. Deux fois l'impact, et aucune récupération dans l'eau — c'est le format le plus dur pour les jambes du catalogue.",
    formats:[["S","Sprint (5 / 20 / 2,5)"],["M","Standard (10 / 40 / 5)"],["L","Longue distance (14 / 60 / 7)"],["PM","Powerman (10 / 150 / 30)"]],
    minWeeks:{S:8,M:12,L:16,PM:24},
    disciplines:["rn","bk"],
    terrains:[["plat","Plat / roulant"],["vallonne","Vallonné"],["montagne","Montagneux"]]
  },
  swimrun: {
    nom:"Swimrun", ico:"🌊", accent:"#0e7490",
    pitch:"Nager en chaussures, courir en combinaison, vingt fois de suite. Le terrain et le matériel commandent, pas le chrono.",
    // Le format ne sert que de valeurs par DÉFAUT : ce sont les données de l'épreuve
    // (distance nagée, segments, plus longue nage) qui dimensionnent la préparation.
    formats:[["experience","Experience (~5-8 km)"],["sprint","Sprint (~10-15 km)"],["series","World Series (~30-45 km)"],["championship","Championnat du monde (~70 km)"]],
    minWeeks:{experience:10,sprint:12,series:20,championship:30},
    disciplines:["sw","rn"]
  },
  trail: {
    nom:"Trail", ico:"⛰", accent:"#2f7d4f",
    pitch:"Le dénivelé commande tout. On planifie en temps et en D+, jamais en kilomètres — et la descente compte autant que la montée.",
    // Pas de « format » à choisir : la catégorie d'effort est DÉDUITE de la distance et du
    // D+ de la course visée (T6/§3.1). Les formats ci-dessous ne servent qu'à l'affichage.
    formats:[],
    minWeeks:{kv:10,court:12,long:16,ultra:22,ultra_long:28},
    disciplines:["rn"]
  },
  run: {
    nom:"Course à pied", ico:"🏃", accent:"#ff7a1a",
    pitch:"Du 10 km au marathon. L'impact gère tout : volume progressif et renfo au centre.",
    formats:[["5k","5 km"],["10k","10 km"],["semi","Semi-marathon"],["marathon","Marathon"]],
    minWeeks:{"5k":6,"10k":8,semi:12,marathon:16},
    disciplines:["rn"],
    terrains:[["route","Route / bitume"],["trail","Trail / sentier"],["piste","Piste / mixte"]]
  },
  bike: {
    nom:"Vélo", ico:"🚴", accent:"#2e6bff",
    pitch:"Route, gravel ou cyclosportive. Zéro impact : les plus gros volumes tolérés.",
    formats:[["crit","Critérium / courte"],["route","Course sur route"],["cyclo","Cyclosportive"],["clm","Contre-la-montre"],["gravel","Gravel / ultra-distance"]],
    minWeeks:{crit:8,route:12,cyclo:14,clm:10,gravel:16},
    disciplines:["bk"],
    terrains:[["plat","Plat / roulant"],["vallonne","Vallonné"],["montagne","Montagneux"]]
  },
  swim: {
    nom:"Natation", ico:"🏊", accent:"#00b8d9",
    pitch:"Bassin ou eau libre. La technique prime sur le volume — surtout chez le débutant.",
    formats:[["sprint","Sprint (50-100m)"],["demifond","Demi-fond (200-400m)"],["fond","Fond (800-1500m)"],["ow","Eau libre (1-10km)"]],
    minWeeks:{sprint:8,demifond:10,fond:12,ow:14},
    disciplines:["sw"],
    milieux:[["bassin","Bassin"],["ow","Eau libre"],["mixte","Les deux"]]
  }
};

/* ============================================================
   ZENNA — Générateur de plans multisport
   Cœur commun + modules par sport (tri / run / bike / swim)
   ============================================================ */
const PREMIUM_STEPS_DEF=[
  {id:"recovery",title:"Sommeil & vie",eyebrow:"Réglage fin — Récupération",why:"Le sommeil est ton 1er outil de récup, le stress de vie consomme la même capacité. Ils modulent ton plafond.",
   render(){return '<div class="q"><span class="q-label">Sommeil moyen</span><div class="opts" data-key="sleep">'+opt("court","<6h30")+opt("moyen","6h30-7h30")+opt("bon",">7h30")+'</div></div>'
     +'<div class="q"><span class="q-label">Charge de vie</span><div class="opts" data-key="life_load">'+opt("legere","Légère")+opt("normale","Normale")+opt("lourde","Lourde")+'</div></div>';},
   valid(a){return a.sleep&&a.life_load;}},
  {id:"nutri",title:"Objectif de poids",eyebrow:"Gratuit — Composition",why:"Le poids est un paramètre de performance, jamais une injonction. Tu décides s'il est travaillé. (L'onglet Nutrition estime ta dépense et ton ravitaillement d'effort ; il ne fixe jamais de cible d'apport.)",
   render(){let s='<div class="q"><span class="q-label">Travailler le poids comme levier ?</span><div class="q-sub">Révocable à tout moment.</div><div class="opts" data-key="weight_lever">'+opt("oui","Oui")+opt("non","Maintien strict")+opt("coach","Le moteur juge")+'</div></div>';
     // R11.7 — la périodisation sur le cycle AGIT désormais sur le plan (voir
     // src/engine/cycleModel.ts). Elle demande donc les deux données sans lesquelles elle
     // n'est qu'une case à cocher : la date de départ du dernier cycle et sa longueur.
     if(S.answers.sex==="F")s+='<div class="branch"><div class="branch-tag">↳ Option cycle menstruel</div>'
       +'<div class="q"><span class="q-label">Périodiser selon ton cycle ?</span><div class="q-sub">Le plan déplace l\'intensité hors de la fenêtre prémenstruelle, sans toucher au volume. Révocable à tout moment.</div><div class="opts" data-key="cycle_sync">'+opt("oui","Oui")+opt("non","Non")+'</div></div>'
       +'<div id="cycleDates"></div></div>';
     return s;},
   branches(a){
     branch("cycleDates",a.sex==="F"&&a.cycle_sync==="oui",
       '<div class="q"><span class="q-label">1er jour de tes dernières règles</span><div class="q-sub">Sert uniquement à situer les semaines. Rien n\'est transmis nulle part.</div><input type="date" id="qCycleStart" data-input="cycle_start" value="'+(a.cycle_start||"")+'" style="width:100%"></div>'
       +'<div class="q"><span class="q-label">Longueur de ton cycle (jours)</span><div class="q-sub">28 par défaut si tu ne sais pas.</div><input type="number" min="21" max="40" id="qCycleLen" data-input="cycle_len" value="'+(a.cycle_len||"28")+'" style="width:100%"></div>');},
   valid(a){return a.weight_lever&&(a.sex!=="F"||(a.cycle_sync&&(a.cycle_sync!=="oui"||a.cycle_start)));}},
  {id:"races",title:"Courses intermédiaires",eyebrow:"Réglage fin — Le chemin",why:"Des laboratoires avant le jour J : on place une récup juste après chacune, et un mini-affûtage avant les courses importantes.",
   render(){return '<div class="q"><span class="q-label">Des courses avant l\'objectif ?</span><div class="opts" data-key="races">'+opt("oui","Oui")+opt("non","Pas encore")+'</div></div><div id="racesB"></div>';},
   branches(a){
     branch("racesB",a.races==="oui",'<div class="branch"><div class="branch-tag">↳ Tes courses (dates pour les placer dans le calendrier)</div>'
       +'<div class="q"><span class="q-label">Course 1 — date</span><input type="date" data-input="race1_date"></div>'
       +'<div class="q"><span class="q-label">Course 1 — importance</span><div class="opts" data-key="race1_prio">'+opt("C","C — entraînement, on enchaîne")+opt("B","B — vise un bon résultat")+opt("A","A — objectif majeur")+'</div></div>'
       +'<div class="q"><span class="q-label">Une 2e course ? (optionnel) — date</span><input type="date" data-input="race2_date"></div>'
       +'<div id="race2B"></div></div>');
     branch("race2B",a.races==="oui"&&!!a.race2_date,'<div class="q"><span class="q-label">Course 2 — importance</span><div class="opts" data-key="race2_prio">'+opt("C","C")+opt("B","B")+opt("A","A")+'</div></div>');
   },
   valid(a){return a.races==="non"||(a.races==="oui"&&a.race1_date&&a.race1_prio);}},
];
// ===== §11 — contrat de sortie : plan en JSON structuré, indépendant du rendu HTML =====
const VLAB={competition:"Compétition",finir:"Finir",plaisir:"Plaisir",np:"Non précisé",H:"Homme",F:"Femme",
  debutant:"Débutant",inter:"Intermédiaire",avance:"Avancé",reprise:"Reprise <12 mois",confirme:"Régulier 1-3 ans",ancien:"Longue date",
  aucune:"Aucune",course:"Course",velo:"Vélo",epaule:"Épaule",tibia:"Tibias",genou:"Genou",pied:"Pied",hanche:"Hanche",dos:"Dos",cou:"Nuque",
  quotidienne:"Quotidienne libre",semaine:"Quotidienne contrainte",partielle:"4-5j/sem",weekend:"Week-end",
  route:"Route",trail:"Trail",piste:"Piste",plat:"Plat",vallonne:"Vallonné",montagne:"Montagneux",bassin:"Bassin",ow:"Eau libre",mixte:"Mixte",
  court:"<6h30",moyen:"6h30-7h30",bon:">7h30",legere:"Légère",normale:"Normale",lourde:"Lourde",
  sedentaire:"Sédentaire",modere:"Modérément actif",actif:"Métier physique",oui:"Oui",non:"Non",parfois:"Parfois",coach:"Le moteur juge",
  respiration:"Respiration",technique:"Technique",endurance:"Endurance",peur:"Confiance",
  // R7 TRAIL
  roulant:"Roulant",alpin:"Alpin",majoritaire:"Majoritairement",
  collines:"Collines",a_decider:"À décider"};
// R5.6b (audit v7 bis) — le namespace de VLAB est PLAT : il collisionne dès qu'un sport réutilise
// un mot. `partielle` (dispo « 4-5j/sem ») était écrasé par `partielle` (nuit), et `montagne`
// (terrain « Montagneux ») par `montagne` (dénivelé accessible) — l'affichage de la dispo et du
// terrain était donc FAUX. Les libellés ambigus vivent désormais dans une table PAR QUESTION,
// consultée avant la table plate ; celle-ci ne garde que les valeurs sans ambiguïté.
const VLAB_Q={
  dispo:{partielle:"4-5j/sem"},
  terrain:{montagne:"Montagneux"},
  race_night:{partielle:"En partie",majoritaire:"Majoritairement",non:"Non"},
  train_dplus_access:{montagne:"Montagne (+800m)",collines:"Collines (200-800m)",plat:"Plat (<200m)"}};
const QLABELS={intent:"Intention",format:"Objectif",terrain:"Terrain",epreuve:"Épreuve",milieu:"Milieu",sex:"Sexe",level:"Niveau",swim_limit:"Limite",
  ftp_known:"FTP connue",ftp:"FTP",pace_known:"Allure connue",pace:"Allure seuil",css_known:"CSS connu",css:"CSS",history:"Historique",injury:"Blessures",
  sessions_max:"Séances max",vol_max:"Volume max",vol_recent:"Volume récent",dispo:"Dispo",shift_ok:"Décalage",off_days:"Jours OFF",off_which:"Jours bloqués",doubles:"Doubles",
  sleep:"Sommeil",life_load:"Charge vie",weight_lever:"Levier poids",cycle_sync:"Cycle menstruel",races:"Courses inter.",age:"Âge",weight:"Poids",
  race_distance_km:"Distance",race_dplus_m:"D+ course",race_technicity:"Technicité",race_night:"Nuit",
  vam_known:"VAM connue",vam:"VAM",train_dplus_access:"Accès dénivelé",poles:"Bâtons",treadmill:"Tapis inclinable"};
const RULE_CAT={intent:"struct",sante:"sante",duree:"struct",medical:"sante",terrain:"struct",clm:"struct",ow:"disc",bassin:"disc",tech:"disc",recup:"struct",inj:"sante",volume:"struct",sessions:"struct",cycle:"struct",polar:"struct",sleep:"sante",life:"sante",renfo:"sante",gammes:"disc",force:"disc",tech_drill:"disc",poids:"nutri",fer:"sante",cyclep:"sante",races:"struct"};
const CATS=[["struct","🧱","Structure"],["sante","❤️","Santé & garde-fous"],["disc","🎯","Spécifique sport"],["nutri","🍽","Nutrition"]];
const HEROS=["cycle","volume","intent","sante"];

export { CATS, HEROS, PREMIUM_STEPS_DEF, QLABELS, RULE_CAT, SPORTS, VLAB, VLAB_Q };

// R6 — relais OAuth Strava par défaut : l'URL du worker déployé (server/README.md), pour que
// la connexion se fasse en UN clic sans que personne ait à coller quoi que ce soit. Vide =
// pas encore déployé (repli : champ URL en réglages avancés + jeton manuel).
//
// H-1 — DÉPLOYÉ LE 03/08/2026. Ce qu'il y a DANS cette chaîne et ce qu'il n'y a pas :
// c'est une URL PUBLIQUE, rien d'autre. Le `client_secret` Strava vit dans les variables
// Cloudflare (type *Secret*, illisible même depuis le tableau de bord) et ne traverse jamais
// ce dépôt — c'est toute la raison d'être du relais. Le `client_id` (269639) n'est pas ici
// non plus : le worker le porte, alors qu'il aurait pu être public sans risque. Un identifiant
// de moins dans le code d'une app 100 % côté client est un identifiant de moins à faire suivre
// le jour où il change.
//
// Vérifié après déploiement (03/08/2026) : la racine du worker répond
// « Relais OAuth Strava EnduraBuild — endpoints : /auth, /callback, /refresh ».
//
// R-ZENNA v8 — cette phrase garde l'ANCIEN nom À DESSEIN : elle décrit ce que l'instance
// DÉPLOYÉE renvoie aujourd'hui, pas ce que dit la source. `server/strava-relay.js` est renommé
// dans le dépôt, mais un worker Cloudflare ne se met à jour qu'au redéploiement, qui est un
// geste HUMAIN. Renommer la phrase ici ferait passer une intention pour une vérification —
// exactement ce qu'O-19 a coûté. Elle sera mise à jour quand le worker sera redéployé.
// Rien ne dépend de cette chaîne : c'est la réponse 404 de la racine, jamais lue par l'app.
const STRAVA_RELAY_DEFAULT = "https://fragrant-truth-668f.dobetheo.workers.dev";
export { STRAVA_RELAY_DEFAULT };
