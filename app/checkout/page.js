"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {User,Phone,Mail,MapPin,House,PackageCheck,ShieldCheck} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { api, useStore, price, Empty } from "@/components/StoreShell";
export const addressFields = [
  "house",
  "street",
  "area",
  "city",
  "district",
  "state",
  "pincode",
  "landmark",
];
export function AddressForm({ value, onChange }) {
  return (
    <div className="form-grid">
      {addressFields.map((k) => (
        <label key={k}>
          <MapPin size={16} aria-hidden="true"/> {k === "house"
            ? "House / door number"
            : k.charAt(0).toUpperCase() + k.slice(1)}
          {k !== "landmark" ? " *" : " (optional)"}
          <input
            required={k !== "landmark"}
            maxLength={k === "pincode" ? 6 : 150}
            pattern={k === "pincode" ? "[1-9][0-9]{5}" : undefined}
            inputMode={k === "pincode" ? "numeric" : undefined}
            value={value[k] || ""}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
export default function Checkout() {
  const { items, clearCart } = useCart(),
    { user, settings } = useStore();
  const [form, setForm] = useState({
      customerName: "",
      phone: "",
      email: "",
      deliveryAddress: {},
    }),
    [quote, setQuote] = useState(null),
    [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState("");
  useEffect(() => {
    if (user)
      setForm((f) => ({
        ...f,
        customerName: user.name,
        phone: user.phone,
        email: user.email,
        deliveryAddress: user.addresses[0] || {},
      }));
  }, [user]);
  const lines = () =>
    items.map((i) => ({
      id: i.id,
      size: i.size,
      color: i.color,
      quantity: i.qty,
    }));
  async function review(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setQuote(
        await api("orders/quote", "POST", {
          items: lines(),
          couponCode: sessionStorage.getItem("rylixs_coupon") || "",
        }),
      );
      setKey(crypto.randomUUID());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function place() {
    setBusy(true);
    setError("");
    try {
      const result = await api("orders", "POST", {
        ...form,
        items: lines(),
        couponCode: quote.couponCode,
        requestKey: key,
        quoteToken: quote.quoteToken,
      });
      setOrder(result);
      clearCart();
      sessionStorage.removeItem("rylixs_coupon");
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (order)
    return (
      <section className="store-section narrow">
        <p className="eyebrow">ORDER CREATED</p>
        <h1>Thank you, {order.order.customerName}.</h1>
        <p>Your order has been created successfully.</p>
        <h2>{order.order.id}</h2>
        <p>
          Please send the order message on WhatsApp to complete your order
          request. The store will confirm availability and delivery with you.
        </p>
        <div className="actions">
          <a
            className="button"
            href={order.whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open WhatsApp ↗
          </a>
          <Link className="button secondary" href={"/orders/" + order.order.id}>
            View order
          </Link>
          <Link href="/shop">Continue shopping</Link>
        </div>
      </section>
    );
  if (!user)
    return (
      <section className="store-section narrow">
        <ShieldCheck size={36}/><h1>Sign in to continue your order</h1>
        <p>
          Your bag is saved. Sign in to add your delivery details, place your order and track its progress.
        </p>
        <Link className="button" href="/login?next=/checkout">
          Sign in to order
        </Link>
      </section>
    );
  if (!items.length) return <Empty title="Your bag is empty." />;
  return (
    <section className="store-section">
      <p className="eyebrow">BAG / DETAILS / {quote ? "REVIEW" : "DELIVERY"}</p>
      <h1>{quote ? "Review your order" : "Delivery details"}</h1><p>Complete your details below. You can review everything before placing your order.</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!settings.whatsappNumber && (
        <p className="error">
          Ordering is temporarily unavailable. The store has not configured
          WhatsApp yet.
        </p>
      )}
      <div className="checkout-layout">
        {!quote ? (
          <form onSubmit={review} className="panel">
            <h2><User size={23}/> Contact details</h2>
            <div className="form-grid">
              {[
                ["customerName", "Full name", "text"],
                ["phone", "Mobile number", "tel"],
                ["email", "Email (optional)", "email"],
              ].map(([k, l, t]) => (
                <label key={k}>
                  {k === "phone" ? <Phone size={17}/> : k === "email" ? <Mail size={17}/> : <User size={17}/>} {l}
                  {k !== "email" ? " *" : ""}
                  <input
                    type={t}
                    required={k !== "email"}
                    value={form[k]}
                    pattern={k === "phone" ? "[6-9][0-9]{9}" : undefined}
                    maxLength={k === "phone" ? 10 : 200}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <h2><House size={23}/> Delivery address</h2>
            {user.addresses.length > 0 && (
              <label>
                Saved address
                <select
                  onChange={(e) =>
                    setForm({
                      ...form,
                      deliveryAddress:
                        e.target.value === "" ? {} : user.addresses[Number(e.target.value)] || {},
                    })
                  }
                >
                  <option value="">Choose a saved address</option>
                  {user.addresses.map((a, i) => (
                    <option key={i} value={i}>
                      {a.house}, {a.city} — {a.pincode}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <AddressForm
              value={form.deliveryAddress}
              onChange={(deliveryAddress) =>
                setForm({ ...form, deliveryAddress })
              }
            />
            <button className="button" disabled={busy}>
              {busy ? "Checking availability…" : "Review order →"}
            </button>
          </form>
        ) : (
          <div className="panel">
            <h2>Order summary</h2>
            {quote.items.map((i, n) => (
              <div className="review-line" key={n}>
                <div>
                  <h3>{i.productNameSnapshot}</h3>
                  <p>
                    {i.size} / {i.color} · Qty {i.quantity}
                  </p>
                </div>
                <strong>{price(i.totalPrice)}</strong>
              </div>
            ))}
            <h2>Delivery to</h2>
            <p>
              {form.customerName} · {form.phone}
            </p>
            <p>{form.email}</p>
            <p>
              {Object.values(form.deliveryAddress).filter(Boolean).join(", ")}
            </p>
            <button onClick={() => setQuote(null)}>Edit details</button>
          </div>
        )}
        <aside className="summary">
          <h2>{quote ? "Ready when you are." : "How it works"}</h2>
          {quote ? (
            <>
              {[
                ["Subtotal", quote.subtotal],
                ["Discount", quote.discount],
                ["Delivery", quote.deliveryCharge],
                ["Grand total", quote.total],
              ].map(([l, v]) => (
                <div key={l} className="total-row">
                  <span>{l}</span>
                  <strong>{price(v)}</strong>
                </div>
              ))}
              <button
                className="button"
                disabled={busy || !settings.whatsappNumber}
                onClick={place}
              >
                {busy ? "Creating order…" : "Place order & send to WhatsApp"}
              </button>
              <p>
                Prices and stock are validated again when your order is saved.
              </p>
            </>
          ) : (
            <p>
              Review your order, then send the prepared message to RYLIXS on
              WhatsApp. Your request will be saved in your account.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
