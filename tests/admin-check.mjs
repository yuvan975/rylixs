import assert from "node:assert/strict";
const base = "http://localhost:3100";
let passed = 0;
async function call(route, method = "GET", body, cookie) {
  const r = await fetch(base + "/api/" + route, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const a = await call("admin/login", "POST", {
    email: "admin@rylixs.test",
    password: "Local-test-only-123!",
  }),
  c = await call("auth/login", "POST", {
    email: "customer@rylixs.test",
    password: "Local-test-only-123!",
  });
const ac = a.cookie,
  cc = c.cookie;
function check(name, fn) {
  fn();
  passed++;
  console.log("PASS " + name);
}
const slug = "qa-" + Date.now();
let r = await call(
  "admin/categories",
  "POST",
  { slug, name: "QA Category", active: true, order: 3, image: "/hero.jpeg" },
  ac,
);
check("category create", () => assert.equal(r.status, 200));
const category = r.data.category;
r = await call(
  "admin/categories",
  "POST",
  { ...category, name: "QA Category Edited" },
  ac,
);
check("category edit", () =>
  assert.equal(r.data.category.name, "QA Category Edited"),
);
r = await call(
  "admin/products",
  "POST",
  {
    name: "QA Product",
    slug,
    sku: slug,
    category: slug,
    price: 19.99,
    description: "Disposable QA product",
    active: true,
    images: ["/hero.jpeg"],
    variants: [{ size: "", color: "", stock: 1 }],
  },
  ac,
);
check("create sizeless product with decimal price", () =>
  assert.equal(r.status, 200),
);
let p = r.data.product;
const items = [{ id: p.id, size: "", color: "", quantity: 1 }];
let q = await call("orders/quote", "POST", { items }, cc);
const oldToken = q.data.quoteToken;
r = await call("admin/products", "POST", { ...p, price: 29.99 }, ac);
check("product price update", () => assert.equal(r.status, 200));
p = r.data.product;
const body = {
  items,
  quoteToken: oldToken,
  requestKey: crypto.randomUUID(),
  customerName: "QA Customer",
  phone: "9000000000",
  deliveryAddress: {
    house: "1",
    street: "Test Street",
    area: "Test Area",
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
  },
};
r = await call("orders", "POST", body, cc);
check("price change forces a fresh review", () => assert.equal(r.status, 409));
q = await call("orders/quote", "POST", { items }, cc);
const race = await Promise.all(
  [1, 2].map(() =>
    call(
      "orders",
      "POST",
      {
        ...body,
        quoteToken: q.data.quoteToken,
        requestKey: crypto.randomUUID(),
      },
      cc,
    ),
  ),
);
check("concurrent requests cannot oversell last item", () =>
  assert.deepEqual(race.map((x) => x.status).sort(), [201, 409]),
);
const order = race.find((x) => x.status === 201).data.order;
r = await call("admin/orders/" + order.id, "PUT", { status: "Cancelled" }, ac);
check("cancel an order", () => assert.equal(r.data.order.status, "Cancelled"));
let data = await call("admin/data", "GET", undefined, ac);
p = data.data.products.find((x) => x.id === p.id);
check("cancellation restores last item", () =>
  assert.equal(p.variants[0].stock, 1),
);
r = await call(
  "admin/products",
  "POST",
  { ...p, variants: [{ size: "", color: "", stock: 7 }] },
  ac,
);
check("inventory update", () =>
  assert.equal(r.data.product.variants[0].stock, 7),
);
p = r.data.product;
r = await call("admin/products", "POST", { ...p, active: false }, ac);
check("product deactivation", () => assert.equal(r.data.product.active, false));
r = await call("catalog");
check("deactivated products disappear from storefront", () =>
  assert.ok(!r.data.products.some((x) => x.id === p.id)),
);
r = await call("admin/categories", "POST", { ...category, active: false }, ac);
check("category deactivation", () =>
  assert.equal(r.data.category.active, false),
);
const prior = data.data.settings;
r = await call(
  "admin/settings",
  "PUT",
  { heroTitle: "QA banner title", heroButton: "QA shop", deliveryCharge: 59 },
  ac,
);
check("homepage and delivery settings persist", () =>
  assert.equal(r.data.settings.heroTitle, "QA banner title"),
);
r = await call("catalog");
check("homepage updates reach customer API", () =>
  assert.equal(r.data.settings.deliveryCharge, 59),
);
await call("admin/settings", "PUT", prior, ac);
r = await call(
  "profile",
  "PUT",
  {
    name: "Test Customer",
    phone: "9000000000",
    addresses: [body.deliveryAddress],
  },
  cc,
);
check("profile and saved address update", () =>
  assert.equal(r.data.user.addresses[0].pincode, "600001"),
);
r = await call(
  "admin/settings",
  "PUT",
  { heroDestination: "javascript:alert(1)" },
  ac,
);
check("unsafe banner destination blocked", () => assert.equal(r.status, 400));
r = await call("admin/settings", "PUT", { whatsappNumber: "123" }, ac);
check("invalid WhatsApp configuration rejected", () =>
  assert.equal(r.status, 400),
);
r = await call("admin/settings", "PUT", { heroTitle: "x".repeat(151000) }, ac);
check("oversized JSON body blocked", () => assert.equal(r.status, 413));
console.log(passed + " additional API checks passed.");
