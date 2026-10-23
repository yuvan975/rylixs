"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ShoppingBag,
  Search,
  Heart,
  Home,
  User,
  Crown,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
} from "lucide-react";
import { useStore, Photo, price, Skeleton } from "@/components/StoreShell";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import BrandSplash from "@/components/BrandSplash";
import "./home.css";

function Banner({ banner, hero = false }) {
  return <article className={`rh-banner rh-image-only ${hero ? "rh-hero" : "rh-promo"}`}>
    <Link href={banner.destination || "/shop"} aria-label="Explore RYLIXS collection">
      <picture>{banner.mobileImage && <source media="(max-width:600px)" srcSet={banner.mobileImage}/>}
        <Photo src={banner.image} alt="RYLIXS collection banner" loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : undefined}/>
      </picture>
    </Link>
  </article>;
}
export default function HomePage() {
  const {
      products,
      categories,
      banners = [],
      settings,
      loading,
      error,
      preview,
      user,
    } = useStore(),
    { count } = useCart(),
    { ids, isSaved, toggle } = useWishlist();
  const [slide, setSlide] = useState(0),
    [notifications, setNotifications] = useState(0);
  const heroes = banners.filter((b) => b.placement === "Hero"),
    promos = banners.filter((b) => ["Offer", "Category"].includes(b.placement));
  const hero = heroes[slide % Math.max(heroes.length, 1)];
  const sold = products
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold);
  const picks = [...products.filter(p=>p.newArrival), ...products.filter(p=>!p.newArrival)].slice(0, 6);
  useEffect(() => {
    if (!user) {
      setNotifications(0);
      return;
    }
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotifications(d?.notifications?.length || 0))
      .catch(() => {});
  }, [user]);
  return (
    <div className="rylixs-home">

      <main className="rh-main">
        <form className="rh-search" action="/shop">
          <Search size={21} />
          <input
            name="q"
            aria-label="Search products"
            placeholder="Search for tops, dresses, jeans & more…"
          />
          <button aria-label="Search collection">
            <ArrowRight size={20} />
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        {hero && (
          <section className="rh-hero-wrap" aria-label="New collection">
            <Banner banner={hero} hero />
            {heroes.length > 1 && (
              <div className="rh-dots">
                {heroes.map((b, i) => (
                  <button
                    key={b.id}
                    aria-label={`Show banner ${i + 1}`}
                    aria-pressed={slide === i}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        {loading && <Skeleton />}
        <nav className="rh-categories" aria-label="Shop by category">
          {categories.map((c, i) => (
            <Link key={c.id} href={"/shop?category=" + c.id}>
              <span className={"rh-category-image tint-" + (i % 6)}>
                <Photo src={c.image} alt="" />
              </span>
              <span>{c.name}</span>
            </Link>
          ))}
          <Link href="/shop" className="rh-all">
            <span className="rh-category-image">
              <ChevronRight />
            </span>
            <span>All</span>
          </Link>
        </nav>
        <section className="rh-products">
          <div className="rh-section-heading">
            <h2>
              New Arrivals
            </h2>
            <Link href="/shop">
              View All <ArrowRight size={15} />
            </Link>
          </div>
          <div className="rh-product-grid">
            {picks.map((p) => (
              <article className="rh-product" key={p.id}>
                <div className="rh-product-photo">
                  <Link href={"/product/" + p.slug}>
                    <Photo src={p.images[0]} alt={p.name} />
                  </Link>
                  <button
                    aria-label={(isSaved(p.id) ? "Remove " : "Save ") + p.name}
                    aria-pressed={isSaved(p.id)}
                    onClick={() => toggle(p.id)}
                  >
                    <Heart
                      size={19}
                      fill={isSaved(p.id) ? "currentColor" : "none"}
                    />
                  </button>
                  {p.compareAt > p.price && (
                    <span className="rh-discount">
                      -{Math.round((1 - p.price / p.compareAt) * 100)}%
                    </span>
                  )}
                </div>
                <h3>
                  <Link href={"/product/" + p.slug}>{p.name}</Link>
                </h3>
                <p className="rh-rating">
                  {p.reviewCount > 0 ? (
                    <>
                      <span>★</span> {p.rating.toFixed(1)}{" "}
                      <small>({p.reviewCount})</small>
                    </>
                  ) : (
                    <span className="rh-new-piece">New collection</span>
                  )}
                </p>
                <p className="rh-price">
                  {price(p.price)}{" "}
                  {p.compareAt > p.price && <del>{price(p.compareAt)}</del>}
                </p>
                <div
                  className="rh-swatches"
                  aria-label={"Available colours: " + p.colors.join(", ")}
                >
                  {p.colors.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      title={c}
                      style={{
                        background:
                          {
                            Ivory: "#e4d6c2",
                            Black: "#111516",
                            Green: "#496348",
                            Cream: "#f5eee3",
                            Blue: "#326592",
                            Sand: "#d3c2a5",
                          }[c] || "#bbb8ae",
                      }}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
          {!loading && !picks.length && (
            <p className="rh-empty">
              A new collection is on its way. Visit again soon.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
