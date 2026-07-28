// R4.10 — notifications. LIMITE ASSUMÉE (documentée, pas cachée) : PWA sans backend →
// pas de push quand l'app est fermée (il faudrait un serveur Push API). Ce module fait
// tout ce qui est honnêtement possible côté client :
//   · notification « séance du jour » à l'heure choisie, si l'app est ouverte à ce
//     moment-là (setTimeout) OU en rattrapage à l'ouverture (une fois par jour) ;
//   · relance bienveillante après 3 séances manquées consécutives — UNE seule fois,
//     jamais de rafale, ton encourageant + proposition de reprise allégée ;
//   · bilan hebdo le dimanche (carte in-app + notification si permission).
// Aucune autre notification : chaque interruption doit mériter sa place (spec §11).
import { S, ebSave } from "./state.js";

function canNotify() { return "Notification" in window && Notification.permission === "granted"; }
function notify(title, body) {
  if (!canNotify()) return;
  try { new Notification(title, { body, icon: "assets/icon-192.png", badge: "assets/icon-192.png" }); } catch (e) {}
}
export async function requestNotifyPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try { return await Notification.requestPermission(); } catch (e) { return "denied"; }
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function sessionOfDay(plan, dateISO) {
  for (const w of plan.weeks) for (const d of w.days) if (d.date === dateISO) return d;
  return null;
}
function oneLiner(day) {
  const s = day && day.sessions.find((x) => x.d !== "rs");
  if (!s) return "Repos aujourd'hui — la récupération compte aussi, valide-la.";
  const obj = s.det ? " — " + String(s.det).split("—")[0].split("·")[0].trim().slice(0, 60) : "";
  return s.name + obj;
}

/** Notification « séance du jour » à l'heure choisie (answers.notifyTime "HH:MM"). */
export function scheduleDailyNotification(plan) {
  const t = S.answers.notifyTime;
  if (!t || !canNotify()) return;
  const [hh, mm] = t.split(":").map(Number);
  const now = new Date();
  const target = new Date(now); target.setHours(hh, mm, 0, 0);
  const key = todayISO();
  // Rattrapage : heure passée + pas encore notifié aujourd'hui + app ouverte maintenant
  if (now >= target && S.answers.lastDailyNotif !== key) {
    S.answers.lastDailyNotif = key; ebSave();
    notify("Séance du jour", oneLiner(sessionOfDay(plan, key)));
    return;
  }
  if (now < target) {
    clearTimeout(scheduleDailyNotification._t);
    scheduleDailyNotification._t = setTimeout(() => {
      if (S.answers.lastDailyNotif === key) return;
      S.answers.lastDailyNotif = key; ebSave();
      notify("Séance du jour", oneLiner(sessionOfDay(plan, key)));
    }, target.getTime() - now.getTime());
  }
}

/** 3 séances manquées consécutives → relance UNIQUE, encourageante, reprise allégée. */
export function missedSessionsCheck(plan) {
  const done = S.answers.done || {};
  const sick = S.answers.sickDates || [];
  const pf = S.answers.painFlag;
  const today = todayISO();
  let missed = 0, lastMissedDate = null;
  const days = [];
  plan.weeks.forEach((w) => w.days.forEach((d) => { if (d.date && d.date < today) days.push({ w, d }); }));
  days.sort((a, b) => a.d.date.localeCompare(b.d.date));
  for (let i = days.length - 1; i >= 0; i--) {
    const { w, d } = days[i];
    const sessions = d.sessions.map((s, si) => ({ s, k: w.num + "|" + d.jour + "|" + si })).filter((x) => x.s.d !== "rs");
    if (!sessions.length) continue; // les jours de repos n'entrent pas dans le compte des « séances manquées »
    if (sick.includes(d.date) || (pf && pf.active && pf.since && d.date >= pf.since)) continue; // gel : pas une « séance manquée »
    if (sessions.every((x) => done[x.k])) break;
    missed++; if (!lastMissedDate) lastMissedDate = d.date;
  }
  if (missed < 3) return "";
  const key = "relance-" + lastMissedDate;
  const alreadySent = S.answers.relanceSent === key;
  if (!alreadySent) { S.answers.relanceSent = key; ebSave(); notify("On reprend en douceur ?", "3 séances sont passées — aucune importance. Une reprise facile en Z2 et la machine repart."); }
  return '<div class="warn" style="background:#e9defc">🌿 <b>La vie a pris le dessus — ça arrive.</b> '
    + 'Trois séances sont passées, et ce n’est ni grave ni un échec : le plan encaisse. '
    + 'Reprends par la prochaine séance FACILE telle quelle, sans rien rattraper — la régularité sur toute la préparation compte plus qu’une semaine parfaite.</div>';
}

/** Bilan hebdo (dimanche) : volume réalisé/prévu, tendance, séance clé de la semaine à venir. */
export function weeklyReviewHTML(plan) {
  const now = new Date();
  if (now.getDay() !== 0) return ""; // dimanche uniquement
  if (!globalThis.EBV2 || !globalThis.EBV2.progress) return "";
  let pg;
  try { pg = globalThis.EBV2.progress(plan, S.answers, todayISO()); } catch (e) { return ""; }
  const cur = pg.weekly.find((w) => !w.complete) || pg.weekly[pg.weekly.length - 1];
  if (!cur) return "";
  const pct = cur.minTotal ? Math.round((cur.minDone / cur.minTotal) * 100) : 0;
  const trend = pct >= 80 ? "solide" : pct >= 50 ? "en construction" : "semaine légère — la suivante repart de zéro, sans rattrapage";
  // séance clé de la semaine suivante : la plus longue séance non-repos
  let keyNext = null;
  const wkNext = plan.weeks.find((w) => w.num === cur.num + 1);
  if (wkNext) wkNext.days.forEach((d) => d.sessions.forEach((s) => { if (s.d !== "rs" && (!keyNext || (s.min || 0) > (keyNext.min || 0))) keyNext = s; }));
  const key = "bilan-" + todayISO();
  if (S.answers.lastWeeklyNotif !== key && canNotify()) { S.answers.lastWeeklyNotif = key; ebSave(); notify("Bilan de la semaine", pct + "% du volume prévu réalisé (" + trend + ")."); }
  return '<div class="load-card"><div class="load-title">🗞 Bilan de la semaine</div>'
    + '<div class="load-sub" style="margin-top:6px"><b>' + Math.round(cur.minDone / 6) / 10 + "h réalisées / " + Math.round(cur.minTotal / 6) / 10 + "h prévues (" + pct + "%)</b> — " + trend + "."
    + (keyNext ? "<br>Séance clé de la semaine prochaine : <b>" + keyNext.name + "</b>." : "") + "</div></div>";
}

/** Carte de réglage (Semaine, une fois) + champ au Profil. */
export function notifySetupHTML() {
  if (S.answers.notifyTime || S.answers.notifyDismissed) return "";
  return '<div class="load-card" id="notifSetup"><div class="load-title">🔔 Rappel de séance</div>'
    + '<div class="load-sub" style="margin-top:6px">Choisis l’heure de ton rappel quotidien. Limite honnête : sans serveur, la notification ne part que si l’app est ouverte — sinon tu la reçois à l’ouverture suivante.</div>'
    + '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap"><input type="time" id="notifTime" value="07:00">'
    + '<button class="btn primary" id="notifOk" type="button">Activer</button>'
    + '<button class="btn" id="notifNo" type="button">Non merci</button></div></div>';
}
export function bindNotifySetup(plan, rerender) {
  const ok = document.getElementById("notifOk");
  if (ok) ok.onclick = async () => {
    const t = (document.getElementById("notifTime") || {}).value || "07:00";
    const perm = await requestNotifyPermission();
    S.answers.notifyTime = t;
    ebSave();
    if (perm === "granted") scheduleDailyNotification(plan);
    rerender();
  };
  const no = document.getElementById("notifNo");
  if (no) no.onclick = () => { S.answers.notifyDismissed = true; ebSave(); rerender(); };
}
