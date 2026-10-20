"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/StoreShell";
export default function Notifications() {
  const [rows, setRows] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("notifications")
      .then((d) => setRows(d.notifications))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="store-section narrow">
      <p className="eyebrow">YOUR RYLIXS INBOX</p>
      <h1>A little update.</h1>
      {error ? (
        <p>
          {error} <Link href="/login?next=/notifications">Sign in</Link>
        </p>
      ) : rows.length ? (
        rows.map((n) => (
          <article className="panel" key={n.id}>
            <small>{new Date(n.createdAt).toLocaleString()}</small>
            <h2>{n.title}</h2>
            <p>{n.description}</p>
            {n.id.startsWith("RYX-") && (
              <Link href={"/orders/" + n.id}>View order →</Link>
            )}
          </article>
        ))
      ) : (
        <p>You’re all caught up.</p>
      )}
    </section>
  );
}
