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
export function startOAuth(next) {
  const c = oauthConfig();
  if (!c.clientId || !c.clientSecret)
    fail(
      "Google sign-in is not configured yet. Use the local preview to test this build.",
      503,
    );
  const state = randomBytes(32).toString("hex"),
    verifier = randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM oauth_states WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO oauth_states VALUES(?,?,?)").run(
    state,
    JSON.stringify({
      verifier,
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
      redirect_uri: c.redirectUri,
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
