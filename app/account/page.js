"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api, useStore } from "@/components/StoreShell";
import { AddressForm } from "@/app/checkout/page";
export default function Account() {
  const { user, setUser } = useStore(),
    [form, setForm] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) setForm({ ...user });
  }, [user]);
  if (!user || !form)
    return (
      <section className="store-section narrow">
        <h1>Your personal edit.</h1>
        <Link className="button" href="/login?next=/account">
          Sign in
        </Link>
      </section>
    );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api("profile", "PUT", form);
      setUser(d.user);
      setMessage("Profile saved.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="store-section narrow">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Hello, {user.name}.</h1>
      <div className="actions">
        <Link href="/orders">Your orders ↗</Link>
        <Link href="/wishlist">Your wishlist ↗</Link>
        <button
          onClick={async () => {
            await api("auth/logout", "POST", {});
            setUser(null);
          }}
        >
          Sign out
        </button>
      </div>
      <form onSubmit={save}>
        <h2>Profile</h2>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Mobile
          <input
            pattern="[6-9][0-9]{9}"
            maxLength="10"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <p>Email: {user.email}</p>
        <h2>Saved addresses</h2>
        {form.addresses.map((a, i) => (
          <div className="panel" key={i}>
            <AddressForm
              value={a}
              onChange={(value) =>
                setForm({
                  ...form,
                  addresses: form.addresses.map((x, j) =>
                    j === i ? value : x,
                  ),
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  addresses: form.addresses.filter((_, j) => i !== j),
                })
              }
            >
              Remove address
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={form.addresses.length >= 10}
          onClick={() =>
            setForm({ ...form, addresses: [...form.addresses, {}] })
          }
        >
          + Add address
        </button>
        <p role="status">{message}</p>
        <button disabled={busy} className="button">
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
