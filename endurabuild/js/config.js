// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { S } from "./state.js";
import { branch, ebAddTest, ebAvailDur, ebAvailSet, opt, stravaImport } from "./ui/steps.js";

const SPORTS = {
  tri: {
    nom:"Triathlon", ico:"🔺", accent:"#ff3b30",
    pitch:"Trois disciplines, un chrono. Le plan le plus complexe à équilibrer.",
    formats:[["S","Sprint (750m/20k/5k)"],["M","Olympique (1.5/40/10)"],["70.3","Half (1.9/90/21)"],["Full","Ironman (3.8/180/42)"]],
    minWeeks:{S:8,M:12,"70.3":20,Full:36},
    disciplines:["sw","bk","rn"]
  },
  run: {
    nom:"Course à pied", ico:"🏃", accent:"#ff7a1a",
    pitch:"Du 10 km au marathon. L'impact gère tout : volume progressif et renfo au centre.",
    formats:[["5k","5 km"],["10k","10 km"],["semi","Semi-marathon"],["marathon","Marathon"],["trail","Trail / Ultra"]],
    minWeeks:{"5k":6,"10k":8,semi:12,marathon:16,trail:18},
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
   ENDURABUILD — Générateur de plans multisport
   Cœur commun + modules par sport (tri / run / bike / swim)
   ============================================================ */
const PREMIUM_STEPS_DEF=[
  {id:"weekshape",title:"Contraintes de semaine",eyebrow:"Premium — Disponibilité",why:"Un jour bloqué ou une sortie club imposée : le moteur la décompte de ton budget au lieu de prescrire par-dessus. Tes zones peuvent aussi se caler sur un test récent.",
   render(){
     const days=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
     const cur=d=>{const e=(S.answers.availability||[]).find(x=>x.day===d);if(!e)return"dispo";if(e.status==="blocked")return"blocked";return e.load==="seuil"?"club-seuil":"club-z2";};
     const dur=d=>{const e=(S.answers.availability||[]).find(x=>x.day===d);return e&&e.durationMin?e.durationMin:90;};
     let s='<div class="q"><span class="q-label">Chaque jour (optionnel)</span><div class="q-sub">Dispo = le moteur décide. Bloqué = repos imposé. Club = créneau à durée fixe, décompté du budget.</div>';
     days.forEach(d=>{const v=cur(d);
       const opts=[["dispo","Dispo"],["blocked","Bloqué"],["club-z2","Club (Z2)"],["club-seuil","Club (seuil)"]].map(o=>'<option value="'+o[0]+'"'+(v===o[0]?" selected":"")+'>'+o[1]+'</option>').join("");
       s+='<div class="row" style="align-items:center;gap:8px;margin:4px 0"><span style="width:38px;font-weight:600">'+d+'</span>'
         +'<select onchange="ebAvailSet(\''+d+'\',this.value)">'+opts+'</select>'
         +'<input type="number" data-avdur="'+d+'" value="'+dur(d)+'" onchange="ebAvailDur(\''+d+'\',this.value)" placeholder="min" style="width:72px;display:'+(v.indexOf("club")===0?"":"none")+'"></div>';
     });
     s+='</div><div class="q"><span class="q-label">Test terrain récent (optionnel)</span><div class="q-sub">Le moteur cale tes zones dessus, et les recalcule automatiquement dès que tu ajoutes un test plus récent (les séances passées gardent l\'ancienne valeur).</div>'
       +'<div class="q"><span class="q-label">Date du test</span><input type="date" id="ebTestDate"></div>'
       +'<div class="row" style="gap:6px;flex-wrap:wrap"><input type="number" id="ebFtpP20" placeholder="P20 (W)" style="width:100px"><button type="button" class="opt" onclick="ebAddTest(\'ftp\')">FTP (0.95×P20)</button></div>'
       +'<div class="row" style="gap:6px;flex-wrap:wrap"><input type="text" id="ebCss400" placeholder="400m m:ss" style="width:90px"><input type="text" id="ebCss50" placeholder="50m m:ss" style="width:90px"><button type="button" class="opt" onclick="ebAddTest(\'css\')">CSS nage</button></div>'
       +'<div class="row" style="gap:6px;flex-wrap:wrap"><input type="number" id="ebCsD3" placeholder="3min (m)" style="width:90px"><input type="number" id="ebCsD10" placeholder="10min (m)" style="width:100px"><button type="button" class="opt" onclick="ebAddTest(\'cs\')">Allure seuil</button></div>'
       +'<div class="row" style="gap:6px;flex-wrap:wrap"><input type="number" id="ebVmaD6" placeholder="6min (m)" style="width:100px"><button type="button" class="opt" onclick="ebAddTest(\'vma\')">VMA</button></div>'
       +'<div id="ebTestList" class="q-sub" style="margin-top:6px"></div></div>'
       +'<div class="q"><span class="q-label">Import Strava (lecture seule, optionnel)</span><div class="q-sub">Colle un token d\'accès Strava (Réglages Strava → « Mon API », scope <b>activity:read</b>). On lit tes activités récentes pour estimer FTP, allure seuil et CSS — <b>rien n\'est écrit</b> sur Strava.</div>'
       +'<div class="row" style="gap:6px;flex-wrap:wrap"><input type="text" id="ebStravaTok" placeholder="token d\'accès Strava" style="flex:1;min-width:180px"><button type="button" class="opt" onclick="stravaImport()">Importer depuis Strava</button></div>'
       +'<div id="ebStravaStatus" class="q-sub" style="margin-top:4px"></div></div>';
     return s;
   },
   valid(){return true;}},
  {id:"recovery",title:"Sommeil & vie",eyebrow:"Premium — Récupération",why:"Le sommeil est ton 1er outil de récup, le stress de vie consomme la même capacité. Ils modulent ton plafond.",
   render(){return '<div class="q"><span class="q-label">Sommeil moyen</span><div class="opts" data-key="sleep">'+opt("court","<6h30")+opt("moyen","6h30-7h30")+opt("bon",">7h30")+'</div></div>'
     +'<div class="q"><span class="q-label">Charge de vie</span><div class="opts" data-key="life_load">'+opt("legere","Légère")+opt("normale","Normale")+opt("lourde","Lourde")+'</div></div>';},
   valid(a){return a.sleep&&a.life_load;}},
  {id:"equip",title:"Outils de suivi",eyebrow:"Premium — Mesure",why:"Le HRV permet un garde-fou automatique de surentraînement.",
   render(){return '<div class="q"><span class="q-label">Suivi HRV quotidien ?</span><div class="q-def">HRV = variabilité cardiaque mesurée la nuit (montre, bague). Baisse = corps dépassé.</div><div class="opts" data-key="hrv">'+opt("oui","Oui")+opt("non","Non")+'</div></div>';},
   valid(a){return a.hrv;}},
  {id:"nutri",title:"Objectif de poids",eyebrow:"Gratuit — Composition",why:"Le poids est un paramètre de performance, jamais une injonction. Tu décides s'il est travaillé. (Le conseil nutritionnel détaillé — ravitaillement, hydratation — n'est pas encore dans l'outil.)",
   render(){let s='<div class="q"><span class="q-label">Activité hors sport</span><div class="opts" data-key="daily_burn">'+opt("sedentaire","Sédentaire")+opt("modere","Modérément actif")+opt("actif","Métier physique")+'</div></div>'
     +'<div class="q"><span class="q-label">Travailler le poids comme levier ?</span><div class="q-sub">Révocable à tout moment.</div><div class="opts" data-key="weight_lever">'+opt("oui","Oui")+opt("non","Maintien strict")+opt("coach","Le moteur juge")+'</div></div>';
     if(S.answers.sex==="F")s+='<div class="branch"><div class="branch-tag">↳ Option cycle menstruel</div><div class="q"><span class="q-label">Périodiser selon ton cycle ?</span><div class="opts" data-key="cycle_sync">'+opt("oui","Oui")+opt("non","Non")+'</div></div></div>';
     return s;},
   valid(a){return a.daily_burn&&a.weight_lever&&(a.sex!=="F"||a.cycle_sync);}},
  {id:"races",title:"Courses intermédiaires",eyebrow:"Premium — Le chemin",why:"Des laboratoires avant le jour J : on place une récup juste après chacune, et un mini-affûtage avant les courses importantes.",
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
const fieldTests={
  css:(t400,t50,date)=>{const mps=350/(t400-t50);return{type:"css",value:Math.round(100/mps),date:date||null,source:"400m TT − 50m TT"};},
  cs:(d3,d10,date)=>{const mps=(d10-d3)/420;return{type:"thrPace",value:Math.round(1000/mps),date:date||null,source:"3min max / 10min max"};},
  vma:(d6,date)=>({type:"vma",value:Math.round(d6/100*10)/10,date:date||null,source:"6min max (demi-Cooper)"}),
  ftp:(p20,date)=>({type:"ftp",value:Math.round(0.95*p20),date:date||null,source:"20min TT"})
};
// ===== §11 — contrat de sortie : plan en JSON structuré, indépendant du rendu HTML =====
const VLAB={competition:"Compétition",finir:"Finir",plaisir:"Plaisir",np:"Non précisé",H:"Homme",F:"Femme",
  debutant:"Débutant",inter:"Intermédiaire",avance:"Avancé",reprise:"Reprise <12 mois",confirme:"Régulier 1-3 ans",ancien:"Longue date",
  aucune:"Aucune",course:"Course",velo:"Vélo",epaule:"Épaule",tibia:"Tibias",genou:"Genou",pied:"Pied",hanche:"Hanche",dos:"Dos",cou:"Nuque",
  quotidienne:"Quotidienne libre",semaine:"Quotidienne contrainte",partielle:"4-5j/sem",weekend:"Week-end",
  route:"Route",trail:"Trail",piste:"Piste",plat:"Plat",vallonne:"Vallonné",montagne:"Montagneux",bassin:"Bassin",ow:"Eau libre",mixte:"Mixte",
  court:"<6h30",moyen:"6h30-7h30",bon:">7h30",legere:"Légère",normale:"Normale",lourde:"Lourde",
  sedentaire:"Sédentaire",modere:"Modérément actif",actif:"Métier physique",oui:"Oui",non:"Non",parfois:"Parfois",coach:"Le moteur juge",
  respiration:"Respiration",technique:"Technique",endurance:"Endurance",peur:"Confiance"};
const QLABELS={intent:"Intention",format:"Objectif",terrain:"Terrain",epreuve:"Épreuve",milieu:"Milieu",sex:"Sexe",level:"Niveau",swim_limit:"Limite",
  ftp_known:"FTP connue",ftp:"FTP",pace_known:"Allure connue",pace:"Allure seuil",css_known:"CSS connu",css:"CSS",history:"Historique",injury:"Blessures",
  sessions_max:"Séances max",vol_max:"Volume max",dispo:"Dispo",shift_ok:"Décalage",off_days:"Jours OFF",off_which:"Jours bloqués",doubles:"Doubles",
  sleep:"Sommeil",life_load:"Charge vie",hrv:"HRV",daily_burn:"Activité",weight_lever:"Levier poids",cycle_sync:"Cycle menstruel",races:"Courses inter.",age:"Âge",weight:"Poids",height:"Taille"};
const RULE_CAT={intent:"struct",sante:"sante",duree:"struct",medical:"sante",terrain:"struct",clm:"struct",ow:"disc",bassin:"disc",tech:"disc",recup:"struct",inj:"sante",volume:"struct",sessions:"struct",cycle:"struct",polar:"struct",sleep:"sante",life:"sante",hrv:"sante",renfo:"sante",gammes:"disc",force:"disc",tech_drill:"disc",poids:"nutri",fer:"sante",cyclep:"sante",races:"struct"};
const CATS=[["struct","🧱","Structure"],["sante","❤️","Santé & garde-fous"],["disc","🎯","Spécifique sport"],["nutri","🍽","Nutrition"]];
const HEROS=["cycle","volume","intent","sante"];

export { CATS, HEROS, PREMIUM_STEPS_DEF, QLABELS, RULE_CAT, SPORTS, VLAB, fieldTests };
