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
    bike:{reprise:{crit:6,route:8,cyclo:9,clm:7,gravel:11},confirme:{crit:8,route:11,cyclo:13,clm:10,gravel:15},ancien:{crit:10,route:14,cyclo:16,clm:12,gravel:20}},
    swim:{reprise:{sprint:3,demifond:4,fond:5,ow:6},confirme:{sprint:5,demifond:6,fond:7,ow:9},ancien:{sprint:6,demifond:8,fond:10,ow:12}},
    tri:{reprise:{S:6,M:8,"70.3":11,Full:15},confirme:{S:7,M:10,"70.3":13,Full:17},ancien:{S:8,M:12,"70.3":15,Full:19}}}[sp][a.history||"confirme"][fmt]||10;
  const util={run:{"5k":6,"10k":7,semi:9,marathon:12,trail:14},bike:{crit:9,route:13,cyclo:15,clm:11,gravel:20},swim:{sprint:6,demifond:8,fond:10,ow:12},tri:{S:8,M:11,"70.3":14,Full:18}}[sp][fmt]||12;
  const marg=(a.intent==="competition")?1.0:0.9;
  let volPeak=Math.round(Math.min(parseInt(a.vol_max||"10"),caps,util)*marg*10)/10;
  if(sp==="swim"&&a.level==="debutant")volPeak=Math.min(volPeak,4);
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
    const P=(lo,hi)=>Math.round(lo+(hi-lo)*prog);
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
        const durCaps={"5k":{lo:40,hi:75},"10k":{lo:50,hi:90},semi:{lo:70,hi:130},marathon:{lo:90,hi:180},trail:{lo:120,hi:270}}[fmt]||{lo:60,hi:110};
        const durMin=P(durCaps.lo,durCaps.hi);
        S2.push({d:"rn",name:"Sortie longue",det:struct({corps:durMin+"min @ "+rz.easy+((phase==="spec"||phase==="peak")&&!finisher?", derniers 15-20min @ allure cible":""),note:beginner?"Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK.":"Allure d'endurance, jamais forcée. La longue construit l'endurance de base."})});
      }
      else if(slot==="facileR")S2.push({d:"rn",name:"Footing facile",det:P(30,50)+"min @ "+rz.easy+(G&&!injImp?" · termine par "+G.replace("+ ",""):"")+(beginner?" — 💡 allure de conversation, sans forcer":"")});
      else if(slot==="facile2")S2.push({d:"rn",name:"Footing récup",det:"30min @ "+rz.rec});
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
        const durCaps={crit:{lo:60,hi:150},route:{lo:90,hi:180},clm:{lo:75,hi:165},cyclo:{lo:120,hi:240},gravel:{lo:150,hi:330}}[fmt]||{lo:90,hi:210};
        const durMin=P(durCaps.lo,durCaps.hi);
        S2.push({d:"bk",name:"Sortie longue",det:durMin+"min @ "+bz.z2+((fmt==="cyclo"||fmt==="gravel")?" · endurance":"")});
      }
      else if(slot==="facileR")S2.push({d:"bk",name:"Endurance facile",det:P(45,90)+"min @ "+bz.z2});
      else if(slot==="facile2")S2.push({d:"bk",name:"Récup active",det:"45min très souple"});
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / gainage",det:"mobilité"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    } else if(sp==="swim"){
      const shoulder=(a.injury||"").includes("epaule"), ow=a.milieu==="ow"||a.milieu==="mixte";
      if(slot==="dur1"){
        if(beginner)S2.push({d:"sw",name:"Technique + éducatifs",det:struct({ech:"200m souple",corps:"éducatifs variés (rattrapé, poings fermés, battements planche), "+P(1,2)+" point(s) technique",rec:"repos libre entre séries",rc:"100m relâché",note:"La technique se construit à froid, sans fatigue. Qualité > quantité."})});
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
          ? {lo:200,hi:900}
          : ({sprint:{lo:600,hi:1400},demifond:{lo:1000,hi:2000},fond:{lo:1500,hi:3000},ow:{lo:1500,hi:4500}}[fmt]||{lo:1000,hi:2000});
        const distM=P(distCaps.lo,distCaps.hi);
        S2.push({d:"sw",name:ow?"Volume + sighting":(beginner?"Volume aérobie":"Longue continue"),
          det:distM+"m @ "+sz.aero+(ow?" · navigation aux repères":"")+(beginner?" · fractionne en blocs de 100-200m si besoin, la continuité prime sur l'allure":"")});
      }
      else if(slot==="facileR")S2.push({d:"sw",name:ow&&a.swim_limit==="peur"?"Aisance eau libre":"Technique souple",det:ow&&a.swim_limit==="peur"?"familiarisation, respiration, flottaison":"éducatifs @ "+sz.easy});
      else if(slot==="facile2")S2.push({d:"sw",name:"Récup eau",det:"souple "+sz.easy});
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / épaules",det:"étirements coiffe"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    } else if(sp==="tri"){
      const runInj=(a.injury||"").includes("course");
      const swDetBeg=struct({ech:"200m souple",corps:"éducatifs (rattrapé, battements) + respiration, "+P(1,2)+" point technique",rec:"repos libre",rc:"100m relâché",note:"Technique à froid : qualité du geste avant tout."});
      const swDetCSS=struct({ech:"300m + 4×50m éducatifs",corps:P(6,10)+"×100m @ "+sz.css,rec:"15-20s",rc:"200m souple",note:"Allure régulière, tous les 100m identiques."});
      const swT=beginner?{name:"Nage technique",det:swDetBeg}:{name:"Nage seuil",det:swDetCSS};
      if(slot==="dur1"){ if(dbl)S2.push({d:"sw",name:swT.name+" (matin)",det:swT.det});
        if(phase==="base")S2.push({d:"bk",name:"Sweetspot vélo",det:struct({ech:"15min montée progressive",corps:P(2,3)+"×15min @ "+bz.ss,rec:"5min souple",rc:"10min décrassage",note:"Cadence 85-95 rpm, soutenu mais maîtrisé."})});
        else if(phase==="spec"||phase==="peak")S2.push({d:"bk",name:"Race-pace vélo",det:struct({ech:"15min progressif",corps:P(2,3)+"×"+P(20,40)+"min @ "+bz.rp,rec:"5min souple",rc:"10min décrassage",note:"L'allure que tu tiendras le jour J. Mémorise-la."})});
        else if(lvl==="debutant"||finisher)S2.push({d:"bk",name:"Tempo vélo",det:struct({ech:"15min souple",corps:P(2,3)+"×"+P(8,15)+"min @ "+bz.ss,rec:"4min souple",rc:"10min décrassage",note:"Confortablement soutenu, jamais dans le rouge."})});
        else S2.push({d:"bk",name:"VO2max vélo",det:struct({ech:"20min progressif + 3 sprints",corps:P(4,6)+"×4min @ "+bz.vo2,rec:"4min récup",rc:"10min souple",note:"Intensité max tenable 4min, récup quasi complète entre."})}); }
      else if(slot==="dur2"){ if(dbl)S2.push({d:"sw",name:swT.name,det:swT.det}); S2.push({d:"bk",name:"Force basse cadence",det:struct({ech:"15min + montée en intensité",corps:P(4,6)+"×5min @ "+bz.frc+" à 50-60 rpm",rec:"3min souple",rc:"10min moulinage",note:"Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux."})}); }
      else if(slot==="durLong"){
        if(phase==="spec"||phase==="peak"){
          const brickBikeCaps={S:{lo:45,hi:90},M:{lo:60,hi:120},"70.3":{lo:90,hi:180},Full:{lo:150,hi:300}}[fmt]||{lo:60,hi:180};
          const brickRunCaps={S:{lo:10,hi:20},M:{lo:15,hi:30},"70.3":{lo:20,hi:45},Full:{lo:30,hi:75}}[fmt]||{lo:15,hi:30};
          const bikeMin=P(brickBikeCaps.lo,brickBikeCaps.hi), runMin=P(brickRunCaps.lo,brickRunCaps.hi);
          S2.push({d:"br",name:"Brick vélo+CAP",det:struct({ech:"15min vélo souple",corps:bikeMin+"min vélo @ "+bz.rp+" puis transition rapide + "+runMin+"min CAP"+(runInj?" souple, surface souple":" @ allure cible"),note:"Le brick simule la course : enchaîne vite vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP."})});
        } else {
          const longRunCaps={S:{lo:30,hi:60},M:{lo:40,hi:75},"70.3":{lo:50,hi:100},Full:{lo:60,hi:140}}[fmt]||{lo:50,hi:100};
          const durMin=P(longRunCaps.lo,longRunCaps.hi);
          S2.push({d:"rn",name:"Sortie longue CAP",det:struct({corps:durMin+"min @ "+rz.easy+(runInj?" sur surface souple":""),note:"Endurance fondamentale, allure facile et conversationnelle."})});
        } }
      else if(slot==="facileR")S2.push({d:"rn",name:"Footing facile",det:"@ "+rz.easy+(runInj?" · court, surface souple":"")});
      else if(slot==="facile2")S2.push({d:"sw",name:swT.name+" courte",det:swT.det});
      else if(slot==="recup")S2.push({d:"rs",name:"Récup active",det:"mobilité"});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total"});
    }
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
  const declSess=parseInt(a.sessions_max)||7;
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
        const victim=durs[durs.length-1];
        victim.charge="facile";
        victim.slot=(sp==="run")?"facileR":(sp==="bike")?"facileR":(sp==="swim")?"facileR":"facileR";
        victim.sessions=sess(victim.slot,victim.phaseId,victim.prog||0);
      }
    }
  }
  const wl=[];
  for(let w=0;w<weeks;w++){const ph=phases.find(p=>w>=p.start&&w<p.end)||phases[4];const prog=ph.weeks>1?(w-ph.start)/(ph.weeks-1):1;let vol;
    if(ph.id==="taper")vol=volPeak*0.7-(volPeak*0.4)*prog;else{const fl={base:0,dev:.35,spec:.6,peak:.85}[ph.id]??0,cl={base:.35,dev:.6,spec:.85,peak:1}[ph.id]??1;vol=volBase+(volPeak-volBase)*(fl+(cl-fl)*prog);}
    const wd=days.filter(d=>d.week===w+1);const isRW=wd.filter(d=>d.isR).length>=4;if(isRW)vol*=0.65;
    wl.push({num:w+1,phase:ph,vol:Math.round(vol*10)/10,days:wd,isRecup:isRW});}
  return {weeks:wl,phases,volPeak,volBase,use10,totalWeeks:weeks};
}

// Export for Node.js
if(typeof module!=="undefined"&&module.exports){
  module.exports={S:{sport:null,answers:{}},SPORTS,buildPlan,hrZones,bikeZones,runZones,swimZones};
}
