// Module extrait de Coach_Pro_V1.5.html par scripts/splitPwa.py — extraction fidèle,
// ne pas éditer la logique ici sans relancer les audits (npm run audit:v1 / audit:v2).
import { $, S, ebSave } from "../state.js";

function fetchWeather(){return new Promise(res=>{
  if(!navigator.geolocation)return res(null);
  const to=setTimeout(()=>res(null),3500);
  navigator.geolocation.getCurrentPosition(pos=>{
    fetch("https://api.open-meteo.com/v1/forecast?latitude="+pos.coords.latitude+"&longitude="+pos.coords.longitude+"&daily=temperature_2m_max,precipitation_sum&forecast_days=1&timezone=auto")
      .then(r=>r.json()).then(j=>{clearTimeout(to);res({tmaxC:j.daily.temperature_2m_max[0],precipMm:j.daily.precipitation_sum[0]});})
      .catch(()=>{clearTimeout(to);res(null);});
  },()=>{clearTimeout(to);res(null);},{timeout:3000,maximumAge:600000});
});}
/** Verdict lisible + séances du jour, en HTML — factorisé pour le rendu direct ET le
 *  ré-affichage (retour à l'onglet Semaine sans re-décrocher la météo). */
function verdictHTML(res,weather){
  const v=res.adjustment.verdict,ic={verte:"🟢",orange:"🟠",rouge:"🔴"};
  const lbl={keep:"séance maintenue",reduce:"volume réduit, structure conservée",replace:"qualité remplacée par de l’endurance",rest:"repos aujourd’hui",off:"repos complet (affûtage)"};
  let h='<div class="why" style="margin:0">'+(weather?'🌤 '+Math.round(weather.tmaxC)+'°C prévus'+(weather.precipMm>=5?' · pluie':'')+'<br>':'')+ic[v.level]+' <b>Readiness '+v.level+'</b> — '+lbl[res.adjustment.action]+'<br><span style="color:#555;font-size:12px">'+v.drivers.join(" · ")+'</span></div>';
  if(res.sessions.length)res.sessions.forEach(x=>{h+='<div style="font-size:12px;margin-top:6px"><b>'+(res.jour||"Aujourd’hui")+' · '+x.name+'</b><br>'+x.det+'</div>';});
  else h+='<div style="font-size:12px;margin-top:6px">Aucune séance planifiée aujourd’hui.</div>';
  return h;
}
/** Applique la forme du jour : lit les 4 sélecteurs (sommeil/VFC/énergie/ressenti), calcule
 *  le verdict, sauvegarde (daté — pas de nouvelle question tant que le jour ne change pas),
 *  écrit #rdResult si présent. Retourne {snap,res} pour que l'appelant (onglet Semaine)
 *  puisse ré-agencer l'écran (fin du check-in → séance du jour affichée). */
async function applyReadiness(){
  if(!globalThis.EBV2)return null;
  // Retour immédiat : la géoloc peut prendre jusqu'à ~3.5s (timeout) avant le verdict —
  // sans ce message, le bouton semble muet/cassé pendant tout ce temps (retour panel de test).
  const btn=$("rdApply");if(btn)btn.disabled=true;
  if($("rdResult"))$("rdResult").innerHTML='<div class="load-sub">Analyse en cours…</div>';
  const snap={date:new Date().toISOString().slice(0,10),
    sleepQuality:$("rdSleep").value,hrvStatus:$("rdHrv")?$("rdHrv").value:"normale",
    energy:parseInt($("rdEnergy").value),feel:$("rdFeel").value};
  const wx=await fetchWeather();if(wx&&wx.tmaxC!=null)snap.weather=wx;
  if(btn)btn.disabled=false;
  S.answers.readiness={date:snap.date,sleepQuality:snap.sleepQuality,hrvStatus:snap.hrvStatus,energy:snap.energy,feel:snap.feel};ebSave();
  let res;try{res=globalThis.EBV2.adjustToday(S.sport,S.answers,snap);}catch(e){console.warn(e);return null;}
  if($("rdResult"))$("rdResult").innerHTML=verdictHTML(res,snap.weather);
  return {snap,res};
}
/** true si la forme du jour a déjà été renseignée AUJOURD'HUI (pas de nouvelle
 *  question tant que le jour ne change pas — ergonomique, jamais insistant). */
function readinessDoneToday(){
  const r=S.answers.readiness;
  return !!(r&&r.date===new Date().toISOString().slice(0,10));
}

export { applyReadiness, fetchWeather, readinessDoneToday };
