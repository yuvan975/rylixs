"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, useStore } from "./StoreShell";
export default function AuthForm({ admin = false }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [options, setOptions] = useState({});
  const { setUser } = useStore(),
    router = useRouter(),
    params = useSearchParams();
  const desired = params.get("next") || "/account",
    next =
      /^\/(?!\/)[\w/?=&%#-]*$/.test(desired) && !desired.startsWith("/admin")
        ? desired
        : "/account";
  useEffect(() => {
    api("auth/options")
      .then(setOptions)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e, preview = false) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(
        preview ? "auth/preview" : "admin/login",
        "POST",
        preview ? {} : Object.fromEntries(new FormData(e.currentTarget)),
      );
      setUser(result.user);
      router.push(admin ? "/admin/dashboard" : next);
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <Link className="wordmark" href="/">
        RYLIXS
      </Link>
      <p className="eyebrow">
        {admin ? "PRIVATE / STORE MANAGEMENT" : "YOUR PERSONAL EDIT"}
      </p>
      <h1>{admin ? "Store sign in." : next === "/checkout" ? "Sign in to continue your order" : "Welcome to RYLIXS"}</h1>
      {!admin && params.get("signin") === "retry" && <p role="alert">Sign-in was cancelled or could not be completed. Please try again with your Google account.</p>}
      {admin ? (
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <button className="button" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <p>
            Sign in to save your bag and follow your orders. We’ll take you back
            to where you left off.
          </p>
          {options.google ? (
            <a
              className="button google-button"
              href={"/api/auth/google?next=" + encodeURIComponent(next)}
            >
              G · Continue with Google
            </a>
          ) : (
            <div className="panel"><button className="button google-button" disabled>G · Continue with Google</button><p>Google sign-in is temporarily unavailable. Please try again later.</p></div>
          )}
          {options.preview && (
            <form onSubmit={(e) => submit(e, true)} className="panel">
              <p className="eyebrow">TEST BUILD</p>
              <p>
                Use a test customer account to try shopping and orders.
                Saved data may reset. Do not enter sensitive personal information.
              </p>
              <button className="button secondary" disabled={busy}>
                Continue as preview customer
              </button>
            </form>
          )}
          <Link href="/shop">Continue browsing →</Link>
          <p><Link href="/privacy">Privacy policy</Link></p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
