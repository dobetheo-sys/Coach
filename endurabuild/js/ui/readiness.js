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
async function applyReadiness(){
  if(!globalThis.EBV2)return;
  const snap={date:new Date().toISOString().slice(0,10),
    sleepQuality:$("rdSleep").value,energy:parseInt($("rdEnergy").value),feel:$("rdFeel").value};
  const wx=await fetchWeather();if(wx&&wx.tmaxC!=null)snap.weather=wx;
  S.answers.readiness={sleepQuality:snap.sleepQuality,energy:snap.energy,feel:snap.feel};ebSave();
  let res;try{res=globalThis.EBV2.adjustToday(S.sport,S.answers,snap);}catch(e){console.warn(e);return;}
  const v=res.adjustment.verdict,ic={verte:"\ud83d\udfe2",orange:"\ud83d\udfe0",rouge:"\ud83d\udd34"};
  const lbl={keep:"s\u00e9ance maintenue",reduce:"volume r\u00e9duit, structure conserv\u00e9e",replace:"qualit\u00e9 remplac\u00e9e par de l\u2019endurance",rest:"repos aujourd\u2019hui",off:"repos complet (aff\u00fbtage)"};
  let h='<div class="why" style="margin:0">'+(snap.weather?'\ud83c\udf24 '+Math.round(snap.weather.tmaxC)+'\u00b0C pr\u00e9vus'+(snap.weather.precipMm>=5?' \u00b7 pluie':'')+'<br>':'')+ic[v.level]+' <b>Readiness '+v.level+'</b> \u2014 '+lbl[res.adjustment.action]+'<br><span style="color:#555;font-size:12px">'+v.drivers.join(" \u00b7 ")+'</span></div>';
  if(res.sessions.length)res.sessions.forEach(x=>{h+='<div style="font-size:12px;margin-top:6px"><b>'+(res.jour||"Aujourd\u2019hui")+' \u00b7 '+x.name+'</b><br>'+x.det+'</div>';});
  else h+='<div style="font-size:12px;margin-top:6px">Aucune s\u00e9ance planifi\u00e9e aujourd\u2019hui.</div>';
  $("rdResult").innerHTML=h;
}
// Reprise : si un état est sauvegardé, on le restaure (plan ou questionnaire en cours).

export { applyReadiness, fetchWeather };
