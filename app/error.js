"use client";
import Link from "next/link";
export default function ErrorPage({ reset }) {
  return (
    <section className="store-section narrow">
      <h1>Something went wrong.</h1>
      <p>
        Please try again. If you were placing an order, check Your orders before
        submitting another request.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link className="button secondary" href="/orders">
        Your orders
      </Link>
    </section>
  );
}
