"use client";
import { useState, useEffect } from "react";
import { api, useStore } from "./StoreShell";
export default function Reviews({ productId }) {
  const { user } = useStore(),
    [reviews, setReviews] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("reviews")
      .then((d) =>
        setReviews(d.reviews.filter((r) => r.productId === productId)),
      )
      .catch((e) => setMessage(e.message));
  }, [productId]);
  return (
    <section className="reviews panel">
      <h2>Worn. Loved. Reviewed.</h2>
      {reviews.length ? (
        <>
          <p>
            ★{" "}
            {(
              reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
            ).toFixed(1)}{" "}
            · {reviews.length} verified reviews
          </p>
          {reviews.map((r) => (
            <article key={r.id}>
              <strong>
                {r.name} · {"★".repeat(r.rating)}
              </strong>
              <p>{r.description}</p>
              {r.reply && <blockquote>RYLIXS: {r.reply}</blockquote>}
            </article>
          ))}
        </>
      ) : (
        <p>
          No reviews yet. Be the first to share your experience after delivery.
        </p>
      )}
      {user && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("reviews", "POST", {
                ...Object.fromEntries(new FormData(e.currentTarget)),
                productId,
              });
              setMessage("Thank you. Your review is awaiting moderation.");
            } catch (e) {
              setMessage(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Your rating
            <select name="rating">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Your review
            <textarea name="description" required maxLength={2000} />
          </label>
          <button className="button secondary" disabled={busy}>
            Submit review
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
