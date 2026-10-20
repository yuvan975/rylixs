import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
const dir = mkdtempSync(path.join(os.tmpdir(), "rylixs-test-"));
process.env.RYLIXS_DB_PATH = path.join(dir, "test.sqlite");
const s = await import("../lib/store.mjs");
let user, other, p, order;
const address = {
  house: "1",
  street: "Test Street",
  area: "Test Area",
  city: "Chennai",
  district: "Chennai",
  state: "Tamil Nadu",
  pincode: "600001",
  landmark: "",
};
const input = () => ({
  customerName: "Test Customer",
  phone: "9000000000",
  email: "test@example.test",
  deliveryAddress: address,
  items: [{ id: p.id, size: "M", color: "Black", quantity: 2, price: 1 }],
  requestKey: crypto.randomUUID(),
  quoteToken: s.quote({
    items: [{ id: p.id, size: "M", color: "Black", quantity: 2 }],
  }).quoteToken,
  total: 1,
});
test("register hashes passwords and never accepts a client admin role", () => {
  user = s.register({
    name: "Test Customer",
    email: "test@example.test",
    password: "test-password-123!",
    role: "admin",
  });
  other = s.register({
    name: "Other",
    email: "other@example.test",
    password: "test-password-123!",
  });
  assert.equal(user.role, "customer");
  assert.equal(user.password, undefined);
  assert.notEqual(
    s.db.prepare("SELECT password FROM users WHERE id=?").get(user.id).password,
    "test-password-123!",
  );
});
test("sessions are opaque, stored hashed, and revoked on logout", () => {
  const token = s.createSession(user.id);
  assert.equal(s.sessionUser(token).id, user.id);
  assert.equal(
    s.db.prepare("SELECT token FROM sessions WHERE token=?").get(token),
    undefined,
  );
  s.logout(token);
  assert.equal(s.sessionUser(token), null);
});
test("admin login rejects customer and wrong password", () => {
  assert.throws(() =>
    s.login({ email: user.email, password: "test-password-123!" }, true),
  );
  assert.throws(() => s.login({ email: user.email, password: "wrong" }));
  assert.equal(
    s.login({ email: user.email, password: "test-password-123!" }).id,
    user.id,
  );
});
test("category and product validation, variant setup", () => {
  s.saveCategory({ slug: "shirts", name: "Shirts", active: true });
  p = s.saveProduct({
    name: "Test Shirt",
    slug: "test-shirt",
    sku: "TEST-1",
    category: "shirts",
    price: 899,
    compareAt: 999,
    description: "Test only",
    active: true,
    images: ["/hero.jpeg"],
    variants: [{ size: "M", color: "Black", stock: 5 }],
  });
  assert.equal(s.product("test-shirt").id, p.id);
  assert.throws(() => s.saveProduct({ ...p, price: -1 }));
  assert.throws(() =>
    s.saveProduct({
      ...p,
      variants: [{ size: "M", color: "Black", stock: -1 }],
    }),
  );
});
test("missing business configuration blocks orders without reducing stock", () => {
  assert.throws(() => s.createOrder(user, input()), /temporarily unavailable/);
  assert.equal(s.product(p.id).variants[0].stock, 5);
  s.saveSettings({ whatsappNumber: "919000000000", deliveryCharge: 50 });
});
test("rejects negative, fractional, zero, missing and oversized quantities", () => {
  for (const quantity of [-1, 0, 1.5, 100])
    assert.throws(() =>
      s.quote({ items: [{ id: p.id, size: "M", color: "Black", quantity }] }),
    );
  assert.throws(() => s.quote({ items: [{ id: "fake", quantity: 1 }] }));
  assert.throws(() =>
    s.quote({ items: [{ id: p.id, size: "XL", color: "Black", quantity: 1 }] }),
  );
});
test("duplicate lines cannot bypass available stock", () => {
  assert.throws(
    () =>
      s.quote({
        items: [
          { id: p.id, size: "M", color: "Black", quantity: 3 },
          { id: p.id, size: "M", color: "Black", quantity: 3 },
        ],
      }),
    /stock/,
  );
});
test("customer data validates phone and pincode", () => {
  assert.throws(() => s.createOrder(user, { ...input(), phone: "123" }));
  assert.throws(() =>
    s.createOrder(user, {
      ...input(),
      deliveryAddress: { ...address, pincode: "abc" },
    }),
  );
  assert.equal(s.product(p.id).variants[0].stock, 5);
});
test("order persists authoritative prices, stock reservation and snapshots", () => {
  const request = input();
  order = s.createOrder(user, request);
  assert.equal(order.total, 1848);
  assert.equal(order.items[0].unitPrice, 899);
  assert.equal(order.status, "Pending WhatsApp Confirmation");
  assert.equal(s.product(p.id).variants[0].stock, 3);
  assert.equal(s.getOrder(user, order.id).id, order.id);
  assert.equal(s.createOrder(user, request).id, order.id);
  assert.equal(s.product(p.id).variants[0].stock, 3);
});
test("another customer cannot read or update an order", () => {
  assert.throws(() => s.getOrder(other, order.id), /not found/);
  assert.throws(
    () => s.updateOrder(user, order.id, { status: "Confirmed" }),
    /Unauthorized/,
  );
});
test("old orders preserve names and prices after product changes", () => {
  s.saveProduct({
    ...s.product(p.id),
    name: "Changed Shirt",
    price: 1200,
    compareAt: 1500,
  });
  assert.equal(s.getOrder(user, order.id).items[0].unitPrice, 899);
  assert.equal(
    s.getOrder(user, order.id).items[0].productNameSnapshot,
    "Test Shirt",
  );
});
test("stock exhaustion prevents overselling and partial writes", () => {
  assert.throws(
    () =>
      s.createOrder(user, {
        ...input(),
        items: [{ id: p.id, size: "M", color: "Black", quantity: 4 }],
      }),
    /stock/,
  );
  assert.equal(s.product(p.id).variants[0].stock, 3);
});
test("WhatsApp link is encoded and does not claim the message was sent", () => {
  const url = new URL(s.whatsappLink(order));
  assert.equal(url.hostname, "wa.me");
  assert.match(url.searchParams.get("text"), new RegExp(order.id));
  assert.match(url.searchParams.get("text"), /899.00 each/);
  assert.equal(order.whatsappStatus, "Awaiting customer send");
  assert.doesNotMatch(url.searchParams.get("text"), /password|token/i);
});
test("admin timeline is sequential and cancellation restores once", () => {
  const admin = { ...user, role: "admin" };
  assert.throws(() => s.updateOrder(admin, order.id, { status: "Delivered" }));
  s.updateOrder(admin, order.id, { status: "Confirmed" });
  const cancelled = s.updateOrder(admin, order.id, { status: "Cancelled" });
  assert.equal(cancelled.statusHistory.length, 3);
  assert.equal(s.product(p.id).variants[0].stock, 5);
  s.updateOrder(admin, order.id, { status: "Cancelled" });
  assert.equal(s.product(p.id).variants[0].stock, 5);
  assert.throws(() => s.updateOrder(admin, order.id, { status: "Processing" }));
});
test("profile persists saved addresses", () => {
  const u = s.updateProfile(user, {
    name: user.name,
    phone: "9000000000",
    addresses: [address],
  });
  assert.equal(u.addresses[0].pincode, "600001");
});
test.after(() => {
  s.db.close();
  rmSync(dir, { recursive: true, force: true });
});
