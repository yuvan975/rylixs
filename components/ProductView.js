"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Share2, Plus, Shirt, Palette, Circle, Scissors } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useStore, Photo, price, Card } from "./StoreShell";
import Reviews from "./Reviews";
export default function ProductView({ product: initial }) {
  const { products, user } = useStore(),
    p = products.find((p) => p.id === initial.id) || initial,
    { addItem, setDrawerOpen } = useCart(),
    { toggle, isSaved } = useWishlist(),
    router = useRouter();
  const [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [qty, setQty] = useState(1),
    [index, setIndex] = useState(0),
    [message, setMessage] = useState(""),
    [zoom, setZoom] = useState(false),
    [touch, setTouch] = useState(null);
  const v = p.variants.find((v) => v.size === size && v.color === color),
    images = v?.image
      ? [v.image, ...p.images.filter((i) => i !== v.image)]
      : p.images;
  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem("rylixs_recent") || "[]");
      localStorage.setItem(
        "rylixs_recent",
        JSON.stringify([p.id, ...old.filter((id) => id !== p.id)].slice(0, 12)),
      );
    } catch {}
  }, [p.id]);
  useEffect(() => {
    if (!user) return;
    try {
      const pending = JSON.parse(
        sessionStorage.getItem("rylixs_pending_add") || "null",
      );
      if (pending?.id === p.id) {
        sessionStorage.removeItem("rylixs_pending_add");
        const v = p.variants.find(
          (v) => v.size === pending.size && v.color === pending.color,
        );
        setSize(pending.size);
        setColor(pending.color);
        if (v && v.stock >= pending.qty) {
          addItem(p, pending);
          setDrawerOpen(false);
          setMessage("Added to your cart.");
          if (pending.buy) router.push("/cart");
        } else setMessage("This selection is no longer available.");
      }
    } catch {}
  }, [user, p.id]);
  function add(buy = false) {
    if (p.sizes.length && !size) return setMessage("Please choose a size.");
    if (p.colors.length && !color) return setMessage("Please choose a colour.");
    if (!v || v.stock < qty)
      return setMessage("This selection is out of stock.");
    addItem(p, { size, color, qty });
    setDrawerOpen(false);
    setMessage("Added to your cart.");
    if (buy) router.push(user ? "/checkout" : "/login?next=/checkout");
  }
  return (
    <section className="store-section product-reference">
      <p className="breadcrumb">
        <Link href="/shop">Shop</Link> / {p.category} / {p.name}
      </p>
      <div className="product-detail">
        <div>
          <button
            className={"main-photo " + (zoom ? "is-zoomed" : "")}
            aria-label="Toggle image zoom"
            onClick={() => setZoom(!zoom)}
            onTouchStart={(e) => setTouch(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (
                touch !== null &&
                Math.abs(e.changedTouches[0].clientX - touch) > 40
              )
                setIndex(
                  (index +
                    (e.changedTouches[0].clientX < touch
                      ? 1
                      : images.length - 1)) %
                    images.length,
                );
            }}
          >
            <Photo
              loading="eager"
              src={images[index % images.length]}
              alt={p.name}
            />
          </button>
          <div className="thumbnails">
            {images.map((src, i) => (
              <button
                key={src + i}
                aria-label={"View image " + (i + 1)}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                <Photo src={src} alt={p.name} />
              </button>
            ))}
          </div>
        </div>
        <div className="product-info">
          <p className="eyebrow">{p.brand || "RYLIXS"} / THE CONSIDERED EDIT</p>
          <h1>{p.name}</h1>
          <p>
            {p.reviewCount
              ? "★ " + p.rating.toFixed(1) + " · " + p.reviewCount + " reviews"
              : "A new addition to your wardrobe"}
          </p>
          <p className="product-price">
            {price(p.price)}{" "}
            {p.compareAt > p.price && (
              <>
                <del>{price(p.compareAt)}</del>
                <small>
                  {" "}
                  {Math.round((1 - p.price / p.compareAt) * 100)}% off
                </small>
              </>
            )}
          </p>
          <div className="product-features">{[[Palette,p.material||"Selected fabric"],[Shirt,p.fit||"Everyday style"],[Circle,"Details & care"],[Scissors,"RYLIXS edit"]].map(([Icon,label])=><div key={label}><Icon size={22}/><span>{label}</span></div>)}</div>
          {p.colors.length > 0 && (
            <fieldset>
              <legend>Colour · {color || "Choose your shade"}</legend>
              <div className="options">
                {p.colors.map((c) => (
                  <button
                    key={c}
                    aria-pressed={color === c}
                    onClick={() => {
                      setColor(c);
                      setIndex(0);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {p.sizes.length > 0 && (
            <fieldset>
              <legend>Size · {size || "Find your fit"}</legend>
              <div className="options">
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    aria-pressed={size === s}
                    disabled={
                      !p.variants.some(
                        (v) =>
                          v.size === s &&
                          (!color || v.color === color) &&
                          v.stock > 0,
                      )
                    }
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {p.sizeGuide && (
            <details>
              <summary>Size guide</summary>
              <p>{p.sizeGuide}</p>
            </details>
          )}
          <p className="stock">
            {v
              ? v.stock > 0
                ? v.stock + " available"
                : "Out of stock"
              : "Choose size and colour to check stock"}
          </p>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              max={Math.min(v?.stock || 99, 99)}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Math.min(99, Number(e.target.value))))
              }
            />
          </label>
          <p role="status">
            {message}{" "}
            {message.includes("Added") && <Link href="/cart">View cart →</Link>}
          </p>
          <div className="product-actions">
            <button className="button" onClick={() => add()}>
              Add to cart <Plus size={16} />
            </button>
            <button className="button secondary" onClick={() => add(true)}>
              Buy now →
            </button>
            <button
              className="button secondary"
              aria-label="Save to wishlist"
              aria-pressed={isSaved(p.id)}
              onClick={() => toggle(p.id)}
            >
              <Heart size={18} fill={isSaved(p.id) ? "currentColor" : "none"} /> Wishlist
            </button>
            <button
              className="button secondary"
              aria-label="Share product"
              onClick={async () => {
                try {
                  if (navigator.share)
                    await navigator.share({
                      title: p.name,
                      url: location.href,
                    });
                  else {
                    await navigator.clipboard.writeText(location.href);
                    setMessage("Link copied.");
                  }
                } catch {
                  setMessage(
                    "Use your browser’s share menu to share this page.",
                  );
                }
              }}
            >
              <Share2 size={18} /> Share
            </button>
          </div>
          <details>
            <summary>Details & care</summary><p>{p.description}</p>
            {[
              ["Material", p.material],
              ["Fit", p.fit],
              ["Care", p.care],
              ["SKU", p.sku],
            ].map(
              ([k, v]) =>
                v && (
                  <p key={k}>
                    <strong>{k}:</strong> {v}
                  </p>
                ),
            )}
          </details>
          <details>
            <summary>Delivery & returns</summary>
            <p>
              {p.deliveryInfo || "Delivery estimate confirmed by the store."}
            </p>
            <p>
              {p.returnPolicy ||
                "Contact the store for return eligibility before ordering."}
            </p>
          </details>
        </div>
      </div>
      <Reviews productId={p.id} />
      <div className="related">
        <h2>You may also like.</h2>
        <div className="product-grid">
          {products
            .filter((x) => x.id !== p.id && x.category === p.category)
            .slice(0, 4)
            .map((x) => (
              <Card key={x.id} p={x} />
            ))}
        </div>
      </div>
    </section>
  );
}
