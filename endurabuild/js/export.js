// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { S, todayISO } from "./state.js";
import { SPORTS } from "./config.js";
import { buildPlan } from "./app.js";

function planToJSON(a){
  const p=buildPlan(a);
  return {
    meta:{sport:a.sport||S.sport,format:a.format,raceDate:a.race_date||null,volPeak:p.volPeak,volBase:p.volBase,totalWeeks:p.totalWeeks},
    tests:Array.isArray(a.tests)?a.tests:[],
    weeks:p.weeks.map(w=>({num:w.num,phase:w.phase.id,isRecup:w.isRecup,targetMin:Math.round((w.vol_declared||w.vol)*60),
      days:w.days.map(d=>({date:d.date,sessions:d.sessions.filter(s=>s.d!=="rs").map(s=>({
        d:s.d,name:s.name,long:!!s.long,min:Math.round(s.min||0),
        steps:(s.steps||[]).map(st=>({role:st.role,reps:st.reps||1,durationMin:st.durationMin||null,distanceM:st.distanceM||null,intensity:st.intensity||null})),
        det:s.det}))}))}))
  };
}
// ===== Suivi de charge : TSS estimé (sans capteur) → CTL/ATL/TSB (fitness/fatigue/forme) =====
// IF (facteur d'intensité) par zone, dérivé des références relatives (ZDEF). TSS d'un bloc =
// durée(h) × IF² × 100. Warmup/cooldown à IF 0.5. Aucune donnée capteur requise.
function _dl(name,mime,content){try{const b=new Blob([content],{type:mime});const u=URL.createObjectURL(b);const el=document.createElement("a");el.href=u;el.download=name;document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}catch(e){alert("Export impossible : "+e.message);}}
function exportJSON(){try{const j=planToJSON(S.answers);_dl("plan-"+(S.sport||"eb")+".json","application/json",JSON.stringify(j,null,2));}catch(e){alert("Export impossible : "+e.message);}}
function exportICS(){try{
  const j=planToJSON(S.answers);
  const esc2=s=>String(s==null?"":s).replace(/([,;\\])/g,"\\$1").replace(/\r?\n/g,"\\n");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//EnduraBuild//FR//","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  // Conformité RFC 5545 (audit v6) — trois défauts corrigés :
  //  1. DTSTAMP était ABSENT (obligatoire ; certains clients rejetaient le fichier entier)
  //  2. UID collisionnable (AAAAMMJJ-index) : deux plans différents à la même date se
  //     REMPLAÇAIENT à l'import — l'UID porte maintenant sport, format et id du plan
  //  3. DTEND == DTSTART sur un événement VALUE=DATE : DTEND est EXCLUSIF, l'événement
  //     avait donc une durée nulle — il vaut désormais J+1
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const planId=String((S.currentPlan&&S.currentPlan.id)||S.activePlanId||"p").replace(/[^A-Za-z0-9]/g,"");
  const tag=(S.sport||"eb")+"-"+String(S.answers.format||"x").replace(/[^A-Za-z0-9.]/g,"")+"-"+planId;
  const nextDay=iso=>{const t=new Date(iso+"T00:00:00Z").getTime()+864e5;return new Date(t).toISOString().slice(0,10).replace(/-/g,"");};
  j.weeks.forEach(w=>w.days.forEach(d=>{if(!d.date)return;const dt=d.date.replace(/-/g,"");
    d.sessions.forEach((s,i)=>{L.push("BEGIN:VEVENT","UID:"+dt+"-"+i+"-"+tag+"@endurabuild","DTSTAMP:"+stamp,"SEQUENCE:0","DTSTART;VALUE=DATE:"+dt,"DTEND;VALUE=DATE:"+nextDay(d.date),"SUMMARY:"+esc2(s.name),"DESCRIPTION:"+esc2(s.det||""),"END:VEVENT");});}));
  L.push("END:VCALENDAR");
  _dl("plan-"+(S.sport||"eb")+".ics","text/calendar;charset=utf-8",L.join("\r\n"));
}catch(e){alert("Export impossible : "+e.message);}}

// ===== R23.4 — LA CARTE DE PARTAGE SE POSE SUR UNE PHOTO =====
//
// Retour du fondateur (06/08/2026) : *« Problème d'affichage du texte, je voudrais que ce soit en
// transparence, qu'on puisse l'ajouter par-dessus une photo, pas un fond coloré, retravaille
// peut-être l'esthétique »*. Trois choses, et la première n'était pas dans la demande.
//
// (1) LE CANVAS DESSINAIT SANS JAMAIS ATTENDRE LES POLICES. `fillText` utilise ce qui est chargé
// À CET INSTANT ; si « Archivo Black » et « Space Grotesk » ne le sont pas encore, le navigateur
// retombe sur sa police système, dont les métriques sont différentes. `document.fonts.ready` est
// désormais attendu, avec un délai de garde — une police qui ne vient pas ne doit pas empêcher
// de partager.
//
// HONNÊTETÉ SUR CE POINT : c'est une correction de JUSTESSE, pas un défaut reproduit. J'ai tenté
// de simuler l'absence de police (retrait de la feuille de style + `document.fonts.clear()`) et
// la mesure est sortie IDENTIQUE au cas normal — retirer un `<link>` ne décharge pas des polices
// déjà chargées. Je ne peux donc pas affirmer que c'était la cause du « problème d'affichage »
// signalé. Ce qui GARANTIT le cadre, quelle que soit la police effectivement utilisée, c'est le
// rétrécissement de `txt()` ci-dessous — lui est mesuré (pixel opaque le plus à droite : 1019
// sur 1080).
//
// (2) LE FOND DEVIENT TRANSPARENT. Le beige `#f1eadb` disparaît, `toBlob` en PNG conserve l'alpha.
//
// (3) ET C'EST (2) QUI FORCE À REVOIR L'ESTHÉTIQUE, pas un choix de goût. Sur un fond inconnu,
// l'encre sombre d'origine (`#0c1016`) est illisible dès que la photo est sombre — et une carte
// qu'on ne peut poser que sur une photo claire n'est pas une carte transparente. Le texte passe
// donc en BLANC avec un halo sombre : c'est la solution des sous-titres vidéo, la seule qui tienne
// sur un fond qu'on ne contrôle pas. Les couleurs de phases et les barres restent telles quelles —
// elles sont saturées, elles se lisent sur clair comme sur sombre.
//
// `txt()` est le point unique du texte : halo, et RÉTRÉCISSEMENT si la ligne dépasse la largeur
// utile. Même sans (1), une chaîne trop longue ne peut plus sortir du cadre.
const _EB_HALO="rgba(0,0,0,.78)";
function _ebTxt(x,s,px,py,{size,weight=500,family="Space Grotesk",color="#fff",max=960,halo=true,center=0}){
  const set=(sz)=>{x.font=weight+" "+sz+"px '"+family+"',sans-serif";};
  let sz=size;set(sz);
  while(sz>12&&x.measureText(s).width>max){sz-=2;set(sz);}
  if(center)px=Math.max(40,center/2-x.measureText(s).width/2); // R24.4 — centrage au point unique
  if(halo){x.save();x.shadowColor=_EB_HALO;x.shadowBlur=Math.max(8,Math.round(sz/3));
    x.fillStyle=color;x.fillText(s,px,py);x.fillText(s,px,py);x.restore();} // deux passes : le halo se densifie
  else{x.fillStyle=color;x.fillText(s,px,py);}
  return sz;
}
/** Les polices de la carte, ou la promesse tenue quand même. Un partage ne doit jamais rester
 *  suspendu parce qu'une police n'arrive pas — on dessine alors avec ce qu'on a. */
async function _ebFontsPretes(ms=1500){
  if(!document.fonts||!document.fonts.ready)return;
  try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,ms))]);}catch(e){}
}

async function exportPNG(){try{
  await _ebFontsPretes();
  const a=S.answers,plan=buildPlan(a),v2=plan._v2||{};
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  // FOND TRANSPARENT : aucun `fillRect` de fond. Le PNG conserve l'alpha.
  _ebTxt(x,"ENDURABUILD",60,140,{size:92,weight:900,family:"Archivo Black"});
  _ebTxt(x,(SPORTS[S.sport]?SPORTS[S.sport].nom:S.sport)+" · "+(a.format||""),60,220,{size:44,weight:700,color:"#ff5c68"});
  _ebTxt(x,plan.totalWeeks+" semaines · "+plan.volBase+"h → "+plan.volPeak+"h",60,290,{size:36});
  let y=360;
  let px=60;(plan.phases||[]).forEach(p=>{const w=(W-120)*p.weeks/plan.totalWeeks;x.fillStyle=p.c;x.fillRect(px,y,Math.max(2,w-4),46);px+=w;});
  _ebTxt(x,"Base → Développement → Spécifique → Peak → Affûtage",60,y+90,{size:28,color:"rgba(255,255,255,.9)"});
  y+=160;
  const mx=Math.max(1,...plan.weeks.map(w=>w.vol));
  const bw=(W-120)/plan.weeks.length;
  plan.weeks.forEach((w,i)=>{const h=Math.max(8,Math.round(w.vol/mx*220));x.fillStyle=w.isRecup?"#9b72ff":(w.phase&&w.phase.c)||"#2e6bff";x.fillRect(60+i*bw,y+240-h,Math.max(2,bw-4),h);});
  y+=300;
  if(globalThis.EBV2&&globalThis.EBV2.predict){try{
    const pr=globalThis.EBV2.predict(S.sport,S.answers,plan);
    if(pr.items.length){_ebTxt(x,"Prédiction de course",60,y,{size:40,weight:700});y+=56;
      pr.items.forEach(it=>{_ebTxt(x,it.leg+" : "+it.value,60,y,{size:34});y+=48;});}
  }catch(e){}}
  if(globalThis.EBV2&&globalThis.EBV2.progress){try{
    const pg=globalThis.EBV2.progress(plan,S.answers,todayISO());
    y+=30;
    _ebTxt(x,"Semaine "+pg.weekNow+"/"+pg.totalWeeks+" · "+pg.pctLoad+"% de la charge accomplie"+(pg.streakWeeks?" · streak "+pg.streakWeeks:""),60,y,{size:40,weight:700});
    // la piste de la barre devient un blanc translucide : sur une photo, un beige opaque ferait
    // une tache rectangulaire, alors que la barre elle-même reste pleine et lisible
    y+=40;x.fillStyle="rgba(255,255,255,.35)";x.fillRect(60,y,W-120,26);x.fillStyle="#00c98d";x.fillRect(60,y,(W-120)*pg.pctLoad/100,26);
  }catch(e){}}
  _ebTxt(x,"Généré par EnduraBuild — plan raisonné, chaque décision justifiée",60,H-60,{size:26,color:"rgba(255,255,255,.85)"});
  c.toBlob(b=>{const u=URL.createObjectURL(b);const l=document.createElement("a");l.href=u;l.download="enduraBuild-"+(S.sport||"plan")+".png";document.body.appendChild(l);l.click();setTimeout(()=>{document.body.removeChild(l);URL.revokeObjectURL(u);},200);},"image/png");
}catch(e){console.warn("exportPNG",e);}}

// ===== R4-3 : image STORY 1080×1920 (9:16) post-séance + partage natif =====
// Réutilise ce module (brief : étendre, pas dupliquer). Pas de SDK Instagram/Strava —
// aucune API publique de post direct côté web : le chemin réaliste est la Web Share API
// (feuille de partage de l'OS → Story), avec repli téléchargement (Safari desktop…).
// Pas de tracé GPS : l'import FIT actuel ne lit que le résumé de séance (pas les records
// GPS point à point) — on ne promet pas de carte qu'on n'a pas.
async function storyBlob(o,format){
  // R24.4 (retour fondateur, 06/08 soir : « toujours pas de fond transparent type png pour le
  // partage ? ») — la demande de R23.4 est ÉTENDUE à l'image post-séance : même contrat que la
  // carte du plan. Fond dégradé SUPPRIMÉ, alpha conservé, texte blanc à halo sombre (la seule
  // encre qui tienne sur une photo qu'on ne contrôle pas), et tout le texte passe par _ebTxt —
  // le point unique halo + rétrécissement + centrage (le centrage vivait ici en copie manuelle).
  // L'avatar garde ses couleurs sombres : il se pose sur une PLAQUE claire translucide, façon
  // autocollant — sans elle, la silhouette disparaîtrait sur une photo de nuit.
  await _ebFontsPretes();
  // o : {sessionName, detail, sport, streak, badge:{icon,label}|null, avatarSVG, accent}
  // format (R6 — plusieurs types de partage) : "story" 1080×1920 (défaut) | "square" 1080×1080
  const sq=format==="square";
  const W=1080,H=sq?1080:1920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  const acc=o.accent||"#ff7a1a";
  // FOND TRANSPARENT : aucun fillRect plein cadre. Les deux barres d'accent restent (saturées,
  // lisibles sur clair comme sur sombre) — ce sont elles qui « tiennent » la composition.
  x.fillStyle=acc;x.fillRect(0,0,W,18);x.fillRect(0,H-18,W,18);
  _ebTxt(x,o.title||"SÉANCE FAITE ✔",70,sq?140:190,{size:sq?66:88,weight:900,family:"Archivo Black",max:W-140});
  _ebTxt(x,(SPORTS[o.sport]?SPORTS[o.sport].ico+" "+SPORTS[o.sport].nom:o.sport||""),70,sq?210:290,{size:sq?42:52,weight:700,color:acc,max:W-140});
  // avatar au centre (SVG → Image via blob URL, même origine), sur sa plaque claire
  if(o.avatarSVG){
    await new Promise(res=>{
      const b=new Blob([o.avatarSVG],{type:"image/svg+xml"});const u=URL.createObjectURL(b);
      const im=new Image();
      // R25 — le triptyque (aspect 1,78) remplace peu à peu le carré (1,1) : les dimensions
      // suivent l'aspect DÉCLARÉ par l'appelant au lieu d'être codées pour un seul format.
      const asp=o.avatarAspect||1.1;
      const dims=sq?[W/2-170,250,340,Math.round(340*asp)]:(asp>1.4?[W/2-210,300,420,Math.round(420*asp)]:[W/2-260,360,520,Math.round(520*asp)]);
      im.onload=()=>{
        const pad=26,r=32,[dx,dy,dw,dh]=dims;
        x.save();x.fillStyle="rgba(246,239,227,.92)";
        x.beginPath();
        if(x.roundRect)x.roundRect(dx-pad,dy-pad,dw+2*pad,dh+2*pad,r);else x.rect(dx-pad,dy-pad,dw+2*pad,dh+2*pad);
        x.fill();x.restore();
        x.drawImage(im,dx,dy,dw,dh);URL.revokeObjectURL(u);res();
      };
      im.onerror=()=>{URL.revokeObjectURL(u);res();};im.src=u;
    });
  }
  _ebTxt(x,(o.sessionName||"").slice(0,28),0,sq?700:1080,{size:sq?52:64,weight:800,max:W-80,center:W});
  if(o.detail)_ebTxt(x,String(o.detail).split("—")[0].slice(0,44),0,sq?755:1150,{size:sq?32:40,color:"rgba(255,255,255,.92)",max:W-80,center:W});
  let y=sq?840:1280;
  if(o.streak>1){_ebTxt(x,"🔥 "+o.streak+" jours d'affilée",0,y,{size:sq?44:54,weight:700,max:W-80,center:W});y+=sq?66:90;}
  if(o.badge){_ebTxt(x,(o.badge.icon+" Badge débloqué : "+o.badge.label).slice(0,40),0,y,{size:sq?40:50,weight:700,color:"#ffd76a",max:W-80,center:W});y+=sq?66:90;}
  const d=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  _ebTxt(x,d,0,y+20,{size:sq?28:36,color:"rgba(255,255,255,.85)",max:W-80,center:W});
  _ebTxt(x,"ENDURABUILD",70,H-(sq?66:80),{size:sq?32:40,weight:700,max:W-140});
  _ebTxt(x,"plan raisonné · chaque décision justifiée",70,H-(sq?34:40),{size:sq?24:30,color:"rgba(255,255,255,.85)",max:W-140});
  return new Promise(res=>c.toBlob(res,"image/png"));
}
/** Partage natif (feuille OS → Story Instagram/etc.) ; repli : téléchargement du PNG.
 *  format : "story" (9:16, défaut) | "square" (1:1 — posts/groupes). */
async function shareStory(o,format){
  const blob=await storyBlob(o,format);
  if(!blob)return false;
  const fname=format==="square"?"endurabuild-carte.png":"endurabuild-seance.png";
  const file=new File([blob],fname,{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
    try{await navigator.share({files:[file],title:"Séance faite — EnduraBuild"});return true;}
    catch(e){if(e&&e.name==="AbortError")return true;/* l'utilisateur a annulé : pas un échec */}
  }
  const u=URL.createObjectURL(blob);const l=document.createElement("a");
  l.href=u;l.download=fname;document.body.appendChild(l);l.click();
  setTimeout(()=>{document.body.removeChild(l);URL.revokeObjectURL(u);},200);
  return true;
}
/** R6 — partage TEXTE (WhatsApp/SMS/…) : résumé de séance en clair, feuille de partage
 *  native, repli presse-papiers (puis rien si même le presse-papiers est refusé). */
async function shareText(o){
  const parts=["✔ Séance faite — "+(SPORTS[o.sport]?SPORTS[o.sport].nom:"")];
  if(o.sessionName)parts.push(o.sessionName+(o.detail?" — "+String(o.detail).split("—")[0].trim():""));
  if(o.streak>1)parts.push("🔥 "+o.streak+" jours d'affilée");
  if(o.badge)parts.push(o.badge.icon+" Badge débloqué : "+o.badge.label);
  parts.push("(EnduraBuild — plan raisonné)");
  const text=parts.join("\n");
  if(navigator.share){
    try{await navigator.share({text});return "share";}
    catch(e){if(e&&e.name==="AbortError")return "share";}
  }
  try{await navigator.clipboard.writeText(text);return "clipboard";}
  catch(e){return null;}
}

export { _dl, exportICS, exportJSON, exportPNG, planToJSON, shareStory, shareText, storyBlob };
