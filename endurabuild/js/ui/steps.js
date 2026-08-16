// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { CATS, HEROS, PREMIUM_STEPS_DEF, RULE_CAT, SPORTS, VLAB, VLAB_Q } from "../config.js";
import { $, S, ebActivate, ebClear, ebSave, todayISO } from "../state.js";
import { renderPlan } from "../ui/plan-view.js";
import { hideTabs, invalidatePlan } from "../ui/tabs.js";
import { stravaFetch } from "../strava.js";

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
  if(sp==="swimrun"){
    add("terrain","Discipline","Swimrun — le matériel et le terrain commandent","Volume planifié en TEMPS, jamais en kilomètres. Le terrain est celui du trail, la nage se fait en chaussures et en combinaison, et les transitions sont un poste de temps à part entière.");
    add("transitions","Transitions","Un poste de temps, pas un détail","Ta course compte deux transitions par segment nagé. À 2 minutes l'unité, vingt transitions font quarante minutes — c'est le temps le plus facile à récupérer, et il s'entraîne.");
    if(a.team_mode!=="solo") add("binome","Binôme","Effet de longe calculé","Le suiveur économise 15 à 20 % d'effort et n'a pas la charge de navigation ; attachée, la vitesse de l'équipe se rapproche de celle du nageur le plus rapide. C'est dans le calcul, pas dans un conseil.");
    if(a.openwater_access==="aucun") add("ow2","Accès eau libre","Aucun — substitutions","Le plan remplace les swimruns par des enchaînements bassin ↔ course et le DIT : la navigation, la houle et le froid ne se substituent pas. Cale deux week-ends en eau libre avant ta course.");
    if(!a.swimrun_swim_pace||!a.swimrun_run_pace) add("refs","Références","ESTIMÉES, pas mesurées","Tes allures sont dérivées de ton CSS et de ton allure route par des facteurs de repli. Un binôme à 6 min/km sur route se retrouve souvent autour de 8 min/km en tenue : fais le test en tenue complète, c'est lui qui rend la prédiction honnête.");
  }
  if(sp==="duathlon"){
    add("terrain","Discipline","Duathlon — deux fois l'impact","Deux segments de course, dont un sur jambes entamées, et aucune séance dans l'eau pour absorber du volume sans impact : le plafond de jours d'appui est le garde-fou n°1 de ce plan, et la longue sortie se fait à vélo.");
    add("brick","Enchaînements","Les DEUX sens travaillés","R1 → vélo (tu montes sur le vélo avec des jambes déjà entamées : la puissance tenable n'est pas celle d'un contre-la-montre frais) et vélo → R2 (le R2 est plus court et plus intense que la CAP d'un triathlon : on n'y gère pas, on y lutte).");
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
    // R10 phase 0 (§ R10.0.3) — les plafonds viennent du MOTEUR, plus d'une copie locale.
    // La copie avait divergé (8h affichées, 9h appliquées en vélo/route/reprise) : une règle
    // qui explique une décision doit lire le chiffre qui décide, sinon elle raconte.
    const vc = (globalThis.EBV2&&EBV2.volumeCaps) ? EBV2.volumeCaps : null;
    const tc = (globalThis.EBV2&&EBV2.trailCaps) ? EBV2.trailCaps : null;
    // Un sport ou un format inconnu ne doit JAMAIS casser le rendu des règles : repli documenté.
    const caps = trailCat
      ? (tc&&tc.history[trailCat] ? tc.history[trailCat][a.history] : null) || 11
      : (vc?.history?.[sp]?.[a.history]?.[fmt] ?? 10);
    const util = trailCat
      ? (tc ? tc.util[trailCat] : null) || 13
      : (vc?.util?.[sp]?.[fmt] ?? 12);
    const decl=parseInt(a.vol_max), marg=(a.intent==="competition")?(vc?.margin?.competition ?? 1.0):(vc?.margin?.autres ?? 0.9);
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

  if(a.weight_lever==="oui"&&a.weight) add("poids","Levier poids","Actif sur le plan","Paramètre de performance"+(sp==="bike"||sp==="run"?" (W/kg ou portage)":"")+", jamais une injonction. L'onglet 🥗 Nutrition estime ta dépense et ton ravitaillement d'effort ; il ne prescrit AUCUNE cible d'apport ni aucun régime — ça, c'est l'affaire d'un diététicien.");
  if(a.sex==="F"){ add("fer","Ferritine","Bilan 3×/an","Risque de carence en fer élevé en endurance féminine."); if(a.cycle_sync==="oui") add("cyclep","Périodisation menstruelle","Active sur le placement","Sur une semaine majoritairement prémenstruelle, la SECONDE séance de qualité redevient facile — jamais les deux, et le volume de la semaine ne bouge pas. L'effet moyen de la phase sur la performance est faible et très variable d'une personne à l'autre : on touche au placement, pas à la charge. Ton ressenti reste le dernier mot, et la question est révocable."); }
  if(a.races==="oui") add("races","Courses intermédiaires","Hiérarchie A/B/C","Objectif C = on enchaîne. B = mini-affûtage. Récup placée juste après.");
  return R;
}

/* ============================================================
   ÉTAPES — communes, avec injections spécifiques par sport
   ============================================================ */
function curCfg(){return SPORTS[S.sport];}
function buildFreeSteps(){
  const cfg=curCfg();
  // R11.1 — le SCHÉMA D'ENTRÉE du moteur est la source de vérité des domaines. L'UI garde ses
  // libellés (le moteur n'a que faire de « Ironman (3.8/180/42) »), mais la LISTE des valeurs
  // vient de lui : deux listes écrites à deux endroits divergent toujours, et c'est ainsi
  // qu'un format proposé ici a pu ne plus exister là-bas — en silence.
  const allowed = (globalThis.EBV2 && globalThis.EBV2.formatsBySport && globalThis.EBV2.formatsBySport[S.sport]) || null;
  const fmtList = allowed ? cfg.formats.filter(f=>allowed.includes(f[0])) : cfg.formats;
  if (allowed && fmtList.length !== cfg.formats.length)
    console.warn("EB: formats proposés absents du schéma moteur —", cfg.formats.filter(f=>!allowed.includes(f[0])).map(f=>f[0]));
  const fmtOpts=fmtList.map(f=>opt(f[0],f[1])).join("");
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
       : S.sport==="swimrun"
       // R10 phase 3 — SWIMRUN (§R10.3.2) : le format ne sert que de valeurs par DÉFAUT. Ce
       // qui dimensionne la préparation, ce sont la distance nagée, le NOMBRE DE SEGMENTS
       // (donc de transitions) et la PLUS LONGUE NAGE — contrainte thermique et mentale.
       ? '<div class="q"><span class="q-label">Quel format ?</span><div class="opts" data-key="format">'+fmtOpts+'</div></div>'
         +'<div class="q"><span class="q-label">Les données de ta course</span><div class="q-sub">Laisse vide si tu ne les connais pas encore : on part des repères du format, et tu affines plus tard au Profil.</div><div class="row">'
         +'<div class="q"><span class="q-label">Total nagé (m)</span><input type="number" min="200" max="20000" data-input="swim_total_m" placeholder="2600"></div>'
         +'<div class="q"><span class="q-label">Total couru (km)</span><input type="number" min="1" max="120" step="0.1" data-input="run_total_km" placeholder="9.2"></div></div>'
         +'<div class="row"><div class="q"><span class="q-label">D+ total (m)</span><input type="number" min="0" max="8000" data-input="race_dplus_m" placeholder="250"></div>'
         +'<div class="q"><span class="q-label">Segments nagés</span><input type="number" min="1" max="60" data-input="segments_n" placeholder="10"></div></div>'
         +'<div class="row"><div class="q"><span class="q-label">La plus longue nage (m)</span><div class="q-def">C\'est elle qui dimensionne ta prépa : thermiquement et mentalement.</div><input type="number" min="50" max="5000" data-input="longest_swim_m" placeholder="600"></div>'
         +'<div class="q"><span class="q-label">Température d\'eau prévue (°C)</span><input type="number" min="4" max="30" data-input="water_temp_c" placeholder="16"></div></div>'
         +'<div class="q"><span class="q-label">Solo ou binôme ?</span><div class="q-def">La plupart des épreuves se courent en binôme, attachés par une longe — et ça change toute la prescription.</div><div class="opts" data-key="team_mode">'+opt("binome","En binôme")+opt("solo","En solo")+'</div></div><div id="teamB"></div>'
         +'<div class="q"><span class="q-label">Accès à l\'eau libre à l\'entraînement ?</span><div class="opts" data-key="openwater_access">'+opt("toute_annee","Toute l\'année")+opt("saisonnier","En saison seulement")+opt("aucun","Aucun")+'</div></div>'
         +'<div class="q"><span class="q-label">Tu nages 30min (~1200m) sans t\'arrêter ?</span><div class="opts" data-key="swim_continuous">'+opt("oui","Oui")+opt("non","Pas encore")+'</div></div>'
         +'<div class="q"><span class="q-label">Tu cours 30min en continu ?</span><div class="opts" data-key="run_continuous">'+opt("oui","Oui")+opt("non","Pas encore")+'</div></div><div id="prereqB"></div>'
       : S.sport==="tri"
       // D3 §1 — LES DEUX QUESTIONS QUE LE GATE B-17 CONSOMME. Elles étaient déclarées au schéma
       // et POSÉES NULLE PART : la clé était consommée et inrenseignable, ce qu'`audit:sensibilite`
       // ne détecte pas (il vérifie qu'une clé AGIT, pas qu'on puisse y répondre). Conséquence
       // mesurée avant correction : 117 profils tri sur 148 rabattus, dont 56 Full → Sprint.
       ? '<div class="q"><span class="q-label">Quel objectif ?</span><div class="opts" data-key="format">'+fmtOpts+'</div></div>'
         +'<div class="q"><span class="q-label">Ta plus longue nage sans t\'arr\u00eater</span><div class="q-def">En eau libre le risque ne se voit pas avant d\'arriver : pas de mur, pas de fond. C\'est la continuit\u00e9, pas le volume, qui d\u00e9cide le jour J.</div><div class="opts" data-key="longest_swim_known">'+opt("oui","Je la connais")+opt("non","Je ne sais pas")+'</div><div id="lswB"></div></div>'
         +'<div class="q"><span class="q-label">O\u00f9 nages-tu ?</span><div class="opts" data-key="milieu">'+opt("bassin","Bassin")+opt("ow","Eau libre")+opt("mixte","Les deux")+'</div></div>'
       : '<div class="q"><span class="q-label">Quel objectif ?</span><div class="opts" data-key="format">'+fmtOpts+'</div></div>')
     +'<div class="q"><span class="q-label">Date (si connue)</span><input type="date" data-input="race_date"></div>';},
   branches(a){
     if(S.sport==="tri"){
       // Le nombre n'est demandé QUE si l'athlète dit le connaître — sinon « je ne sais pas » se
       // confondrait avec un champ qu'on a oublié de remplir, et c'est justement la distinction
       // que D3 §1 exige.
       branch("lswB", a.longest_swim_known==="oui", '<div class="branch"><div class="q"><span class="q-label">Combien de m\u00e8tres, d\'affil\u00e9e et sans t\'arr\u00eater ?</span><div class="q-def">Bassin accept\u00e9 : le plan tient compte de l\'\u00e9cart avec l\'eau libre.</div><input type="number" min="50" max="10000" data-input="longest_swim_m" placeholder="800"></div></div>');
       return;
     }
     if(S.sport!=="swimrun")return;
     branch("teamB",a.team_mode!=="solo",'<div class="branch"><div class="q"><span class="q-label">Écart de niveau à la nage avec ton binôme (s/100m, optionnel)</span><div class="q-def">0 = même niveau. Sert à calculer l\'effet de longe : attachée, l\'équipe se rapproche de la vitesse du plus rapide.</div><input type="number" min="0" max="60" data-input="team_swim_gap_sec" placeholder="0"></div></div>');
     // S10 — prérequis d'entrée : on REFUSE de générer un format long en dessous, et on dit pourquoi.
     const block = (globalThis.EBV2 && EBV2.swimrunPrereq) ? EBV2.swimrunPrereq(a) : null;
     branch("prereqB", !!block, '<div class="branch" style="border-color:#c0392b"><div class="branch-tag" style="color:#c0392b">↳ Prérequis non atteints</div><div class="q-sub">'+(block||"")+'</div></div>');
   },
   valid(a){
     if(S.sport==="trail")return a.intent&&a.race_distance_km&&a.race_dplus_m&&a.race_technicity&&a.race_night;
     // D3 §1 — obligatoires. « Je ne sais pas » est une réponse VALIDE ; l'absence n'en est pas une.
     if(S.sport==="tri")return !!(a.intent&&a.format&&a.milieu&&(a.longest_swim_known==="non"||(a.longest_swim_known==="oui"&&a.longest_swim_m)));
     if(S.sport==="swimrun"){
       const block=(globalThis.EBV2&&EBV2.swimrunPrereq)?EBV2.swimrunPrereq(a):null;
       return !!(a.intent&&a.format&&a.team_mode&&a.openwater_access&&a.swim_continuous&&a.run_continuous&&!block);
     }
     return a.intent&&a.format;
   }},

  {id:"medical",title:"Sécurité d'abord",eyebrow:"Gratuit — Feu vert",
   why:"Trois questions avant tout. Un signal → orientation médecin avant intensité. Gratuit, non négociable.",
   render(){return '<div class="q-sub">🔒 Ces réponses de santé restent dans ton navigateur et ne sont <b>jamais</b> envoyées à un serveur. Elles servent uniquement à sécuriser ton plan sur cet appareil.</div><div class="q"><span class="q-label">Douleur thoracique à l\'effort, déjà ?</span><div class="opts" data-key="med_pain">'+opt("non","Non")+opt("oui","Oui")+'</div></div>'
     +'<div class="q"><span class="q-label">Vertiges / malaise à l\'effort, déjà ?</span><div class="opts" data-key="med_dizzy">'+opt("non","Non")+opt("oui","Oui")+'</div></div>'
     +'<div class="q"><span class="q-label">Traitement cardiovasculaire ?</span><div class="opts" data-key="med_treat">'+opt("non","Non")+opt("oui","Oui")+'</div></div>';},
   valid(a){return a.med_pain&&a.med_dizzy&&a.med_treat;}},
  ];

  // Étape terrain/milieu spécifique
  if(cfg.terrains){
    steps.push({id:"terrain",title:(S.sport==="bike"||S.sport==="duathlon")?"Le parcours":"Le terrain",eyebrow:"Gratuit — Où ça se joue",
      why:S.sport==="duathlon"?"Le profil du parcours change tout en duathlon : un vélo vallonné ponctionne les jambes avant le R2, un parcours plat récompense la puissance constante."
        :S.sport==="bike"?"Plat ou montagne ne se préparent pas pareil : force, braquets, pacing changent.":"Route, trail ou piste : l'impact, le dénivelé et le type de travail diffèrent.",
      render(){
        // Retour utilisateur (08/08/2026) : « pas de détail pour vallonné et montagneux » —
        // l'aide chiffrée existait déjà au Profil (carte « Ta course », `raceCardHTML`) mais
        // pas ICI, sur la même question posée en premier au questionnaire. Chiffres identiques
        // à ceux réellement appliqués (RELIEF_BIKE_IF côté vélo, RELIEF côté course à pied).
        const sub = S.sport==="duathlon"
          ? "Vallonné réduit la puissance cible à vélo et élargit le temps de course à pied estimé. Montagneux accentue les deux — c'est la même réponse qui joue sur les deux disciplines."
          : cfg.terrains.some(t=>t[0]==="vallonne")
            ? "Vallonné recule la puissance cible d'environ 1 point d'intensité par rapport au plat, montagneux d'environ 2,5 points — le relief coûte plus cher en watts qu'en apparence."
            : "";
        return '<div class="q"><span class="q-label">Ton terrain principal</span>'+(sub?'<div class="q-sub">'+sub+'</div>':"")+'<div class="opts" data-key="terrain">'+cfg.terrains.map(t=>opt(t[0],t[1])).join("")+'</div></div>';
      },
      valid(a){return a.terrain;}});
  }
  if(cfg.milieux){
    steps.push({id:"milieu",title:"Bassin ou eau libre",eyebrow:"Gratuit — Le milieu",
      why:"L'eau libre demande des compétences en plus : navigation, peloton, sighting. Le bassin affine la technique.",
      render(){return '<div class="q"><span class="q-label">Où nages-tu principalement ?</span><div class="opts" data-key="milieu">'+cfg.milieux.map(m=>opt(m[0],m[1])).join("")+'</div></div>';},
      valid(a){return a.milieu;}});
  }

  // R18.2 — LE PROFIL DE LA COURSE, PAR DISCIPLINE (retour du fondateur après test).
  // La question « ton terrain » ci-dessus décrit UN terrain, comme si le parcours était
  // homogène. Un triathlon ne l'est jamais : on peut nager en eau vive, rouler en montagne et
  // courir à plat, et les trois corrections sont indépendantes. Une seule réponse en
  // appliquait une troisième, fausse pour les trois legs.
  // Facultative de bout en bout : chaque leg non renseigné retombe sur le terrain global
  // (`legProfileOf`), donc quelqu'un qui ne sait pas encore n'est pas bloqué et ne perd rien.
  if (S.sport === "tri" || S.sport === "duathlon" || S.sport === "swimrun") {
    const nage = S.sport === "tri" || S.sport === "swimrun";
    const velo = S.sport === "tri" || S.sport === "duathlon";
    steps.push({id:"leg_profiles",title:"Le profil de ta course",eyebrow:"Gratuit — Discipline par discipline",
      why:"Ton épreuve n'est pas d'un seul bloc. Chaque segment a son terrain, et chacun change une chose différente : le milieu de nage décale la fourchette de natation, le relief du vélo abaisse ta puissance cible, le relief à pied élargit ton temps de course. Tu peux tout laisser vide — on reprendra alors ton terrain général.",
      render(){
        let h = "";
        // R19.2 — la température de l'eau décide de la COMBINAISON, qui vaut 4 à 7 % de temps
        // de nage et bascule sur un seuil réglementaire (24,5 °C). C'est le facteur dominant
        // du leg natation ; il manquait pendant qu'on affinait le milieu à ±5 %.
        if (S.sport === "tri") h += '<div class="q"><span class="q-label">Température de l\'eau (°C, si tu la connais)</span>'
          + '<div class="q-sub">Au-dessus de 24,5 °C la combinaison est interdite — tu nageras 4 à 7 % moins vite que l\'estimation, et on te le dira. En dessous de 15 °C, c\'est une question de sécurité avant d\'être une question de chrono.</div>'
          + '<input type="number" data-input="water_temp_c" value="' + (S.answers.water_temp_c || "") + '" placeholder="ex. 19" min="-2" max="35" step="0.5"></div>';
        if (nage) h += '<div class="q"><span class="q-label">La natation se passe où ?</span>'
          + '<div class="q-sub">Le bassin est plus rapide que l\'eau libre (ni navigation, ni houle). Un courant, lui, peut porter autant que freiner — on élargira la fourchette dans les deux sens.</div>'
          + '<div class="opts" data-key="leg_swim_env">'+opt("bassin","Bassin")+opt("lac","Lac / eau libre calme")+opt("mer_calme","Mer calme")+opt("mer_agitee","Mer agitée")+opt("eau_vive","Eau vive (courant)")+'</div></div>';
        if (velo) h += '<div class="q"><span class="q-label">Le parcours vélo ?</span>'
          + '<div class="q-sub">Sur du relief, le coût suit la puissance NORMALISÉE : viser la bande du plat revient à rouler plus dur qu\'on ne croit, et ça se paie à pied. Vallonné recule la puissance cible d\'environ 1 point d\'intensité, montagneux d\'environ 2,5 points.</div>'
          + '<div class="opts" data-key="leg_bike_prof">'+opt("plat","Plat")+opt("vallonne","Vallonné")+opt("montagne","Montagneux")+'</div></div>';
        h += '<div class="q"><span class="q-label">Le parcours à pied ?</span>'
          + '<div class="q-sub">Le relief ralentit ET rend le chrono moins prévisible : la fourchette monte et s\'élargit. Vallonné coûte environ 3 à 6 % de temps en plus qu\'un parcours plat, montagneux 8 à 15 %.</div>'
          + '<div class="opts" data-key="leg_run_prof">'+opt("plat","Plat")+opt("vallonne","Vallonné")+opt("montagne","Montagneux")+'</div></div>';
        return h;
      },
      valid(){return true;}}); // facultative : rien ne bloque, tout retombe sur le terrain global
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
      +'<div class="q"><span class="q-label">Poids (kg, optionnel)</span><input type="number" min="25" max="250" data-input="weight" placeholder="—"></div></div>'
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
    // U14 — LA VALIDATION NE RETIENT QUE LES TROIS RÉPONSES QUI STRUCTURENT.
    //
    // L'écran en pose huit ; trois seulement décident de la forme du plan : le nombre de
    // séances (C1), le volume de pic (le seul champ VRAIMENT requis du schéma) et le volume
    // récent (la rampe R10, celle qui protège une reprise). Les cinq autres affinent, et leur
    // absence a désormais un repli PRUDENT et JOURNALISÉ (voir la note `dispo` de weekBuilder :
    // le défaut tacite était « quotidienne », le plus permissif du domaine).
    //
    // Elles restent à l'écran, dans le même ordre : on ne retire pas une question, on cesse
    // d'en faire un péage.
    valid(a){return a.sessions_max&&a.vol_max&&a.vol_recent;}});

  // H-1b — L'OPT-IN VFC, EN DERNIÈRE ÉTAPE ET UNE SEULE FOIS.
  //
  // La VFC est un signal AVANCÉ : elle demande une montre ou une bague, un protocole stable,
  // et un chiffre relevé chaque matin. Mesuré, elle occupait UN TIERS du check-in quotidien —
  // trois diapos, dont une pour un signal que la plupart des gens ne suivent pas. C'est une
  // friction imposée à tout le monde pour une minorité.
  //
  // Elle devient donc un CHOIX, posé ici, une fois. Non par défaut : le check-in retombe à
  // deux diapos (sommeil → ressenti). Mesuré : sur 36 combinaisons de sommeil × énergie ×
  // ressenti, retirer la diapo ne change AUCUN verdict pour qui ne la suivait pas — l'ancien
  // « je ne la suis pas » écrivait « normale », qui ne pesait rien.
  //
  // Et ce qu'on demande à qui l'active, c'est la VALEUR, pas un adjectif : depuis H-1, seule
  // une valeur comparée à la base de l'athlète est une mesure. L'adjectif est retiré des DEUX
  // endroits où il vivait (le diaporama et le panneau avancé) — en corriger un seul, c'est le
  // correctif qu'on croit avoir (R18.1).
  steps.push({id:"hrv_track",title:"Ta variabilité cardiaque",eyebrow:"Gratuit — Optionnel",
    why:"Signal avancé, et le plus utile qu'on connaisse pour repérer une fatigue avant qu'elle ne se voie. Il demande un chiffre chaque matin, au réveil, dans les mêmes conditions. Si tu ne le suis pas, dis-le : on ne te posera plus la question.",
    render(){return '<div class="q"><span class="q-label">Tu relèves ta VFC le matin ?</span>'
      +'<div class="q-sub">Ta montre ou ta bague affiche un chiffre en millisecondes (rMSSD). On le compare à TA base des 7 derniers matins — jamais à une norme.</div>'
      +'<div class="opts" data-key="hrv_track">'+opt("oui","Oui, je la relève")+opt("non","Non, je ne la suis pas")+'</div></div>';},
    valid(){return true;}}); // optionnelle : ne pas répondre = ne pas la suivre

  // U14 — L'ORDRE MET EN TÊTE CE DONT L'ABSENCE COÛTE UNE GARDE DE SÉCURITÉ.
  //
  // Mesuré côté client : 8 écrans et 30 gestes avant le premier plan. Le socle ci-dessous est
  // incompressible et il est court — format et date (sans quoi il n'y a pas de plan), les trois
  // drapeaux médicaux (le seul blocage dur du produit), l'âge (bornes physiologiques, garde
  // mineur × format R15.7-C) et le trio volume/séances/volume récent (l'enveloppe et la rampe).
  // Tout le reste — terrain, niveau, historique, blessures, allures — affine, et son absence
  // est prudente et journalisée (R11.2). On ne SUPPRIME aucune question : on les met après le
  // moment où le plan devient montrable.
  //
  // Réordonner par identifiant plutôt que déplacer les blocs : les fonctions de rendu ne
  // bougent pas d'une ligne, et un sport auquel une étape manque n'a rien de spécial à faire.
  const tete = SOCLE_IDS.map((id) => steps.find((x) => x.id === id)).filter(Boolean);
  return [...tete, ...steps.filter((x) => !tete.includes(x))];
}

/** U14 — les étapes du socle, dans l'ordre. Une seule liste : l'ordre du questionnaire et
 *  la condition d'apparition du bouton lisent la même (R11.1). */
const SOCLE_IDS = ["intent", "medical", "profil", "dispo"];

/** U14 — le socle est-il complet ? C'est la condition d'apparition de « générer maintenant ». */
function socleComplet(){
  const a=S.answers, cfg=curCfg();
  if(!a.med_pain||!a.med_dizzy||!a.med_treat) return false;   // le seul blocage dur du produit
  if(!a.age) return false;                                     // bornes physio + mineur × format
  if(!a.sessions_max||!a.vol_max||!a.vol_recent) return false; // enveloppe + rampe R10
  // Le trail et le swimrun décrivent leur objectif par des DONNÉES, pas par un format : sans
  // elles il n'y a pas d'objectif à préparer (R7 TRAIL, R10 phase 3).
  if(S.sport==="trail") return !!(a.race_distance_km&&a.race_dplus_m);
  return !!(a.format||!cfg.formats);
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
  // R12.1 — LA BONNE QUESTION N'EST PAS « CONNAIS-TU TA VAM ? », C'EST « QU'AS-TU FAIT ? ».
  // Personne ne connaît sa VAM : c'était la seule référence sans chemin d'acquisition, et le
  // moteur la DEVINAIT depuis l'adjectif « niveau » — trois heures d'écart sur l'estimation de
  // course selon la case cochée. On demande désormais une montée VÉCUE : deux chiffres que
  // n'importe qui peut donner de mémoire, et dont la VAM se déduit.
  if(sp==="trail") return {id:"level",title:"Ton moteur en montagne",eyebrow:"Gratuit — Le moteur",
    why:"La référence du trail, c'est la vitesse ascensionnelle : combien de mètres de dénivelé tu montes en une heure. Pas besoin de la connaître — raconte-nous ta dernière grosse montée, on s'occupe du calcul.",
    render(){return '<div class="q"><span class="q-label">Ton niveau</span><div class="q-sub">Sert au CONTENU des séances (technicité, progressivité), jamais à estimer un chrono.</div><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">Ta dernière grosse montée</span><div class="q-sub">Une montée que tu as vraiment faite, d\'au moins 5 minutes, sans t\'arrêter. De mémoire suffit.</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><label style="flex:1;min-width:120px;font-size:var(--fs-md)">D+ (mètres)<input type="number" min="50" max="3000" data-input="climb_dplus_m" placeholder="450" style="width:100%"></label>'
      +'<label style="flex:1;min-width:120px;font-size:var(--fs-md)">Durée (minutes)<input type="number" min="5" max="300" data-input="climb_min" placeholder="40" style="width:100%"></label></div>'
      +'<div class="q-sub" style="margin-top:6px">Tu n\'en as pas ? Laisse vide : le plan partira d\'une estimation prudente et se corrigera dès ta première montée enregistrée.</div></div>'
      +'<div class="q"><span class="q-label">Ton allure seuil sur PLAT ?</span><div class="opts" data-key="pace_known">'+opt("oui","Je la connais")+opt("non","Non")+'</div></div><div id="paceB"></div>'
      +'<details style="margin-top:8px"><summary style="cursor:pointer;font-size:var(--fs-sm)">Je connais déjà ma VAM</summary>'
      +'<div class="q" style="margin-top:6px"><span class="q-label">VAM (m de D+ / h)</span><div class="opts" data-key="vam_known">'+opt("oui","Je la connais")+opt("non","Non")+'</div><div id="vamB"></div></div></details>';},
    branches(a){
      branch("paceB",a.pace_known==="oui",'<div class="branch"><div class="q"><span class="q-label">Allure seuil sur plat (min/km)</span><input type="text" data-input="pace" placeholder="4:50"></div></div>');
      branch("vamB",a.vam_known==="oui",'<div class="branch"><div class="q"><span class="q-label">VAM (m de D+ / h)</span><input type="number" min="200" max="2500" data-input="vam" placeholder="850"></div></div>');
    },
    // La montée n'est PAS obligatoire : un athlète sans montée en tête doit pouvoir avancer.
    // Le repli est prudent et il est annoncé — c'est le contrat R12.4.
    valid(a){return a.level&&a.pace_known&&(a.pace_known!=="oui"||a.pace)&&(a.vam_known!=="oui"||a.vam);}};
  // R10 phase 3 — SWIMRUN : les références qui comptent sont EN TENUE (§R10.3.3). Le CSS et
  // l'allure route ne sont qu'un repli, et l'UI le dit à chaque affichage.
  if(sp==="swimrun") return {id:"level",title:"Tes références en tenue",eyebrow:"Gratuit — Le moteur",
    why:"Les allures ne transfèrent PAS en swimrun : combinaison, chaussures mouillées, pull buoy, plaquettes, terrain. Le seul test qui vaut se fait en tenue COMPLÈTE, avec ton partenaire et la longe. Sans lui on estime — et on te le dira partout.",
    render(){return '<div class="q"><span class="q-label">Niveau global</span><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">As-tu fait le test EN TENUE (1000m nagés + 5-8km courus) ?</span><div class="q-def">Combinaison, chaussures, chaussettes, pull buoy, plaquettes, en eau libre, avec le partenaire et la longe.</div><div class="opts" data-key="gear_test">'+opt("oui","Oui")+opt("non","Pas encore")+'</div></div><div id="gearB"></div>'
      +'<div class="q"><span class="q-label">Sinon : ton CSS en bassin ?</span><div class="opts" data-key="css_known">'+opt("oui","Je le connais")+opt("non","Non")+'</div></div><div id="cssB"></div>'
      +'<div class="q"><span class="q-label">Ton allure seuil sur route ?</span><div class="opts" data-key="pace_known">'+opt("oui","Je la connais")+opt("non","Non")+'</div></div><div id="paceB"></div>';},
    branches(a){
      branch("gearB",a.gear_test==="oui",'<div class="branch"><div class="branch-tag">↳ Tes vraies références</div><div class="q"><span class="q-label">Allure de nage en tenue (min/100m)</span><input type="text" data-input="swimrun_swim_pace" placeholder="2:05"></div><div class="q"><span class="q-label">Allure de course en tenue (min/km)</span><input type="text" data-input="swimrun_run_pace" placeholder="8:00"></div></div>');
      branch("cssB",a.css_known==="oui",'<div class="branch"><div class="q"><span class="q-label">CSS (min/100m)</span><input type="text" data-input="css" placeholder="1:45"></div></div>');
      branch("paceB",a.pace_known==="oui",'<div class="branch"><div class="q"><span class="q-label">Allure seuil route (min/km)</span><input type="text" data-input="pace" placeholder="4:50"></div></div>');
    },
    valid(a){return a.level&&a.gear_test&&a.css_known&&a.pace_known&&(a.gear_test!=="oui"||(a.swimrun_swim_pace&&a.swimrun_run_pace));}};
  // R10 phase 2 — DUATHLON : deux références seulement (allure course + FTP). Pas de CSS :
  // il n'y a pas de natation, et demander une donnée inutilisée serait du bruit.
  if(sp==="duathlon") return {id:"level",title:"Tes niveaux (2 disciplines)",eyebrow:"Gratuit — Le moteur",
    why:"Le duathlon combine course et vélo. L'allure seuil course pilote tes deux segments à pied, la FTP ton segment vélo — et c'est la course qui décide la plupart des duathlons.",
    render(){return '<div class="q"><span class="q-label">Niveau global</span><div class="opts" data-key="level">'+opt("debutant","Débutant")+opt("inter","Intermédiaire")+opt("avance","Avancé")+'</div></div>'
      +'<div class="q"><span class="q-label">🏃 Connais-tu ton allure seuil course ?</span><div class="opts" data-key="pace_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="paceB"></div>'
      +'<div class="q"><span class="q-label">🚴 Connais-tu ta FTP (watts) ?</span><div class="opts" data-key="ftp_known">'+opt("oui","Oui")+opt("non","Non")+'</div></div><div id="ftpB"></div><div id="hrB"></div>';},
    branches(a){
      branch("paceB",a.pace_known==="oui",'<div class="branch"><div class="q"><span class="q-label">Allure seuil (min/km, ex 4:50)</span><input type="text" data-input="pace" placeholder="4:50"></div></div>');
      branch("ftpB",a.ftp_known==="oui",'<div class="branch"><div class="q"><span class="q-label">FTP (W)</span><input type="number" data-input="ftp" placeholder="220"></div></div>');
      branch("hrB",(a.ftp_known==="non"||a.pace_known==="non"),'<div class="branch"><div class="branch-tag">↳ Ce qui manque, sans bloquer ton plan</div>'
        +'<div class="q-sub">Sans donnée chiffrée, les zones passent en BPM (FC max estimée par l\'âge, ou renseigne-la).</div><div class="q"><span class="q-label">FC max ? (optionnel)</span><input type="number" data-input="hr_max" placeholder="ex 188"></div>'
        +(a.pace_known==="non"?protocolHTML("pace"):"")+(a.ftp_known==="non"?protocolHTML("ftp"):"")+'</div>');
    },
    valid(a){return a.level&&a.pace_known&&a.ftp_known&&(a.pace_known!=="oui"||a.pace)&&(a.ftp_known!=="oui"||a.ftp);}};
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
  // R10 phase 2 — DUATHLON : deux disciplines seulement, donc pas d'épaule ; en revanche
  // « ça tire quand je cours » est LA déclaration qui compte (deux segments de course).
  // R10 phase 3 — SWIMRUN : l'épaule est la zone n°1 (plaquettes), et le terrain est du trail.
  if(sp==="swimrun") arr=[["aucune","Aucune"],["epaule","Épaule (plaquettes)"],["cou","Nuque / cervicales"],["cheville","Cheville / entorses"],["genou","Genou"],["tibia","Tibias / périostite"],["fascia","Fascia plantaire"]];
  if(sp==="duathlon") arr=[["aucune","Aucune"],["course","Gêne à la course"],["tibia","Tibias / périostite"],["genou","Genou"],["pied","Pied / cheville"],["hanche","Hanche / ITB"],["dos","Dos / lombaires (vélo)"]];
  if(sp==="trail") arr=[["aucune","Aucune"],["quadriceps","Quadriceps (descentes)"],["cheville","Cheville / entorses"],["tibia","Tibias / périostite"],["genou","Genou"],["fascia","Fascia plantaire"],["hanche","Hanche / ITB"]];
  return arr.map(x=>opt(x[0],x[1])).join("");
}

function ebParseT(v){const m=String(v||"").split(":");return m.length===2?(+m[0])*60+(+m[1]):parseFloat(v);}
// ===== §10 — LECTURE Strava (OAuth 2.0, jeton personnel) : alimente a.tests (R3.8) =====
// Formate des secondes en m'ss (allure au km, temps au 100 m).
const _fk100=s=>Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,"0");
/**
 * O-22 — L'IMPORT LIT LA GRANDEUR QUE LE PROTOCOLE NOMME.
 *
 * ================================================================================
 * LE DÉFAUT, TROUVÉ SUR UNE DONNÉE RÉELLE
 * ================================================================================
 *
 * Premier défaut de ce dépôt remonté par un VRAI compte plutôt que par un banc : le
 * fondateur branche son Strava, l'import annonce **188 W** quand sa FTP est **230**.
 *
 * L'ancien calcul prenait la puissance normalisée la plus élevée parmi les sorties de
 * plus de 20 minutes, et la multipliait par 0,95 :
 *
 *     const best = powRides.reduce((m,a) => Math.max(m, a.weighted_average_watts || …), 0);
 *     const ftp  = Math.round(best * 0.95);
 *
 * Le 0,95 vient de `disciplineRegistry.ts` — « FTP (20min à fond) : FTP ≈ 95 % de la
 * puissance moyenne ». Il attend donc la puissance moyenne d'un effort MAXIMAL DE VINGT
 * MINUTES. Il était appliqué à la moyenne d'une sortie ENTIÈRE, qui peut durer trois
 * heures en endurance. 188 ÷ 0,95 = 198 W = la meilleure NP de sortie, sur 1 h 17.
 *
 * Et l'erreur CHANGE DE SENS selon l'athlète, ce qui la rend dangereuse : basse pour qui
 * roule en endurance (zones trop faciles, sous-charge), HAUTE pour qui a fait une seule
 * sortie courte et très dure — et là le plan prescrit des watts que l'athlète ne tient
 * pas, sur toutes ses séances de vélo. Priorités 1 et 2 du manifeste.
 *
 * ================================================================================
 * CE QUE L'IMPORT FAIT MAINTENANT — RIEN D'INVENTÉ
 * ================================================================================
 *
 * `src/engine/disciplineRegistry.ts` est la source de vérité du dépôt sur « comment un
 * effort devient une référence ». On s'y conforme au lieu d'écrire un second modèle
 * (R11.1) :
 *
 *   FTP       « 20 minutes à fond : FTP ≈ 95 % de la puissance moyenne »
 *   Seuil     « 3min + 10min à fond. UN 10-15 KM RÉCENT À FOND EST UNE BONNE ESTIMATION. »
 *   CSS       « 400m + 200m à fond »
 *
 * Trois sources pour la FTP, par ordre de confiance décroissante :
 *
 *   1. LA FTP DÉCLARÉE SUR STRAVA (`GET /athlete` → `ftp`). C'est le chiffre que
 *      l'athlète a posé lui-même, le plus souvent issu d'un vrai test. R14.1 a payé cher
 *      la leçon « un ADJECTIF auto-déclaré ne pilote aucun chiffre » — mais une FTP n'est
 *      pas un adjectif : c'est une mesure, et l'athlète peut la corriger d'un geste.
 *   2. LA MEILLEURE MOYENNE GLISSANTE DE 20 MIN, lue dans les flux de puissance
 *      (`/activities/{id}/streams`). C'est très exactement la grandeur que le 0,95 attend.
 *   3. AUCUNE ESTIMATION, et on le DIT. C'est la règle P7/P8 du prédicteur appliquée
 *      ici : refuser d'estimer en donnant le motif vaut mieux qu'un chiffre faux qui
 *      pilote des zones.
 *
 * Pour l'allure seuil, le protocole du dépôt nomme lui-même son raccourci : un 10-15 km
 * couru À FOND. La fenêtre de distance ne suffit donc pas — une sortie longue tranquille
 * de 12 km y entre et n'est pas un test (mesuré : 5'37/km annoncé pour un seuil réel à
 * 4'42, O-25). Même cascade que pour la FTP : une COURSE déclarée telle sur Strava, sinon
 * la meilleure moyenne glissante de 10 min lue dans les flux de vitesse (le « 10 min à
 * fond » du protocole, qui vit À L'INTÉRIEUR des séances), sinon aucune estimation.
 *
 * CE QUI N'EST PAS TRAITÉ ICI, ET C'EST DIT : le CSS. Son protocole (400 m + 200 m) ne se
 * reconstitue pas depuis un résumé d'activité, et « la nage la plus rapide en moyenne »
 * n'est pas un CSS. Il reste en l'état, avec son libellé, et l'entrée O-22 le porte.
 */
async function stravaImport(oauthTok){
  // Deux chemins vers le même import : token OAuth (relais serveur) ou jeton manuel collé.
  const tok=(oauthTok||((document.getElementById("pfStravaTok")||{}).value||"")).trim();
  const st=document.getElementById("pfStravaMsg");
  const setS=h=>{if(st)st.innerHTML=h;};
  if(!tok){setS("Colle d'abord un token d'accès Strava (Réglages → Mon API, scope <b>activity:read</b>) — ou connecte-toi via le relais ci-dessus.");return;}
  // Audit 08/08/2026 : `stravaFetch` (strava.js) borne CHAQUE appel dans le temps — un relais
  // lent ou une API qui traîne bloquait l'import sans retour utilisateur avant l'échec final.
  const api=(p)=>stravaFetch("https://www.strava.com/api/v3"+p,{headers:{Authorization:"Bearer "+tok}});
  setS("Lecture de tes activités récentes…");
  try{
    const r=await api("/athlete/activities?per_page=50");
    if(r.status===429){setS("Strava a limité les requêtes (quota atteint) — réessaie dans quelques minutes.");return;}
    if(!r.ok){setS("Strava a refusé la requête ("+r.status+"). Vérifie le token et le scope activity:read.");return;}
    const acts=await r.json();
    if(!Array.isArray(acts)||!acts.length){setS("Aucune activité récente trouvée.");return;}
    if(!Array.isArray(S.answers.tests))S.answers.tests=[];
    const today=todayISO(),added=[],notes=[];
    const sport=a=>a.sport_type||a.type||"";

    // ---- FTP ----------------------------------------------------------------
    // 1. Ce que l'athlète a DÉCLARÉ sur Strava. Demande le périmètre `profile:read_all` ;
    //    sans lui (jeton manuel à l'ancienne), l'appel échoue et on passe à la suite —
    //    un import ne doit jamais s'arrêter parce qu'une source optionnelle manque.
    let ftp=0,ftpSrc="";
    try{
      const ra=await api("/athlete");
      if(ra.ok){const me=await ra.json();
        if(me&&isFinite(+me.ftp)&&+me.ftp>0){ftp=Math.round(+me.ftp);ftpSrc="Strava (FTP de ton profil)";}}
    }catch(e){ /* périmètre absent ou réseau : on tente l'estimation */ }

    // 2. À défaut : la meilleure moyenne glissante de 20 min, la grandeur que 0,95 attend.
    if(!ftp){
      const rides=acts.filter(a=>/Ride/.test(sport(a))&&(a.moving_time||0)>=1500
        &&(a.weighted_average_watts||a.average_watts));
      // On ne télécharge pas cinquante flux : les sorties les plus intenses d'abord, et
      // on s'arrête tôt. Chaque flux est un appel API, donc du quota et de l'attente.
      const cand=rides.sort((x,y)=>(y.weighted_average_watts||y.average_watts||0)-(x.weighted_average_watts||x.average_watts||0)).slice(0,6);
      let best20=0,quota=false;
      for(const a of cand){
        if(quota)break; // un 429 sur la première sortie en donnerait cinq de plus : on arrête, pas d'acharnement
        try{
          const rs=await api("/activities/"+a.id+"/streams?keys=watts,time&key_by_type=true");
          if(rs.status===429){quota=true;continue;}
          if(!rs.ok)continue;
          const js=await rs.json();
          const w=js&&js.watts&&js.watts.data,t=js&&js.time&&js.time.data;
          best20=Math.max(best20,bestRollingMean(w,t,1200));
        }catch(e){ /* une sortie illisible n'arrête pas les autres */ }
      }
      if(best20>0){ftp=(globalThis.EBV2&&EBV2.ftpFromBest20)?EBV2.ftpFromBest20(best20):Math.round(best20*0.95);ftpSrc="Strava (meilleure moyenne sur 20 min réelles)";} // B2 — la règle vit dans le moteur (fitParser.FTP_BEST20_FACTOR) ; le littéral local n'est que le repli hors moteur
      else if(quota)notes.push("FTP non estimée : Strava a limité les requêtes (quota atteint) avant d'avoir lu assez de sorties. Réessaie dans quelques minutes.");
      else if(rides.length)notes.push("FTP non estimée : aucune de tes sorties ne contient 20 minutes continues exploitables. Renseigne-la au Profil, ou fais le test de 20 min.");
      else notes.push("FTP non estimée : pas de capteur de puissance sur tes sorties. Saisis-la, ou fais un test 20min ci-dessus.");
    }
    // R23.1 — LE POINT UNIQUE « cette mesure est-elle humaine ? ». Trois écritures vivent dans
    // ce fichier, et aucune ne bornait quoi que ce soit : un artefact (glitch GPS, portion en
    // voiture, sortie vélo étiquetée course) devenait la référence VIVANTE sur laquelle le plan
    // calcule ses zones. La règle E3 existait, elle ne couvrait que les clés numériques du
    // schéma — donc jamais `pace` ni `css`, saisies en `min:s`.
    const borne=(type,val)=>{
      const f=globalThis.EBV2&&globalThis.EBV2.testDansBornes;
      return f?f(type,val):val; // moteur absent (repli legacy) : on ne bloque pas l'import
    };
    if(ftp>0){
      const v=borne("ftp",ftp);
      if(v!=null){S.answers.tests.push({type:"ftp",value:v,date:today,source:ftpSrc});added.push("FTP "+v+"W");}
      else notes.push("FTP écartée : "+ftp+" W est hors des bornes physiologiques — c'est un artefact, pas une mesure.");
    }

    // ---- Allure seuil -------------------------------------------------------
    // O-25 — LE PROTOCOLE DIT « À FOND », ET RIEN NE VÉRIFIAIT LE « À FOND ».
    //
    // La version précédente prenait la course la plus rapide EN MOYENNE dans la fenêtre
    // 10-15 km. Borner la distance était juste ; c'est l'autre moitié du protocole qui
    // manquait — « un 10-15 km récent À FOND est une bonne estimation ». Une sortie
    // longue tranquille de 12 km entre exactement dans la fenêtre et n'a rien d'un test.
    //
    // Mesuré sur le compte du fondateur : 5'37/km annoncé pour un seuil réel à 4'42 —
    // 55 s/km d'écart, soit toutes les zones de course décalées d'un cran. Exactement le
    // défaut d'O-22 sur un autre poste : un coefficient (ici un raccourci de protocole)
    // appliqué à une grandeur qui n'est pas celle qu'il attend.
    //
    // Trois sources, par confiance décroissante — et la troisième est de REFUSER :
    //
    //   1. UNE COURSE, déclarée telle sur Strava (`workout_type === 1`). C'est le « à
    //      fond » du protocole, attesté par l'athlète lui-même. Fenêtre 10-15 km.
    //   2. LA MEILLEURE MOYENNE GLISSANTE DE 10 MINUTES, lue dans les flux de vitesse.
    //      `disciplineRegistry.ts` nomme le protocole du seuil « 3min + 10min à fond » :
    //      c'est la grandeur qu'il attend, et elle vit à l'intérieur des séances (un
    //      tempo, une côte, une fin de sortie) au lieu d'être noyée dans une moyenne.
    //      Même geste que pour la FTP (`bestRollingMean`), même raison.
    //   3. AUCUNE ESTIMATION, et on le DIT. Règle P7/P8 du prédicteur : un refus motivé
    //      vaut mieux qu'un chiffre faux qui pilote toutes les allures prescrites.
    const runs=acts.filter(a=>/Run/.test(sport(a))&&(a.average_speed||0)>0);
    let sk=0,skSrc="";
    const courses=runs.filter(a=>a.workout_type===1&&(a.distance||0)>=10000&&(a.distance||0)<=15000);
    if(courses.length){
      const fast=courses.reduce((m,a)=>Math.max(m,a.average_speed||0),0);
      if(fast>0){sk=Math.round(1000/fast);skSrc="Strava (ta course de 10-15 km — protocole du plan)";}
    }
    let skQuota=false;
    if(!sk){
      // Les sorties les plus rapides d'abord : le meilleur 10 min a le plus de chances d'y
      // être. Bornées à six, comme pour la puissance — chaque flux est un appel API.
      const cand=runs.slice().sort((x,y)=>(y.average_speed||0)-(x.average_speed||0)).slice(0,6);
      let best10=0;
      for(const a of cand){
        if(skQuota)break; // un 429 sur la première sortie en donnerait cinq de plus : on arrête
        try{
          const rs=await api("/activities/"+a.id+"/streams?keys=velocity_smooth,time&key_by_type=true");
          if(rs.status===429){skQuota=true;continue;}
          if(!rs.ok)continue;
          const js=await rs.json();
          const v=js&&js.velocity_smooth&&js.velocity_smooth.data,t=js&&js.time&&js.time.data;
          best10=Math.max(best10,bestRollingMean(v,t,600));
        }catch(e){ /* une sortie illisible n'arrête pas les autres */ }
      }
      if(best10>0){sk=Math.round(1000/best10);skSrc="Strava (ton meilleur 10 min continu)";}
    }
    if(sk>0&&borne("thrPace",sk)!=null){
      S.answers.tests.push({type:"thrPace",value:sk,date:today,source:skSrc});
      added.push("allure seuil "+_fk100(sk)+"/km");
    } else if(sk>0){
      notes.push("Allure seuil écartée : "+_fk100(sk)+"/km est hors des bornes physiologiques — c'est l'artefact d'une trace (GPS, véhicule, activité mal étiquetée), pas ton seuil.");
    } else if(skQuota) notes.push("Allure seuil non estimée : Strava a limité les requêtes (quota atteint) avant d'avoir lu assez de sorties. Réessaie dans quelques minutes.");
    else if(runs.length) notes.push("Allure seuil non estimée : aucune course déclarée entre 10 et 15 km, et aucun bloc de 10 minutes continues exploitable dans tes sorties. La moyenne d'une sortie tranquille ne dit pas ton seuil — corrige-la au Profil, ou fais le test (3 min + 10 min à fond).");
    else notes.push("Allure seuil non estimée : aucune course à pied dans tes 50 dernières activités.");

    // ---- CSS ----------------------------------------------------------------
    // Son protocole (400m + 200m à fond) ne se reconstitue pas depuis un résumé
    // d'activité ; « la nage la plus rapide en moyenne » n'est PAS un CSS. Laissé en
    // l'état, libellé compris, et suivi dans O-22.
    const swims=acts.filter(a=>/Swim/.test(sport(a))&&(a.moving_time||0)>=600&&(a.average_speed||0)>0);
    if(swims.length){const fast=swims.reduce((m,a)=>Math.max(m,a.average_speed||0),0);
      if(fast>0){const s100=Math.round(100/fast);
        if(borne("css",s100)!=null){S.answers.tests.push({type:"css",value:s100,date:today,source:"Strava (nage la plus rapide)"});added.push("CSS ≈ "+_fk100(s100)+"/100m");}
        else notes.push("CSS écarté : "+_fk100(s100)+"/100m est hors des bornes physiologiques.");}}

    setS((added.length?("Importé : "+added.join(" · ")+". <span class='q-sub'>Tu peux corriger n'importe quelle valeur au Profil — ta correction prime sur cet import et sur tout import du même jour.</span>"):"Aucune donnée exploitable.")+(notes.length?("<br><span class='q-sub'>⚠ "+notes.join(" ")+"</span>"):""));
    ebSave();
  }catch(e){setS("Échec réseau (CORS ou token invalide). Renseigne les valeurs à la main si besoin.");}
}
/**
 * La meilleure moyenne sur une fenêtre de `win` secondes, bornée par le TEMPS et non par
 * le nombre d'échantillons : les flux Strava ne sont pas à pas régulier (pauses, capteur
 * intermittent), et compter les points donnerait une « fenêtre de 20 min » qui couvre
 * parfois une heure. C'est la même faute d'unité que celle qu'on corrige ici.
 *
 * Sert aux DEUX références lues dans un flux — la puissance sur 20 min (FTP, O-22) et la
 * vitesse sur 10 min (allure seuil, O-25). Un seul calcul pour une seule idée (R11.1).
 */
function bestRollingMean(vals,times,win){
  if(!Array.isArray(vals)||!Array.isArray(times)||vals.length!==times.length||vals.length<30)return 0;
  let best=0,i=0,sum=0;
  for(let j=0;j<vals.length;j++){
    sum+=(+vals[j]||0);
    while(i<j&&times[j]-times[i]>win){sum-=(+vals[i]||0);i++;}
    // On n'accepte que les fenêtres réellement pleines : une sortie de 12 min ne peut pas
    // rendre une « moyenne de 20 min ».
    if(times[j]-times[i]>=win*0.95)best=Math.max(best,sum/(j-i+1));
  }
  return best;
}

function buildPremiumSteps(){return PREMIUM_STEPS_DEF;}

/* ============================================================
   GÉNÉRATEUR multisport
   ============================================================ */
function curSteps(){return S.tier==="free"?buildFreeSteps():buildPremiumSteps();}
// `q` = identifiant de la question : lève l'ambiguïté des valeurs partagées (R5.6b).
function vlab(v,q){const T=(q&&VLAB_Q[q])||null;return String(v).split(",").map(x=>(T&&T[x])||VLAB[x]||x).join(", ");}
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

// U19 — « CONTINUER » DÉSACTIVÉ DISAIT NON, SANS DIRE POURQUOI.
//
// Retour du fondateur (06/08/2026) : *« questionnaire pour avancer »*. Mesuré en traversant les
// six écrans du tri : on ARRIVE sur cinq d'entre eux avec « Continuer → » désactivé (opacité 0,4,
// `cursor: not-allowed` — invisible au doigt), et **rien à l'écran ne dit ce qui manque**. Un
// écran porte jusqu'à SIX questions : on ne sait donc même pas laquelle bloque.
//
// Le blocage lui-même est légitime — ce sont des réponses dont le moteur a besoin, et une garde
// E2E de swimrun dit « impossible de continuer sur un format long sans les bases ». Ce qui ne
// l'est pas, c'est le silence : le manifeste range « informer » avant tout, et un bouton mort
// et muet ne fait ni l'un ni l'autre.
//
// CE QUI MANQUE EST DÉRIVÉ, PAS DÉCLARÉ. Aucune liste de clés obligatoires n'est écrite ici —
// deux listes écrites à deux endroits divergent toujours (R11.1), et « obligatoire » est déjà
// encodé dans le `valid(a)` de l'étape. On SONDE donc cette fonction, qui est pure : on remplit
// les réponses absentes avec une valeur plausible, puis on retire les clés une à une. Une clé
// dont le retrait rend l'étape invalide est requise ; les autres (« Poids, optionnel », « Date
// si connue ») ne sont jamais nommées. C'est ce qui empêche le message de réclamer une réponse
// facultative.
function valeurPlausible(k,root){
  const o=root.querySelector('.opts[data-key="'+k+'"] .opt');
  if(o)return o.dataset.val;
  const i=root.querySelector('[data-input="'+k+'"]');
  if(!i)return "1";
  if(i.type==="date")return new Date(Date.now()+180*864e5).toISOString().slice(0,10);
  if(i.placeholder&&/^[\d.:]+$/.test(i.placeholder))return i.placeholder;
  return i.min||"1";
}
function libelleDe(k,root){
  const el=root.querySelector('.opts[data-key="'+k+'"]')||root.querySelector('[data-input="'+k+'"]');
  const q=el&&el.closest(".q"),lab=q&&q.querySelector(".q-label");
  return lab?(lab.textContent||"").trim():k;
}
function reponsesManquantes(st,a,root){
  if(!st||!root||st.valid(a))return [];
  const cles=[...new Set([...root.querySelectorAll(".opts[data-key]")].map(e=>e.dataset.key)
    .concat([...root.querySelectorAll("[data-input]")].map(e=>e.dataset.input)))];
  const vide=k=>a[k]===undefined||a[k]===null||a[k]==="";
  const manque=cles.filter(vide);
  if(!manque.length)return [];
  const plein={...a};manque.forEach(k=>{plein[k]=valeurPlausible(k,root);});
  // Si tout remplir ne suffit pas, c'est qu'une réponse DÉJÀ donnée est hors bornes (un âge de
  // 5 ans, un volume absurde) : on ne peut pas isoler, on nomme tout ce qui est vide.
  if(!st.valid(plein))return manque;
  return manque.filter(k=>{const t={...plein};delete t[k];return !st.valid(t);});
}
function refreshNav(){
  const st=curSteps()[S.step],b=$("nextBtn");
  if(b&&st)b.disabled=!st.valid(S.answers);
  // Le message n'apparaît QUE si l'écran est déjà entamé. Sur un écran vierge, tout manque par
  // construction — le dire serait réclamer avant même qu'on ait commencé, et ce produit ne
  // reproche rien (U1). Il arrive au moment exact où on se demande pourquoi ça ne passe pas :
  // une réponse donnée, et ça bloque encore.
  const z=$("navManque"),root=$("screen");
  if(z&&st&&root){
    const manque=b&&b.disabled?reponsesManquantes(st,S.answers,root):[];
    const entame=[...root.querySelectorAll(".opts[data-key]")].some(e=>e.querySelector(".opt.sel"))
      ||[...root.querySelectorAll("[data-input]")].some(e=>e.value);
    if(manque.length&&entame){
      z.textContent="Il manque encore "+(manque.length>1?"— ":"")+manque.map(k=>"« "+libelleDe(k,root)+" »").join(", ");
      z.style.display="";
    } else z.style.display="none";
  }
  // U14 — « générer maintenant » suit les réponses, pas le rendu.
  const g=$("genNowWrap");
  if(g)g.style.display=(S.tier==="free"&&socleComplet())?"":"none";
}
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
  return backToPlanTarget()?'<div style="text-align:center;margin:10px 0"><button class="btn" id="ebBackToPlan" type="button" style="font-size:var(--fs-sm);padding:8px 16px">← Revenir à mon plan en cours</button></div>':"";
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
  // R12 §0 — les sports proposés sont ceux que le MOTEUR connaît réellement (registre R10).
  // Un sport exclu du bundle V1 ne doit pas apparaître ici : proposer un choix qui lèvera à la
  // génération est pire que de ne pas le proposer.
  const known = (globalThis.EBV2 && globalThis.EBV2.sports) ? Object.keys(globalThis.EBV2.sports) : null;
  Object.entries(SPORTS).filter(([k])=>!known||known.includes(k)).forEach(([k,c])=>{html+='<button class="sport-card" data-sport="'+k+'" type="button" style="--sa:'+c.accent+'"><span class="sc-ico">'+c.ico+'</span><span class="sc-nom">'+c.nom+'</span><span class="sc-pitch">'+c.pitch+'</span></button>';});
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
  if($("tierBadge")){$("tierBadge").className="tier-badge "+(S.tier==="free"?"free":"premium");$("tierBadge").textContent=(S.tier==="free"?"● ":"★ ")+SPORTS[S.sport].nom+(S.tier==="free"?" · l'essentiel":" · réglage fin");}
  if(S.step>=steps.length){renderBlueprint();return;}
  const st=steps[S.step];
  $("screen").innerHTML='<div class="card"><div class="eyebrow">'+st.eyebrow+'</div><h2>'+st.title+'</h2><div class="why">'+st.why+'</div>'+st.render()
    +'<div class="nav"><button class="btn" id="prevBtn" type="button" '+(S.step===0&&S.tier==="free"?'style="visibility:hidden"':'')+'>← Retour</button><button class="btn primary" id="nextBtn" type="button">Continuer →</button></div>'
    // U19 — ce que le bouton désactivé ne disait pas. `aria-live` parce que le message apparaît
    // sans que rien ne prenne le focus : sans lui, un lecteur d'écran ne l'annoncerait jamais.
    +'<div id="navManque" class="load-sub" role="status" aria-live="polite" style="display:none;margin-top:8px;text-align:center;color:var(--muted)"></div>'
    // U14 — DÈS QUE LE SOCLE EST COMPLET, LE PLAN EST À UN CLIC.
    //
    // Le reste du questionnaire affine ; il ne conditionne plus l'accès. Le bouton dit ce qu'il
    // fait ET ce qu'il coûte : les réponses non données prendront leur valeur par défaut, et
    // ces défauts sont visibles dans « Les décisions du moteur » (R11.2).
    // Le bloc est TOUJOURS émis et sa visibilité suit les réponses (`refreshNav`) : calculé au
    // seul moment du rendu, il n'apparaissait qu'à l'écran SUIVANT celui qui complétait le
    // socle — mesuré, il coûtait un écran de plus. Un état qui dépend des réponses doit se
    // rafraîchir quand les réponses changent, pas quand la page se redessine.
    +(S.tier==="free"
      ? '<div class="gate" id="genNowWrap" style="background:var(--bg2);margin-top:14px;display:none"><h3>⚡ Ton plan est déjà constructible</h3>'
        +'<p>Les questions qui suivent l\'affinent — elles ne sont pas obligatoires. Ce que tu ne réponds pas prend une valeur par défaut prudente, et le plan te dit laquelle.</p>'
        +'<button class="btn gold" id="genNowBtn" type="button">Générer mon plan maintenant →</button></div>'
      : "")
    +'</div>'
    +backToPlanHTML();
  bindBackToPlan();
  { const g=$("genNowBtn"); if(g) g.onclick=()=>renderPlan(); }
  bindInputs($("screen"));if(st.branches)st.branches(S.answers);
  $("prevBtn").onclick=()=>{if(S.step===0&&S.tier==="premium"){S.tier="free";S.step=buildFreeSteps().length;}else if(S.step===0){S.sport=null;S.started=false;document.body.dataset.sport="";}else S.step--;renderStep();};
  $("nextBtn").onclick=()=>{S.step++;renderStep();};
  refreshNav();refreshTrail();
}
function rulesGrouped(rules){let h="";const hs=HEROS.map(id=>rules.find(r=>r.id===id)).filter(Boolean);
  if(hs.length){h+='<div class="bp-heros">';hs.forEach(r=>h+='<div class="bp-hero"><div class="bh-cat">'+r.what+'</div><div class="bh-val">'+r.val+'</div></div>');h+='</div>';}
  CATS.forEach(([c,ic,l])=>{const inc=rules.filter(r=>(RULE_CAT[r.id]||"struct")===c&&!HEROS.includes(r.id)),hic=rules.filter(r=>(RULE_CAT[r.id]||"struct")===c&&HEROS.includes(r.id));if(!inc.length&&!hic.length)return;
    // AUDIT UX 11/08/2026 — LES RÈGLES « HÉROS » ÉTAIENT ÉCRITES DEUX FOIS.
    // Elles s'affichent dans le bandeau du haut (`.bp-heros`, ce qui pilote le plan) PUIS à
    // nouveau dans leur catégorie : mesuré, « Performance — chrono cible » et « Marges
    // resserrées — assumées » apparaissaient chacun 2× sur le même écran, à l'identique.
    // On garde la ligne dans sa catégorie — c'est elle qui porte le POURQUOI, la seule chose
    // que le bandeau ne dit pas — mais sa VALEUR n'est plus répétée : elle est juste au-dessus.
    h+='<div class="bp-cat"><div class="bp-cat-h"><span class="ic">'+ic+'</span>'+l+'</div>';
    hic.concat(inc).forEach(r=>{const dejaEnHaut=HEROS.includes(r.id);
      h+='<div class="bp-decision"><div><div class="bp-what">'+r.what+'</div>'
        +(dejaEnHaut?'':'<div class="bp-val">'+r.val+'</div>')+'</div><div class="bp-why">'+r.why+'</div></div>';});
    h+='</div>';});
  return h;}
function renderBlueprint(){
  // Plus de mur de règles : transition visuelle directe vers le plan.
  const a=S.answers,med=a.med_pain==="oui"||a.med_dizzy==="oui"||a.med_treat==="oui";
  let html='<div class="card">';
  if(med)html+='<div class="warn"><strong>⚠️ Signal médical déclaré.</strong> Consulte un médecin avant de démarrer toute intensité.</div>';
  if(S.tier==="free"){
    html+='<div class="eyebrow">'+SPORTS[S.sport].nom+' — prêt</div><h2>Ton plan est prêt 🎯</h2>'
      +'<div class="why">On a tout ce qu\'il faut. Génère ton calendrier, ou affine encore avec quelques questions de plus.</div>'
      +'<div class="gate"><h3>⚡ Voir mon plan</h3><button class="btn gold" id="genBtn" type="button">Générer mon calendrier</button></div>'
      +'<div class="gate" style="background:var(--bg2)"><h3>★ Aller plus loin</h3><p>Sommeil, contraintes de semaine, tests, nutrition, courses intermédiaires : quelques écrans de plus pour calibrer plus finement. <b>Tout est inclus</b> — il n\'y a rien à payer, ici ni ailleurs.</p><button class="btn" id="goPremium" type="button">Affiner mon plan →</button></div>'
      +'<div class="nav"><button class="btn" id="prevBtn" type="button">← Modifier</button><button class="btn" id="restartBtn" type="button">Changer de sport</button></div></div>';
    $("screen").innerHTML=html;$("genBtn").onclick=()=>renderPlan();$("goPremium").onclick=()=>{S.tier="premium";S.step=0;renderStep();};
    $("prevBtn").onclick=()=>{S.step--;renderStep();};$("restartBtn").onclick=()=>reset();
  } else {
    // premium : on va DIRECT au plan, pas d'écran intermédiaire
    renderPlan();return;
  }
}
function reset(){S.sport=null;S.answers={};S.step=0;S.tier="free";S.started=false;S.showAllWeeks=false;S.onPlan=false;invalidatePlan();ebClear();document.body.dataset.intent="";document.body.dataset.sport="";renderStep();}

// `bestRollingMean` est exportée pour être MESURÉE (O-25) : c'est le cœur des deux
// références lues dans un flux, et une fenêtre fausse se voit sur un chiffre plausible.
export { _fk100, bestRollingMean, bindInputs, branch, buildFreeSteps, buildPremiumSteps, curCfg, curSteps, ebParseT, evalRules, injuryOpts, levelStep, opt, refreshNav, refreshTrail, renderBlueprint, renderSportPick, renderStep, reset, rulesGrouped, stravaImport, vlab };
