"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ArrowUpRight,
  Package,
} from "lucide-react";
import PageBanner from "./PageBanner";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
const Data = createContext(null);
export async function api(url, method = "GET", body) {
  const res = await fetch("/api/" + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      "The server could not complete your request. Please try again.",
    );
  }
  if (!res.ok) {
    const error = new Error(data.error || "Please try again.");
    error.status = res.status;
    throw error;
  }
  return data;
}
export function useStore() {
  return useContext(Data);
}
export const price = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
export function Photo({ src, alt, ...props }) {
  return (
    <img
      src={src || "/logo.png"}
      alt={alt}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/logo.png";
      }}
      {...props}
    />
  );
}
export function Empty({
  title = "Your next favourite is on its way.",
  text = "Our collection is being prepared. Check back soon.",
}) {
  return (
    <div className="empty">
      <ShoppingBag size={32} />
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button" href="/shop">
        Explore the shop <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Skeleton() {
  return (
    <div
      className="product-grid"
      aria-label="Loading collection"
      aria-busy="true"
    >
      {[1, 2, 3, 4].map((n) => (
        <div className="skeleton" key={n} />
      ))}
    </div>
  );
}
export function Card({ p }) {
  const { isSaved, toggle } = useWishlist();
  const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
  return (
    <article className="shop-card">
      <div className="card-image">
        <Link href={"/product/" + p.slug}>
          <Photo src={p.images[0]} alt={p.name} />
        </Link>
        <button
          className="heart"
          aria-label={(isSaved(p.id) ? "Remove " : "Save ") + p.name}
          aria-pressed={isSaved(p.id)}
          onClick={() => toggle(p.id)}
        >
          <Heart size={18} fill={isSaved(p.id) ? "currentColor" : "none"} />
        </button>
        {!stock ? (
          <span className="tag">Sold out</span>
        ) : p.newArrival ? (
          <span className="tag">New arrival</span>
        ) : null}
      </div>
      <div className="card-meta">
        <span>{p.brand || "RYLIXS"}</span>
        <h3>
          <Link href={"/product/" + p.slug}>{p.name}</Link>
        </h3>
        <p>
          {price(p.price)}{" "}
          {p.compareAt > p.price && (
            <>
              <del>{price(p.compareAt)}</del>
              <small> −{Math.round((1 - p.price / p.compareAt) * 100)}%</small>
            </>
          )}
        </p>
        {p.reviewCount > 0 && (
          <small className="rating">
            ★ {p.rating.toFixed(1)} · {p.reviewCount} reviews
          </small>
        )}
        <div className="card-bottom">
          <span>{p.sizes.join(" · ")}</span>
          <Link
            href={"/product/" + p.slug}
            aria-label={"Choose options for " + p.name}
          >
            Choose options ↗
          </Link>
        </div>
      </div>
    </article>
  );
}
export default function StoreShell({ children }) {
  const [catalog, setCatalog] = useState({
      products: [],
      categories: [],
      settings: {},
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [user, setUser] = useState(null),
    [menu, setMenu] = useState(false);
  const pathname = usePathname(),
    { count } = useCart(),
    { ids } = useWishlist();
  const admin = pathname.startsWith("/admin");
  const refresh = async () => {
    try {
      const data = await api("catalog");
      setCatalog(data);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    api("auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  const nav = [
    ["/", "Home", Home],
    ["/shop", "Shop", Search],
    ["/wishlist", "Wishlist", Heart],
    ["/orders", "My Orders", Package],
    ["/account", "Profile", User],
  ];
  return (
    <Data.Provider
      value={{ ...catalog, loading, error, user, setUser, refresh }}
    >
      {admin || pathname === "/splash" ? children : <div className="storefront">
        <header className="unified-header">
          <Link className="unified-brand" href="/"><img src="/logo-icon.png" alt=""/><span>RYLIXS<small>Wear Your Style</small></span></Link>
          <div className="unified-actions"><Link href="/notifications" aria-label="Notifications"><Bell/></Link><Link href="/cart" aria-label={`Shopping bag, ${count} items`}><ShoppingBag/>{count>0&&<sup>{count}</sup>}</Link><button aria-label={menu?"Close menu":"Open menu"} aria-expanded={menu} aria-controls="store-menu" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div>
        </header>
        {menu && <nav id="store-menu" className="store-menu" aria-label="All pages">{[["/","Home"],["/shop","Shop"],["/wishlist","Wishlist"],["/orders","My Orders"],["/account","Profile"],["/about","Our Story"],["/lookbook","Lookbook"],["/offers","Offers"],["/contact","Contact"],["/notifications","Notifications"],["/admin/login","Store Management"]].map(([url,label])=><Link key={url} href={url} onClick={()=>setMenu(false)}>{label}<ArrowUpRight size={18}/></Link>)}</nav>}
        <main>{({"/orders":"Orders","/wishlist":"Wishlist","/checkout":"Checkout","/offers":"Offers"}[pathname]) && <PageBanner placement={{"/orders":"Orders","/wishlist":"Wishlist","/checkout":"Checkout","/offers":"Offers"}[pathname]}/>} {children}</main>
        <nav className="unified-bottom" aria-label="Main navigation">{nav.map(([href,label,Icon])=><Link key={href} href={href} aria-current={(href==="/"?pathname==="/":pathname.startsWith(href))?"page":undefined}><Icon size={23}/><span>{label}</span></Link>)}</nav>
      </div>}

    </Data.Provider>
  );
}


