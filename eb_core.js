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
  // Drapeau médical (douleur thoracique / vertiges / traitement CV) : AUCUNE intensité,
  // et volume nettement allégé (endurance de maintien uniquement) tant qu'un feu vert
  // médical n'est pas fourni. Défini tôt car il pilote sessionScale et l'enrichissement.
  const medHold=a.med_pain==="oui"||a.med_dizzy==="oui"||a.med_treat==="oui";
  // 1B — effets réels des indicateurs de récup (evalRules le promet, buildPlan doit le tenir).
  // Sommeil court : volume réduit ~15%. Charge de vie lourde : marge renforcée ~10%.
  // Appliqué au CONTENU (sur sessionScale) pour que le volPeak réel final baisse réellement —
  // le plafond théorique est écrasé par le post-pass. (medHold agit autrement : retrait de
  // l'intensité + séances gardées à longueur normale, cf. plus bas — pas de rétrécissement ici.)
  const recupFactor=(a.sleep==="court"?0.85:1)*(a.life_load==="lourde"?0.90:1);
  // OPTION A — le contenu des séances dépend du volume disponible, pas seulement du format :
  // si l'athlète a moins d'heures (vol_max, historique) que le format n'en demande (util),
  // toutes les quantités prescrites (durées, répétitions, distances) sont réduites d'autant via P().
  const sessionScale=Math.min(1,Math.min(parseInt(a.vol_max||"10"),caps,util)*marg/util)*recupFactor;
  let volPeak=Math.round(Math.min(parseInt(a.vol_max||"10"),caps,util)*marg*recupFactor*10)/10;
  if(sp==="swim"&&a.level==="debutant")volPeak=Math.min(volPeak,4);
  // FIX SWIM : volume déclaré 4.5× trop haut car confond heures avec distance
  // SWIM 4000m = 1.3h réel, pas 5.9h théorique. Réduire volPeak de 60%
  if(sp==="swim")volPeak=Math.round(volPeak*0.4*10)/10;
  if(sp==="tri"&&a.level==="debutant"){/* le tri débutant nage reste limité côté nage, géré par la répartition */}
  let volBase=Math.round(volPeak*0.58*10)/10;
  const phases=[{id:"base",nom:"Base",pct:.30,c:"#00b8d9"},{id:"dev",nom:"Développement",pct:.25,c:"#9b72ff"},{id:"spec",nom:"Spécifique",pct:.20,c:"#f0b429"},{id:"peak",nom:"Peak",pct:.15,c:"#e63946"},{id:"taper",nom:"Affûtage",pct:.10,c:"#00a376"}];
  let acc=0;phases.forEach(p=>{p.start=Math.round(acc*weeks);acc+=p.pct;p.end=Math.round(acc*weeks);p.weeks=p.end-p.start;});phases[4].end=weeks;

  const nOff=(a.off_which||"").split(",").filter(Boolean).length;
  const use10=(a.dispo==="quotidienne"&&a.shift_ok==="oui"&&nOff<2);
  const recupEvery=(a.history==="reprise")?3:4;
  const offW=(a.off_which||"").split(",").filter(Boolean);
  // R3.9 — disponibilité à 4 états : { day, status:"dispo"|"blocked"|"social-ride"|
  // "social-run"|"social-swim", durationMin, load }. Un créneau social ne génère pas de
  // séance mais consomme la durée du budget de la semaine (voir injection plus bas).
  const availMap={};
  if(Array.isArray(a.availability))a.availability.forEach(x=>{if(x&&x.day)availMap[x.day]=x;});
  const inj=(a.injury||"").split(",").filter(x=>x&&x!=="aucune");
  const hz=hrZones(a.age,a.hr_max,a.hr_rest);
  const bz=bikeZones(parseInt(a.ftp),hz), rz=runZones(a.pace,hz), sz=swimZones(a.css);
  const noFTP=a.ftp_known!=="oui", noPace=a.pace_known!=="oui", noCSS=a.css_known!=="oui";
  const beginner=a.level==="debutant";
  const dbl=a.doubles==="oui";

  // ===== R3.1 / R3.8 — intensité relative (référence + multiplicateurs) =====
  // Chaque zone = référence relative (ftp / thrPace / css), repli HR, repli RPE texte.
  // render() résout en valeur absolue au moment du rendu, via la référence datée (C11).
  const ZDEF={
    "bk.z2":{ref:"ftp",lo:.56,hi:.75,hr:"z2",fb:"effort 4/10 conversation"},
    "bk.ss":{ref:"ftp",lo:.88,hi:.94,hr:"tempo",fb:"effort 7/10 soutenu"},
    "bk.vo2":{ref:"ftp",lo:1.06,hi:1.18,hr:null,fb:"effort 9/10 (RPE — la FC suit mal sur 4min)"},
    "bk.frc":{ref:"ftp",lo:.78,hi:.86,hr:null,fb:"gros braquet, effort musculaire (cadence>FC)"},
    "bk.rp":{ref:"ftp",lo:.68,hi:.78,hr:"z2",fb:"allure course contrôlée"},
    "bk.thr":{ref:"ftp",lo:.95,hi:1.05,hr:"seuil",fb:"seuil ~1h"},
    "rn.easy":{ref:"thrPace",lo:1.16,hi:1.26,hr:"z2",fb:"allure conversation"},
    "rn.mara":{ref:"thrPace",lo:1.08,hi:1.13,hr:"tempo",fb:"allure marathon"},
    "rn.thr":{ref:"thrPace",lo:1.0,hi:1.05,hr:"seuil",fb:"allure seuil ~1h"},
    "rn.vo2":{ref:"thrPace",lo:.92,hi:.97,hr:null,fb:"allure 5-10min (RPE — FC peu fiable sur l'intervalle court)"},
    "rn.rec":{ref:"thrPace",lo:1.28,hi:1.4,hr:"z1",fb:"récup très lent"},
    "sw.easy":{ref:"css",lo:1.12,hi:1.12,hr:null,fb:"souple, technique"},
    "sw.aero":{ref:"css",lo:1.06,hi:1.06,hr:null,fb:"endurance régulière"},
    "sw.css":{ref:"css",lo:1.0,hi:1.0,hr:null,fb:"allure seuil (test 400m)"},
    "sw.speed":{ref:"css",lo:.94,hi:.94,hr:null,fb:"rapide mais contrôlé"}
  };
  const _fk=s=>Math.floor(s/60)+"'"+String(Math.round(s%60)).padStart(2,"0");
  const baseRefs={ftp:(a.ftp_known==="oui")?(parseInt(a.ftp)||0):0,
                  thrPace:(a.pace_known==="oui")?(rz.thrRaw||0):0,
                  css:(a.css_known==="oui")?(sz.cssRaw||0):0};
  const _tests=Array.isArray(a.tests)?a.tests:[];
  function refsAt(date){
    const r={ftp:baseRefs.ftp,thrPace:baseRefs.thrPace,css:baseRefs.css};
    if(_tests.length){const pick=t=>_tests.filter(x=>x.type===t&&(!date||!x.date||x.date<=date)).sort((p,q)=>(p.date<q.date?1:-1))[0];
      const f=pick("ftp");if(f)r.ftp=+f.value; const tp=pick("thrPace");if(tp)r.thrPace=+tp.value; const cs=pick("css");if(cs)r.css=+cs.value;}
    return r;
  }
  function fmtInt(key,refs){
    const d=ZDEF[key]; if(!d)return key||"";
    if(d.ref==="ftp"&&refs.ftp)return Math.round(refs.ftp*d.lo)+"-"+Math.round(refs.ftp*d.hi)+"W";
    if(d.ref==="thrPace"&&refs.thrPace)return _fk(refs.thrPace*d.lo)+"-"+_fk(refs.thrPace*d.hi)+"/km";
    if(d.ref==="css"&&refs.css)return (d.lo===d.hi?_fk(refs.css*d.lo):_fk(refs.css*d.lo)+"-"+_fk(refs.css*d.hi))+"/100m";
    if(d.hr&&hz[d.hr])return hz[d.hr];
    return d.fb;
  }
  const intOf=key=>{const d=ZDEF[key];return d?{ref:d.ref,lo:d.lo,hi:d.hi}:null;};
  // Minutes d'un step (nage : mètres via CSS de base ; km course/vélo via allure seuil de base).
  function stepMin(st,disc){
    const reps=st.reps||1;
    if(st.durationMin)return reps*st.durationMin;
    if(st.distanceM){const d=st.d||disc;
      if(d==="sw")return reps*st.distanceM/100*(baseRefs.css||130)/60;
      return reps*st.distanceM/1000*(baseRefs.thrPace||330)/60;}
    return 0;
  }
  // Rendu FR — DERNIÈRE étape, lecture seule. Fixe warmup/cooldown (plafonnés ≤ corps, ≤25min
  // pour l'échauffement chiffré — C13), n'expose le scaling QUE sur les steps role=body.
  function renderSess(s,refs){
    const bodies=s.steps.filter(x=>x.role==="body");
    let bodyMin=0; bodies.forEach(b=>{b._min=stepMin(b,s.d);bodyMin+=b._min;});
    const seg=[];
    if(s.brick){ // vélo+CAP : deux legs body, rendu dédié
      const bk=bodies.find(b=>b.leg==="bike"),rn=bodies.find(b=>b.leg==="run");
      seg.push(bk.durationMin+"min vélo @ "+fmtInt(bk.zone,refs)+", échauffement progressif inclus, puis transition rapide + "+rn.durationMin+"min CAP"+(s.runInj?" souple, surface souple":" @ allure cible"));
    } else {
      const w=s.steps.find(x=>x.role==="warmup");
      if(w){ if(w.durationMin!=null){const wm=Math.min(w.durationMin,25,Math.max(3,Math.round(bodyMin)||w.durationMin));w._min=wm;seg.push("Échauffement "+wm+"min"+(w.text?" "+w.text:""));}
             else if(w.distanceM!=null){w._min=stepMin(w,s.d);seg.push("Échauffement "+w.distanceM+"m"+(w.text?" "+w.text:""));} }
      bodies.forEach(b=>{
        let str=(b.prefix||"");
        const reps=b.reps||1; if(reps>1)str+=reps+"×";
        if(b.durationMin!=null)str+=b.durationMin+"min";
        else if(b.distanceM!=null)str+=(b.unitKm?(b.distanceM/1000):b.distanceM)+(b.unitKm?"km":"m");
        if(b.zone)str+=" @ "+fmtInt(b.zone,refs);
        str+=(b.suffix||"");
        if(b.recoveryText)str+=" (récup "+b.recoveryText+" entre les blocs)";
        seg.push(str);
      });
      const c=s.steps.find(x=>x.role==="cooldown");
      if(c){ if(c.durationMin!=null){c._min=c.durationMin;seg.push("Retour au calme "+c.durationMin+"min"+(c.text?" "+c.text:""));}
             else if(c.distanceM!=null){c._min=stepMin(c,s.d);seg.push("Retour au calme "+c.distanceM+"m"+(c.text?" "+c.text:""));} }
    }
    let det=seg.join(" · ");
    if(s.plainBody&&!s.steps.some(x=>x.role==="warmup")&&bodies.length===1){det=seg.join(" · ");} // corps seul
    if(s.note)det+=" — 💡 "+s.note;
    s.min=s.steps.reduce((t,x)=>t+(x._min||0),0);
    s.det=det;
    return det;
  }
  function sess(slot,phase,prog){
    prog=prog||0;
    const S2=[];
    const lvl=a.level||"inter", comp=a.intent==="competition", finisher=a.intent==="finir";
    const _injImpactG=(a.injury||"").split(",").some(x=>["tibia","genou","pied","hanche","course"].includes(x));
    const _plioOK=(lvl!=="debutant")&&!finisher&&!_injImpactG;
    const G=phase==="base"?"+ 4-6 strides 15s":phase==="dev"?"+ gammes (genoux, talons-fesses)":(phase==="spec"||phase==="peak")?(_plioOK?"+ foulées bondissantes + strides":"+ gammes + strides (sans sauts)"):"";
    const P=(lo,hi)=>Math.max(1,Math.round((lo+(hi-lo)*prog)*sessionScale));
    // builders de steps
    const W=(min,txt)=>({role:"warmup",durationMin:min,text:txt||""});
    const Wm=(dist,txt)=>({role:"warmup",distanceM:dist,text:txt||""});
    const C=(min,txt)=>({role:"cooldown",durationMin:min,text:txt||""});
    const Cm=(dist,txt)=>({role:"cooldown",distanceM:dist,text:txt||""});
    const B=(reps,dur,zone,recTxt,sfx)=>({role:"body",reps:reps,durationMin:dur,zone:zone,intensity:intOf(zone),recoveryText:recTxt||"",suffix:sfx||"",prefix:""});
    const Bd=(reps,dist,zone,recTxt,sfx,unitKm,disc)=>({role:"body",reps:reps,distanceM:dist,unitKm:!!unitKm,zone:zone,intensity:intOf(zone),recoveryText:recTxt||"",suffix:sfx||"",prefix:"",d:disc});
    if(sp==="run"){
      const injImp=(a.injury||"").split(",").some(x=>["tibia","genou","pied","hanche"].includes(x));
      if(slot==="dur1"){
        if(finisher||lvl==="debutant"){
          S2.push({d:"rn",name:"Seuil doux",note:"Le seuil doit rester «confortablement difficile» : tu peux dire quelques mots, pas tenir une conversation. Si ça pique, ralentis.",steps:[W(15,"footing très facile + 3 lignes droites"),B(P(2,4),P(6,10),"rn.thr","2-3min trot très lent",injImp?" sur surface souple":""),C(10,"footing facile")]});
        } else if(phase==="base"){ S2.push({d:"rn",name:"Seuil progressif",note:"Allure soutenue mais maîtrisée, régulière du 1er au dernier bloc.",steps:[W(15,"footing + 4 lignes droites"),B(P(3,4),P(6,10),"rn.thr","2min trot"),C(10,"footing")]}); }
        else if(phase==="spec"||phase==="peak"){ S2.push({d:"rn",name:"Allure course spécifique",note:"C'est l'allure de ta course : mémorise la sensation, elle doit devenir automatique le jour J.",steps:[W(18,"progressif + gammes"),Bd(P(3,5),(fmt==="5k"||fmt==="10k")?1000:2000,(fmt==="marathon")?"rn.mara":"rn.thr","2-3min récup active","",!(fmt==="5k"||fmt==="10k"),"rn"),C(10,"retour au calme")]}); }
        else { S2.push({d:"rn",name:"VO2max",note:"Effort maximal soutenable 3min. La récup complète entre les blocs est essentielle pour tenir l'intensité.",steps:[W(20,"progressif + 4 lignes droites"),B(P(5,8),3,"rn.vo2","2min30 trot"),C(10,"footing très facile")]}); }
      }
      else if(slot==="dur2"){ S2.push({d:"rn",name:phase==="base"?"Endurance soutenue":"Allure spécifique",note:"Allure tenue et continue, sans à-coups.",steps:[W(15,"footing facile"),B(1,P(20,45),(fmt==="marathon"||fmt==="trail")?"rn.mara":"rn.thr"),C(8,"retour au calme "+G)]}); }
      else if(slot==="durLong"){
        const durCaps={"5k":{lo:40,hi:74},"10k":{lo:50,hi:90},semi:{lo:70,hi:130},marathon:{lo:90,hi:180},trail:{lo:120,hi:255}}[fmt]||{lo:60,hi:110};
        const durMin=P(durCaps.lo,durCaps.hi);
        S2.push({d:"rn",long:true,name:"Sortie longue",plainBody:true,note:beginner?"Cours lentement, vraiment : tu dois pouvoir parler tout du long. Marche si besoin, c'est OK.":"Allure d'endurance, jamais forcée. La longue construit l'endurance de base.",steps:[B(1,durMin,"rn.easy","",((phase==="spec"||phase==="peak")&&!finisher&&!medHold)?", derniers 15-20min @ allure cible":"")]});
      }
      else if(slot==="facileR")S2.push({d:"rn",name:"Footing facile",plainBody:true,note:beginner?"allure de conversation, sans forcer":"",steps:[B(1,P(30,50),"rn.easy","",(G&&!injImp)?" · termine par "+G.replace("+ ",""):"")]});
      else if(slot==="facile2")S2.push({d:"rn",name:"Footing récup",plainBody:true,steps:[B(1,P(20,30),"rn.rec")]});
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / mobilité",det:"marche, étirements",steps:[]});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total",steps:[]});
    } else if(sp==="bike"){
      const clm=a.format==="clm", climb=a.terrain==="montagne"||a.terrain==="vallonne";
      if(slot==="dur1"){
        if(phase==="base")S2.push({d:"bk",name:"Sweetspot",note:"Effort soutenu mais maîtrisé, cadence 85-95 rpm. Tu dois pouvoir finir chaque bloc sans t'effondrer.",steps:[W(15,"montée progressive"),B(P(2,3),P(12,20),"bk.ss","5min souple"),C(10,"décrassage")]});
        else if(clm&&(phase==="spec"||phase==="peak"))S2.push({d:"bk",name:"Spécifique CLM (position)",note:"Travaille la tenue de position autant que la puissance : c'est elle qui te fera gagner du temps.",steps:[W(20,"progressif en position normale"),B(P(2,3),P(15,25),"bk.thr","5min souple, redresse-toi"," en position aéro tenue"),C(10,"décrassage")]});
        else if(phase==="spec"||phase==="peak")S2.push({d:"bk",name:"Seuil / race-pace",note:"Allure de course soutenable ~1h. Régularité avant tout.",steps:[W(15,"progressif"),B(P(2,4),P(10,20),"bk.thr","5min souple"),C(10,"décrassage")]});
        else if(lvl==="debutant"||finisher)S2.push({d:"bk",name:"Tempo progressif",note:"Effort confortablement soutenu, sans jamais te mettre dans le rouge.",steps:[W(15,"souple"),B(P(2,3),P(8,15),"bk.ss","4min très souple"),C(10,"décrassage")]});
        else S2.push({d:"bk",name:"VO2max",note:"Intensité maximale tenable 4min. La récup longue permet de répéter la qualité.",steps:[W(20,"progressif + 3 sprints courts"),B(P(4,6),4,"bk.vo2","4min"),C(10,"souple")]});
      }
      else if(slot==="dur2")S2.push({d:"bk",name:climb?"Force en côte":"Force basse cadence",note:"Gros braquet, cadence basse, mais sans forcer sur les genoux : c'est musculaire, pas cardio.",steps:[W(15,"+ montée en intensité"),B(P(4,6),5,"bk.frc","3min souple ou en redescendant"," à 50-60 rpm"+(climb?" en côte":"")),C(10,"moulinage léger")]});
      else if(slot==="durLong"){
        const durCaps={crit:{lo:60,hi:150},route:{lo:90,hi:180},clm:{lo:75,hi:165},cyclo:{lo:120,hi:240},gravel:{lo:150,hi:360}}[fmt]||{lo:90,hi:210};
        S2.push({d:"bk",long:true,name:"Sortie longue",plainBody:true,steps:[B(1,P(durCaps.lo,durCaps.hi),"bk.z2","",((fmt==="cyclo"||fmt==="gravel")?" · endurance":""))]});
      }
      else if(slot==="facileR")S2.push({d:"bk",name:"Endurance facile",plainBody:true,steps:[B(1,P(45,90),"bk.z2")]});
      else if(slot==="facile2")S2.push({d:"bk",name:"Récup active",plainBody:true,steps:[B(1,P(30,45),null,""," très souple")]});
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / gainage",det:"mobilité",steps:[]});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total",steps:[]});
    } else if(sp==="swim"){
      const shoulder=(a.injury||"").includes("epaule"), ow=a.milieu==="ow"||a.milieu==="mixte";
      if(slot==="dur1"){
        if(beginner)S2.push({d:"sw",name:"Technique + éducatifs",note:"La technique se construit à froid, sans fatigue. Qualité > quantité.",steps:[Wm(200,"souple"),Bd(P(6,10),50,"sw.easy","repos libre entre séries"," éducatifs variés (rattrapé, poings fermés, battements planche), "+P(1,2)+" point(s) technique",false,"sw"),Cm(100,"relâché")]});
        else if(shoulder)S2.push({d:"sw",name:"Seuil contrôlé (épaule)",note:"Volume modéré, technique soignée : on épargne l'épaule, on ne cherche pas la performance brute.",steps:[Wm(300,"souple + 4×50m éducatifs"),Bd(P(6,8),100,"sw.css","20-30s","",false,"sw"),Cm(200,"souple")]});
        else S2.push({d:"sw",name:"Seuil CSS",note:"Allure régulière sur tous les 100m. Le dernier doit ressembler au premier.",steps:[Wm(400,"progressif + 4×50m éducatifs"),Bd(P(6,10),100,"sw.css","15-20s","",false,"sw"),Cm(200,"souple")]});
      }
      else if(slot==="dur2"){
        if(beginner)S2.push({d:"sw",name:"Endurance technique",note:"Priorité au geste, pas au chrono. Un seul point technique à la fois.",steps:[Wm(200,"souple"),Bd(1,600,"sw.easy","20-30s, le temps de respirer"," nage continue fractionnée (ex 8-12×50m) + 1 éducatif entre chaque",false,"sw"),Cm(100,"très souple")]});
        else if(shoulder)S2.push({d:"sw",name:"Jambes + technique",plainBody:true,steps:[Bd(1,400,null,""," séries battements + éducatifs · épargne épaule",false,"sw")]});
        else S2.push({d:"sw",name:"Vitesse",note:"Vitesse contrôlée et technique : la fréquence ne doit pas casser ta nage.",steps:[Wm(400,"varié + 4×25m accélérations"),Bd(P(8,12),50,"sw.speed","30-40s","",false,"sw"),Cm(200,"souple")]});
      }
      else if(slot==="durLong"){
        const distCaps = beginner
          ? {lo:300,hi:850}
          : ({sprint:{lo:600,hi:1400},demifond:{lo:1000,hi:2000},fond:{lo:1500,hi:3000},ow:{lo:1500,hi:4500}}[fmt]||{lo:1000,hi:2000});
        S2.push({d:"sw",long:true,name:ow?"Volume + sighting":(beginner?"Volume aérobie":"Longue continue"),plainBody:true,
          steps:[Bd(1,P(distCaps.lo,distCaps.hi),"sw.aero","",(ow?" · navigation aux repères":"")+(beginner?" · fractionne en blocs de 100-200m si besoin, la continuité prime sur l'allure":""),false,"sw")]});
      }
      else if(slot==="facileR"){
        const techDistCaps=beginner?{lo:200,hi:600}:{lo:400,hi:1000};
        if(ow&&a.swim_limit==="peur")S2.push({d:"sw",name:"Aisance eau libre",det:"familiarisation, respiration, flottaison",steps:[]});
        else S2.push({d:"sw",name:"Technique souple",plainBody:true,steps:[Bd(1,P(techDistCaps.lo,techDistCaps.hi),"sw.easy",""," éducatifs",false,"sw")]});
      }
      else if(slot==="facile2"){
        const recDistCaps=beginner?{lo:100,hi:400}:{lo:200,hi:600};
        S2.push({d:"sw",name:"Récup eau",plainBody:true,steps:[Bd(1,P(recDistCaps.lo,recDistCaps.hi),"sw.easy",""," souple",false,"sw")]});
      }
      else if(slot==="recup")S2.push({d:"rs",name:"Repos / épaules",det:"étirements coiffe",steps:[]});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total",steps:[]});
    } else if(sp==="tri"){
      const runInj=(a.injury||"").includes("course");
      const PB={base:[0.35,0.55],dev:[0.55,0.75],spec:[0.75,0.9],peak:[0.9,1],taper:[0.35,0.45]}[phase]||[0.5,0.8];
      const PT=(lo,hi)=>Math.max(1,Math.round((lo+(hi-lo)*(PB[0]+(PB[1]-PB[0])*prog))*sessionScale));
      const swimDistCaps={S:{lo:300,hi:750},M:{lo:600,hi:1500},"70.3":{lo:950,hi:1900},Full:{lo:1600,hi:3000}}[fmt]||{lo:600,hi:1500};
      const swimDist=PT(swimDistCaps.lo,swimDistCaps.hi);
      const swShortDist=Math.min(600,Math.max(200,Math.round(swimDist*0.4/50)*50));
      const swTechDist=Math.max(300,Math.round(swimDist*0.5/50)*50);
      const swMain=beginner
        ?{name:"Nage technique (+dist)",note:"Technique à froid : qualité du geste avant tout, distance progressive.",steps:[Wm(200,"souple"),Bd(1,swimDist,"sw.aero","repos libre entre séries",", fractionné en séries courtes souples, éducatifs entre",false,"sw"),Cm(100,"relâché")]}
        :{name:"Nage seuil (+dist)",note:"Distance cible atteinte, allure régulière. Fractionné = réponse à intensité.",steps:[Wm(300,"+ 4×50m éducatifs"),Bd(1,swimDist,"sw.css","15-20s",", fractionné en séries régulières si besoin",false,"sw"),Cm(200,"souple")]};
      const swTech=beginner
        ?{name:"Nage éducatifs",note:"Zéro chrono ici : uniquement le geste. Alterne les éducatifs, ne les enchaîne pas en force.",steps:[Wm(100,"souple"),Bd(1,swTechDist,"sw.easy","20-30s",", éducatifs variés (rattrapé, poings fermés, battements planche) par 50m, 1 point technique à la fois",false,"sw"),Cm(100,"dos souple")]}
        :{name:"Nage vitesse",note:"Fréquence et vitesse contrôlées : la technique ne doit pas se dégrader sur les derniers 50m.",steps:[Wm(200,"+ 4×25m accélérations progressives"),Bd(1,swTechDist,"sw.aero","30-40s sur les 50m rapides",", dont la moitié en accélérations de 50m @ "+sz.speed,false,"sw"),Cm(150,"souple")]};
      const swShort={name:"Nage récup",plainBody:true,steps:[Bd(1,swShortDist,"sw.easy",""," souple, en blocs de 50m, respiration 3 temps · relâchement total",false,"sw")]};
      if(slot==="dur1"){ if(dbl)S2.push({d:"sw",name:swMain.name+" (matin)",note:swMain.note,steps:swMain.steps});
        if(phase==="base")S2.push({d:"bk",name:"Sweetspot vélo",note:"Cadence 85-95 rpm, soutenu mais maîtrisé.",steps:[W(15,"montée progressive"),B(PT(2,3),PT(12,18),"bk.ss","5min souple"),C(10,"décrassage")]});
        else if(phase==="spec"||phase==="peak"){const rpCaps={S:{lo:20,hi:40},M:{lo:22,hi:45},"70.3":{lo:25,hi:55},Full:{lo:30,hi:60}}[fmt]||{lo:20,hi:40};
          S2.push({d:"bk",name:"Race-pace vélo",note:"L'allure que tu tiendras le jour J. Mémorise-la.",steps:[W(15,"progressif"),B(PT(2,3),PT(rpCaps.lo,rpCaps.hi),"bk.rp","5min souple"),C(10,"décrassage")]});}
        else if(phase==="taper")S2.push({d:"bk",name:"Rappel race-pace",note:"Affûtage : on réveille l'allure course sans générer de fatigue. Court et précis.",steps:[W(10,"progressif"),B(PT(2,3),PT(6,10),"bk.rp","3min souple"),C(5,"décrassage")]});
        else if(lvl==="debutant"||finisher)S2.push({d:"bk",name:"Tempo vélo",note:"Confortablement soutenu, jamais dans le rouge.",steps:[W(15,"souple"),B(PT(2,3),PT(8,15),"bk.ss","4min souple"),C(10,"décrassage")]});
        else S2.push({d:"bk",name:"VO2max vélo",note:"Intensité max tenable 4min, récup quasi complète entre.",steps:[W(20,"progressif + 3 sprints"),B(PT(4,6),4,"bk.vo2","4min récup"),C(10,"souple")]}); }
      else if(slot==="dur2"){ if(dbl)S2.push({d:"sw",name:swTech.name,note:swTech.note,steps:swTech.steps}); S2.push({d:"bk",name:"Force basse cadence",note:"Gros braquet, cadence basse : musculaire, pas cardio. Sans forcer sur les genoux.",steps:[W(15,"+ montée en intensité"),B(PT(4,6),({S:5,M:5,"70.3":6,Full:7}[fmt]||5),"bk.frc","3min souple"," à 50-60 rpm"),C(10,"moulinage")]}); }
      else if(slot==="durLong"){
        if(phase==="spec"||phase==="peak"){
          const brickBikeCaps={S:{lo:45,hi:90},M:{lo:60,hi:120},"70.3":{lo:90,hi:180},Full:{lo:150,hi:300}}[fmt]||{lo:60,hi:180};
          const brickRunCaps={S:{lo:10,hi:20},M:{lo:12,hi:24},"70.3":{lo:16,hi:32},Full:{lo:35,hi:70}}[fmt]||{lo:15,hi:30};
          S2.push({d:"br",long:true,brick:true,runInj:runInj,name:"Brick vélo+CAP",note:"Le brick simule la course : enchaîne vite vélo→course pour habituer tes jambes à la sensation «de coton» du début de CAP.",steps:[{role:"body",leg:"bike",durationMin:PT(brickBikeCaps.lo,brickBikeCaps.hi),zone:"bk.rp",intensity:intOf("bk.rp")},{role:"body",leg:"run",durationMin:PT(brickRunCaps.lo,brickRunCaps.hi),d:"rn"}]});
        } else {
          const longRunCaps={S:{lo:30,hi:60},M:{lo:40,hi:75},"70.3":{lo:50,hi:100},Full:{lo:60,hi:140}}[fmt]||{lo:50,hi:100};
          S2.push({d:"rn",long:true,name:"Sortie longue CAP",plainBody:true,note:"Endurance fondamentale, allure facile et conversationnelle.",steps:[B(1,PT(longRunCaps.lo,longRunCaps.hi),"rn.easy","",runInj?" sur surface souple":"")]});
        } }
      else if(slot==="facileR"){const ftCaps={S:{lo:25,hi:45},M:{lo:15,hi:26},"70.3":{lo:14,hi:22},Full:{lo:50,hi:100}}[fmt]||{lo:25,hi:45};
        S2.push({d:"rn",name:"Footing facile",plainBody:true,steps:[B(1,PT(ftCaps.lo,ftCaps.hi),"rn.easy","",runInj?" · surface souple":"")]});}
      else if(slot==="facile2")S2.push({d:"sw",name:swShort.name+" courte",plainBody:true,steps:swShort.steps});
      else if(slot==="recup")S2.push({d:"rs",name:"Récup active",det:"mobilité",steps:[]});
      else if(slot==="off")S2.push({d:"rs",name:"OFF",det:"repos total",steps:[]});
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
    const av=availMap[jn];let social=null;
    if(av){
      if(av.status==="blocked"){ch="off";sl="off";forced=true;}
      else if(typeof av.status==="string"&&av.status.indexOf("social")===0){
        const hard=/seuil|vo2|intens|dur/i.test(av.load||"");
        ch=hard?"dur":"facile";sl="social";forced=true;
        social={durationMin:parseInt(av.durationMin)||60,load:av.load||"z2",disc:av.status.replace("social-","")};
      }
    }
    days.push({week:w+1,jour:jn,cyc,jc:dic+1,charge:ch,slot:sl,forced,social,wasHard:(ch==="dur"&&forced),isR,phaseId:ph.id,phase:ph});dic++;
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
  // medHold : convertir les jours d'intensité (dur1/dur2) en jours faciles avant génération.
  // La sortie longue (durLong, endurance) est conservée ; on retire vo2max/seuil/vitesse.
  if(medHold)days.forEach(d=>{
    // Tri : le durLong = brick à allure course (intensité) → aussi converti. Run/bike/swim :
    // le durLong est de l'endurance pure (sortie longue), conservé.
    const stripLong=(sp==="tri");
    if(d.charge==="dur"&&(d.slot==="dur1"||d.slot==="dur2"||(stripLong&&d.slot==="durLong"))){d.charge="facile";d.slot=(sp==="run")?"facile2":"facileR";}
  });
  // Date absolue par jour (R3.1/R3.8) : le plan se termine à la date de course (ou à
  // aujourd'hui + durée). Chaque séance se rend avec la référence datée valide à sa date.
  const _MS=864e5;
  const _end=a.race_date?new Date(a.race_date+"T00:00:00Z"):new Date(Date.now()+(totalDays-1)*_MS);
  const _iso=t=>new Date(t).toISOString().slice(0,10);
  days.forEach((d,i)=>{
    const ph=d.phase; const prog=ph.weeks>1?((d.week-1)-ph.start)/(ph.weeks-1):0.5;
    d.prog=Math.max(0,Math.min(1,prog));
    d.date=_iso(_end.getTime()-(totalDays-1-i)*_MS);
    d.sessions=sess(d.slot,d.phaseId,d.prog);
    const refs=refsAt(d.date);
    if(d.social){ // R3.9 — créneau club : séance à durée FIXE (jamais scalée), comptée au volume
      const disc=d.social.disc==="run"?"rn":d.social.disc==="swim"?"sw":"bk";
      const zone=disc==="bk"?(/seuil/i.test(d.social.load)?"bk.thr":"bk.z2"):disc==="rn"?(/seuil/i.test(d.social.load)?"rn.thr":"rn.easy"):"sw.easy";
      const nm={bk:"Sortie club vélo",rn:"Sortie club course",sw:"Créneau club nage"}[disc];
      const so={d:disc,name:nm,social:true,note:"Créneau imposé (club) — décompté du budget de la semaine.",steps:[{role:"body",durationMin:disc==="sw"?null:d.social.durationMin,distanceM:disc==="sw"?Math.round(d.social.durationMin*100/(baseRefs.css||130)*60):null,zone:zone,intensity:intOf(zone),d:disc}]};
      renderSess(so,refs);d.sessions=[so];
    } else d.sessions.forEach(s=>{if(s.steps&&s.steps.length)renderSess(s,refs);else if(s.min==null)s.min=(s.d==="rs")?0:0;});
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
  // Le nombre de jours actifs par semaine ne doit JAMAIS dépasser budgetPerWeek —
  // y compris les semaines de récup (elles ont beaucoup de jours faciles). On retire
  // d'abord les faciles, puis les durs non-signature, puis en dernier recours n'importe
  // quel jour non forcé (le durLong/signature est retiré en tout dernier).
  const toOff=d=>{d.charge="off";d.slot="off";d.sessions=[{d:"rs",name:"OFF (budget séances)",det:"repos — respect de ta disponibilité déclarée"}];};
  for(let w=1;w<=weeks;w++){
    const wd=days.filter(d=>d.week===w);
    const activeNow=()=>wd.filter(d=>d.charge!=="off"&&d.charge!=="recup");
    let over=activeNow().length-budgetPerWeek;
    if(over<=0)continue;
    const fac=activeNow().filter(d=>d.charge==="facile"&&!d.forced);
    for(let i=fac.length-1;i>=0&&over>0;i--){toOff(fac[i]);over--;}
    if(over>0){const durs=activeNow().filter(d=>d.charge==="dur"&&!d.forced&&d.slot!=="durLong");
      for(let i=durs.length-1;i>=0&&over>0;i--){toOff(durs[i]);over--;}}
    if(over>0){const any=activeNow().filter(d=>!d.forced);
      for(let i=any.length-1;i>=0&&over>0;i--){toOff(any[i]);over--;}}
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

  // ===== R3.2 — VOLUME PAR SOMMATION DES CHAMPS (plus aucun reparse de texte) =====
  const weekMin=wd=>wd.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+(s.min||0),0),0);
  const renderWeek=wd=>wd.forEach(d=>{const refs=refsAt(d.date);d.sessions.forEach(s=>{if(s.steps&&s.steps.length)renderSess(s,refs);else if(s.min==null)s.min=0;});});
  // ===== R3.4b — planchers ET plafonds de séance (symétriques), par type et par format =====
  const CAP_BRICK={S:90,M:120,"70.3":180,Full:300};
  const CAP_SWIM={sprint:1400,demifond:2000,fond:3000,ow:4500,S:750,M:1500,"70.3":1900,Full:3000};
  const CAP_LONG={"5k":74,"10k":90,semi:130,marathon:180,trail:255,crit:150,route:180,clm:165,cyclo:240,gravel:360};
  function blockBounds(b,s){
    if(s.brick){if(b.leg==="bike")return{floor:32,cap:CAP_BRICK[fmt]||300};return{floor:8,cap:9999};}
    if(s.long){
      if(s.d==="sw")return{floor:820,cap:CAP_SWIM[fmt]||4500};
      if(s.d==="rn")return{floor:30,cap:CAP_LONG[fmt]||9999};
      if(s.d==="bk")return{floor:35,cap:CAP_LONG[fmt]||9999};
    }
    if(b.distanceM!=null)return{floor:100,cap:9999};
    return{floor:3,cap:9999};
  }
  // R3.4b — le scaling ne touche QUE les steps role=body, borné [floor,cap]. Les blocs
  // d'intervalle ajustent le NOMBRE de reps (durée de bloc quasi fixe) ; les blocs uniques
  // ajustent leur durée/distance. warmup/cooldown ne scalent jamais (rendus ≤ corps).
  function scaleBlock(b,f,s){
    if(b.role!=="body")return;
    const bd=blockBounds(b,s);
    if(b.distanceM!=null){
      if((b.reps||1)>1){const tot=(b.reps)*b.distanceM*f;b.reps=Math.max(1,Math.min(15,Math.round(tot/b.distanceM)));}
      else b.distanceM=Math.max(bd.floor,Math.min(bd.cap,Math.round(b.distanceM*f/25)*25));
    } else if(b.durationMin!=null){
      if((b.reps||1)>1){const tot=b.reps*b.durationMin*f;b.durationMin=Math.max(bd.floor,Math.min(bd.cap,b.durationMin));b.reps=Math.max(1,Math.min(15,Math.round(tot/b.durationMin)));}
      else b.durationMin=Math.max(bd.floor,Math.min(bd.cap,Math.round(b.durationMin*f)));
    }
  }
  const scaleWeekBody=(wd,f)=>wd.forEach(d=>d.sessions.forEach(s=>{if(s.social)return;if(s.steps)s.steps.forEach(b=>scaleBlock(b,f,s));}));
  const clampWeekBody=wd=>scaleWeekBody(wd,1); // applique planchers/plafonds sans scaler
  // Courbe de charge normalisée (globale) : rampe base→peak, pic large (≥2 sem ≥0.9×pic),
  // taper strictement décroissant. Elle PILOTE le budget de chaque semaine (R3.3).
  const bands={base:[0.50,0.68],dev:[0.68,0.92],spec:[0.94,1.0],peak:[1.0,1.0],taper:[0.55,0.30]};
  const Lval=(id,prog)=>{const b=bands[id]||[0.6,0.9];return b[0]+(b[1]-b[0])*Math.max(0,Math.min(1,prog));};
  const theoPeak=Math.min(parseInt(a.vol_max||"10"),caps,util)*marg*recupFactor;
  const capH=parseInt(a.vol_max||"10");           // plafond dur = vol_max (C3)
  const medFactor=medHold?0.4:1;                   // plan de maintien médical : pic allégé
  const peakH=Math.min(theoPeak,capH)*medFactor;
  const wl=[];
  for(let w=0;w<weeks;w++){
    const ph=phases.find(p=>w>=p.start&&w<p.end)||phases[4];
    const prog=ph.weeks>1?(w-ph.start)/(ph.weeks-1):(ph.id==="taper"?0.5:1);
    const wd=days.filter(d=>d.week===w+1);
    const isRW=wd.filter(d=>d.isR).length>=4;
    let targetH=Lval(ph.id,prog)*peakH;
    if(isRW)targetH*=0.62;
    targetH=Math.min(targetH,capH);               // jamais > vol_max
    // R3.3 — ajuster le CORPS des séances à la cible de la courbe (itératif : warmup/cooldown
    // suivent le corps au rendu, donc quelques passes convergent).
    for(let it=0;it<5;it++){
      renderWeek(wd);
      const cur=weekMin(wd)/60;
      if(cur<=0||targetH<=0)break;
      const f=targetH/cur;
      if(f>0.99&&f<1.01)break;
      scaleWeekBody(wd,f);
    }
    clampWeekBody(wd); renderWeek(wd);           // planchers (C8) + plafonds (C12) garantis
    // Plafond dur vol_max (C3) : si les planchers longue débordent, réduire le corps non-longue.
    for(let g=0;g<3;g++){
      const vh=weekMin(wd)/60; if(vh<=capH*1.03)break;
      const longH=wd.reduce((t,d)=>t+d.sessions.reduce((u,s)=>u+((s.long&&s.d!=="rs")?(s.min||0):0),0),0)/60;
      const nlH=vh-longH, room=Math.max(0,capH*1.0-longH);
      if(nlH<=0)break;
      wd.forEach(d=>d.sessions.forEach(s=>{if(s.long||s.social||!s.steps)return;s.steps.forEach(b=>scaleBlock(b,room/nlH,s));}));
      renderWeek(wd);
    }
    const volReal=Math.round(weekMin(wd)/60*10)/10;
    wl.push({num:w+1,phase:ph,vol:volReal,vol_declared:Math.round(targetH*10)/10,vol_real:volReal,days:wd,isRecup:isRW});
  }
  // volPeak = pic réel des semaines de charge (cohérent avec le contenu généré — C6).
  {const chargeW=wl.filter(w=>!w.isRecup);if(chargeW.length)volPeak=Math.max(...chargeW.map(w=>w.vol));}
  volBase=Math.round(volPeak*0.58*10)/10;
  // R3 — les 4 passes de rescaling concurrentes sont SUPPRIMÉES : la courbe pilote chaque
  // semaine par construction, le volume est une somme de champs, le rendu FR est la dernière
  // étape (aucune regex ne touche un nombre après génération).
  return {weeks:wl,phases,volPeak,volBase,use10,totalWeeks:weeks};
}

// ===== R3.10 — protocoles de test terrain (4 fonctions pures) =====
// Chaque protocole renvoie une entrée { type, value, date, source } prête pour a.tests
// (R3.8). Aucune ne dépend du moteur : calculs isolés, testables un par un.
const fieldTests={
  // CSS nage : 400m TT (t400) puis 50m TT (t50), en secondes → allure seuil sec/100m.
  css:(t400,t50,date)=>{const mps=350/(t400-t50);return{type:"css",value:Math.round(100/mps),date:date||null,source:"400m TT − 50m TT"};},
  // Vitesse critique course : 3min max (d3) et 10min max (d10) en mètres → allure sec/km.
  cs:(d3,d10,date)=>{const mps=(d10-d3)/420;return{type:"thrPace",value:Math.round(1000/mps),date:date||null,source:"3min max / 10min max"};},
  // VMA : distance en 6min (d6) en mètres → km/h (demi-Cooper).
  vma:(d6,date)=>({type:"vma",value:Math.round(d6/100*10)/10,date:date||null,source:"6min max (demi-Cooper)"}),
  // FTP : puissance moyenne sur 20min (p20) en W → FTP = 0.95 × P20.
  ftp:(p20,date)=>({type:"ftp",value:Math.round(0.95*p20),date:date||null,source:"20min TT"})
};
// ===== §11 — contrat de sortie : plan en JSON structuré, indépendant du rendu HTML =====
function planToJSON(a){
  const p=buildPlan(a);
  return {
    meta:{sport:a.sport,format:a.format,raceDate:a.race_date||null,volPeak:p.volPeak,volBase:p.volBase,totalWeeks:p.totalWeeks},
    tests:Array.isArray(a.tests)?a.tests:[],
    weeks:p.weeks.map(w=>({num:w.num,phase:w.phase.id,isRecup:w.isRecup,targetMin:Math.round((w.vol_declared||w.vol)*60),
      days:w.days.map(d=>({date:d.date,sessions:d.sessions.filter(s=>s.d!=="rs").map(s=>({
        d:s.d,name:s.name,long:!!s.long,min:Math.round(s.min||0),
        steps:(s.steps||[]).map(st=>({role:st.role,reps:st.reps||1,durationMin:st.durationMin||null,distanceM:st.distanceM||null,intensity:st.intensity||null})),
        det:s.det}))}))}))
  };
}

// Export for Node.js
if(typeof module!=="undefined"&&module.exports){
  module.exports={SPORTS,buildPlan,hrZones,bikeZones,runZones,swimZones,fieldTests,planToJSON};
}
