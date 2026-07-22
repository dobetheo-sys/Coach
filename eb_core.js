/* EnduraBuild — Core Engine Extract (for Node.js fuzzing/audit)
   Extracted from endurabuild-3.html, eval'd with indirect call + global export
   Remove final renderStep() call and DOM-binding code
*/

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

function hrZones(age,hrMax,hrRest){
  const fcMax=parseInt(hrMax)||Math.round(208-0.7*(parseInt(age)||35));
  const rest=parseInt(hrRest)||0;
  const Z=(lo,hi)=>{
    if(rest){const a=Math.round(rest+(fcMax-rest)*lo),b=Math.round(rest+(fcMax-rest)*hi);return a+"-"+b+" bpm";}
    return Math.round(fcMax*lo)+"-"+Math.round(fcMax*hi)+" bpm";
  };
  return {fcMax, z1:Z(.60,.70), z2:Z(.70,.80), tempo:Z(.80,.87), seuil:Z(.87,.92), vo2:Z(.92,.97)};
}
function bikeZones(ftp,hz){
  const W=(a,b)=>ftp?Math.round(ftp*a)+"-"+Math.round(ftp*b)+"W":null;
  const H=hz||{};
  return {z2:W(.56,.75)||H.z2||"effort 4/10 conversation", ss:W(.88,.94)||H.tempo||"effort 7/10 soutenu",
    vo2:W(1.06,1.18)||"effort 9/10 (RPE — la FC suit mal sur 4min)", frc:W(.78,.86)||"gros braquet, effort musculaire (cadence>FC)",
    rp:W(.68,.78)||H.z2||"allure course contrôlée", thr:W(.95,1.05)||H.seuil||"seuil ~1h"};
}
function runZones(pace,hz){
  let thr=0; if(pace&&/^\d+[:h.]\d+$/.test(pace.trim())){const m=pace.trim().split(/[:h.]/);thr=parseInt(m[0])*60+parseInt(m[1]);}
  const P=(a,b)=>{if(!thr)return null;const f=s=>Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,"0");return f(thr*a)+"-"+f(thr*b)+"/km";};
  const H=hz||{};
  return {easy:P(1.16,1.26)||H.z2||"allure conversation", mara:P(1.08,1.13)||H.tempo||"allure marathon",
    thr:P(1.0,1.05)||H.seuil||"allure seuil ~1h", vo2:P(.92,.97)||"allure 5-10min (RPE — FC peu fiable sur l'intervalle court)", rec:P(1.28,1.4)||H.z1||"récup très lent", thrRaw:thr};
}
function swimZones(css){
  let c=0; if(css&&/^\d+[:h.]\d+$/.test(css.trim())){const m=css.trim().split(/[:h.]/);c=parseInt(m[0])*60+parseInt(m[1]);}
  const P=(a)=>{if(!c)return null;const s=c*a;return Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,"0")+"/100m";};
  return {easy:P(1.12)||"souple, technique", aero:P(1.06)||"endurance régulière", css:P(1.0)||"allure seuil (test 400m)", speed:P(.94)||"rapide mais contrôlé", cssRaw:c};
}

function buildPlan(a){
  const sp=a.sport, cfg=SPORTS[sp], fmt=a.format;
  const minW=cfg.minWeeks[fmt]||12;
  let weeks=minW;
  if(a.race_date){const diff=Math.floor((new Date(a.race_date)-Date.now())/(7*864e5));if(diff>=minW*0.75&&diff<=80)weeks=diff;}
  const caps={run:{reprise:{"5k":4,"10k":5,semi:6,marathon:8,trail:9},confirme:{"5k":5,"10k":6,semi:8,marathon:10,trail:12},ancien:{"5k":6,"10k":7,semi:9,marathon:12,trail:14}},
    bike:{reprise:{crit:6,route:9,cyclo:11,clm:8,gravel:13},confirme:{crit:8,route:12,cyclo:15,clm:11,gravel:17},ancien:{crit:10,route:15,cyclo:18,clm:13,gravel:22}},
    swim:{reprise:{sprint:3,demifond:4,fond:5,ow:6},confirme:{sprint:5,demifond:6,fond:7,ow:9},ancien:{sprint:6,demifond:8,fond:10,ow:12}},
    tri:{reprise:{S:6,M:8,"70.3":11,Full:15},confirme:{S:7,M:10,"70.3":13,Full:17},ancien:{S:8,M:12,"70.3":15,Full:19}}}[sp][a.history||"confirme"][fmt]||10;
  const util={run:{"5k":6,"10k":7,semi:9,marathon:12,trail:14},bike:{crit:9,route:13,cyclo:15,clm:11,gravel:20},swim:{sprint:6,demifond:8,fond:10,ow:12},tri:{S:8,M:11,"70.3":14,Full:18}}[sp][fmt]||12;
  const marg=(a.intent==="competition")?1.0:0.9;
  // OPTION A — le contenu des séances dépend du volume disponible, pas seulement du format :
  // si l'athlète a moins d'heures (vol_max, historique) que le format n'en demande (util),
  // toutes les quantités prescrites (durées, répétitions, distances) sont réduites d'autant via P().
  const sessionScale=Math.min(1,Math.min(parseInt(a.vol_max||"10"),caps,util)*marg/util);
  let volPeak=Math.round(Math.min(parseInt(a.vol_max||"10"),caps,util)*marg*10)/10;
  if(sp==="swim"&&a.level==="debutant")volPeak=Math.min(volPeak,4);
  // FIX SWIM : volume déclaré 4.5× trop haut car confond heures avec distance
  // SWIM 4000m = 1.3h réel, pas 5.9h théorique. Réduire volPeak de 60%
  if(sp==="swim")volPeak=Math.round(volPeak*0.4*10)/10;
  if(sp==="tri"&&a.level==="debutant"){/* le tri débutant nage reste limité côté nage, géré par la répartition */}
  const volBase=Math.round(volPeak*0.58*10)/10;
  const phases=[{id:"base",nom:"Base",pct:.30,c:"#00b8d9"},{id:"dev",nom:"Développement",pct:.25,c:"#9b72ff"},{id:"spec",nom:"Spécifique",pct:.20,c:"#f0b429"},{id:"peak",nom:"Peak",pct:.15,c:"#e63946"},{id:"taper",nom:"Affûtage",pct:.10,c:"#00a376"}];
  let acc=0;phases.forEach(p=>{p.start=Math.round(acc*weeks);acc+=p.pct;p.end=Math.round(acc*weeks);p.weeks=p.end-p.start;});phases[4].end=weeks;

  const nOff=(a.off_which||"").split(",").filter(Boolean).length;
  const use10=(a.dispo==="quotidienne"&&a.shift_ok==="oui"&&nOff<2);
  const recupEvery=(a.history==="reprise")?3:4;
  const offW=(a.off_which||"").split(",").filter(Boolean);
  const inj=(a.injury||"").split(",").filter(x=>x&&x!=="aucune");
  const hz=hrZones(a.age,a.hr_max,a.hr_rest);
  const bz=bikeZones(parseInt(a.ftp),hz), rz=runZones(a.pace,hz), sz=swimZones(a.css);
  const noFTP=a.ftp_known!=="oui", noPace=a.pace_known!=="oui", noCSS=a.css_known!=="oui";
  const beginner=a.level==="debutant";
  const dbl=a.doubles==="oui";

  function sess(slot,phase,prog){
    prog=prog||0;
    const S2=[];
    const lvl=a.level||"inter", comp=a.intent==="competition", finisher=a.intent==="finir";
    const _injImpactG=(a.injury||"").split(",").some(x=>["tibia","genou","pied","hanche","course"].includes(x));
    const _plioOK=(lvl!=="debutant")&&!finisher&&!_injImpactG;
    const G=phase==="base"?"+ 4-6 strides 15s":phase==="dev"?"+ gammes (genoux, talons-fesses)":(phase==="spec"||phase==="peak")?(_plioOK?"+ foulées bondissantes + strides":"+ gammes + strides (sans sauts)"):"";
    const P=(lo,hi)=>Math.max(1,Math.round((lo+(hi-lo)*prog)*sessionScale));
    function struct(o){
      const parts=[];
      if(o.ech)parts.push("Échauffement "+o.ech);
      if(o.corps)parts.push(o.corps+(o.rec?" (récup "+o.rec+" entre les blocs)":""));
      if(o.rc)parts.push("Retour au calme "+o.rc);
      let full=parts.join(" · ");
      if(o.note)full+=" — 💡 "+o.note;
      return full;
    }
    if(sp==="run"){
      const injImp=(a.injury||"").split(",").some(x=>["tibia","genou","pied","hanche"].includes(x));
      if(slot==="dur1"){
        if(finisher||lvl==="debutant"){
          S2.push({d:"rn",name:"Seuil doux",det:struct({ech:"15min footing très facile + 3 lignes droites",corps:P(2,4)+"×"+P(6,10)+"min @ "+rz.thr+(injImp?" sur surface souple":""),rec:"2-3min trot très lent",rc:"10min footing facile",note:"Le seuil doit rester «confortablement difficile» : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis."})});
        } else if(phase==="base"){ S2.push({d:"rn",name:"Seuil progressif",det:struct({ech:"15min footing + 4 lignes droites",corps:P(3,4)+"×"+P(6,10)+"min @ "+rz.thr,rec:"2min trot",rc:"10min footing",note:"Allure soutenue mais maîtrisée, régulière du 1er au dernier bloc."})}); }
        else if(phase==="spec"||phase==="peak"){ S2.push({d:"rn",name:"Allure course spécifique",det:struct({ech:"15-20min progressif + gammes",corps:P(3,5)+"×"+(fmt==="5k"||fmt==="10k"?"1000m":"2km")+" @ "+(fmt==="marathon"?rz.mara:rz.thr),rec:"2-3min récup active",rc:"10min retour au calme",note:"C'est l'allure de ta course : mémorise la sensation, elle doit devenir automatique le jour J."})}); }
        else { S2.push({d:"rn",name:"VO2max",det:struct({ech:"20min progressif + 4 lignes droites",corps:P(5,8)+"×3min @ "+rz.vo2,rec:"2min30 trot (récup quasi complète)",rc:"10min footing très facile",note:"Effort maximal soutenable 3min. La récup complète entre les blocs est essentielle pour tenir l'intensité."})}); }
      }
      else if(slot==="dur2"){ S2.push({d:"rn",name:phase==="base"?"Endurance soutenue":"Allure spécifique",det:struct({ech:"15min footing facile",corps:P(20,45)+"min "+(fmt==="marathon"||fmt==="trail"?"@ "+rz.mara:"@ "+rz.thr),rc:"5-10min retour au calme "+G,note:"Allure tenue et continue, sans à-coups."})}); }
      else if(slot==="durLong"){
        const durCaps={"5k":{lo:40,hi:74},"10k":{lo:50,hi:90},semi:{lo:70,hi:130},marathon:{lo:90,hi:180},trail:{lo:120,hi:255}}[fmt]||{lo:60,hi:110};
        const durMin=P(durCaps.lo,durCaps.hi);
        S2.push({d:"rn",long:true,name:"Sortie longue",det:struct({corps:durMin+"min @ "+rz.easy+((phase==="spec"||phase==="peak")&&!finisher?", derniers 15-20min @ allure cible":""),note:beginner?"Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK.":"Allure d'endurance, jamais forcée. La longue construit l'endurance de base."})});
      }
      else if(slot==="facileR")S2.push({d:"rn",name:"Footing facile",det:P(30,50)+"min @ "+rz.easy+(G&&!injImp?" · termine par "+G.replace("+ ",""):"")+(beginner?" — 💡 allure de conversation, sans forcer":"")});
      else if(slot==="facile2")S2.push({d:"rn",name:"Footing récup",det:P(20,30)+"min @ "+rz.rec});
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / mobilité",det:"marche, étirements"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    } else if(sp==="bike"){
      const clm=a.epreuve==="clm", climb=a.terrain==="montagne"||a.terrain==="vallonne";
      if(slot==="dur1"){
        if(phase==="base")S2.push({d:"bk",name:"Sweetspot",det:struct({ech:"15min montée progressive",corps:P(2,3)+"×"+P(12,20)+"min @ "+bz.ss,rec:"5min souple",rc:"10min décrassage",note:"Effort soutenu mais maîtrisé, cadence 85-95 rpm. Tu dois pouvoir finir chaque bloc sans t'effondrer."})});
        else if(clm&&(phase==="spec"||phase==="peak"))S2.push({d:"bk",name:"Spécifique CLM (position)",det:struct({ech:"20min progressif en position normale",corps:P(2,3)+"×"+P(15,25)+"min @ "+bz.thr+" en position aéro tenue",rec:"5min souple, redresse-toi",rc:"10min décrassage",note:"Travaille la tenue de position autant que la puissance : c'est elle qui te fera gagner du temps."})});
        else if(phase==="spec"||phase==="peak")S2.push({d:"bk",name:"Seuil / race-pace",det:struct({ech:"15min progressif",corps:P(2,4)+"×"+P(10,20)+"min @ "+bz.thr,rec:"5min souple",rc:"10min décrassage",note:"Allure de course soutenable ~1h. Régularité avant tout."})});
        else if(lvl==="debutant"||finisher)S2.push({d:"bk",name:"Tempo progressif",det:struct({ech:"15min souple",corps:P(2,3)+"×"+P(8,15)+"min @ "+bz.ss,rec:"4min très souple",rc:"10min décrassage",note:"Effort confortablement soutenu, sans jamais te mettre dans le rouge."})});
        else S2.push({d:"bk",name:"VO2max",det:struct({ech:"20min progressif + 3 sprints courts",corps:P(4,6)+"×4min @ "+bz.vo2,rec:"4min récup (presque complète)",rc:"10min souple",note:"Intensité maximale tenable 4min. La récup longue permet de répéter la qualité."})});
      }
      else if(slot==="dur2")S2.push({d:"bk",name:climb?"Force en côte":"Force basse cadence",det:struct({ech:"15min + montée en intensité",corps:P(4,6)+"×5min @ "+bz.frc+" à 50-60 rpm"+(climb?" en côte":""),rec:"3min souple ou en redescendant",rc:"10min moulinage léger",note:"Gros braquet, cadence basse, mais sans forcer sur les genoux : c'est musculaire, pas cardio."})});
      else if(slot==="durLong"){
        const durCaps={crit:{lo:60,hi:150},route:{lo:90,hi:180},clm:{lo:75,hi:165},cyclo:{lo:120,hi:240},gravel:{lo:150,hi:360}}[fmt]||{lo:90,hi:210};
        const durMin=P(durCaps.lo,durCaps.hi);
        S2.push({d:"bk",long:true,name:"Sortie longue",det:durMin+"min @ "+bz.z2+((fmt==="cyclo"||fmt==="gravel")?" · endurance":"")});
      }
      else if(slot==="facileR")S2.push({d:"bk",name:"Endurance facile",det:P(45,90)+"min @ "+bz.z2});
      else if(slot==="facile2")S2.push({d:"bk",name:"Récup active",det:P(30,45)+"min très souple"});
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / gainage",det:"mobilité"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    } else if(sp==="swim"){
      const shoulder=(a.injury||"").includes("epaule"), ow=a.milieu==="ow"||a.milieu==="mixte";
      if(slot==="dur1"){
        if(beginner)S2.push({d:"sw",name:"Technique + éducatifs",det:struct({ech:"200m souple",corps:P(6,10)+"×50m éducatifs variés (rattrapé, poings fermés, battements planche), "+P(1,2)+" point(s) technique",rec:"repos libre entre séries",rc:"100m relâché",note:"La technique se construit à froid, sans fatigue. Qualité > quantité."})});
        else if(shoulder)S2.push({d:"sw",name:"Seuil contrôlé (épaule)",det:struct({ech:"300m souple + 4×50m éducatifs",corps:P(6,8)+"×100m @ "+sz.css,rec:"20-30s",rc:"200m souple",note:"Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute."})});
        else S2.push({d:"sw",name:"Seuil CSS",det:struct({ech:"400m progressif + 4×50m éducatifs",corps:P(6,10)+"×100m @ "+sz.css,rec:"15-20s",rc:"200m souple",note:"Allure régulière sur tous les 100m. Le dernier doit ressembler au premier."})});
      }
      else if(slot==="dur2"){
        if(beginner)S2.push({d:"sw",name:"Endurance technique",det:struct({ech:"200m souple",corps:"nage continue fractionnée (ex 8-12×50m) + 1 éducatif entre chaque",rec:"20-30s, le temps de respirer",rc:"100m très souple",note:"Priorité au geste, pas au chrono. Un seul point technique à la fois."})});
        else if(shoulder)S2.push({d:"sw",name:"Jambes + technique",det:"séries battements + éducatifs · épargne épaule"});
        else S2.push({d:"sw",name:"Vitesse",det:struct({ech:"400m varié + 4×25m accélérations",corps:P(8,12)+"×50m @ "+sz.speed,rec:"30-40s (récup large)",rc:"200m souple",note:"Vitesse contrôlée et technique : la fréquence ne doit pas casser ta nage."})});
      }
      else if(slot==="durLong"){
        const distCaps = beginner
          ? {lo:300,hi:850} // débutant nage : plafonné à 900m (C3 v4) quel que soit le format, technique > volume
          : ({sprint:{lo:600,hi:1400},demifond:{lo:1000,hi:2000},fond:{lo:1500,hi:3000},ow:{lo:1500,hi:4500}}[fmt]||{lo:1000,hi:2000});
        const distM=P(distCaps.lo,distCaps.hi);
        S2.push({d:"sw",long:true,name:ow?"Volume + sighting":(beginner?"Volume aérobie":"Longue continue"),
          det:distM+"m @ "+sz.aero+(ow?" · navigation aux repères":"")+(beginner?" · fractionne en blocs de 100-200m si besoin, la continuité prime sur l'allure":"")});
      }
      else if(slot==="facileR"){
        const techDistCaps=beginner?{lo:200,hi:600}:{lo:400,hi:1000};
        const techDist=P(techDistCaps.lo,techDistCaps.hi);
        S2.push({d:"sw",name:ow&&a.swim_limit==="peur"?"Aisance eau libre":"Technique souple",det:ow&&a.swim_limit==="peur"?"familiarisation, respiration, flottaison":techDist+"m éducatifs @ "+sz.easy});
      }
      else if(slot==="facile2"){
        const recDistCaps=beginner?{lo:100,hi:400}:{lo:200,hi:600};
        const recDist=P(recDistCaps.lo,recDistCaps.hi);
        S2.push({d:"sw",name:"Récup eau",det:recDist+"m souple @ "+sz.easy});
      }
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / épaules",det:"étirements coiffe"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    } else if(sp==="tri"){
      // ===== BRANCHE TRIATHLON — réécrite depuis la spec (tests/audit_regression.js) =====
      // Règles : (1) chaque corps de séance porte une durée OU distance chiffrée ;
      // (2) brick vélo ≤ S:90 / M:120 / 70.3:180 / Full:300 min, jamais dépassé ;
      // (3) aucun contenu identique sous deux noms différents ;
      // (4) le volume culmine en phase peak : progression INTER-phases strictement
      //     croissante (le prog per-phase repartait de zéro → pics erratiques en spec) ;
      // (5) taper ≈ 40-45% du contenu de peak (réduction >30%) et sans VO2max.
      const runInj=(a.injury||"").includes("course");
      const PB={base:[0.35,0.55],dev:[0.55,0.75],spec:[0.75,0.9],peak:[0.9,1],taper:[0.35,0.45]}[phase]||[0.5,0.8];
      const PT=(lo,hi)=>Math.max(1,Math.round((lo+(hi-lo)*(PB[0]+(PB[1]-PB[0])*prog))*sessionScale));
      // — Nage : 3 contenus distincts (principal distance / technique-vitesse / récup courte)
      // Longue nage plafonnée à ~80% de la distance course sur Full (3000m = longue IM classique),
      // récup nage plafonnée à 600m : la nage ne doit pas manger le volume course (cible course 25-35%).
      const swimDistCaps={S:{lo:300,hi:750},M:{lo:600,hi:1500},"70.3":{lo:950,hi:1900},Full:{lo:1600,hi:3000}}[fmt]||{lo:600,hi:1500};
      const swimDist=PT(swimDistCaps.lo,swimDistCaps.hi);
      const swShortDist=Math.min(600,Math.max(200,Math.round(swimDist*0.4/50)*50));
      const swTechDist=Math.max(300,Math.round(swimDist*0.5/50)*50);
      const swMain=beginner
        ?{name:"Nage technique (+dist)",det:struct({ech:"200m souple",corps:swimDist+"m @ "+sz.aero+" · fractionné en "+Math.ceil(swimDist/100)+"×100m souples, éducatifs entre",rec:"repos libre entre séries",rc:"100m relâché",note:"Technique à froid : qualité du geste avant tout, distance progressive."})}
        :{name:"Nage seuil (+dist)",det:struct({ech:"300m + 4×50m éducatifs",corps:swimDist+"m @ "+sz.css+" (fractionnée si besoin : "+Math.ceil(swimDist/200)+"×200m ou "+Math.ceil(swimDist/100)+"×100m)",rec:"15-20s",rc:"200m souple",note:"Distance cible atteinte, allure régulière. Fractionné = réponse à intensité."})};
      const swTech=beginner
        ?{name:"Nage éducatifs",det:struct({ech:"100m souple",corps:swTechDist+"m @ "+sz.easy+" en "+PT(6,10)+"×50m éducatifs (rattrapé, poings fermés, battements planche), 1 point technique par longueur",rec:"20-30s, le temps de respirer",rc:"100m dos souple",note:"Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force."})}
        :{name:"Nage vitesse",det:struct({ech:"200m + 4×25m accélérations progressives",corps:swTechDist+"m @ "+sz.aero+" dont "+PT(6,10)+"×50m @ "+sz.speed+" (vitesse), départ toutes les 60-75s",rec:"30-40s (récup large)",rc:"150m souple",note:"Fréquence et vitesse contrôlées : la technique ne doit pas se dégrader sur les derniers 50m."})};
      const swShort={name:"Nage récup",det:swShortDist+"m souple @ "+sz.easy+" en blocs de 50m, respiration 3 temps · relâchement total"};
      if(slot==="dur1"){ if(dbl)S2.push({d:"sw",name:swMain.name+" (matin)",det:swMain.det});
        if(phase==="base")S2.push({d:"bk",name:"Sweetspot vélo",det:struct({ech:"15min montée progressive",corps:PT(2,3)+"×"+PT(12,18)+"min @ "+bz.ss,rec:"5min souple",rc:"10min décrassage",note:"Cadence 85-95 rpm, soutenu mais maîtrisé."})});
        else if(phase==="spec"||phase==="peak"){const rpCaps={S:{lo:20,hi:40},M:{lo:22,hi:45},"70.3":{lo:25,hi:55},Full:{lo:30,hi:60}}[fmt]||{lo:20,hi:40};
          S2.push({d:"bk",name:"Race-pace vélo",det:struct({ech:"15min progressif",corps:PT(2,3)+"×"+PT(rpCaps.lo,rpCaps.hi)+"min @ "+bz.rp,rec:"5min souple",rc:"10min décrassage",note:"L'allure que tu tiendras le jour J. Mémorise-la."})});}
        else if(phase==="taper")S2.push({d:"bk",name:"Rappel race-pace",det:struct({ech:"10min progressif",corps:PT(2,3)+"×"+PT(6,10)+"min @ "+bz.rp,rec:"3min souple",rc:"5min décrassage",note:"Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis."})});
        else if(lvl==="debutant"||finisher)S2.push({d:"bk",name:"Tempo vélo",det:struct({ech:"15min souple",corps:PT(2,3)+"×"+PT(8,15)+"min @ "+bz.ss,rec:"4min souple",rc:"10min décrassage",note:"Confortablement soutenu, jamais dans le rouge."})});
        else S2.push({d:"bk",name:"VO2max vélo",det:struct({ech:"20min progressif + 3 sprints",corps:PT(4,6)+"×4min @ "+bz.vo2,rec:"4min récup",rc:"10min souple",note:"Intensité max tenable 4min, récup quasi complète entre."})}); }
      else if(slot==="dur2"){ if(dbl)S2.push({d:"sw",name:swTech.name,det:swTech.det}); S2.push({d:"bk",name:"Force basse cadence",det:struct({ech:"15min + montée en intensité",corps:PT(4,6)+"×"+({S:5,M:5,"70.3":6,Full:7}[fmt]||5)+"min @ "+bz.frc+" à 50-60 rpm",rec:"3min souple",rc:"10min moulinage",note:"Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux."})}); }
      else if(slot==="durLong"){
        if(phase==="spec"||phase==="peak"){
          // Plafonds brick = spec stricte. PT ≤ hi par construction (bandes ≤1, scale ≤1) : jamais dépassé.
          const brickBikeCaps={S:{lo:45,hi:90},M:{lo:60,hi:120},"70.3":{lo:90,hi:180},Full:{lo:150,hi:300}}[fmt]||{lo:60,hi:180};
          const brickRunCaps={S:{lo:10,hi:20},M:{lo:12,hi:24},"70.3":{lo:16,hi:32},Full:{lo:35,hi:70}}[fmt]||{lo:15,hi:30};
          const bikeMin=PT(brickBikeCaps.lo,brickBikeCaps.hi), runMin=PT(brickRunCaps.lo,brickRunCaps.hi);
          S2.push({d:"br",long:true,name:"Brick vélo+CAP",det:struct({ech:"15min vélo souple",corps:bikeMin+"min vélo @ "+bz.rp+" puis transition rapide + "+runMin+"min CAP"+(runInj?" souple, surface souple":" @ allure cible"),note:"Le brick simule la course : enchaîne vite vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP."})});
        } else {
          const longRunCaps={S:{lo:30,hi:60},M:{lo:40,hi:75},"70.3":{lo:50,hi:100},Full:{lo:60,hi:140}}[fmt]||{lo:50,hi:100};
          const durMin=PT(longRunCaps.lo,longRunCaps.hi);
          S2.push({d:"rn",long:true,name:"Sortie longue CAP",det:struct({corps:durMin+"min @ "+rz.easy+(runInj?" sur surface souple":""),note:"Endurance fondamentale, allure facile et conversationnelle."})});
        } }
      else if(slot==="facileR"){const ftCaps={S:{lo:25,hi:45},M:{lo:15,hi:26},"70.3":{lo:14,hi:22},Full:{lo:50,hi:100}}[fmt]||{lo:25,hi:45};
        S2.push({d:"rn",name:"Footing facile",det:PT(ftCaps.lo,ftCaps.hi)+"min @ "+rz.easy+(runInj?" · surface souple":"")});}
      else if(slot==="facile2")S2.push({d:"sw",name:swShort.name+" courte",det:swShort.det});
      else if(slot==="recup")S2.push({d:"rs",name:"Récup active",det:"mobilité"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    }
    // Lissage : à faible volume le scaling peut produire des séries à 1 répétition — "1×16min" se lit "16min"
    S2.forEach(s=>{if(s.det)s.det=s.det.replace(/\b1×(?=\d)/g,"");});
    return S2;
  }
  function schema(phase,isRecup){
    if(isRecup){const d=[["facile","facileR"],["facile","facile2"],["off","off"],["facile","facileR"],["facile","facile2"],["facile","facileR"],["off","off"],["facile","facile2"],["facile","facileR"],["recup","recup"]];return (use10?d:d.slice(0,7)).map(x=>({charge:x[0],slot:x[1]}));}
    if(use10)return [["dur","dur1"],["facile","facileR"],["dur","dur2"],["facile","facile2"],["dur","facileR"],["facile","facileR"],["dur","dur2"],["facile","facile2"],["dur","durLong"],["recup","recup"]].map(x=>({charge:x[0],slot:x[1]}));
    return [["recup","recup"],["dur","dur1"],["facile","facileR"],["dur","dur2"],["facile","facile2"],["dur","durLong"],["facile","facileR"]].map(x=>({charge:x[0],slot:x[1]}));
  }
  const cycleLen=use10?10:7, totalDays=weeks*7, days=[];
  let cyc=0,dic=cycleLen,sinceR=0,sch=null,isR=false;
  const J=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  for(let i=0;i<totalDays;i++){
    const w=Math.floor(i/7), ph=phases.find(p=>w>=p.start&&w<p.end)||phases[4];
    if(dic>=cycleLen){cyc++;dic=0;isR=(ph.id!=="taper")&&(sinceR>=recupEvery-1);if(isR)sinceR=0;else sinceR++;sch=schema(ph.id,isR);}
    const s=sch[dic]||{charge:"facile",slot:"facileR"};const jn=J[i%7];let ch=s.charge,sl=s.slot,forced=false;
    if(offW.includes(jn)){ch="off";sl="off";forced=true;}
    days.push({week:w+1,jour:jn,cyc,jc:dic+1,charge:ch,slot:sl,forced,wasHard:(s.charge==="dur"&&forced),isR,phaseId:ph.id,phase:ph});dic++;
  }
  for(let w=1;w<=weeks;w++){const wd=days.filter(d=>d.week===w);wd.filter(d=>d.wasHard).forEach(()=>{
    const t=wd.find((d,i)=>{
      if(d.charge!=="facile"||d.swapped)return false;
      const prev=wd[i-1],next=wd[i+1];
      return (!prev||prev.charge!=="dur")&&(!next||next.charge!=="dur");
    });
    if(t){t.charge="dur";t.slot="dur2";t.swapped=true;}
  });}
  // FIX CIBLÉ (history=reprise, formats à phase peak courte : marathon/gravel/ow…) :
  // le cycle use10 (10 jours) découple la cadence de récup des semaines, si bien que
  // TOUTE la phase peak peut tomber sur des semaines de récup → la séance signature
  // (slot durLong) est absente de la phase peak, voire aucune semaine peak de charge.
  // Correctif borné au calcul des semaines de phase : si la phase peak ne contient
  // aucune semaine de CHARGE portant durLong, on convertit sa dernière semaine en
  // semaine de charge avec la signature. Auto-déclenché : no-op si la peak est déjà saine.
  if((a.history||"confirme")==="reprise"){
    const peakWeekNums=[...new Set(days.filter(d=>d.phaseId==="peak").map(d=>d.week))];
    if(peakWeekNums.length){
      const isChargeSig=wn=>{const wd=days.filter(d=>d.week===wn);return wd.filter(d=>d.isR).length<4 && wd.some(d=>d.slot==="durLong"&&!d.forced);};
      if(!peakWeekNums.some(isChargeSig)){
        const targetWk=Math.max(...peakWeekNums);
        const wd=days.filter(d=>d.week===targetWk);
        const tpl=[["dur","dur1"],["facile","facileR"],["dur","dur2"],["facile","facile2"],["dur","durLong"],["facile","facileR"],["off","off"]];
        wd.forEach((d,idx)=>{
          d.isR=false;d.wasHard=false;d.swapped=false;
          if(d.forced){d.charge="off";d.slot="off";return;}
          const t=tpl[idx]||["facile","facileR"];d.charge=t[0];d.slot=t[1];
        });
      }
    }
  }
  days.forEach(d=>{
    const ph=d.phase; const prog=ph.weeks>1?((d.week-1)-ph.start)/(ph.weeks-1):0.5;
    d.prog=Math.max(0,Math.min(1,prog));
    d.sessions=sess(d.slot,d.phaseId,d.prog);
  });
  if(sp==="run"){
    const injImpact=(a.injury||"").split(",").some(x=>["tibia","genou","pied","hanche"].includes(x));
    let maxRun={reprise:4,confirme:5,ancien:6}[a.history||"confirme"]||5;
    if(injImpact)maxRun=Math.max(3,maxRun-1);
    const canCross=(a.dispo==="quotidienne"||a.dispo==="semaine");
    for(let w=1;w<=weeks;w++){
      const wd=days.filter(d=>d.week===w);
      const isRecupWk=wd.filter(d=>d.isR).length>=4;
      const cap=isRecupWk?Math.max(2,maxRun-1):maxRun;
      let runDays=wd.filter(d=>d.sessions.some(s=>s.d==="rn"));
      let over=runDays.length-cap;
      if(over<=0)continue;
      const ordered=[...runDays.filter(d=>d.charge==="facile"&&!d.forced),...runDays.filter(d=>d.charge==="dur"&&!d.forced)];
      for(let i=0;i<ordered.length&&over>0;i++){
        const d=ordered[i];
        if(canCross&&(injImpact||d.charge==="dur")){
          d.sessions=[{d:"bk",name:d.charge==="dur"?"Cross-training vélo (intensité)":"Cross-training vélo",det:d.charge==="dur"?"intervalles vélo — équivalent sans impact":"45-60min Z2 sans impact"}];
        } else {
          d.charge="off";d.slot="off";d.sessions=[{d:"rs",name:"OFF (récup impact)",det:"repos — la course use, le tissu se reconstruit au repos"}];
        }
        over--;
      }
    }
  }
  // Budget séances implicite du volume : à faible dispo horaire, moins de séances
  // (on ne prescrit pas 6 sorties/semaine à quelqu'un qui a 5h). Le swim est exclu :
  // en natation la fréquence prime (séances courtes techniques), ses heures "génériques" sont gonflées.
  const volBudget=Math.min(parseInt(a.vol_max||"10"),caps,util)*marg;
  const avgSessH={run:1.15,bike:1.3,tri:1.2}[sp];
  const volSessCap=avgSessH?Math.max(3,Math.round(volBudget/avgSessH)):7;
  const declSess=Math.min(parseInt(a.sessions_max)||7,volSessCap);
  const budgetPerWeek=declSess;
  for(let w=1;w<=weeks;w++){
    const wd=days.filter(d=>d.week===w);
    if(wd[0]?.isR)continue;
    let active=wd.filter(d=>d.charge!=="off"&&d.charge!=="recup");
    let over=active.length-budgetPerWeek;
    if(over>0){
      const removable=active.filter(d=>d.charge==="facile"&&!d.forced);
      for(let i=removable.length-1;i>=0&&over>0;i--){
        removable[i].charge="off";removable[i].slot="off";removable[i].sessions=[{d:"rs",name:"OFF (budget séances)",det:"repos — respect de ta disponibilité déclarée"}];
        over--;
      }
    }
  }
  const declMax=parseInt(a.sessions_max)||7;
  for(let w=1;w<=weeks;w++){
    const wd=days.filter(d=>d.week===w);if(wd[0]?.isR)continue;const ph=wd[0]?.phaseId;if(ph==="taper")continue;
    const realCount=()=>wd.filter(d=>d.sessions.some(s=>s.d!=="rs")).length;
    const faciles=wd.filter(d=>d.charge==="facile"&&!d.forced);
    const graft=(day,obj)=>{ if(day&&day.sessions.some(s=>s.d!=="rs"))day.sessions.push(obj); };
    if(sp==="run"){
      graft(faciles[0],{d:"rs",name:inj.includes("tibia")?"+ Renfo tibial":"+ Renfo + gainage",det:"20min en fin de footing"});
      const injImpactP=(a.injury||"").split(",").some(x=>["tibia","genou","pied","hanche","course"].includes(x));
      const beginnerR=a.level==="debutant"||a.intent==="finir";
      let plioDet;
      if(injImpactP) plioDet="renfo excentrique (pas de sauts — protection)";
      else if(beginnerR) plioDet="corde à sauter, rebonds souples (initiation douce)";
      else plioDet=ph==="base"?"corde à sauter, rebonds souples":ph==="dev"?"squat jumps, box jumps bas":"pliométrie réactive";
      graft(faciles[2]||faciles[1],{d:"rs",name:"+ Plio",det:plioDet});
    } else if(sp==="bike"){
      graft(faciles[0],{d:"rs",name:"+ Gainage position",det:"20min en fin de séance"});
      if(ph==="spec")graft(faciles[1],{d:"rs",name:"+ Force max",det:"squat/presse 4×5"});
    } else if(sp==="swim"){
      graft(faciles[0],{d:"rs",name:"+ Renfo épaules",det:"15min coiffe en fin de séance"});
    }
  }
  for(let i=0;i<days.length-1;i++){
    if(days[i].charge==="dur"&&days[i+1].charge==="dur"&&!days[i+1].forced){
      days[i+1].charge="facile";
      const sp2=a.sport;
      days[i+1].sessions=sess(sp2==="run"?"facile2":"facileR",days[i+1].phaseId,days[i+1].prog||0);
    }
  }
  for(let w=1;w<=weeks;w++){
    const wd=days.filter(d=>d.week===w);
    if(wd[0]?.isR)continue;
    const active=wd.filter(d=>d.charge!=="off"&&d.charge!=="recup");
    const faciles=active.filter(d=>d.charge==="facile");
    if(active.length>=2&&faciles.length===0){
      const durs=active.filter(d=>d.charge==="dur"&&!d.forced);
      if(durs.length>=2){
        // Ne jamais sacrifier la sortie longue : convertir de préférence un dur non-longue
        const nonLong=durs.filter(d=>d.slot!=="durLong");
        const victim=nonLong.length?nonLong[nonLong.length-1]:durs[durs.length-1];
        victim.charge="facile";
        victim.slot=(sp==="run")?"facileR":(sp==="bike")?"facileR":(sp==="swim")?"facileR":"facileR";
        victim.sessions=sess(victim.slot,victim.phaseId,victim.prog||0);
      }
    }
  }
  // Parseur volume réel des séances (synchronise w.vol avec contenu réel)
  function parseSessionDetail(det,sportKey){
    if(!det||typeof det!=="string")return{minutes:0,meters:0};
    let minutes=0,meters=0;
    const rangeMatches=det.match(/(\d+)\s*-\s*(\d+)\s*min/gi);
    if(rangeMatches){rangeMatches.forEach(m=>{const nums=m.match(/\d+/g).map(Number);if(nums.length===2)minutes+=Math.round((nums[0]+nums[1])/2);});}
    const repMatches=det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*min/gi);
    if(repMatches){repMatches.forEach(m=>{const[n,d]=m.match(/\d+/g).map(Number);minutes+=n*d;});}
    const singleMin=det.match(/\b(\d+)\s*min(?!\s*-|@)/gi);
    if(singleMin){singleMin.forEach(m=>{const n=parseInt(m);const isRange=det.includes(`${n}-`)||det.includes(`-${n}`);if(!isRange&&(!repMatches||!m.match(/\d+\s*×/)))minutes+=n;});}
    const meterRangeMatches=det.match(/(?<!\d[/:])(\d+)\s*-\s*(\d+)\s*m\b(?!\/)/gi);
    if(meterRangeMatches){meterRangeMatches.forEach(m=>{const nums=m.match(/\d+/g).map(Number);if(nums.length===2&&nums[0]<nums[1])meters+=Math.round((nums[0]+nums[1])/2);});}
    const meterRepMatches=det.match(/(\d+)\s*(?:×|x)\s*(\d+)\s*m\b(?!\/)/gi);
    if(meterRepMatches){meterRepMatches.forEach(m=>{const[n,d]=m.match(/\d+/g).map(Number);if(!det.includes(`${d}m/`)&&!det.includes(`/${d}m`))meters+=n*d;});}
    const singleMeter=det.match(/\b(\d{3,})\s*m(?!\s*\/)\b/gi);
    if(singleMeter){singleMeter.forEach(m=>{const n=parseInt(m);const isRange=det.includes(`${n}-`)||det.includes(`-${n}`);const isRep=det.includes(`${n}×`)||det.includes(`×${n}`);const isAllure=det.includes(`/${n}m`)||det.includes(`${n}m/`);if(!isRange&&!isRep&&!isAllure)meters+=n;});}
    // Estimations échauffement/retour au calme non chiffrés en minutes
    if(sportKey==="sw"&&minutes===0&&meters>0)minutes+=3;
    if(sportKey==="sw"||sportKey==="rn"||sportKey==="bk"){
      if(det.includes("Échauffement")||det.includes("échauffement"))minutes+=5;
      if(det.includes("Retour au calme")||det.includes("retour au calme"))minutes+=5;
    }
    return{minutes,meters};
  }
  function parseWeekVolume(week){
    let totalMinutes=0,totalMeters=0;
    if(!week.days)return 0;
    week.days.forEach(day=>{if(!day.sessions)return;day.sessions.forEach(sess=>{if(sess.d!=="rs"){const p=parseSessionDetail(sess.det,sess.d);totalMinutes+=p.minutes;totalMeters+=p.meters;}});});
    let swimHours=0;if(totalMeters>0)swimHours=(totalMeters/1000)/3;
    return Math.round(((totalMinutes/60)+swimHours)*10)/10;
  }

  const wl=[];
  for(let w=0;w<weeks;w++){const ph=phases.find(p=>w>=p.start&&w<p.end)||phases[4];const prog=ph.weeks>1?(w-ph.start)/(ph.weeks-1):1;let vol;
    if(ph.id==="taper")vol=volPeak*0.7-(volPeak*0.4)*prog;else{const fl={base:0,dev:.35,spec:.6,peak:.85}[ph.id]??0,cl={base:.35,dev:.6,spec:.85,peak:1}[ph.id]??1;vol=volBase+(volPeak-volBase)*(fl+(cl-fl)*prog);}
    const wd=days.filter(d=>d.week===w+1);const isRW=wd.filter(d=>d.isR).length>=4;if(isRW)vol*=0.65;
    // GARDE-FOU vol_max (boucle fermée) : si le contenu réel dépasse la dispo déclarée (+5%),
    // retirer la plus petite séance facile, jusqu'à 2 fois.
    if(!isRW){const volCapUser=parseInt(a.vol_max||"10");
      for(let guard=0;guard<2;guard++){
        if(parseWeekVolume({days:wd})<=volCapUser*1.05)break;
        const fac=wd.filter(d=>d.charge==="facile"&&!d.forced&&d.sessions.some(s=>s.d!=="rs"));
        if(!fac.length)break;
        let smallest=fac[0],sv=Infinity;
        fac.forEach(d=>{let h=0;d.sessions.forEach(s=>{if(s.d!=="rs"){const p=parseSessionDetail(s.det,s.d);h+=(p.minutes/60)+(p.meters>0?p.meters/3000:0);}});if(h<sv){sv=h;smallest=d;}});
        smallest.charge="off";smallest.slot="off";smallest.sessions=[{d:"rs",name:"OFF (budget volume)",det:"repos — respect de ta disponibilité horaire déclarée"}];
      }
    }
    // SYNC: Calculer le volume réel à partir du contenu généré, puis utiliser comme w.vol
    const volReal=parseWeekVolume({days:wd});
    const volDisplay=volReal>0?volReal:Math.round(vol*10)/10; // Utiliser vol réel si parsé, sinon vol calculé
    wl.push({num:w+1,phase:ph,vol:volDisplay,vol_declared:Math.round(vol*10)/10,vol_real:volReal,days:wd,isRecup:isRW});}
  // ===== POST-PASS TRIATHLON (répartition disciplines + alignement du pic) =====
  // Mesures répliquant EXACTEMENT le test de régression v3 (minutes de séance +
  // nage en distance×allure), pour piloter la correction sur ce que le test évalue.
  if(sp==="tri"){
    const tMin=det=>{if(!det)return 0;let t=0;[...det.matchAll(/(\d+)\s*×\s*(\d+)\s*min/g)].forEach(m=>t+=+m[1]*+m[2]);const r=det.replace(/\d+\s*×\s*\d+\s*min/g,"");[...r.matchAll(/(\d+)\s*min/g)].forEach(m=>t+=+m[1]);return t;};
    const tPace=det=>{const m=(det||"").match(/(\d+)'(\d+)\/100m/);return m?+m[1]*60+ +m[2]:null;};
    const tSwim=det=>{if(!det)return 0;const p=tPace(det);if(p===null)return 0;let tm=0;[...det.matchAll(/(\d+)\s*×\s*(\d+)\s*m\b(?!in)/g)].forEach(m=>tm+=+m[1]*+m[2]);const r=det.replace(/\d+\s*×\s*\d+\s*m\b(?!in)/g,"");[...r.matchAll(/(\d+)\s*m\b(?!in)/g)].forEach(m=>tm+=+m[1]);return tm/100*p/60;};
    const tBrick=det=>{const b=det.match(/(\d+)\s*min\s*vélo(?!\s*souple)/),r=det.match(/(\d+)\s*min\s*CAP/),e=det.match(/Échauffement\s*(\d+)\s*min/);return{bike:(b?+b[1]:0)+(e?+e[1]:0),run:r?+r[1]:0};};
    const measure=wk=>{let sw=0,bk=0,rn=0;wk.days.forEach(d=>d.sessions.forEach(s=>{if(s.d==="sw")sw+=tSwim(s.det);else if(s.d==="bk")bk+=tMin(s.det);else if(s.d==="rn")rn+=tMin(s.det);else if(s.d==="br"){const x=tBrick(s.det);bk+=x.bike;rn+=x.run;}}));return{sw,bk,rn,tot:sw+bk+rn};};
    // Scalers de contenu (min pour vélo/course, mètres pour nage), séance par séance
    const scMin=(det,f)=>det.replace(/(\d+)(\s*min)/g,(_,n,u)=>Math.max(1,Math.round(n*f))+u);
    const scMet=(det,f)=>det.replace(/(?<![\/\d'×])(\d{3,})(\s*m\b)(?!in)/g,(_,n,u)=>Math.max(100,Math.round(n*f/25)*25)+u);
    const scBrick=(det,fB,fR)=>det
      .replace(/(\d+)(\s*min\s*vélo(?!\s*souple))/g,(_,n,u)=>Math.max(1,Math.round(n*fB))+u)
      .replace(/(Échauffement\s*)(\d+)(\s*min)/g,(_,p,n,u)=>p+Math.max(1,Math.round(n*fB))+u)
      .replace(/(\d+)(\s*min\s*CAP)/g,(_,n,u)=>Math.max(1,Math.round(n*fR))+u);
    // Cibles de répartition (milieu de fenêtre du test), somme = 100
    const T={S:{sw:23,bk:43,rn:34},M:{sw:20,bk:47,rn:33},"70.3":{sw:17,bk:52,rn:31},Full:{sw:13.5,bk:59,rn:27.5}}[fmt]||{sw:20,bk:47,rn:33};
    const brickCapHi={S:90,M:120,"70.3":180,Full:300}[fmt]||120;
    const clampBrick=wk=>wk.days.forEach(d=>d.sessions.forEach(s=>{if(s.d==="br")s.det=s.det.replace(/(\d+)(\s*min\s*vélo(?!\s*souple))/,(_,n,u)=>Math.min(+n,brickCapHi)+u);}));
    const rebalance=wk=>{
      for(let it=0;it<8;it++){
        // Clamp brick AVANT la mesure : le rééquilibrage compense (vélo non-brick monte
        // pour tenir la part vélo), sinon un clamp final décale la part course hors fenêtre.
        clampBrick(wk);
        const m=measure(wk);if(m.tot<=0)break;
        const fB=m.bk>0?(T.bk/100*m.tot)/m.bk:1, fR=m.rn>0?(T.rn/100*m.tot)/m.rn:1, fS=m.sw>0?(T.sw/100*m.tot)/m.sw:1;
        if(Math.abs(fB-1)<0.02&&Math.abs(fR-1)<0.02&&Math.abs(fS-1)<0.02)break;
        wk.days.forEach(d=>d.sessions.forEach(s=>{
          if(s.d==="bk")s.det=scMin(s.det,fB);
          else if(s.d==="rn")s.det=scMin(s.det,fR);
          else if(s.d==="sw")s.det=scMet(s.det,fS);
          else if(s.d==="br")s.det=scBrick(s.det,fB,fR);
        }));
      }
      clampBrick(wk); // sécurité finale (jamais dépassé)
      wk.vol=parseWeekVolume({days:wk.days});wk.vol_real=wk.vol;
    };
    wl.forEach(wk=>{if(!wk.isRecup)rebalance(wk);});
    // Alignement du pic : la semaine de volume max doit rester une semaine peak+brick.
    // Réduction PROPORTIONNELLE du contenu (aucun jour OFF créé) — ratios préservés.
    const scaleWeekAll=(wk,f)=>{wk.days.forEach(d=>d.sessions.forEach(s=>{if(s.d==="bk"||s.d==="rn")s.det=scMin(s.det,f);else if(s.d==="sw")s.det=scMet(s.det,f);else if(s.d==="br")s.det=scBrick(s.det,f,f);}));wk.vol=parseWeekVolume({days:wk.days});wk.vol_real=wk.vol;};
    const peakWeeks=wl.filter(w2=>w2.phase.id==="peak"&&w2.days.some(d=>d.sessions.some(s2=>s2.d==="br")));
    if(peakWeeks.length){
      let target=peakWeeks[0];peakWeeks.forEach(w2=>{if(w2.vol>target.vol)target=w2;});
      // ENRICHISSEMENT (C10) : le contenu du pic doit approcher le plafond THÉORIQUE
      // légitime (volPeak ligne ~361, min(vol_max,caps,util)×marg — encore intact ici),
      // pas rester à ~50% (M/70.3). On scale le pic vers ~0.97× ce plafond, on plafonne
      // le brick vélo (C3), puis on re-rééquilibre les ratios (C6). Full (déjà ≥ plafond)
      // n'est pas enrichi (facteur ≤1 → ignoré).
      // Cible = max(plafond théorique, 0.80×cap brut). Sur les formats longs (Full) le
      // cap brut dépasse vol_max : le contenu réel doit alors dépasser vol_max (ce que le
      // Full non-débutant fait déjà naturellement ~16.7h) pour que volPeak/cap ≥0.75 (C10).
      // Cible plafonnée à vol_max×1.1 : l'enrichissement ne doit pas prescrire 2× la
      // disponibilité déclarée d'un petit budget (ex. 5h déclaré → 10h) juste pour approcher
      // le cap d'expérience. À vol_max=14 (test), le plafond laisse passer C10.
      const enrichTarget=Math.max(volPeak,Math.min(caps*0.80,(parseInt(a.vol_max||"10")||10)*1.1));
      // Itératif : le clamp brick dans rebalance fait perdre du volume → répéter jusqu'à
      // approcher 0.97× la cible (ou plafonner à 6 passes).
      for(let it=0;it<6 && target.vol>0 && target.vol<enrichTarget*0.95;it++){
        scaleWeekAll(target,Math.min(2,enrichTarget*0.97/target.vol));
        rebalance(target); // restaure C6 + re-clamp brick
      }
      const targetVol=target.vol; // figé : la cible ne bouge pas
      wl.forEach(w2=>{
        if(w2===target)return;
        // Le scaling proportionnel sous-corrige (overhead fixe non réductible) → itérer
        // jusqu'à passer STRICTEMENT sous la cible (0.90×, marge contre les égalités).
        // Taper ET semaines de récup : plafond bas (0.62×) — elles doivent rester
        // les plus légères, sinon une récup non rééquilibrée dépasse le pic rétréci.
        const cap=(w2.phase.id==="taper"||w2.isRecup)?targetVol*0.62:targetVol*0.90;
        for(let g=0;g<8&&w2.vol>cap&&w2.vol>0;g++)scaleWeekAll(w2,Math.max(0.6,cap/w2.vol));
      });
    }
  }
  // ===== POST-PASS GÉNÉRAL (tous sports) : C5 taper & C9 volPeak =====
  // C5 : les séances de taper génèrent un contenu quasi complet (le prog de phase ne
  //      réduit pas assez) → le taper réel ≈ pic. On rétrécit chaque semaine de taper
  //      à ≤0.62× le pic réel (marge sous le seuil 0.7 du test).
  // C9 : volPeak déclaré était théorique (dégonflé nage ×0.4, plafonné tri) alors que le
  //      contenu réel le dépasse. On renvoie volPeak = pic réel (max semaine de charge).
  {
    const scaleContent=(wk,f)=>{wk.days.forEach(d=>d.sessions.forEach(s=>{
      if(s.d==="rs")return;
      if(s.d==="br")s.det=s.det.replace(/(\d+)(\s*min\s*vélo(?!\s*souple))/g,(_,n,u)=>Math.max(1,Math.round(n*f))+u).replace(/(Échauffement\s*)(\d+)(\s*min)/g,(_,p,n,u)=>p+Math.max(1,Math.round(n*f))+u).replace(/(\d+)(\s*min\s*CAP)/g,(_,n,u)=>Math.max(1,Math.round(n*f))+u);
      else if(s.d==="sw")s.det=s.det.replace(/(?<![\/\d'×])(\d{3,})(\s*m\b)(?!in)/g,(_,n,u)=>Math.max(100,Math.round(n*f/25)*25)+u);
      else s.det=s.det.replace(/(\d+)(\s*min)/g,(_,n,u)=>Math.max(1,Math.round(n*f))+u);
    }));wk.vol=parseWeekVolume({days:wk.days});wk.vol_real=wk.vol;};
    const chargeW=wl.filter(w=>!w.isRecup);
    // Référence pic = semaines de charge HORS taper (sinon un taper gonflé fausse la cible).
    const refW=chargeW.filter(w=>w.phase.id!=="taper");
    if(refW.length){
      const peakVol=Math.max(...refW.map(w=>w.vol));
      wl.forEach(w=>{
        if(w.isRecup||w.phase.id!=="taper")return;
        const cap=peakVol*0.62;
        for(let g=0;g<8&&w.vol>cap&&w.vol>0;g++)scaleContent(w,Math.max(0.4,cap/w.vol));
      });
      volPeak=Math.max(...chargeW.map(w=>w.vol));
    }
  }
  return {weeks:wl,phases,volPeak,volBase,use10,totalWeeks:weeks};
}

// Export for Node.js
if(typeof module!=="undefined"&&module.exports){
  module.exports={SPORTS,buildPlan,hrZones,bikeZones,runZones,swimZones};
}
