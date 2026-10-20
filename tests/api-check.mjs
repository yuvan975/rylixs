import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://localhost:3100";
let passed = 0;
async function request(
  route,
  { method = "GET", body, cookie = "", origin = base } = {},
) {
  const res = await fetch(base + "/api/" + route, {
    method,
    headers: {
      ...(method !== "GET"
        ? { "Content-Type": "application/json", Origin: origin }
        : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return {
    status: res.status,
    data,
    cookie: res.headers.get("set-cookie")?.split(";")[0],
    headers: res.headers,
  };
}
function check(name, fn) {
  fn();
  passed++;
  console.log("PASS " + name);
}
const catalog = await request("catalog");
check("public catalogue uses persistent product data", () =>
  assert.equal(catalog.data.products.length, 4),
);
const p = catalog.data.products[0];
const anon = await request("admin/data");
check("anonymous admin API denied", () => assert.equal(anon.status, 403));
const badOrigin = await request("auth/login", {
  method: "POST",
  origin: "https://evil.example",
  body: { email: "admin@rylixs.test", password: "Local-test-only-123!" },
});
check("cross-origin mutations denied", () =>
  assert.equal(badOrigin.status, 403),
);
const customer = await request("auth/login", {
  method: "POST",
  body: { email: "customer@rylixs.test", password: "Local-test-only-123!" },
});
check("customer login and HTTP-only cookie", () => {
  assert.equal(customer.status, 200);
  assert.ok(customer.cookie);
  assert.match(customer.headers.get("set-cookie"), /HttpOnly/i);
});
const cc = customer.cookie;
const forbidden = await request("admin/data", { cookie: cc });
check("customer admin API denied", () => assert.equal(forbidden.status, 403));
const fakeAdmin = await request("admin/products", {
  method: "POST",
  cookie: cc,
  body: { role: "admin", ...p, price: 1 },
});
check("client admin role injection denied", () =>
  assert.equal(fakeAdmin.status, 403),
);
const customerAdmin = await request("admin/login", {
  method: "POST",
  body: { email: "customer@rylixs.test", password: "Local-test-only-123!" },
});
check("customer admin login denied", () =>
  assert.equal(customerAdmin.status, 401),
);
const admin = await request("admin/login", {
  method: "POST",
  body: { email: "admin@rylixs.test", password: "Local-test-only-123!" },
});
check("admin login works", () => assert.equal(admin.status, 200));
const ac = admin.cookie;
const items = [{ id: p.id, size: "M", color: "Black", quantity: 1, price: 1 }],
  quote = await request("orders/quote", {
    method: "POST",
    cookie: cc,
    body: { items },
  });
check("server quote ignores client price", () =>
  assert.equal(quote.data.subtotal, p.price),
);
const orderBody = {
  items,
  quoteToken: quote.data.quoteToken,
  requestKey: crypto.randomUUID(),
  customerName: "API Test",
  phone: "9000000000",
  email: "test@example.test",
  deliveryAddress: {
    house: "1",
    street: "Test Street",
    area: "Test Area",
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
  },
  total: 1,
};
const created = await request("orders", {
  method: "POST",
  cookie: cc,
  body: orderBody,
});
check("order saved before WhatsApp link is returned", () => {
  assert.equal(created.status, 201);
  assert.equal(created.data.order.total, quote.data.total);
  assert.equal(new URL(created.data.whatsappUrl).hostname, "wa.me");
});
const order = created.data.order;
const repeat = await request("orders", {
  method: "POST",
  cookie: cc,
  body: orderBody,
});
check("order retry is idempotent", () =>
  assert.equal(repeat.data.order.id, order.id),
);
const adminData = await request("admin/data", { cookie: ac });
check("same order visible to admin", () =>
  assert.ok(adminData.data.orders.some((o) => o.id === order.id)),
);
const another = await request("auth/register", {
  method: "POST",
  body: {
    name: "Other API User",
    email: "other-" + Date.now() + "@example.test",
    password: "Local-test-only-123!",
  },
});
const privateOrder = await request("orders/" + order.id, {
  cookie: another.cookie,
});
check("order IDOR is blocked", () => assert.equal(privateOrder.status, 404));
for (const quantity of [-1, 0, 100, 1.5]) {
  const r = await request("orders/quote", {
    method: "POST",
    cookie: cc,
    body: { items: [{ ...items[0], quantity }] },
  });
  check("reject quantity " + quantity, () => assert.equal(r.status, 400));
}
const soldOut = await request("orders/quote", {
  method: "POST",
  cookie: cc,
  body: { items: [{ ...items[0], color: "Ivory" }] },
});
check("sold-out variant blocked", () => assert.equal(soldOut.status, 409));
const stale = await request("admin/products", {
  method: "POST",
  cookie: ac,
  body: p,
});
check("stale product edit cannot restore reserved stock", () =>
  assert.equal(stale.status, 409),
);
const confirmed = await request("admin/orders/" + order.id, {
  method: "PUT",
  cookie: ac,
  body: { status: "Confirmed" },
});
check("admin confirms persisted order", () =>
  assert.equal(confirmed.data.order.status, "Confirmed"),
);
for (const status of [
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
]) {
  const r = await request("admin/orders/" + order.id, {
    method: "PUT",
    cookie: ac,
    body: { status },
  });
  check("status transition " + status, () =>
    assert.equal(r.data.order.status, status),
  );
}
const updated = await request("orders/" + order.id, { cookie: cc });
check("customer sees full delivery timeline", () =>
  assert.equal(updated.data.order.statusHistory.length, 7),
);
const form = new FormData();
form.append(
  "file",
  new Blob([await readFile("public/hero.jpeg")], { type: "image/jpeg" }),
  "hero.jpeg",
);
const uploadRes = await fetch(base + "/api/admin/upload", {
  method: "POST",
  headers: { Cookie: ac, Origin: base },
  body: form,
});
const upload = await uploadRes.json();
check("admin image upload optimizes actual image", () =>
  assert.equal(uploadRes.status, 200),
);
const media = await fetch(base + upload.url);
check("new upload is publicly served in production", () => {
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/webp");
});
const fake = new FormData();
fake.append(
  "file",
  new Blob(["not an image"], { type: "image/jpeg" }),
  "fake.jpg",
);
const invalid = await fetch(base + "/api/admin/upload", {
  method: "POST",
  headers: { Cookie: ac, Origin: base },
  body: fake,
});
check("fake image rejected", () => assert.equal(invalid.status, 400));
await request("auth/logout", { method: "POST", cookie: cc, body: {} });
const expired = await request("orders", { cookie: cc });
check("logout revokes server session", () => assert.equal(expired.status, 401));
console.log(`${passed} API checks passed. Test order: ${order.id}`);
