// OAuth Strava côté app — pendant client du relais `server/strava-relay.js` (voir son
// README pour le déploiement). Le secret Strava vit UNIQUEMENT sur le relais ; l'app ne
// manipule que des tokens d'accès utilisateur, stockés dans l'état (localStorage) comme
// le reste. Repli assumé : sans relais configuré, l'import par jeton manuel marche toujours.
import { S, ebSave } from "./state.js";

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

/** URL du relais, normalisée (answers.stravaRelay — clé partagée entre plans). */
function stravaRelayUrl() {
  return String(S.answers.stravaRelay || "").trim().replace(/\/+$/, "");
}

/** Lance la connexion : simple redirection vers le relais, qui gère tout. */
function stravaConnect() {
  const relay = stravaRelayUrl();
  if (!relay) return false;
  location.href = relay + "/auth?return=" + encodeURIComponent(location.origin + location.pathname);
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
    const r = await fetch(relay + "/refresh", {
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

export { stravaAuthFromHash, stravaConnect, stravaAccessToken, stravaDisconnect, stravaRelayUrl };
