import { db, fail, publicUser, hashPassword } from "./store.mjs";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import "./commerce.mjs";
export function oauthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri:
      (process.env.RYLIXS_SITE_URL || "http://127.0.0.1:3100") +
      "/api/auth/google/callback",
  };
}
export function startOAuth(next, appChallenge = null, requestedOrigin = null) {
  if (appChallenge && !/^[A-Za-z0-9_-]{43}$/.test(appChallenge))
    fail("Invalid app sign-in request.", 400);
  const c = oauthConfig();
  const allowed = new Set([new URL(c.redirectUri).origin, ...(process.env.RYLIXS_ADDITIONAL_ORIGINS || "").split(",").map(v=>v.trim()).filter(Boolean)]);
  if (requestedOrigin && allowed.has(requestedOrigin)) c.redirectUri = requestedOrigin + "/api/auth/google/callback";
  if (!c.clientId || !c.clientSecret)
    fail(
      "Google sign-in is temporarily unavailable. Please try again later.",
      503,
    );
  const state = randomBytes(32).toString("hex"),
    verifier = randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM oauth_states WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO oauth_states VALUES(?,?,?)").run(
    state,
    JSON.stringify({
      verifier,
      appChallenge,
      redirectUri: c.redirectUri,
      next:
        /^\/(?!\/)[\w/?=&%#-]*$/.test(next || "") && !next.startsWith("/admin")
          ? next
          : "/account",
    }),
    Date.now() + 600000,
  );
  const q = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  return { state, url: "https://accounts.google.com/o/oauth2/v2/auth?" + q };
}
export async function finishOAuth(state, code, cookie) {
  if (!state || state !== cookie)
    fail("Sign-in expired. Please try again.", 403);
  const row = db
    .prepare("SELECT * FROM oauth_states WHERE state=? AND expires>?")
    .get(state, Date.now());
  if (!row) fail("Sign-in expired.", 403);
  db.prepare("DELETE FROM oauth_states WHERE state=?").run(state);
  const data = JSON.parse(row.data),
    c = oauthConfig();
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code || "",
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: data.redirectUri || c.redirectUri,
      grant_type: "authorization_code",
      code_verifier: data.verifier,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const t = await tr.json();
  if (!tr.ok || !t.access_token) fail("Google sign-in failed.", 401);
  const ur = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + t.access_token },
      signal: AbortSignal.timeout(15000),
    }),
    u = await ur.json();
  if (!ur.ok || !u.sub || !u.email_verified)
    fail("A verified Google account is required.", 401);
  let identity = db
    .prepare("SELECT userId FROM identities WHERE subject=?")
    .get(u.sub);
  if (!identity) {
    if (
      db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(u.email.toLowerCase())
    )
      fail(
        "This email is already assigned to another login. Contact the store.",
        409,
      );
    identity = { userId: randomUUID() };
    db.prepare("INSERT INTO users(id,email,password,name) VALUES(?,?,?,?)").run(
      identity.userId,
      u.email.toLowerCase(),
      hashPassword(randomBytes(32).toString("hex")),
      String(u.name || u.email).slice(0, 100),
    );
    db.prepare("INSERT INTO identities VALUES(?,?)").run(
      u.sub,
      identity.userId,
    );
  }
  return {
    user: publicUser(
      db.prepare("SELECT * FROM users WHERE id=?").get(identity.userId),
    ),
    next: data.next,
    appChallenge: data.appChallenge,
    origin: new URL(data.redirectUri || c.redirectUri).origin,
  };
}
export function previewUser() {
  if (
    process.env.RYLIXS_LOCAL_PREVIEW !== "true" ||
    process.env.RYLIXS_INSECURE_LOCAL_HTTP !== "true"
  )
    fail("Local preview is disabled.", 404);
  const email = "preview@rylixs.test";
  let u = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!u) {
    db.prepare("INSERT INTO users(id,email,password,name) VALUES(?,?,?,?)").run(
      randomUUID(),
      email,
      hashPassword(randomBytes(32).toString("hex")),
      "Local Preview Customer",
    );
    u = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  }
  return publicUser(u);
}

// The browser and Android WebView have separate cookies. Transfer only a
// one-time grant bound to a secret generated and retained by the initiating app.
db.exec(`CREATE TABLE IF NOT EXISTS app_auth_grants(challenge TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),next TEXT NOT NULL,expires INTEGER NOT NULL)`);
export function issueAppGrant(auth) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(auth.appChallenge || "")) fail("Invalid app request.", 400);
  db.prepare("DELETE FROM app_auth_grants WHERE expires<?").run(Date.now());
  db.prepare("INSERT OR REPLACE INTO app_auth_grants VALUES(?,?,?,?)").run(auth.appChallenge, auth.user.id, auth.next, Date.now() + 120000);
}
export function redeemAppGrant(verifier) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(verifier || "")) fail("Invalid sign-in request.", 400);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const grant = db.prepare("DELETE FROM app_auth_grants WHERE challenge=? AND expires>? RETURNING *").get(challenge, Date.now());
  if (!grant) fail("Finish Google sign-in in your browser, then return to RYLIXS.", 409);
  const user = publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(grant.userId));
  if (!user || user.role !== "customer") fail("Customer account required.", 403);
  return { user, next: grant.next };
}
