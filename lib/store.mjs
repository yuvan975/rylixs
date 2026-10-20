import { salePrice, couponDiscount } from "./commerce.mjs";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";

const location =
  process.env.RYLIXS_DB_PATH ||
  path.join(process.cwd(), "data", "rylixs.sqlite");
mkdirSync(path.dirname(location), { recursive: true });
export const db = new DatabaseSync(location);
db.exec(`PRAGMA busy_timeout=15000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT 'customer',addresses TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),requestKey TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(userId,requestKey));
CREATE INDEX IF NOT EXISTS orders_user ON orders(userId);
CREATE TABLE IF NOT EXISTS account_flags(userId TEXT PRIMARY KEY REFERENCES users(id),blocked INTEGER NOT NULL DEFAULT 0,lastLogin TEXT);
CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
`);
db.exec(
  `CREATE TABLE IF NOT EXISTS resources(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS coupon_uses(code TEXT NOT NULL,orderId TEXT UNIQUE NOT NULL); CREATE TABLE IF NOT EXISTS identities(subject TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id)); CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY,data TEXT NOT NULL,expires INTEGER NOT NULL);`,
);

const defaults = {
  businessName: "RYLIXS",
  whatsappNumber: process.env.RYLIXS_WHATSAPP_NUMBER || "",
  deliveryCharge: 0,
  freeDeliveryAbove: 0,
  contactEmail: "",
  businessAddress: "",
  instagram: "",
  heroTitle: "DEFINE YOUR STYLE",
  heroSubtitle: "A considered wardrobe. An unmistakable point of view.",
  heroImage: "/hero.jpeg",
  heroButton: "Shop the collection",
  heroDestination: "/shop",
  heroActive: true,
  collectionTitle: "THE ESSENTIAL COLLECTION",
  collectionSubtitle: "Designed for every moment.",
  collectionImage: "/hero1.jpeg",
  collectionDestination: "/shop",
  collectionActive: true,
};
db.prepare("INSERT OR IGNORE INTO settings VALUES(1,?)").run(
  JSON.stringify(defaults),
);
export const statuses = [
  "Pending WhatsApp Confirmation",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];
export function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export function transaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function text(value, name, max = 200, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail(`Please provide a valid ${name}.`);
  return value.trim();
}
export function money(value, name) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 10000000 ||
    Math.abs(Math.round(value * 100) - value * 100) > 0.000001
  )
    fail(`Invalid ${name}.`);
  return value;
}
export function integer(value, name, max = 100000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max)
    fail(`Invalid ${name}.`);
  return value;
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
function passwordMatches(password, stored) {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(
    Buffer.from(hash, "hex"),
    scryptSync(password, salt, 64),
  );
}
export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    addresses: JSON.parse(u.addresses),
  };
}
export function register(input) {
  const email = text(input.email, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Enter a valid email.");
  const password = text(input.password, "password", 128);
  if (password.length < 12)
    fail("Use at least 12 characters for your password.");
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
    fail("An account with that email already exists.");
  const id = randomUUID();
  db.prepare("INSERT INTO users(id,email,password,name) VALUES(?,?,?,?)").run(
    id,
    email,
    hashPassword(password),
    text(input.name, "name", 100),
  );
  return publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(id));
}
export function rateLimit(key, limit = 15) {
  const now = Date.now();
  db.prepare("DELETE FROM attempts WHERE expires<?").run(now);
  const row = db.prepare("SELECT * FROM attempts WHERE key=?").get(key);
  if (row?.count >= limit)
    fail("Too many attempts. Please try again in 15 minutes.", 429);
  db.prepare(
    "INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).run(key, now + 900000);
}
export function login(input, admin = false) {
  const email = text(input.email, "email").toLowerCase();
  rateLimit("login:" + email);
  const password = text(input.password, "password", 128);
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  const dummy = "0123456789abcdef0123456789abcdef:" + "00".repeat(64);
  if (
    !passwordMatches(password, u?.password || dummy) ||
    !u ||
    (admin && u.role !== "admin")
  )
    fail("Email or password is incorrect.", 401);
  return publicUser(u);
}
export function createSession(userId) {
  if (
    db.prepare("SELECT blocked FROM account_flags WHERE userId=?").get(userId)
      ?.blocked
  )
    fail("This account is suspended. Contact the store.", 403);
  db.prepare(
    "INSERT INTO account_flags(userId,lastLogin) VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET lastLogin=excluded.lastLogin",
  ).run(userId, new Date().toISOString());
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    createHash("sha256").update(token).digest("hex"),
    userId,
    Date.now() + 7 * 86400000,
  );
  return token;
}
export function sessionUser(token) {
  if (!token) return null;
  return publicUser(
    db
      .prepare(
        "SELECT u.* FROM users u JOIN sessions s ON u.id=s.userId WHERE s.token=? AND s.expires>? AND NOT EXISTS(SELECT 1 FROM account_flags f WHERE f.userId=u.id AND f.blocked=1)",
      )
      .get(createHash("sha256").update(token).digest("hex"), Date.now()),
  );
}
export function logout(token) {
  if (token)
    db.prepare("DELETE FROM sessions WHERE token=?").run(
      createHash("sha256").update(token).digest("hex"),
    );
}
export function settings() {
  return JSON.parse(
    db.prepare("SELECT data FROM settings WHERE id=1").get().data,
  );
}
export function products(all = false) {
  return db
    .prepare("SELECT data FROM products")
    .all()
    .map((r) => JSON.parse(r.data))
    .filter((p) => all || p.active)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function categories(all = false) {
  return db
    .prepare("SELECT data FROM categories")
    .all()
    .map((r) => JSON.parse(r.data))
    .filter((c) => all || c.active)
    .sort((a, b) => a.order - b.order);
}
export function product(id) {
  const row = db
    .prepare("SELECT data FROM products WHERE id=? OR slug=?")
    .get(id, id);
  return row ? JSON.parse(row.data) : null;
}
export function imageUrl(value) {
  const s = text(value, "image URL", 2000);
  if (!/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(s) && !/^https:\/\//.test(s))
    fail("Images must use HTTPS or a local path.");
  return s;
}
function internalUrl(value) {
  const s = text(value, "destination", 300);
  if (!/^\/(?!\/)[a-zA-Z0-9/?=&%#_-]*$/.test(s))
    fail("Use a local page destination.");
  return s;
}
export function saveProduct(input) {
  const old = input.id ? product(input.id) : null;
  if (old && input.version !== old.version)
    fail(
      "This product changed. Refresh before saving to avoid overwriting stock.",
      409,
    );
  const id = old?.id || randomUUID();
  const slug = text(input.slug, "slug", 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    fail("Use lowercase words separated by hyphens for the slug.");
  const category = text(input.category, "category", 100);
  if (!categories(true).some((c) => c.id === category))
    fail("Choose an existing category.");
  if (
    !Array.isArray(input.variants) ||
    !input.variants.length ||
    input.variants.length > 200
  )
    fail("Add between 1 and 200 stock variants.");
  const variants = input.variants.map((v) => ({
    size: text(v.size || "", "size", 30, false),
    color: text(v.color || "", "colour", 40, false),
    stock: integer(v.stock, "stock"),
    image: v.image ? imageUrl(v.image) : "",
  }));
  if (
    new Set(variants.map((v) => JSON.stringify([v.size, v.color]))).size !==
    variants.length
  )
    fail("Duplicate size and colour combination.");
  if (
    !Array.isArray(input.images) ||
    !input.images.length ||
    input.images.length > 12
  )
    fail("Add between 1 and 12 product images.");
  const p = {
    id,
    version: (old?.version || 0) + 1,
    slug,
    name: text(input.name, "product name", 120),
    brand: text(input.brand || "RYLIXS", "brand", 100),
    deliveryInfo: text(
      input.deliveryInfo || "Delivery estimate confirmed by the store.",
      "delivery information",
      1000,
      false,
    ),
    returnPolicy: text(
      input.returnPolicy ||
        "Contact the store for return eligibility before ordering.",
      "return policy",
      2000,
      false,
    ),
    sku: text(input.sku, "SKU", 80),
    category,
    subcategory: text(input.subcategory || "", "subcategory", 80, false),
    price: money(input.price, "price"),
    compareAt: money(input.compareAt || 0, "original price"),
    description: text(input.description, "description", 5000),
    material: text(input.material || "", "material", 200, false),
    fit: text(input.fit || "", "fit", 100, false),
    care: text(input.care || "", "care instructions", 500, false),
    sizeGuide: text(input.sizeGuide || "", "size guide", 2000, false),
    tags: text(input.tags || "", "tags", 500, false),
    images: input.images.map(imageUrl),
    variants,
    sizes: [...new Set(variants.map((v) => v.size).filter(Boolean))],
    colors: [...new Set(variants.map((v) => v.color).filter(Boolean))],
    active: input.active === true,
    featured: input.featured === true,
    newArrival: input.newArrival === true,
    createdAt: old?.createdAt || new Date().toISOString(),
  };
  if (old) {
    const pending = db
      .prepare("SELECT data FROM orders")
      .all()
      .map((r) => JSON.parse(r.data))
      .filter((o) => !["Delivered", "Cancelled"].includes(o.status));
    for (const o of pending)
      for (const item of o.items)
        if (
          item.productId === id &&
          !variants.some((v) => v.size === item.size && v.color === item.color)
        )
          fail(
            "Keep variants used by open orders until those orders are closed.",
          );
  }
  if (p.compareAt && p.compareAt < p.price)
    fail("Original price cannot be below the selling price.");
  if (
    products(true).some(
      (x) => x.id !== id && (x.sku === p.sku || x.slug === slug),
    )
  )
    fail("SKU and slug must be unique.");
  db.prepare(
    "INSERT INTO products VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,data=excluded.data",
  ).run(id, slug, JSON.stringify(p));
  return p;
}
export function saveCategory(input) {
  const id = input.id || text(input.slug, "slug", 100);
  if (!/^[a-z0-9-]+$/.test(id)) fail("Invalid category slug.");
  const c = {
    id,
    slug: id,
    name: text(input.name, "category name", 100),
    image: input.image ? imageUrl(input.image) : "",
    order: integer(input.order || 0, "display order"),
    active: input.active === true,
  };
  db.prepare(
    "INSERT INTO categories VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
  ).run(id, JSON.stringify(c));
  return c;
}
export function saveSettings(input) {
  const s = { ...settings() };
  for (const k of [
    "businessName",
    "contactEmail",
    "businessAddress",
    "heroTitle",
    "heroSubtitle",
    "heroButton",
    "collectionTitle",
    "collectionSubtitle",
  ])
    if (k in input) s[k] = text(input[k], k, 1000, false);
  for (const k of ["heroImage", "collectionImage"])
    if (k in input) s[k] = imageUrl(input[k]);
  for (const k of ["heroDestination", "collectionDestination"])
    if (k in input) s[k] = internalUrl(input[k]);
  for (const k of ["heroActive", "collectionActive"])
    if (k in input) s[k] = input[k] === true;
  for (const k of ["deliveryCharge", "freeDeliveryAbove"])
    if (k in input) s[k] = money(input[k], k);
  if ("whatsappNumber" in input) {
    const n = text(input.whatsappNumber, "WhatsApp number", 15, false);
    if (n && !/^[1-9]\d{7,14}$/.test(n))
      fail("Use a country code and digits only for WhatsApp.");
    s.whatsappNumber = n;
  }
  if ("instagram" in input) {
    if (
      input.instagram &&
      !/^https:\/\/www\.instagram\.com\/[\w.]+\/?$/.test(input.instagram)
    )
      fail("Use a valid Instagram profile URL.");
    s.instagram = input.instagram;
  }
  db.prepare("UPDATE settings SET data=? WHERE id=1").run(JSON.stringify(s));
  return s;
}
export function address(input) {
  if (!input || typeof input !== "object") fail("Enter your delivery address.");
  const a = {};
  for (const key of ["house", "street", "area", "city", "district", "state"])
    a[key] = text(input[key], key, 150);
  a.pincode = text(input.pincode, "pincode", 6);
  if (!/^[1-9]\d{5}$/.test(a.pincode))
    fail("Enter a valid six digit Indian pincode.");
  a.landmark = text(input.landmark || "", "landmark", 150, false);
  return a;
}
export function updateProfile(user, input) {
  const name = text(input.name, "name", 100),
    phone = text(input.phone || "", "phone", 10, false);
  if (phone && !/^[6-9]\d{9}$/.test(phone))
    fail("Enter a valid ten digit Indian mobile number.");
  if (!Array.isArray(input.addresses) || input.addresses.length > 10)
    fail("Save up to ten addresses.");
  const addresses = input.addresses.map(address);
  db.prepare("UPDATE users SET name=?,phone=?,addresses=? WHERE id=?").run(
    name,
    phone,
    JSON.stringify(addresses),
    user.id,
  );
  return publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(user.id));
}
export function orderList(user) {
  return (
    user.role === "admin"
      ? db.prepare("SELECT data FROM orders ORDER BY rowid DESC").all()
      : db
          .prepare("SELECT data FROM orders WHERE userId=? ORDER BY rowid DESC")
          .all(user.id)
  ).map((r) => JSON.parse(r.data));
}
export function getOrder(user, id) {
  const row = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!row || (user.role !== "admin" && row.userId !== user.id))
    fail("Order not found.", 404);
  return JSON.parse(row.data);
}
function totals(items, s) {
  const subtotal =
    items.reduce((v, i) => v + Math.round(i.unitPrice * 100) * i.quantity, 0) /
    100;
  const deliveryCharge =
    s.freeDeliveryAbove > 0 && subtotal >= s.freeDeliveryAbove
      ? 0
      : s.deliveryCharge;
  return {
    subtotal,
    discount: 0,
    deliveryCharge,
    total: Math.round((subtotal + deliveryCharge) * 100) / 100,
  };
}
export function quote(input) {
  if (
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 100
  )
    fail("Add between 1 and 100 items.");
  const grouped = new Map();
  for (const line of input.items) {
    const id = text(line.id, "product", 100),
      size = text(line.size || "", "size", 30, false),
      color = text(line.color || "", "colour", 40, false),
      quantity = integer(line.quantity, "quantity", 99);
    if (!quantity) fail("Quantity must be at least one.");
    const key = JSON.stringify([id, size, color]);
    const existing = grouped.get(key);
    grouped.set(key, {
      id,
      size,
      color,
      quantity: quantity + (existing?.quantity || 0),
    });
  }
  const items = [...grouped.values()].map((line) => {
    const p = product(line.id);
    if (!p?.active) fail("A product is no longer available.");
    const v = p.variants.find(
      (v) => v.size === line.size && v.color === line.color,
    );
    if (!v) fail(`Select a valid size and colour for ${p.name}.`);
    if (line.quantity > 99 || v.stock < line.quantity)
      fail(
        `Insufficient stock for ${p.name} (${line.size} ${line.color}).`,
        409,
      );
    return {
      productId: p.id,
      productNameSnapshot: p.name,
      imageSnapshot: v.image || p.images[0],
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      originalPrice: Math.max(p.compareAt, p.price),
      unitPrice: salePrice(p),
      totalPrice: (Math.round(salePrice(p) * 100) * line.quantity) / 100,
    };
  });
  const base = totals(items, settings());
  const coupon = couponDiscount(input.couponCode, base.subtotal, items);
  const originalTotal =
    items.reduce(
      (n, i) => n + Math.round(i.originalPrice * 100) * i.quantity,
      0,
    ) / 100;
  const priced = {
    items,
    ...base,
    ...coupon,
    originalTotal,
    productDiscount: Math.round((originalTotal - base.subtotal) * 100) / 100,
    total: Math.round((base.total - coupon.discount) * 100) / 100,
  };
  return {
    ...priced,
    quoteToken: createHash("sha256")
      .update(JSON.stringify(priced))
      .digest("hex"),
  };
}
export function createOrder(user, input) {
  return transaction(() => {
    const requestKey = text(input.requestKey, "request key", 100);
    const prior = db
      .prepare("SELECT data FROM orders WHERE userId=? AND requestKey=?")
      .get(user.id, requestKey);
    if (prior) return JSON.parse(prior.data);
    const s = settings();
    if (!s.whatsappNumber)
      fail(
        "Ordering is temporarily unavailable. Please contact the store.",
        503,
      );
    const customerName = text(input.customerName, "customer name", 100),
      phone = text(input.phone, "phone", 10);
    if (!/^[6-9]\d{9}$/.test(phone))
      fail("Enter a valid ten digit Indian mobile number.");
    const email = text(input.email || "", "email", 200, false);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail("Enter a valid email.");
    const deliveryAddress = address(input.deliveryAddress);
    const priced = quote(input);
    if (input.quoteToken !== priced.quoteToken)
      fail(
        "Prices or delivery charges have changed. Please review your order again.",
        409,
      );
    const now = new Date().toISOString();
    const id =
      "RYX-" +
      now.slice(0, 10).replaceAll("-", "") +
      "-" +
      randomBytes(5).toString("hex").toUpperCase();
    const order = {
      id,
      customerId: user.id,
      customerName,
      phone,
      email,
      deliveryAddress,
      ...priced,
      paymentStatus: "Unpaid",
      refundStatus: "Not requested",
      estimatedDelivery: "",
      status: statuses[0],
      whatsappStatus: "Awaiting customer send",
      whatsappNumber: s.whatsappNumber,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: statuses[0], at: now }],
    };
    for (const item of order.items) {
      const p = product(item.productId);
      p.variants.find(
        (v) => v.size === item.size && v.color === item.color,
      ).stock -= item.quantity;
      p.version = (p.version || 0) + 1;
      db.prepare("UPDATE products SET data=? WHERE id=?").run(
        JSON.stringify(p),
        p.id,
      );
    }
    db.prepare("INSERT INTO orders VALUES(?,?,?,?)").run(
      id,
      user.id,
      requestKey,
      JSON.stringify(order),
    );
    if (order.couponCode)
      db.prepare("INSERT INTO coupon_uses VALUES(?,?)").run(
        order.couponCode,
        id,
      );
    return order;
  });
}
export function updateOrder(user, id, input) {
  return transaction(() => {
    const o = getOrder(user, id);
    if (user.role !== "admin") fail("Unauthorized.", 403);
    if (!statuses.includes(input.status)) fail("Invalid order status.");
    for (const [key, allowed] of [
      ["paymentStatus", ["Unpaid", "Paid"]],
      [
        "refundStatus",
        ["Not requested", "Requested", "Processing", "Refunded"],
      ],
    ]) {
      if (key in input) {
        if (!allowed.includes(input[key])) fail("Invalid " + key);
        o[key] = input[key];
      }
    }
    if ("estimatedDelivery" in input) {
      o.estimatedDelivery = text(
        input.estimatedDelivery,
        "delivery estimate",
        100,
        false,
      );
    }
    if (o.status === input.status) {
      db.prepare("UPDATE orders SET data=? WHERE id=?").run(
        JSON.stringify(o),
        id,
      );
      return o;
    }
    if (["Delivered", "Cancelled"].includes(o.status))
      fail("This order is closed.");
    if (
      input.status !== "Cancelled" &&
      statuses.indexOf(input.status) !== statuses.indexOf(o.status) + 1
    )
      fail("Move to the next stage in the order timeline.");
    if (input.status === "Cancelled")
      for (const item of o.items) {
        const p = product(item.productId);
        if (p) {
          const variant = p.variants.find(
            (v) => v.size === item.size && v.color === item.color,
          );
          if (variant) {
            variant.stock += item.quantity;
            p.version = (p.version || 0) + 1;
            db.prepare("UPDATE products SET data=? WHERE id=?").run(
              JSON.stringify(p),
              p.id,
            );
          }
        }
      }
    o.status = input.status;
    if (o.status === "Confirmed") o.whatsappStatus = "Confirmed by store";
    o.updatedAt = new Date().toISOString();
    o.statusHistory.push({ status: o.status, at: o.updatedAt });
    db.prepare("UPDATE orders SET data=? WHERE id=?").run(
      JSON.stringify(o),
      id,
    );
    return o;
  });
}
export function whatsappLink(order) {
  const rupees = (n) => "INR " + n.toFixed(2);
  const message = `Hello RYLIXS,\nI would like to place an order.\n\nOrder ID: ${order.id}\nDate: ${order.createdAt}\nCustomer: ${order.customerName}\nPhone: ${order.phone}\n\nItems:\n${order.items.map((i, n) => `${n + 1}. ${i.productNameSnapshot}\n   Size: ${i.size || "N/A"} | Colour: ${i.color || "N/A"}\n   Qty: ${i.quantity} | ${rupees(i.unitPrice)} each`).join("\n\n")}\n\nSubtotal: ${rupees(order.subtotal)}\nCoupon: ${order.couponCode || "None"}\nProduct discount: ${rupees(order.productDiscount || 0)}\nCoupon discount: ${rupees(order.discount)}\nDelivery: ${rupees(order.deliveryCharge)}\nTotal: ${rupees(order.total)}\n\nDelivery address:\n${Object.values(order.deliveryAddress).filter(Boolean).join(", ")}\n\nPlease confirm my order.`;
  return `https://wa.me/${order.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
