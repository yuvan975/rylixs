import {
  db,
  fail,
  text,
  money,
  integer,
  imageUrl,
  product,
  orderList,
} from "./store.mjs";
import { randomUUID } from "node:crypto";
export const resourceKinds = [
  "coupons",
  "offers",
  "banners",
  "reviews",
  "notifications",
];
export function resources(kind, all = false) {
  return db
    .prepare("SELECT data FROM resources WHERE kind=? ORDER BY rowid DESC")
    .all(kind)
    .map((r) => JSON.parse(r.data))
    .filter(
      (r) =>
        all ||
        (r.active &&
          (!r.expires || Date.parse(r.expires) > Date.now()) &&
          (!r.starts || Date.parse(r.starts) <= Date.now()) &&
          (kind !== "reviews" || r.status === "Approved")),
    )
    .sort(
      (a, b) =>
        (a.order || 0) - (b.order || 0) ||
        (b.priority || 0) - (a.priority || 0),
    );
}
function date(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))
    v += "Z";
  if (!v) return "";
  if (!Number.isFinite(Date.parse(v))) fail("Enter a valid date.");
  return new Date(v).toISOString();
}
function choice(v, values) {
  if (!values.includes(v)) fail("Invalid selection.");
  return v;
}
export function saveResource(kind, x) {
  if (!resourceKinds.includes(kind)) fail("Unknown resource.", 404);
  const old = x.id ? resources(kind, true).find((r) => r.id === x.id) : null;
  const r = {
    id: old?.id || randomUUID(),
    active: x.active === true,
    createdAt: old?.createdAt || new Date().toISOString(),
  };
  if (kind === "reviews") {
    if (!old) fail("Reviews must be submitted by customers.");
    Object.assign(r, old, {
      status: choice(x.status, ["Pending", "Approved", "Rejected"]),
      reply: text(x.reply || "", "reply", 2000, false),
      active: true,
    });
  } else {
    r.title = text(x.title, "title", 160);
    r.description = text(x.description || "", "description", 2000, false);
    if (["coupons", "offers"].includes(kind)) {
      r.type = choice(x.type, ["Percentage", "Flat"]);
      r.value = money(Number(x.value), "discount");
      if (r.type === "Percentage" && r.value > 100)
        fail("Percentage cannot exceed 100.");
      r.starts = date(x.starts);
      r.expires = date(x.expires);
      if (r.starts && r.expires && r.starts >= r.expires)
        fail("Expiry must follow start.");
    }
    if (kind === "coupons") {
      r.code = text(x.code, "coupon code", 30).toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(r.code))
        fail("Use letters, digits, underscore or hyphen for coupon codes.");
      if (resources(kind, true).some((c) => c.id !== r.id && c.code === r.code))
        fail("Coupon code already exists.");
      r.categoryId = text(x.categoryId || "", "category", 100, false);
      if(r.categoryId && !db.prepare("SELECT id FROM categories WHERE id=?").get(r.categoryId)) fail("Choose an existing category.");
      r.minimum = money(Number(x.minimum || 0), "minimum purchase");
      r.limit = integer(Number(x.limit || 0), "usage limit");
    }
    if (kind === "offers") {
      r.scope = choice(x.scope, ["All", "Category", "Product"]);
      r.target = text(x.target || "", "target", 100, false);
      if (r.scope !== "All" && !r.target) fail("Choose an offer target.");
      r.priority = integer(Number(x.priority || 0), "priority");
      r.campaign = choice(x.campaign || "Season", [
        "Festival",
        "Season",
        "Flash",
      ]);
    }
    if (kind === "banners") {
      r.eyebrow = text(x.eyebrow || "", "banner label", 100, false);
      r.buttonText = text(x.buttonText || "Shop Now", "button text", 60);
      r.badge = text(x.badge || "", "offer badge", 80, false);
      r.textPosition = choice(x.textPosition || "Left", ["Left", "Right"]);
      r.tone = choice(x.tone || "Dark", ["Dark", "Light"]);
      r.image = imageUrl(x.image);
      r.mobileImage = x.mobileImage ? imageUrl(x.mobileImage) : "";
      r.placement = choice(x.placement || "Hero", [
        "Hero",
        "Shop",
        "CategoryPage",
        "Offer",
        "Category",
      ]);
      r.categoryId = text(x.categoryId || "", "category", 100, false);
      if(r.placement === "CategoryPage" && (!r.categoryId || !db.prepare("SELECT id FROM categories WHERE id=?").get(r.categoryId))) fail("Choose a category for this banner.");
      r.order = integer(Number(x.order || 0), "display order");
      r.destination = text(x.destination || "/shop", "destination", 300);
      if (!/^\/(?!\/)[a-zA-Z0-9/?=&%#_-]*$/.test(r.destination))
        fail("Choose a local store page.");
    }
    if (kind === "notifications")
      r.type = choice(x.type || "General", ["General", "Offer", "Product"]);
  }
  db.prepare(
    "INSERT INTO resources VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
  ).run(kind, r.id, JSON.stringify(r));
  return r;
}
export function deleteResource(kind, id) {
  if (!resourceKinds.includes(kind)) fail("Unknown resource.", 404);
  db.prepare("DELETE FROM resources WHERE kind=? AND id=?").run(kind, id);
}
export function salePrice(p) {
  const offer = resources("offers").find(
    (o) =>
      o.scope === "All" ||
      (o.scope === "Category" && o.target === p.category) ||
      (o.scope === "Product" && o.target === p.id),
  );
  if (!offer) return p.price;
  return Math.max(
    0,
    Math.round(
      (p.price -
        (offer.type === "Percentage"
          ? (p.price * offer.value) / 100
          : offer.value)) *
        100,
    ) / 100,
  );
}
export function couponDiscount(code, subtotal, items = []) {
  if (!code) return { couponCode: "", discount: 0 };
  const c = resources("coupons").find(
    (c) => c.code === String(code).trim().toUpperCase(),
  );
  if (!c) fail("Coupon is invalid or expired.");
  const eligible = c.categoryId ? Math.round(items.filter(i => product(i.productId)?.category === c.categoryId).reduce((n,i)=>n+i.totalPrice,0)*100)/100 : subtotal;
  if(c.categoryId && eligible <= 0) fail("This coupon applies only to its selected category.");
  if (eligible < c.minimum) fail("Coupon minimum purchase is INR " + c.minimum);
  const uses = db
    .prepare("SELECT count(*) n FROM coupon_uses WHERE code=?")
    .get(c.code).n;
  if (c.limit && uses >= c.limit) fail("Coupon usage limit reached.");
  return {
    couponCode: c.code,
    discount: Math.min(
      eligible,
      Math.round(
        (c.type === "Percentage" ? (eligible * c.value) / 100 : c.value) * 100,
      ) / 100,
    ),
  };
}
export function submitReview(user, x) {
  const p = product(text(x.productId, "product", 100));
  if (!p) fail("Product not found.", 404);
  if (
    !orderList({ ...user, role: "customer" }).some(
      (o) =>
        o.status === "Delivered" && o.items.some((i) => i.productId === p.id),
    )
  )
    fail("Reviews are available after delivery.", 403);
  if (
    resources("reviews", true).some(
      (r) => r.userId === user.id && r.productId === p.id,
    )
  )
    fail("You have already reviewed this product.");
  const rating = integer(Number(x.rating), "rating", 5);
  if (!rating) fail("Choose 1 to 5 stars.");
  const r = {
    id: randomUUID(),
    productId: p.id,
    userId: user.id,
    name: user.name,
    rating,
    description: text(x.description, "review", 2000),
    status: "Pending",
    reply: "",
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO resources VALUES(?,?,?)").run(
    "reviews",
    r.id,
    JSON.stringify(r),
  );
  return r;
}
export function enrichedProducts(list) {
  const reviews = resources("reviews");
  const units = {};
  for (const row of db.prepare("SELECT data FROM orders").all()) {
    const o = JSON.parse(row.data);
    if (o.status === "Delivered")
      for (const i of o.items)
        units[i.productId] = (units[i.productId] || 0) + i.quantity;
  }
  return list.map((p) => {
    const rs = reviews.filter((r) => r.productId === p.id);
    const price = salePrice(p);
    return {
      ...p,
      price,
      compareAt: Math.max(p.compareAt, price < p.price ? p.price : 0),
      rating: rs.length ? rs.reduce((n, r) => n + r.rating, 0) / rs.length : 0,
      reviewCount: rs.length,
      unitsSold: units[p.id] || 0,
    };
  });
}
export function removeProduct(id) {
  if (
    db
      .prepare("SELECT data FROM orders")
      .all()
      .some((r) => {
        const o = JSON.parse(r.data);
        return (
          !["Cancelled", "Delivered"].includes(o.status) &&
          o.items.some((i) => i.productId === id)
        );
      })
  )
    fail("Close open orders before deleting this product.");
  db.prepare("DELETE FROM products WHERE id=?").run(id);
}
export function removeCategory(id) {
  if (
    db
      .prepare("SELECT data FROM products")
      .all()
      .some((r) => JSON.parse(r.data).category === id)
  )
    fail("Move products to another category first.");
  db.prepare("DELETE FROM categories WHERE id=?").run(id);
}

export function reorderBanner(id, direction) {
  if (!["up", "down"].includes(direction)) fail("Choose a valid direction.");
  const list = resources("banners", true),
    index = list.findIndex((b) => b.id === id);
  if (index < 0) fail("Banner not found.", 404);
  const target = index + (direction === "up" ? -1 : 1);
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  for (const [order, banner] of list.entries())
    saveResource("banners", { ...banner, order });
}
