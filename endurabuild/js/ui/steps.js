// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { CATS, HEROS, PREMIUM_STEPS_DEF, RULE_CAT, SPORTS, VLAB } from "../config.js";
import { $, S, ebActivate, ebClear, ebSave, todayISO } from "../state.js";
import { renderPlan } from "../ui/plan-view.js";
import { hideTabs, invalidatePlan } from "../ui/tabs.js";
import { buildPlan } from "../app.js";

function opt(val,label){return '<button class="opt" data-val="'+val+'" type="button">'+label+'</button>';}
function branch(id,cond,html){const el=$(id);if(!el)return;el.innerHTML=cond?html:"";if(cond)bindInputs(el);}

/* ---------- HELPERS ZONES ---------- */
function evalRules(a, tier){
  const R=[]; const add=(id,what,val,why)=>R.push({id,what,val,why});
  const sp=S.sport, cfg=SPORTS[sp]; if(!sp)return R;

  // ---- COMMUN : intention ----
  if(a.intent==="competition") add("intent","Philosophie","Performance — chrono cible","Intensité structurée, objectifs chiffrés, affûtage soigné, marges resserrées assumées.");
  else if(a.intent==="finir") add("intent","Philosophie","Finisher — arriver en forme","Volume minimal viable, marges de sécurité partout, pacing ultra-conservateur.");
  else if(a.intent==="plaisir") add("intent","Philosophie","Plaisir durable","Charge soutenable, variété, zéro culpabilisation. Le plan sert la vie.");

  // ---- COMMUN : santé maîtresse ----
  if(a.intent==="competition") add("sante","Priorité santé","Marges resserrées — assumées","Tu acceptes une marge de risque maîtrisée. Garde-fous actifs, seuils plus agressifs.");
  else if(a.intent) add("sante","Priorité santé","Règle maîtresse — zéro blessure","Chaque arbitrage penche vers la prudence. Marge de sécurité 10% sur tous les plafonds.");

  // ---- COMMUN : durée ----
  const fmt=a.format;
  if(fmt&&cfg.minWeeks[fmt]) add("duree","Durée de préparation",cfg.minWeeks[fmt]+" semaines minimum","Préparation proportionnée à l'objectif "+sp+".");

  // ---- COMMUN : sécurité médicale ----
  if(a.med_pain==="oui"||a.med_dizzy==="oui"||a.med_treat==="oui") add("medical","⚠️ Sécurité médicale","Avis médical REQUIS","Signal d'alerte déclaré. Aucune intensité générée sans feu vert d'un médecin. Gratuit, par principe.");

  // ---- SPÉCIFIQUE PAR SPORT : terrain / milieu ----
  if(sp==="trail"){
    add("terrain","Discipline","Trail — le dénivelé commande","Volume planifié en TEMPS et en D+ (jamais en km), intensité en vitesse ascensionnelle en montée, descente programmée comme une charge à part entière, marche rapide entraînée.");
    if(a.train_dplus_access==="plat") add("terrain2","Terrain d'entraînement","Plat — substituts nécessaires","Le dénivelé de ta course n'est pas atteignable près de chez toi : côtes répétées, escaliers ou tapis incliné remplacent une partie du D+, et le plan te le dit au lieu de prescrire l'impossible.");
    if(a.poles==="oui"||a.poles==="a_decider") add("gammes","Bâtons","Marche rapide travaillée","Au-delà de 1500m D+, la marche avec bâtons économise réellement les jambes : elle se prépare comme le reste.");
  }
  if(sp==="run"){
    if(a.terrain==="route") add("terrain","Terrain","Route — allure constante","Régularité d'allure, économie de course, travail de seuil et d'allure spécifique objectif.");
    else if(a.terrain==="piste") add("terrain","Terrain","Piste/mixte — vitesse","Travail de VMA et de vitesse pure, fractionné court de qualité.");
  }
  if(sp==="bike"){
    if(a.terrain==="montagne") add("terrain","Parcours","Montagneux — le W/kg est roi","Force en côte systématique, poids stratégique, pacing montée discipliné, descentes techniques.");
    else if(a.terrain==="vallonne") add("terrain","Parcours","Vallonné — relances","Travail de force, pacing à puissance variable, gestion des bosses au compteur.");
    else if(a.terrain==="plat") add("terrain","Parcours","Plat — puissance constante","Position aéro tenue, puissance régulière, travail au seuil et sweetspot.");
    if(a.format==="clm") add("clm","Spécificité CLM","Position & puissance seuil","Le contre-la-montre se gagne en position aéro à puissance constante : travail spécifique de tenue de position et de gestion d'effort au seuil.");
  }
  if(sp==="swim"){
    if(a.milieu==="ow"||a.milieu==="mixte") add("ow","Eau libre","Compétences spécifiques","Navigation aux repères, nage en peloton, sighting, départ groupé — à travailler en plus de la condition pure.");
    if(a.milieu==="bassin") add("bassin","Bassin","Technique & virages","Travail technique fin, virages, coulées, gestion de l'allure au pace-clock.");
  }

  // ---- COMMUN : niveau / historique ----
  if(a.level==="debutant"&&sp==="swim") add("tech","Priorité technique","Fréquence > volume","Débutant natation : la technique s'automatise par la fréquence. Séances courtes nombreuses, un focus technique par séance.");
  if(a.history==="reprise") add("recup","Rythme récup","2 charge + 1 récup (début), 3+1 ensuite","Corps en reconstruction : décharges plus fréquentes au début.");
  else if(a.history) add("recup","Rythme récup","3 charge + 1 récup","Standard pour un organisme habitué.");

  // ---- COMMUN : blessures ----
  const inj=(a.injury||"").split(",").filter(x=>x&&x!=="aucune");
  if(inj.length>=2) add("inj","Blessures multiples","Approche ultra-conservatrice","Plusieurs zones fragiles : progression ralentie, bilan médical avant montée en charge.");
  else if(inj.length===1){
    if(sp==="run") add("inj","Blessure","Volume progressif + renfo central","L'impact étant le risque n°1 en course, le volume monte lentement et le renforcement devient prioritaire.");
    else add("inj","Blessure","Charge adaptée à la zone fragile","Intensité maintenue sur ce qui est sain, progression prudente sur la zone touchée.");
  }

  // ---- COMMUN : volume (3 plafonds) ----
  if(a.sessions_max&&a.vol_max&&a.history){
    // R7 — en trail il n'y a PAS de format : les plafonds suivent la catégorie d'effort
    // DÉDUITE des données de la course (kv → ultra_long). Les chiffres viennent du moteur
    // (EBV2.trailCaps) pour qu'une seule table existe dans le projet.
    const trailCat = sp==="trail" ? (globalThis.EBV2&&EBV2.trailObjective ? EBV2.trailObjective(a).category : "long") : null;
    const capsBySport={run:{reprise:{"5k":4,"10k":5,semi:6,marathon:8},confirme:{"5k":5,"10k":6,semi:8,marathon:10},ancien:{"5k":6,"10k":7,semi:9,marathon:12}},
      bike:{reprise:{crit:6,route:8,cyclo:9,clm:7,gravel:11},confirme:{crit:8,route:11,cyclo:13,clm:10,gravel:15},ancien:{crit:10,route:14,cyclo:16,clm:12,gravel:20}},
      swim:{reprise:{sprint:3,demifond:4,fond:5,ow:6},confirme:{sprint:5,demifond:6,fond:7,ow:9},ancien:{sprint:6,demifond:8,fond:10,ow:12}},
      tri:{reprise:{S:6,M:8,"70.3":11,Full:15},confirme:{S:7,M:10,"70.3":13,Full:17},ancien:{S:8,M:12,"70.3":15,Full:19}}};
    const utilBySport={run:{"5k":6,"10k":7,semi:9,marathon:12},bike:{crit:9,route:13,cyclo:15,clm:11,gravel:20},swim:{sprint:6,demifond:8,fond:10,ow:12},tri:{S:8,M:11,"70.3":14,Full:18}};
    const tc = (globalThis.EBV2&&EBV2.trailCaps) ? EBV2.trailCaps : null;
    // Un sport ou un format inconnu ne doit JAMAIS casser le rendu des règles : repli documenté.
    const caps = trailCat
      ? (tc&&tc.history[trailCat] ? tc.history[trailCat][a.history] : null) || 11
      : (capsBySport[sp]?.[a.history]?.[fmt] ?? 10);
    const util = trailCat
      ? (tc ? tc.util[trailCat] : null) || 13
      : (utilBySport[sp]?.[fmt] ?? 12);
    const decl=parseInt(a.vol_max), marg=(a.intent==="competition")?1.0:0.9;
    const raw=Math.min(decl,caps,util), fin=Math.round(raw*marg*10)/10;
    let lim = raw===decl?"ta disponibilité":(raw===util?"l'utilité du format":"ton plafond physiologique");
    add("volume","Volume en pic",fin+(sp==="swim"?"h (eau)":"h")+" max",
      "Min de 3 plafonds — déclaré "+decl+"h, physio "+caps+"h, utile "+util+"h. Ici "+lim+" limite."+(marg<1?" Marge santé -10%.":"")+" Pic tenu quelques semaines seulement.");
    add("sessions","Séances/sem","jusqu'à "+a.sessions_max,"Réparties par le moteur selon tes priorités, pas en blocs égaux.");
  }

  // ---- COMMUN : structure cycle ----
  const nOff=(a.off_which||"").split(",").filter(Boolean).length;
  if(a.off_days==="oui"&&nOff>=2) add("cycle","Structure","Semaine 7 jours (jours bloqués)","Avec "+nOff+" jours bloqués, un cycle glissant placerait des séances clés sur tes indispos. La semaine fixe prime.");
  else if(a.dispo==="quotidienne"&&a.shift_ok==="oui") add("cycle","Structure","Cycles de 10 jours","Dispo quotidienne + décalage accepté : espacement optimal des séances clés, alternance parfaite.");
  else if(a.dispo) add("cycle","Structure","Semaine de 7 jours","Repères fixes : la meilleure périodisation est celle qu'on tient.");

  // ---- COMMUN : polarisation + renfo selon sport ----
  add("polar","Distribution","Polarisation ~80/20","Facile vraiment facile, dur vraiment dur. La zone grise fatigue sans progrès.");
  if(tier==="free") return R;

  // ---- PREMIUM commun ----
  if(a.sleep==="court") add("sleep","Sommeil","Plafond réduit ~15%","Moins de 6h30 : la récup limite, pas le temps. Volume ajusté + priorité sommeil.");
  if(a.life_load==="lourde") add("life","Charge de vie","Marge renforcée","Stress total élevé : récup plus fréquente, adaptation quotidienne assouplie.");

  // ---- PREMIUM : renfo/gammes par sport ----
  if(sp==="run"){
    add("renfo","Renforcement","2×/sem, pliométrie progressive","Course = impact. Renfo excentrique + gainage 2×/sem, pliométrie introduite progressivement (initiation→bipodale→unipodale→réactive) pour blinder les tissus. Recul d'un palier à toute douleur.");
    add("gammes","Gammes athlétiques","Dès le développement","Montées de genoux, talons-fesses, foulées bondissantes en échauffement : économie de course et prévention.");
  } else if(sp==="bike"){
    add("renfo","Renforcement","Gainage + force, 1-2×/sem","Gainage pour tenir la position, force max en salle (transfert puissance). Pas d'enjeu d'impact, mais le tronc lâche avant les jambes sur longue distance.");
    add("force","Force vélo","Basse cadence + force max","Gros braquet 50-60rpm + force salle coordonnées : développe la puissance sans usure articulaire.");
  } else if(sp==="swim"){
    add("renfo","Renforcement","Épaules + gainage","Coiffe des rotateurs (prévention épaule du nageur) + gainage (gréement du corps dans l'eau). Élastique 2-3×/sem.");
    add("tech_drill","Éducatifs","À chaque séance","La technique prime : éducatifs (rattrapé, poings fermés, battements) systématiques en échauffement.");
  } else if(sp==="tri"){
    add("renfo","Renforcement","Transversal 3 sports","Renfo tibial (course), gainage position (vélo), coiffe (nage). Pliométrie progressive si pas de blessure active.");
  }

  if(a.weight_lever==="oui"&&a.weight) add("poids","Levier poids","Signalé — pas encore dans les séances","Paramètre de performance"+(sp==="bike"||sp==="run"?" (W/kg ou portage)":"")+", jamais une injonction. Aucun contenu nutritionnel n'est encore généré dans le plan : à travailler avec un professionnel.");
  if(a.sex==="F"){ add("fer","Ferritine","Bilan 3×/an","Risque de carence en fer élevé en endurance féminine."); if(a.cycle_sync==="oui") add("cyclep","Périodisation menstruelle","Bientôt","Pas encore active dans le calcul du plan — on préfère te le dire plutôt que le laisser croire. En attendant, adapte l'intensité à ton ressenti selon ta phase."); }
  if(a.races==="oui") add("races","Courses intermédiaires","Hiérarchie A/B/C","Objectif C = on enchaîne. B = mini-affûtage. Récup placée juste après.");
  return R;
}

/* ============================================================
   ÉTAPES — communes, avec injections spécifiques par sport
   ============================================================ */
function curCfg(){return SPORTS[S.sport];}
function buildFreeSteps(){
  const cfg=curCfg();
  const fmtOpts=cfg.formats.map(f=>opt(f[0],f[1])).join("");
  const steps=[
  {id:"intent",title:"L'intention",eyebrow:"Gratuit — Pourquoi",
   why:"La même cible se prépare différemment selon qu'on vise un chrono, la ligne d'arrivée, ou le plaisir.",
   render(){return '<div class="q"><span class="q-label">Ton moteur ?</span><div class="opts" data-key="intent">'
     +opt("competition",'<span style="color:#e63946">●</span> Compétition')+opt("finir",'<span style="color:#ff7a1a">●</span> Finir')+opt("plaisir",'<span style="color:#2e6bff">●</span> Plaisir')+'</div></div>'
     +(S.sport==="trail"
       // R7 TRAIL — la catégorie d'effort est DÉDUITE (§3.1) : on ne demande pas un format,
       // on demande les données réelles de la course. Le D+ est LA donnée qui structure tout.
       ? '<div class="q"><span class="q-label">Ta course visée</span><div class="q-sub">Le dénivelé compte autant que la distance : c\'est lui qui décide de la durée de préparation, du volume et du contenu.</div><div class="row">'
         +'<div class="q"><span class="q-label">Distance (km)</span><input type="number" min="3" max="350" data-input="race_distance_km" placeholder="62"></div>'
         +'<div class="q"><span class="q-label">D+ total (m)</span><input type="number" min="0" max="20000" data-input="race_dplus_m" placeholder="3200"></div></div>'
         +'<div class="q"><span class="q-label">Terrain de la course</span><div class="opts" data-key="race_technicity">'+opt("roulant","Roulant (pistes larges)")+opt("mixte","Mixte")+opt("technique","Technique (racines, cailloux)")+opt("alpin","Alpin (haute montagne)")+'</div></div>'
         +'<div class="q"><span class="q-label">Course de nuit ?</span><div class="opts" data-key="race_night">'+opt("non","Non")+opt("partielle","En partie")+opt("majoritaire","Majoritairement")+'</div></div>'
         +'<div class="q"><span class="q-label">Barrière horaire (h, optionnel)</span><input type="number" min="1" max="60" step="0.5" data-input="race_cutoff_h" placeholder="—"></div>'
       : '<div class="q"><span class="q-label">Quel objectif ?</span><div class="opts" data-key="format">'+fmtOpts+'</div></div>')
     +'<div class="q"><span class="q-label">Date (si connue)</span><input type="date" data-input="race_date"></div>';},
   valid(a){return a.intent&&(S.sport==="trail" ? (a.race_distance_km&&a.race_dplus_m&&a.race_technicity&&a.race_night) : a.format);}},

  {id:"medical",title:"Sécurité d'abord",eyebrow:"Gratuit — Feu vert",
   why:"Trois questions avant tout. Un signal → orientation médecin avant intensité. Gratuit, non négociable.",
   render(){return '<div class="q-sub">🔒 Ces réponses de santé restent dans ton navigateur et ne sont <b>jamais</b> envoyées à un serveur. Elles servent uniquement à sécuriser ton plan sur cet appareil.</div><div class="q"><span class="q-label">Douleur thoracique à l\'effort, déjà ?</span><div class="opts" data-key="med_pain">'+opt("non","Non")+opt("oui","Oui")+'</div></div>'
     +'<div class="q"><span class="q-label">Vertiges / malaise à l\'effort, déjà ?</span><div class="opts" data-key="med_dizzy">'+opt("non","Non")+opt("oui","Oui")+'</div></div>'
     +'<div class="q"><span class="q-label">Traitement cardiovasculaire ?</span><div class="opts" data-key="med_treat">'+opt("non","Non")+opt("oui","Oui")+'</div></div>';},
   valid(a){return a.med_pain&&a.med_dizzy&&a.med_treat;}},
  ];

  // Étape terrain/milieu spécifique
  if(cfg.terrains){
    steps.push({id:"terrain",title:S.sport==="bike"?"Le parcours":"Le terrain",eyebrow:"Gratuit — Où ça se joue",
      why:S.sport==="bike"?"Plat ou montagne ne se préparent pas pareil : force, braquets, pacing changent.":"Route, trail ou piste : l'impact, le dénivelé et le type de travail diffèrent.",
      render(){return '<div class="q"><span class="q-label">Ton terrain principal</span><div class="opts" data-key="terrain">'+cfg.terrains.map(t=>opt(t[0],t[1])).join("")+'</div></div>';},
      valid(a){return a.terrain;}});
  }
  if(cfg.milieux){
    steps.push({id:"milieu",title:"Bassin ou eau libre",eyebrow:"Gratuit — Le milieu",
      why:"L'eau libre demande des compétences en plus : navigation, peloton, sighting. Le bassin affine la technique.",
      render(){return '<div class="q"><span class="q-label">Où nages-tu principalement ?</span><div class="opts" data-key="milieu">'+cfg.milieux.map(m=>opt(m[0],m[1])).join("")+'</div></div>';},
      valid(a){return a.milieu;}});
  }

  // R7 TRAIL — « Ton terrain » (§3.3) : la contrainte la plus déterminante du trail, et elle
  // n'existait pas. Un athlète en plaine qui prépare un ultra de montagne a besoin d'un plan
  // structurellement différent — le moteur doit le savoir pour le dire au lieu de prescrire
  // du dénivelé inatteignable.
  if(S.sport==="trail"){
    steps.push({id:"terrain_trail",title:"Ton terrain d'entraînement",eyebrow:"Gratuit — Ce que tu peux faire",
      why:"C'est la contrainte n°1 d'une prépa trail : si tu ne peux pas atteindre le dénivelé que ta course demande, le plan doit compenser autrement — et te le dire franchement.",
      render(){return '<div class="q"><span class="q-label">Du dénivelé accessible depuis chez toi ?</span><div class="opts" data-key="train_dplus_access">'
        +opt("montagne","Montagne (+800m possibles)")+opt("collines","Collines (200-800m)")+opt("plat","Plat (moins de 200m)")+'</div></div>'
        +'<div class="q"><span class="q-label">Tapis inclinable disponible ?</span><div class="q-sub">Substitut de montée quand le relief manque (10-15% d\'inclinaison).</div><div class="opts" data-key="treadmill">'+opt("oui","Oui")+opt("non","Non")+'</div></div>'
        +'<div class="q"><span class="q-label">Bâtons de trail ?</span><div class="q-sub">Au-delà de 1500m D+, ils économisent réellement les jambes — mais c\'est ton choix.</div><div class="opts" data-key="poles">'+opt("oui","Oui, j\'en ai")+opt("a_decider","À décider")+opt("non","Non")+'</div></div>';},
      valid(a){return a.train_dplus_access&&a.treadmill&&a.poles;}});
  }

  // Profil
  steps.push({id:"profil",title:"Profil physique",eyebrow:"Gratuit — Qui tu es",
    why:"Âge calibre zones et récup. Poids optionnel (affine le ravitaillement, éditable plus tard). Le sexe ne sert qu'à des garde-fous précis.",
    render(){return '<div class="q-sub">Ces plans sont calibrés pour des adultes. En dessous de 18 ans, la charge (surtout les VO2max répétés) doit être encadrée par un entraîneur — ne suis pas un plan avancé tel quel.</div><div class="row"><div class="q"><span class="q-label">Âge</span><input type="number" min="14" max="90" data-input="age" placeholder="32"></div>'
      +'<div class="q"><span class="q-label">Poids (kg, optionnel)</span><input type="number" data-input="weight" placeholder="—"></div></div>'
      +'<div class="q" style="margin-top:18px"><span class="q-label">Sexe</span><div class="opts" data-key="sex">'+opt("H","Homme")+opt("F","Femme")+opt("np","Préfère ne pas préciser")+'</div></div>';},
    valid(a){return a.age&&a.sex;}});

  // Niveau (zones spécifiques)
  steps.push(levelStep());

  // Santé
  steps.push({id:"sante",title:"Historique & blessures",eyebrow:"Gratuit — Le vécu du corps",
    why:"Une blessure décide quoi adapter. L'ancienneté fixe le plafond de volume — pas la motivation.",
    render(){return '<div class="q"><span class="q-label">Historique structuré</span><div class="opts" data-key="history">'+opt("reprise","Reprise <12 mois")+opt("confirme","Régulier 1-3 ans")+opt("ancien","Longue date")+'</div></div>'
      +'<div class="q"><span class="q-label">Blessures (plusieurs possibles)</span><div class="opts" data-key="injury" data-multi="1" data-exclusive="aucune">'+injuryOpts()+'</div></div>';},
    valid(a){return a.history&&a.injury;}});

  // Capacité
  steps.push({id:"dispo",title:"Ta capacité réelle",eyebrow:"Gratuit — L'enveloppe",
    why:"Réponds pour une semaine NORMALE, pas idéale. On surestime tous de 20-30%. Le moteur garde une marge.",
    render(){return '<div class="q"><span class="q-label">Séances/sem tenables sans sacrifice ?</span><div class="opts" data-key="sessions_max">'+opt("3","≤3")+opt("5","4-5")+opt("7","6-7")+opt("9","8-9")+opt("12","10+")+'</div></div>'
      +'<div class="q"><span class="q-label">Volume horaire max (pic) ?</span><div class="q-sub">⚠️ Atteint seulement quelques semaines au pic, pas toute la prépa.</div><div class="opts" data-key="vol_max">'+opt("4","≤4h")+opt("7","5-7h")+opt("10","8-10h")+opt("13","11-13h")+opt("16","14-16h")+opt("20","16h+")+'</div></div>'
      +'<div class="q"><span class="q-label">Volume RÉEL des 3-6 derniers mois ?</span><div class="q-sub">Ton point de départ : le plan démarre de ce que ton corps fait DÉJÀ, pas de ta capacité max.</div><div class="opts" data-key="vol_recent">'+opt("1","<2h")+opt("3","2-4h")+opt("5","4-6h")+opt("7","6-8h")+opt("10","8-12h")+opt("13","12h+")+'</div></div>'
      +'<div class="q"><span class="q-label">Disponibilité</span><div class="opts" data-key="dispo">'+opt("quotidienne","Tous les jours, libre")+opt("semaine","Tous les jours, contraint")+opt("partielle","4-5 j/sem")+opt("weekend","Week-end surtout")+'</div></div><div id="cycleBranch"></div>'
      +'<div class="q"><span class="q-label">Des jours OFF obligatoires ?</span><div class="opts" data-key="off_days">'+opt("non","Non")+opt("oui","Oui")+'</div></div><div id="offBranch"></div>'
      +'<div class="q"><span class="q-label">Journées à 2 séances possibles ?</span><div class="opts" data-key="doubles">'+opt("oui","Oui")+opt("parfois","Parfois")+opt("non","Non")+'</div></div>';},
    branches(a){
      branch("cycleBranch",a.dispo==="quotidienne",'<div class="branch"><div class="branch-tag">↳ Cycle long possible</div><div class="q"><span class="q-label">Un cycle de 10 jours glisse sur le calendrier (ta séance longue change de jour). OK ?</span><div class="opts" data-key="shift_ok">'+opt("oui","Oui, peu importe")+opt("non","Non, repères fixes")+'</div></div></div>');
      branch("offBranch",a.off_days==="oui",'<div class="branch"><div class="branch-tag">↳ Jours bloqués</div><div class="q"><span class="q-label">Lesquels ?</span><div class="opts" data-key="off_which" data-multi="1">'+["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j=>opt(j,j)).join("")+'</div></div></div>');},
    valid(a){return a.sessions_max&&a.vol_max&&a.vol_recent&&a.dispo&&a.doubles&&a.off_days&&(a.dispo!=="quotidienne"||a.shift_ok)&&(a.off_days==="non"||a.off_which);}});

  return steps;
}
// Méthode pour obtenir une référence qu'on ne connaît pas encore — remplace les
// calculateurs manuels (retirés, redondants avec l'édition directe du Profil) :
// un protocole terrain réel à faire QUAND ON VEUT, résultat saisi plus tard.
function protocolHTML(kind){
  const M={
    ftp:{t:"⚡ Comment obtenir ta FTP",d:"Fais un test de 20 minutes à fond (route, home-trainer, ou une course de ce format) : ta FTP ≈ 95% de ta puissance moyenne sur ces 20 minutes."},
    pace:{t:"⏱ Comment obtenir ton allure seuil",d:"Cours 3 minutes à fond, récupère complètement (10min), puis cours 10 minutes à fond : l'écart de distance parcourue donne ton allure seuil. Plus simple : un 10-15km récent couru à fond en est une bonne estimation."},
    css:{t:"🏊 Comment obtenir ton CSS",d:"Nage 400m à fond, récupère 10 minutes, puis nage 200m à fond : l'écart de temps entre les deux donne ton CSS (allure critique au 100m)."},
  }[kind];
  return '<div class="q-sub" style="margin-top:6px"><b>'+M.t+'</b> — '+M.d+' Tu pourras la renseigner plus tard dans l’onglet 📋 Profil : le plan se recalcule aussitôt.</div>';
}
function levelStep(){
  const sp=S.sport;
  // R7 TRAIL (§3.2) — deux références, pas une : l'allure seuil SUR PLAT et la vitesse
  // ascensionnelle (VAM). En montée, l'allure au sol ne veut rien dire ; la VAM, si.
  if(sp==="trail") return {id:"level",title:"Ton moteur en montagne",eyebrow:"Gratuit — Le moteur",
    why:"Deux références : ton allure seuil sur PLAT, et ta vitesse ascensionnelle (mètres de D+ par heure). C'est la VAM qui pilote l'intensité de tes montées — pas l'allure.",
    render(){return '<div class="q"><span class="q-label">Ton niveau</span><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">Ton allure seuil sur PLAT ?</span><div class="opts" data-key="pace_known">'+opt("oui","Je la connais")+opt("non","Non")+'</div></div><div id="paceB"></div>'
      +'<div class="q"><span class="q-label">Ta vitesse ascensionnelle (VAM) ?</span><div class="q-sub">En mètres de D+ par heure. Repères : débutant 500-700 · intermédiaire 700-1000 · avancé 1000-1400.</div><div class="opts" data-key="vam_known">'+opt("oui","Je la connais")+opt("non","Non")+'</div></div><div id="vamB"></div>';},
    branches(a){
      branch("paceB",a.pace_known==="oui",'<div class="branch"><div class="q"><span class="q-label">Allure seuil sur plat (min/km)</span><input type="text" data-input="pace" placeholder="4:50"></div></div>');
      branch("paceB2",a.pace_known==="non","");
      branch("vamB",a.vam_known==="oui",'<div class="branch"><div class="q"><span class="q-label">VAM (m de D+ / h)</span><input type="number" min="200" max="2500" data-input="vam" placeholder="850"></div></div>');
      if(a.pace_known==="non"||a.vam_known==="non"){
        const el=document.getElementById("vamB");
        if(el&&a.vam_known==="non")el.innerHTML='<div class="q-sub" style="margin-top:6px"><b>⛰ Comment obtenir ta VAM</b> — Sur une montée régulière de 20 à 30 minutes, à l\'effort maximal tenable : le D+ parcouru divisé par la durée donne ta vitesse ascensionnelle seuil, en mètres par heure. Tu pourras la renseigner plus tard dans l\'onglet 📋 Profil : le plan se recalcule aussitôt.</div>';
      }
    },
    valid(a){return a.level&&a.pace_known&&a.vam_known&&(a.pace_known!=="oui"||a.pace)&&(a.vam_known!=="oui"||a.vam);}};
  if(sp==="tri") return {id:"level",title:"Tes niveaux (3 disciplines)",eyebrow:"Gratuit — Le moteur",
    why:"Le triathlon combine 3 sports : on calibre chacun. Renseigne ce que tu connais, le reste passe en zones cardio ou ressenti.",
    render(){return '<div class="q"><span class="q-label">Niveau global</span><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">🏊 Connais-tu ton CSS (allure seuil 100m) ?</span><div class="opts" data-key="css_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="cssB"></div>'
      +'<div class="q"><span class="q-label">🚴 Connais-tu ta FTP (watts) ?</span><div class="opts" data-key="ftp_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="ftpB"></div>'
      +'<div class="q"><span class="q-label">🏃 Connais-tu ton allure seuil course ?</span><div class="opts" data-key="pace_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="paceB"></div><div id="hrB"></div>';},
    branches(a){
      branch("cssB",a.css_known==="oui",'<div class="branch"><div class="q"><span class="q-label">CSS (min/100m, ex 1:45)</span><input type="text" data-input="css" placeholder="1:45"></div></div>');
      branch("ftpB",a.ftp_known==="oui",'<div class="branch"><div class="q"><span class="q-label">FTP (W)</span><input type="number" data-input="ftp" placeholder="220"></div></div>');
      branch("paceB",a.pace_known==="oui",'<div class="branch"><div class="q"><span class="q-label">Allure seuil (min/km, ex 4:50)</span><input type="text" data-input="pace" placeholder="4:50"></div></div>');
      branch("hrB",(a.ftp_known==="non"||a.pace_known==="non"||a.css_known==="non"),'<div class="branch"><div class="branch-tag">↳ Ce qui manque, sans bloquer ton plan</div>'
        +((a.ftp_known==="non"||a.pace_known==="non")?'<div class="q-sub">Vélo/course sans donnée chiffrée : on passe en BPM (FC max estimée par l\'âge, ou renseigne-la).</div><div class="q"><span class="q-label">FC max ? (optionnel)</span><input type="number" data-input="hr_max" placeholder="ex 188"></div>':'')
        +(a.ftp_known==="non"?protocolHTML("ftp"):"")+(a.pace_known==="non"?protocolHTML("pace"):"")+(a.css_known==="non"?protocolHTML("css"):"")+'</div>');
    },
    valid(a){return a.level&&a.css_known&&a.ftp_known&&a.pace_known;}};
  if(sp==="bike") return {id:"level",title:"Ton niveau vélo",eyebrow:"Gratuit — Le moteur",
    why:"La FTP (puissance soutenable ~1h) calibre toutes les zones. Sans capteur, on estime par le ressenti.",
    render(){return '<div class="q"><span class="q-label">Niveau</span><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">Connais-tu ta FTP ?</span><div class="q-def">FTP = puissance (watts) tenable ~1h, mesurée par un capteur ou home-trainer via un test de 20min.</div><div class="opts" data-key="ftp_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="ftpB"></div><div id="hrB"></div>';},
    branches(a){
      branch("ftpB",a.ftp_known==="oui",'<div class="branch"><div class="branch-tag">↳ FTP connue</div><div class="q"><span class="q-label">FTP (W)</span><input type="number" data-input="ftp" placeholder="220"></div></div>');
      branch("hrB",a.ftp_known==="non",'<div class="branch"><div class="branch-tag">↳ Pas de capteur ? On passe en zones cardio</div><div class="q-sub">Tes zones seront données en battements/min (BPM). On estime ta FC max selon ton âge, mais si tu la connais, c\'est plus précis.</div><div class="q"><span class="q-label">FC max connue ? (optionnel)</span><input type="number" data-input="hr_max" placeholder="ex 188"></div><div class="q"><span class="q-label">FC au repos ? (optionnel, affine les zones)</span><input type="number" data-input="hr_rest" placeholder="ex 52"></div>'+protocolHTML("ftp")+'</div>');
    },
    valid(a){return a.level&&a.ftp_known;}};
  if(sp==="swim") return {id:"level",title:"Ton niveau natation",eyebrow:"Gratuit — Dans l'eau",
    why:"Chez le débutant, la technique prime à 80%. Le CSS (allure seuil au 100m) calibre les zones si tu le connais.",
    render(){return '<div class="q"><span class="q-label">Niveau</span><div class="opts" data-key="level">'+opt("debutant","Débutant (technique en construction)")+opt("inter","Intermédiaire (1500m ok)")+opt("avance","Avancé (<1\'30/100m)")+'</div></div><div id="limB"></div>'
      +'<div class="q"><span class="q-label">Connais-tu ton CSS ?</span><div class="q-def">CSS = vitesse critique de nage, ton allure seuil au 100m (test 400m + 200m). Sinon, réponds non.</div><div class="opts" data-key="css_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="cssB"></div><div id="cssProtoB"></div>';},
    branches(a){
      branch("limB",a.level==="debutant",'<div class="branch"><div class="branch-tag">↳ Débutant</div><div class="q"><span class="q-label">Ta principale limite ?</span><div class="opts" data-key="swim_limit">'+opt("respiration","Respiration")+opt("technique","Technique de bras")+opt("endurance","Tenir la distance")+opt("peur","Aisance/confiance")+'</div></div></div>');
      branch("cssB",a.css_known==="oui",'<div class="branch"><div class="branch-tag">↳ CSS connu</div><div class="q"><span class="q-label">CSS (min/100m, ex 1:45)</span><input type="text" data-input="css" placeholder="1:45"></div></div>');
      branch("cssProtoB",a.css_known==="non",'<div class="branch">'+protocolHTML("css")+'</div>');},
    valid(a){return a.level&&a.css_known;}};
  // run
  return {id:"level",title:"Ton niveau course",eyebrow:"Gratuit — La foulée",
    why:"L'allure seuil (tenable ~1h, proche de ton 10km) calibre toutes les zones. Sans montre, on estime au ressenti.",
    render(){return '<div class="q"><span class="q-label">Niveau</span><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">Connais-tu ton allure seuil ?</span><div class="q-def">Allure seuil = allure tenable ~1h, proche de ton 10-15km à fond. Sinon réponds non.</div><div class="opts" data-key="pace_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="paceB"></div><div id="hrB"></div>';},
    branches(a){
      branch("paceB",a.pace_known==="oui",'<div class="branch"><div class="branch-tag">↳ Allure connue</div><div class="q"><span class="q-label">Allure seuil (min/km, ex 4:50)</span><input type="text" data-input="pace" placeholder="4:50"></div></div>');
      branch("hrB",a.pace_known==="non",'<div class="branch"><div class="branch-tag">↳ Pas de repère d\'allure ? On passe en zones cardio</div><div class="q-sub">Tes zones seront en BPM (battements/min) — la plupart des montres les affichent. FC max estimée selon l\'âge, ou renseigne-la pour plus de précision.</div><div class="q"><span class="q-label">FC max connue ? (optionnel)</span><input type="number" data-input="hr_max" placeholder="ex 190"></div><div class="q"><span class="q-label">FC au repos ? (optionnel)</span><input type="number" data-input="hr_rest" placeholder="ex 50"></div>'+protocolHTML("pace")+'</div>');
    },
    valid(a){return a.level&&a.pace_known;}};
}
function injuryOpts(){
  const sp=S.sport;
  let arr=[["aucune","Aucune"]];
  if(sp==="run"||sp==="tri") arr.push(["course","Course (tibias, genou, pied…)"]);
  if(sp==="bike"||sp==="tri") arr.push(["velo","Dos / genou (vélo)"]);
  if(sp==="swim"||sp==="tri") arr.push(["epaule","Épaule (nage)"]);
  if(sp==="run") arr=[["aucune","Aucune"],["tibia","Tibias / périostite"],["genou","Genou"],["pied","Pied / cheville"],["hanche","Hanche / ITB"]];
  if(sp==="bike") arr=[["aucune","Aucune"],["dos","Dos / lombaires"],["genou","Genou"],["cou","Nuque / cervicales"]];
  if(sp==="swim") arr=[["aucune","Aucune"],["epaule","Épaule"],["cou","Nuque"]];
  // R7 TRAIL (§3.4) — ces localisations pilotent DIRECTEMENT le volume de descente :
  // le quadriceps est la zone que la descente casse en premier.
  if(sp==="trail") arr=[["aucune","Aucune"],["quadriceps","Quadriceps (descentes)"],["cheville","Cheville / entorses"],["tibia","Tibias / périostite"],["genou","Genou"],["fascia","Fascia plantaire"],["hanche","Hanche / ITB"]];
  return arr.map(x=>opt(x[0],x[1])).join("");
}

function ebParseT(v){const m=String(v||"").split(":");return m.length===2?(+m[0])*60+(+m[1]):parseFloat(v);}
// ===== §10 — LECTURE Strava (OAuth 2.0, jeton personnel) : alimente a.tests (R3.8) =====
// Lecture seule : on lit les activités récentes et on estime FTP / allure seuil / CSS.
// Aucune écriture vers Strava. CORS supporté par l'API GET Strava avec un bearer token.
const _fk100=s=>Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,"0");
async function stravaImport(oauthTok){
  // Deux chemins vers le même import : token OAuth (relais serveur) ou jeton manuel collé.
  const tok=(oauthTok||((document.getElementById("pfStravaTok")||{}).value||"")).trim();
  const st=document.getElementById("pfStravaMsg");
  const setS=h=>{if(st)st.innerHTML=h;};
  if(!tok){setS("Colle d'abord un token d'accès Strava (Réglages → Mon API, scope <b>activity:read</b>) — ou connecte-toi via le relais ci-dessus.");return;}
  setS("Lecture de tes activités récentes…");
  try{
    const r=await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=50",{headers:{Authorization:"Bearer "+tok}});
    if(!r.ok){setS("Strava a refusé la requête ("+r.status+"). Vérifie le token et le scope activity:read.");return;}
    const acts=await r.json();
    if(!Array.isArray(acts)||!acts.length){setS("Aucune activité récente trouvée.");return;}
    if(!Array.isArray(S.answers.tests))S.answers.tests=[];
    const today=todayISO(),added=[],notes=[];
    const sport=a=>a.sport_type||a.type||"";
    // FTP : uniquement si une sortie porte de la PUISSANCE (la vitesse seule ne dit rien de la FTP).
    const rides=acts.filter(a=>/Ride/.test(sport(a))&&(a.moving_time||0)>=1200);
    const powRides=rides.filter(a=>a.weighted_average_watts||a.average_watts);
    if(powRides.length){const best=powRides.reduce((m,a)=>Math.max(m,a.weighted_average_watts||a.average_watts||0),0);
      if(best>0){const ftp=Math.round(best*0.95);S.answers.tests.push({type:"ftp",value:ftp,date:today,source:"Strava (meilleure sortie ≥20min)"});added.push("FTP ≈ "+ftp+"W");}}
    else if(rides.length)notes.push("FTP non estimée : pas de capteur de puissance sur tes sorties. Saisis-la, ou fais un test 20min ci-dessus.");
    // Allure seuil : course récente la plus rapide EN MOYENNE — c'est un plancher conservateur
    // si tes sorties sont faciles. Un vrai seuil vient du protocole 3min/10min.
    const runs=acts.filter(a=>/Run/.test(sport(a))&&(a.moving_time||0)>=1200&&(a.average_speed||0)>0);
    if(runs.length){const fast=runs.reduce((m,a)=>Math.max(m,a.average_speed||0),0);
      if(fast>0){const sk=Math.round(1000/fast);S.answers.tests.push({type:"thrPace",value:sk,date:today,source:"Strava (course la plus rapide, estimation basse)"});added.push("allure de réf. ≈ "+_fk100(sk)+"/km");}}
    const swims=acts.filter(a=>/Swim/.test(sport(a))&&(a.moving_time||0)>=600&&(a.average_speed||0)>0);
    if(swims.length){const fast=swims.reduce((m,a)=>Math.max(m,a.average_speed||0),0);
      if(fast>0){const s100=Math.round(100/fast);S.answers.tests.push({type:"css",value:s100,date:today,source:"Strava (nage la plus rapide)"});added.push("CSS ≈ "+_fk100(s100)+"/100m");}}
    setS((added.length?("Importé : "+added.join(" · ")+". <span class='q-sub'>Valeurs estimées à partir de tes séances — affine avec un test si besoin.</span>"):"Aucune donnée d'allure/puissance exploitable.")+(notes.length?("<br><span class='q-sub'>⚠ "+notes.join(" ")+"</span>"):""));
    ebSave();
  }catch(e){setS("Échec réseau (CORS ou token invalide). Renseigne les valeurs à la main si besoin.");}
}
function buildPremiumSteps(){return PREMIUM_STEPS_DEF;}

/* ============================================================
   GÉNÉRATEUR multisport
   ============================================================ */
function curSteps(){return S.tier==="free"?buildFreeSteps():buildPremiumSteps();}
function vlab(v){return String(v).split(",").map(x=>VLAB[x]||x).join(", ");}
function bindInputs(scope){
  scope.querySelectorAll(".opts").forEach(g=>{const key=g.dataset.key,multi=g.dataset.multi==="1",excl=g.dataset.exclusive||"";
    g.querySelectorAll(".opt").forEach(b=>{const cur=(S.answers[key]||"").split(",").filter(Boolean);
      if(multi?cur.includes(b.dataset.val):S.answers[key]===b.dataset.val)b.classList.add("sel");
      b.onclick=()=>{
        if(multi){let v=(S.answers[key]||"").split(",").filter(Boolean);const x=b.dataset.val;
          if(x===excl)v=[x];else{v=v.filter(z=>z!==excl);v.includes(x)?v=v.filter(z=>z!==x):v.push(x);}
          S.answers[key]=v.join(",");g.querySelectorAll(".opt").forEach(o=>o.classList.toggle("sel",v.includes(o.dataset.val)));
        } else {g.querySelectorAll(".opt").forEach(o=>o.classList.remove("sel"));b.classList.add("sel");S.answers[key]=b.dataset.val;if(key==="intent")document.body.dataset.intent=b.dataset.val;}
        const st=curSteps()[S.step];if(st&&st.branches)st.branches(S.answers);refreshTrail();refreshNav();ebSave();
      };});});
  scope.querySelectorAll("[data-input]").forEach(inp=>{const key=inp.dataset.input;if(S.answers[key])inp.value=S.answers[key];inp.oninput=()=>{S.answers[key]=inp.value;refreshNav();ebSave();};});
}
function refreshTrail(){ /* fil de décision retiré — remplacé par le bandeau visuel du plan */ }
function refreshNav(){const st=curSteps()[S.step],b=$("nextBtn");if(b&&st)b.disabled=!st.valid(S.answers);}
// R6 — pendant le questionnaire d'un NOUVEAU plan, on doit toujours pouvoir revenir au
// plan en cours (retour utilisateur : « impossible de retourner à l'accueil »). Le
// brouillon jamais terminé est retiré de la liste — pas de plan fantôme.
function backToPlanTarget(){
  if(!Array.isArray(S.plans))return null;
  const cur=S.plans.find(p=>p.id===S.activePlanId);
  return (cur&&cur.prevPlanId&&S.plans.find(p=>p.id===cur.prevPlanId&&p.onPlan))
    ||S.plans.find(p=>p.id!==S.activePlanId&&p.onPlan)||null;
}
function backToPlanHTML(){
  return backToPlanTarget()?'<div style="text-align:center;margin:10px 0"><button class="btn" id="ebBackToPlan" type="button" style="font-size:12px;padding:8px 16px">← Revenir à mon plan en cours</button></div>':"";
}
function bindBackToPlan(){
  const b=$("ebBackToPlan");if(!b)return;
  b.onclick=()=>{
    const target=backToPlanTarget();if(!target)return;
    const cur=S.plans.find(p=>p.id===S.activePlanId);
    if(cur&&!cur.onPlan&&!S.onPlan)S.plans=S.plans.filter(p=>p.id!==cur.id); // brouillon abandonné
    ebActivate(target.id);ebSave();
    if(S.sport)document.body.dataset.sport=S.sport;
    if(S.answers.intent)document.body.dataset.intent=S.answers.intent;
    renderPlan();
  };
}
function renderSportPick(){
  $("progress").innerHTML="";
  let html='<div class="card welcome"><div class="w-tri">🏁</div><h2>Quel plan veux-tu construire ?</h2>'
    +'<p>Un moteur de raisonnement par sport — choisis le tien, le questionnaire s\'adapte.</p><div class="sport-grid">';
  Object.entries(SPORTS).forEach(([k,c])=>{html+='<button class="sport-card" data-sport="'+k+'" type="button" style="--sa:'+c.accent+'"><span class="sc-ico">'+c.ico+'</span><span class="sc-nom">'+c.nom+'</span><span class="sc-pitch">'+c.pitch+'</span></button>';});
  html+='</div></div>'+backToPlanHTML();
  $("screen").innerHTML=html;
  bindBackToPlan();
  document.querySelectorAll(".sport-card").forEach(b=>b.onclick=()=>{S.sport=b.dataset.sport;document.body.dataset.sport=b.dataset.sport;S.started=true;S.step=0;renderStep();});
}
function renderStep(){
  S.onPlan=false;ebSave();hideTabs(); // questionnaire AVANT les onglets — jamais dedans (brief onglets)
  if(!S.sport){renderSportPick();return;}
  const steps=curSteps(),fT=buildFreeSteps().length+1,pT=buildPremiumSteps().length+1;
  let p="";
  if(S.tier==="free")p=Array.from({length:fT},(_,i)=>'<div class="pstep '+(i<S.step?"done":i===S.step?"cur":"")+'"></div>').join("")+'<div class="psep">★</div>'+Array.from({length:pT},()=>'<div class="pstep prem"></div>').join("");
  else p=Array.from({length:fT},()=>'<div class="pstep done"></div>').join("")+'<div class="psep">★</div>'+Array.from({length:pT},(_,i)=>'<div class="pstep prem '+(i<S.step?"done":i===S.step?"cur":"")+'"></div>').join("");
  $("progress").innerHTML=p;
  if($("tierBadge")){$("tierBadge").className="tier-badge "+(S.tier==="free"?"free":"premium");$("tierBadge").textContent=(S.tier==="free"?"● ":"★ ")+SPORTS[S.sport].nom+(S.tier==="free"?" · gratuit":" · premium");}
  if(S.step>=steps.length){renderBlueprint();return;}
  const st=steps[S.step];
  $("screen").innerHTML='<div class="card"><div class="eyebrow">'+st.eyebrow+'</div><h2>'+st.title+'</h2><div class="why">'+st.why+'</div>'+st.render()
    +'<div class="nav"><button class="btn" id="prevBtn" type="button" '+(S.step===0&&S.tier==="free"?'style="visibility:hidden"':'')+'>← Retour</button><button class="btn primary" id="nextBtn" type="button">Continuer →</button></div></div>'
    +backToPlanHTML();
  bindBackToPlan();
  bindInputs($("screen"));if(st.branches)st.branches(S.answers);
  $("prevBtn").onclick=()=>{if(S.step===0&&S.tier==="premium"){S.tier="free";S.step=buildFreeSteps().length;}else if(S.step===0){S.sport=null;S.started=false;document.body.dataset.sport="";}else S.step--;renderStep();};
  $("nextBtn").onclick=()=>{S.step++;renderStep();};
  refreshNav();refreshTrail();
}
function rulesGrouped(rules){let h="";const hs=HEROS.map(id=>rules.find(r=>r.id===id)).filter(Boolean);
  if(hs.length){h+='<div class="bp-heros">';hs.forEach(r=>h+='<div class="bp-hero"><div class="bh-cat">'+r.what+'</div><div class="bh-val">'+r.val+'</div></div>');h+='</div>';}
  CATS.forEach(([c,ic,l])=>{const inc=rules.filter(r=>(RULE_CAT[r.id]||"struct")===c&&!HEROS.includes(r.id)),hic=rules.filter(r=>(RULE_CAT[r.id]||"struct")===c&&HEROS.includes(r.id));if(!inc.length&&!hic.length)return;
    h+='<div class="bp-cat"><div class="bp-cat-h"><span class="ic">'+ic+'</span>'+l+'</div>';hic.concat(inc).forEach(r=>h+='<div class="bp-decision"><div><div class="bp-what">'+r.what+'</div><div class="bp-val">'+r.val+'</div></div><div class="bp-why">'+r.why+'</div></div>');h+='</div>';});
  return h;}
function renderBlueprint(){
  // Plus de mur de règles : transition visuelle directe vers le plan.
  const a=S.answers,med=a.med_pain==="oui"||a.med_dizzy==="oui"||a.med_treat==="oui";
  let html='<div class="card">';
  if(med)html+='<div class="warn"><strong>⚠️ Signal médical déclaré.</strong> Consulte un médecin avant de démarrer toute intensité.</div>';
  if(S.tier==="free"){
    html+='<div class="eyebrow">'+SPORTS[S.sport].nom+' — prêt</div><h2>Ton plan est prêt 🎯</h2>'
      +'<div class="why">On a tout ce qu\'il faut. Génère ton calendrier, ou affine encore avec quelques questions premium.</div>'
      +'<div class="gate"><h3>⚡ Voir mon plan</h3><button class="btn gold" id="genBtn" type="button">Générer mon calendrier</button></div>'
      +'<div class="gate" style="background:var(--bg2)"><h3>★ Aller plus loin</h3><p>Sommeil, contraintes de semaine, tests, nutrition, courses intermédiaires : quelques écrans de plus pour calibrer plus finement. <b>Gratuit</b> — « premium » veut juste dire « plus poussé ».</p><button class="btn" id="goPremium" type="button">Affiner (gratuit) →</button></div>'
      +'<div class="nav"><button class="btn" id="prevBtn" type="button">← Modifier</button><button class="btn" id="restartBtn" type="button">Changer de sport</button></div></div>';
    $("screen").innerHTML=html;$("genBtn").onclick=()=>renderPlan();$("goPremium").onclick=()=>{S.tier="premium";S.step=0;renderStep();};
    $("prevBtn").onclick=()=>{S.step--;renderStep();};$("restartBtn").onclick=()=>reset();
  } else {
    // premium : on va DIRECT au plan, pas d'écran intermédiaire
    renderPlan();return;
  }
}
function reset(){S.sport=null;S.answers={};S.step=0;S.tier="free";S.started=false;S.showAllWeeks=false;S.onPlan=false;invalidatePlan();ebClear();document.body.dataset.intent="";document.body.dataset.sport="";renderStep();}

export { _fk100, bindInputs, branch, buildFreeSteps, buildPremiumSteps, curCfg, curSteps, ebParseT, evalRules, injuryOpts, levelStep, opt, refreshNav, refreshTrail, renderBlueprint, renderSportPick, renderStep, reset, rulesGrouped, stravaImport, vlab };
