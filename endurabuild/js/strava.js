// OAuth Strava côté app — pendant client du relais `server/strava-relay.js` (voir son
// README pour le déploiement). Le secret Strava vit UNIQUEMENT sur le relais ; l'app ne
// manipule que des tokens d'accès utilisateur, stockés dans l'état (localStorage) comme
// le reste. Repli assumé : sans relais configuré, l'import par jeton manuel marche toujours.
import { S, ebSave } from "./state.js";
import { STRAVA_RELAY_DEFAULT } from "./config.js";

/** À l'ouverture de l'app : récupère les tokens renvoyés par le relais dans le fragment
 *  (#strava_auth=…, jamais en query string — le fragment ne quitte pas le navigateur).
 *  Retourne true si une connexion vient d'aboutir (l'UI peut afficher un message). */
function stravaAuthFromHash() {
  const err = location.hash.match(/strava_error=([^&]+)/);
  if (err) {
    S._stravaError = decodeURIComponent(err[1]);
    history.replaceState(null, "", location.pathname + location.search);
    return false;
  }
  const m = location.hash.match(/strava_auth=([^&]+)/);
  if (!m) return false;
  // B4 (audit 05) — NONCE OAUTH : sans lui, `state` n'était que l'URL de retour et un tiers
  // pouvait faire atterrir SES jetons dans le navigateur de l'athlète (login-CSRF). Le nonce est
  // tiré à la connexion, gardé en `sessionStorage`, et le relais le renvoie dans le fragment.
  // Tolérance TRANSITOIRE : un relais pas encore redéployé ne le renvoie pas — on accepte et on
  // le dit en console ; dès que le fragment porte `strava_nonce`, il DOIT correspondre.
  const nm = location.hash.match(/strava_nonce=([^&]+)/);
  let attendu = "";
  try { attendu = sessionStorage.getItem("eb_strava_nonce") || ""; sessionStorage.removeItem("eb_strava_nonce"); } catch (e) { /* stockage indisponible */ }
  if (nm && decodeURIComponent(nm[1]) !== attendu) {
    S._stravaError = "connexion refusée : jeton de session inattendu (réessaie depuis Zenna)";
    history.replaceState(null, "", location.pathname + location.search);
    return false;
  }
  if (!nm) { try { console.warn("Zenna : le relais Strava n'a pas renvoyé de nonce — redéploie server/strava-relay.js (B4)."); } catch (e) { /* rien */ } }
  try {
    const t = JSON.parse(atob(decodeURIComponent(m[1])));
    if (!t.access_token || !t.refresh_token) return false;
    S.answers.stravaAuth = t;
    S._stravaJustConnected = true;
    ebSave();
  } catch (e) { return false; }
  history.replaceState(null, "", location.pathname + location.search);
  return true;
}

// Audit 08/08/2026 : ni le rafraîchissement de jeton ni les appels à l'API Strava (steps.js
// `stravaImport`) ne portaient de borne de temps — un relais lent ou une API qui traîne
// bloquait l'import sans retour utilisateur avant l'échec final. Point unique R11.1 :
// `stravaFetch` est le SEUL point d'appel réseau Strava (relais compris) de tout le dépôt.
const STRAVA_TIMEOUT_MS = 15000;
/** fetch() borné dans le temps (AbortController). Un dépassement lève une AbortError,
 *  déjà traitée comme un échec ordinaire par tous les appelants (`catch` existant) —
 *  aucun changement de contrat, juste un délai qui ne reste plus jamais ouvert. */
async function stravaFetch(url, opts, ms = STRAVA_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
  } finally {
    clearTimeout(t);
  }
}

/** URL du relais : `config.js`, POINT UNIQUE (B3, décision du fondateur du 12/09/2026).
 *
 *  Avant : `S.answers.stravaRelay || STRAVA_RELAY_DEFAULT` — la valeur collée par l'athlète
 *  dans « Réglages avancés » GAGNAIT sur la config, alors que le commentaire au-dessus
 *  annonçait l'inverse (« celle de l'app d'abord ») : un commentaire qui décrivait le
 *  contraire de sa ligne. Le réglage est retiré de l'UI parce que la CSP épingle désormais
 *  l'hôte EXACT du relais — tout autre hôte est bloqué par le navigateur avant même la
 *  requête, donc un réglage qui ne peut plus rien configurer. Une clé `stravaRelay`
 *  résiduelle dans un état existant est ignorée : c'est le seul comportement honnête, la
 *  laisser gagner enverrait vers un hôte que la page ne peut pas joindre. */
function stravaRelayUrl() {
  return String(STRAVA_RELAY_DEFAULT || "").trim().replace(/\/+$/, "");
}

/** Lance la connexion : simple redirection vers le relais, qui gère tout. */
function stravaConnect() {
  const relay = stravaRelayUrl();
  if (!relay) return false;
  let nonce = "";
  try {
    const b = new Uint8Array(16); crypto.getRandomValues(b);
    nonce = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem("eb_strava_nonce", nonce);
  } catch (e) { nonce = ""; }
  location.href = relay + "/auth?return=" + encodeURIComponent(location.origin + location.pathname) + (nonce ? "&nonce=" + nonce : "");
  return true;
}

/** Token d'accès valide — renouvelé automatiquement via le relais s'il expire
 *  (les tokens Strava vivent 6 h). null = reconnexion nécessaire. */
async function stravaAccessToken() {
  const auth = S.answers.stravaAuth;
  if (!auth || !auth.access_token) return null;
  if (!auth.expires_at || auth.expires_at * 1000 > Date.now() + 60000) return auth.access_token;
  const relay = stravaRelayUrl();
  if (!relay) return null; // expiré et pas de relais → reconnexion manuelle
  try {
    const r = await stravaFetch(relay + "/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    if (!r.ok) return null;
    const t = await r.json();
    if (!t.access_token) return null;
    S.answers.stravaAuth = Object.assign({}, auth, t);
    ebSave();
    return t.access_token;
  } catch (e) { return null; }
}

function stravaDisconnect() {
  delete S.answers.stravaAuth;
  ebSave();
}

export { stravaAuthFromHash, stravaConnect, stravaAccessToken, stravaDisconnect, stravaRelayUrl, stravaFetch };
