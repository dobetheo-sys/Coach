/**
 * Relais OAuth Strava pour EnduraBuild — Cloudflare Worker, zéro dépendance.
 *
 * POURQUOI CE SERVEUR : l'app est 100 % côté client ; le protocole OAuth de Strava exige
 * un `client_secret` qui ne doit JAMAIS être visible dans le code de l'app. Ce worker est
 * le SEUL endroit qui le connaît. Il ne stocke RIEN (aucune base, aucun log de token) :
 * il échange les codes/refresh tokens et renvoie le résultat au navigateur, c'est tout.
 *
 * Endpoints :
 *   GET  /auth?return=<URL de l'app>   → redirige vers l'écran d'autorisation Strava
 *   GET  /callback?code=…&state=…      → échange le code, renvoie vers l'app avec les
 *                                        tokens dans le FRAGMENT (#strava_auth=…) — le
 *                                        fragment n'atteint jamais un serveur, seul le
 *                                        navigateur de l'utilisateur le lit.
 *   POST /refresh {refresh_token}      → renouvelle un token expiré (CORS restreint)
 *
 * Variables d'environnement (à définir dans le dashboard Cloudflare, JAMAIS en clair ici) :
 *   STRAVA_CLIENT_ID     — l'ID de ton application Strava (Réglages → Mon API)
 *   STRAVA_CLIENT_SECRET — le secret (⚠ en tant que « Secret », pas variable texte)
 *   APP_ORIGINS          — origines autorisées, séparées par des virgules
 *                          (ex. "https://tonsite.github.io,http://localhost:8000")
 */

const STRAVA_AUTH = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN = "https://www.strava.com/oauth/token";
const SCOPE = "activity:read_all"; // lecture seule — on n'écrit jamais sur Strava

function allowedOrigin(env, origin) {
  return String(env.APP_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean).includes(origin);
}
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
/** Ne renvoyer à l'app QUE ce dont elle a besoin — jamais l'objet Strava complet. */
function slimTokens(j) {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: j.expires_at,
    athlete: j.athlete ? { id: j.athlete.id, firstname: j.athlete.firstname } : undefined,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- 1. Départ : l'app envoie l'utilisateur ici, on le redirige vers Strava ----
    if (url.pathname === "/auth" && request.method === "GET") {
      const ret = url.searchParams.get("return") || "";
      let retOrigin = "";
      try { retOrigin = new URL(ret).origin; } catch (e) { /* invalide */ }
      if (!retOrigin || !allowedOrigin(env, retOrigin))
        return new Response("Origine de retour non autorisée. Ajoute-la à APP_ORIGINS.", { status: 403 });
      const p = new URLSearchParams({
        client_id: env.STRAVA_CLIENT_ID,
        response_type: "code",
        redirect_uri: url.origin + "/callback",
        approval_prompt: "auto",
        scope: SCOPE,
        state: ret, // on retrouvera l'app au retour — re-validé au callback
      });
      return Response.redirect(STRAVA_AUTH + "?" + p, 302);
    }

    // ---- 2. Retour de Strava : échange du code contre les tokens ----
    if (url.pathname === "/callback" && request.method === "GET") {
      const ret = url.searchParams.get("state") || "";
      let retOrigin = "";
      try { retOrigin = new URL(ret).origin; } catch (e) { /* invalide */ }
      if (!retOrigin || !allowedOrigin(env, retOrigin))
        return new Response("state invalide.", { status: 403 });
      const code = url.searchParams.get("code");
      if (!code) {
        // refus utilisateur ou erreur Strava → retour à l'app avec le motif, sans token
        return Response.redirect(ret + "#strava_error=" + encodeURIComponent(url.searchParams.get("error") || "refus"), 302);
      }
      const r = await fetch(STRAVA_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.STRAVA_CLIENT_ID,
          client_secret: env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
        }),
      });
      if (!r.ok) return Response.redirect(ret + "#strava_error=" + encodeURIComponent("echange_code_" + r.status), 302);
      const j = await r.json();
      const payload = btoa(JSON.stringify(slimTokens(j)));
      return Response.redirect(ret + "#strava_auth=" + encodeURIComponent(payload), 302);
    }

    // ---- 3. Renouvellement d'un token expiré (appelé en fetch par l'app) ----
    if (url.pathname === "/refresh") {
      const origin = request.headers.get("Origin") || "";
      if (!allowedOrigin(env, origin)) return new Response("{}", { status: 403, headers: { "Content-Type": "application/json" } });
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
      if (request.method !== "POST") return new Response("{}", { status: 405, headers: corsHeaders(origin) });
      let body = {};
      try { body = await request.json(); } catch (e) { /* vide */ }
      if (!body.refresh_token) return new Response(JSON.stringify({ error: "refresh_token manquant" }), { status: 400, headers: corsHeaders(origin) });
      const r = await fetch(STRAVA_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.STRAVA_CLIENT_ID,
          client_secret: env.STRAVA_CLIENT_SECRET,
          refresh_token: body.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (!r.ok) return new Response(JSON.stringify({ error: "refresh refusé (" + r.status + ")" }), { status: 502, headers: corsHeaders(origin) });
      const j = await r.json();
      return new Response(JSON.stringify(slimTokens(j)), { headers: corsHeaders(origin) });
    }

    return new Response("Relais OAuth Strava EnduraBuild — endpoints : /auth, /callback, /refresh", { status: 404 });
  },
};
