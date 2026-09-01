import "../src/app/bridge.ts";
const a = {intent:"competition",med_pain:"non",med_dizzy:"non",med_treat:"non",age:"35",sex:"H",weight:"75",history:"confirme",sessions_max:"8",vol_max:"12",vol_recent:"8",dispo:"quotidienne",off_days:"non",doubles:"non",level:"inter",race_date:"2027-06-06",ftp_known:"oui",ftp:"250",pace_known:"oui",pace:"4:30",css_known:"oui",css:"1:40",terrain:"vallonne",swim_continuous:"oui",longest_swim_m:"1500",format:"70.3",injury:process.argv[2]};
globalThis.EBV2.buildPlan("tri", a);
