"use client";
import { useEffect, useRef, useState } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ShopFilters from "./ShopFilters";
import { SlidersHorizontal } from "lucide-react";
import { useStore, Card, Empty, Skeleton, Photo } from "./StoreShell";
export default function Catalog({ wishlist = false }) {
  const { products, categories, banners = [], coupons = [], offers = [], loading, error } = useStore(),
    params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || ""),
    [category, setCategory] = useState(params.get("category") || ""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [sub, setSub] = useState(""),
    [max, setMax] = useState(""),
    [min, setMin] = useState(""),
    [available, setAvailable] = useState(false),
    [discount, setDiscount] = useState(params.get("offers") === "1"),
    [sort, setSort] = useState("recommended"),
    [page, setPage] = useState(1);
  const dialog = useRef(null);
  const [couponNotice,setCouponNotice]=useState("");
  useEffect(()=>{setCategory(params.get("category")||"");setCouponNotice("");},[params]);
  const [extra, setExtra] = useState({fit:"",sleeve:"",occasion:"",percent:"",deal:""});
  const [brand, setBrand] = useState(""),
    [rating, setRating] = useState(""),
    [fresh, setFresh] = useState(false),
    [recent, setRecent] = useState([]);
  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("rylixs_searches") || "[]"));
    } catch {}
  }, []);
  function remember() {
    if (!q.trim()) return;
    const next = [q.trim(), ...recent.filter((s) => s !== q.trim())].slice(
      0,
      6,
    );
    setRecent(next);
    localStorage.setItem("rylixs_searches", JSON.stringify(next));
  }
  const { ids } = useWishlist();
  const results = products
    .filter(
      (p) =>
        (!wishlist || ids.includes(p.id)) &&
        (!extra.fit || (p.fit||"").toLowerCase().includes(extra.fit.toLowerCase())) &&
        (!extra.sleeve || (p.tags||"").toLowerCase().includes(extra.sleeve.toLowerCase())) &&
        (!extra.occasion || (p.tags||"").toLowerCase().includes(extra.occasion.toLowerCase())) &&
        (!extra.percent || (p.compareAt > 0 && (p.compareAt-p.price)/p.compareAt*100 >= extra.percent)) &&
        (!extra.deal || (extra.deal === "Top Rated" ? p.rating >= 4 : extra.deal === "Best Seller" ? p.unitsSold > 0 : extra.deal === "New Arrival" ? p.newArrival : offers.some(o => o.expires && (o.scope === "All" || (o.scope === "Category" && o.target === p.category) || (o.scope === "Product" && o.target === p.id))) && p.compareAt > p.price)) &&
        (!brand || (p.brand || "RYLIXS") === brand) &&
        (!rating || p.rating >= Number(rating)) &&
        (!fresh || p.newArrival) &&
        (!category || p.category === category) &&
        (!params.get("new") || p.newArrival) &&
        (!params.get("featured") || p.featured) &&
        (!sub || p.subcategory === sub) &&
        (!size || p.sizes.includes(size)) &&
        (!color || p.colors.includes(color)) &&
        (!max || p.price <= Number(max)) &&
        (!min || p.price >= Number(min)) &&
        (!available || p.variants.some((v) => v.stock > 0)) &&
        (!discount || p.compareAt > p.price) &&
        q
          .toLowerCase()
          .split(/\s+/)
          .every((word) =>
            [p.name, p.sku, p.category, p.tags, p.description, ...p.colors]
              .join(" ")
              .toLowerCase()
              .includes(word),
          ),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "newest"
              ? b.createdAt.localeCompare(a.createdAt)
              : Number(b.featured) - Number(a.featured),
    );
  const values={category,brand,size,color,min,max,available,discount,rating,fresh,sub};
  const setters={category:setCategory,brand:setBrand,size:setSize,color:setColor,min:setMin,max:setMax,available:setAvailable,discount:setDiscount,rating:setRating,fresh:setFresh,sub:setSub};
  function clear(){for(const [k,set] of Object.entries(setters))set(typeof values[k]==="boolean"?false:"");setExtra({fit:"",sleeve:"",occasion:"",percent:"",deal:""});setPage(1);}
  return (
    <section className={`store-section ${wishlist ? "" : "clean-shop"}`}>
      {!wishlist && <div className="shop-banners">{banners.filter(b=>category ? b.placement==="CategoryPage" && b.categoryId===category : b.placement==="Shop").map(b=><article key={b.id} className="shop-promo shop-image-only"><Link href={b.destination||"/shop"} aria-label="Explore RYLIXS collection"><picture>{b.mobileImage&&<source media="(max-width:600px)" srcSet={b.mobileImage}/>}<Photo src={b.image} alt="RYLIXS collection banner" loading="eager"/></picture></Link></article>)}</div>}
      {wishlist && <>
      <p className="eyebrow">THE RYLIXS WARDROBE</p>
      <h1>{wishlist ? "Your saved edit." : "Discover your next favourite."}</h1>
      <div className="search-row">
        <label className="search-field">
          Search the collection
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Try a name, SKU, colour or category"
            list="suggestions"
            onBlur={remember}
          />
          <datalist id="suggestions">
            {q &&
              results
                .slice(0, 6)
                .map((p) => <option key={p.id}>{p.name}</option>)}
          </datalist>
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {[
              ["recommended", "Recommended"],
              ["newest", "Newest"],
              ["low", "Price: low to high"],
              ["high", "Price: high to low"],
              ["name", "Name"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="search-chips">
        <span>Recent searches</span>
        {recent.map((term) => (
          <button key={term} onClick={() => setQ(term)}>
            {term}
          </button>
        ))}
        <span>Explore</span>
        {categories.slice(0, 4).map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      </>}
      {!wishlist && category && <section className="category-offers" aria-label="Category coupons"><h2>{categories.find(c=>c.id===category)?.name || "Category"} offers</h2><div>{coupons.filter(c=>c.categoryId===category).map(c=><article key={c.id}><div><strong>{c.title}</strong><p>{c.type==="Percentage"?`${c.value}% off`:`₹${c.value} off`} · Min. ₹{c.minimum}</p></div><button onClick={()=>{sessionStorage.setItem("rylixs_coupon",c.code);setCouponNotice(`Coupon ${c.code} saved for checkout.`);}}>{c.code} <span>Use coupon</span></button></article>)}</div>{!coupons.some(c=>c.categoryId===category)&&<p>No category coupons right now.</p>}{couponNotice&&<p role="status">{couponNotice}</p>}</section>}
      <div className="shop-filter-toolbar">
        {!wishlist && <p className="shop-product-count" aria-live="polite">{loading ? "Loading collection…" : `${results.length} products`}</p>}
      <button
        className="shop-filter-trigger"
        aria-label="Filters"
        onClick={() => dialog.current.showModal()}
      >
        <SlidersHorizontal size={18}/> Filters
      </button>
      </div>
      <div className="catalog-layout drawer-catalog" id="shop-products">
        <ShopFilters dialog={dialog} products={products} categories={categories} values={values} setters={setters} extra={extra} setExtra={setExtra} count={results.length} clear={clear}/>

        <div>
          {error ? (
            <p role="alert">{error}</p>
          ) : loading ? (
            <Skeleton />
          ) : (
            <>
              {wishlist && <p className="result-count" aria-live="polite">
                {results.length} products found
              </p>}
              {results.length ? (
                <>
                  <div className="product-grid">
                    {results.slice(0, page * 24).map((p) => (
                      <Card key={p.id} p={p} />
                    ))}
                  </div>
                  {results.length > page * 24 && (
                    <button
                      className="button"
                      onClick={() => setPage(page + 1)}
                    >
                      Load more
                    </button>
                  )}
                </>
              ) : (
                <Empty
                  title={
                    wishlist
                      ? "Save your favourites here."
                      : "We couldn't find what you're looking for."
                  }
                  text="Explore the collection or try another filter."
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}


