"use client";
import { useEffect, useState } from "react";
import { api, price } from "./StoreShell";
export default function CartTotals({ items, user }) {
  const [code, setCode] = useState(""),
    [applied, setApplied] = useState(""),
    [quote, setQuote] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    setApplied(sessionStorage.getItem("rylixs_coupon") || "");
    setCode(sessionStorage.getItem("rylixs_coupon") || "");
  }, []);
  useEffect(() => {
    if (!user || !items.length) return;
    let current = true;
    setQuote(null);
    api("orders/quote", "POST", {
      items: items.map((i) => ({
        id: i.id,
        size: i.size,
        color: i.color,
        quantity: i.qty,
      })),
      couponCode: applied,
    })
      .then((q) => {
        if (current) {
          setQuote(q);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [items, user, applied]);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(code.trim().toUpperCase());
          sessionStorage.setItem("rylixs_coupon", code.trim().toUpperCase());
        }}
      >
        <label>
          Have a coupon?
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter coupon code"
            maxLength={30}
          />
        </label>
        <div className="actions">
          <button className="button secondary">Apply coupon</button>
          {applied && (
            <button
              type="button"
              onClick={() => {
                setCode("");
                setApplied("");
                sessionStorage.removeItem("rylixs_coupon");
              }}
            >
              Remove
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {quote &&
        [
          ["Original price", quote.originalTotal],
          ["Product discount", -quote.productDiscount],
          ["Coupon discount", -quote.discount],
          ["Shipping", quote.deliveryCharge],
          ["Grand total", quote.total],
        ].map(([label, n]) => (
          <div key={label} className="total-row">
            <span>{label}</span>
            <strong>{price(n)}</strong>
          </div>
        ))}
    </>
  );
}
