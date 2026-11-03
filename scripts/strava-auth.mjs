#!/usr/bin/env node
/**
 * One-time Strava OAuth consent → the first token pair in `strava_auth`.
 *
 * Strava has no "personal access token" with private scopes: the athlete has to
 * approve the app once. This prints the approval link; after you press
 * Authorize, Strava redirects to http://localhost/?code=… (the page will not
 * load — that is expected). Paste that whole URL, or just the code, here.
 *
 * Usage:
 *   1. In https://www.strava.com/settings/api set "Authorization Callback
 *      Domain" to `localhost`.
 *   2. .env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, SUPABASE_URL (or
 *      VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY. Apply 0038_training.sql.
 *   3. node scripts/strava-auth.mjs            (or pass the code: -- <code|url>)
 *
 * After this, the sync refreshes and rotates the token on its own. The same
 * client id/secret must be set on Cloudflare for /admin/training/sync.
 */

import readline from "node:readline/promises";
import { loadEnv } from "./lib/stravaEnv.mjs";
import { STRAVA_SCOPES } from "../src/lib/strava.js";
import { exchangeToken, storeInitialToken } from "../src/lib/stravaSync.js";

const env = loadEnv();
if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
  console.error("Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const authorize = `https://www.strava.com/oauth/authorize?${new URLSearchParams({
  client_id: env.STRAVA_CLIENT_ID,
  response_type: "code",
  redirect_uri: "http://localhost/exchange_token",
  approval_prompt: "force",
  scope: STRAVA_SCOPES,
})}`;

let input = process.argv[2];
if (!input) {
  console.log(`\nOpen this link, press Authorize, then paste the URL you land on:\n\n${authorize}\n`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  input = await rl.question("Redirect URL or code: ");
  rl.close();
}

let code = input.trim();
let scope = null;
try {
  const url = new URL(code);
  code = url.searchParams.get("code") || "";
  scope = url.searchParams.get("scope");
} catch (_) {
  // a bare code
}
if (!code) {
  console.error("No code found in that input.");
  process.exit(1);
}
if (scope && !scope.includes("activity:read_all")) {
  console.warn(`Warning: granted scope is "${scope}" — private activities need activity:read_all.`);
}

const token = await exchangeToken(env, { grant_type: "authorization_code", code });
await storeInitialToken(env, { ...token, scope: scope || STRAVA_SCOPES });
console.log(`Stored a Strava token for athlete ${token.athlete?.id ?? "?"}. Next: npm run strava:import`);
