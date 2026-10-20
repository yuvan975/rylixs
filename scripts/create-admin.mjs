import { db, hashPassword } from "../lib/store.mjs";
import { randomUUID } from "node:crypto";
const email = process.env.RYLIXS_ADMIN_EMAIL?.trim().toLowerCase(),
  password = process.env.RYLIXS_ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error(
    "Set RYLIXS_ADMIN_EMAIL and RYLIXS_ADMIN_PASSWORD (12+ characters).",
  );
if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
  throw new Error("Account already exists. No changes made.");
db.prepare(
  "INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,'RYLIXS Admin','admin')",
).run(randomUUID(), email, hashPassword(password));
console.log("Administrator created. Sign in at /admin/login.");
