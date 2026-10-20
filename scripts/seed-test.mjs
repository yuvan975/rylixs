import {
  db,
  register,
  saveCategory,
  saveProduct,
  saveSettings,
  products,
} from "../lib/store.mjs";
if (!process.env.RYLIXS_DB_PATH?.includes("verification"))
  throw new Error(
    "Test fixtures require an isolated verification database path.",
  );
if (
  !db.prepare("SELECT id FROM users WHERE email=?").get("admin@rylixs.test")
) {
  const u = register({
    name: "Test Admin",
    email: "admin@rylixs.test",
    password: "Local-test-only-123!",
  });
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(u.id);
}
if (
  !db.prepare("SELECT id FROM users WHERE email=?").get("customer@rylixs.test")
)
  register({
    name: "Test Customer",
    email: "customer@rylixs.test",
    password: "Local-test-only-123!",
  });
saveSettings({
  whatsappNumber: "919000000000",
  deliveryCharge: 49,
  freeDeliveryAbove: 2000,
});
saveCategory({
  slug: "shirts",
  name: "Shirts",
  active: true,
  image: "/hero.jpeg",
  order: 1,
});
saveCategory({
  slug: "outerwear",
  name: "Outerwear",
  active: true,
  image: "/hero1.jpeg",
  order: 2,
});
if (!products(true).length)
  for (let i = 0; i < 4; i++)
    saveProduct({
      name: [
        "Test Noir Shirt",
        "Test Linen Shirt",
        "Test Everyday Jacket",
        "Test Oversized Shirt",
      ][i],
      slug: "test-piece-" + i,
      sku: "TEST-" + i,
      category: i === 2 ? "outerwear" : "shirts",
      subcategory: "Everyday",
      price: 899 + i * 200,
      compareAt: 1199 + i * 200,
      description:
        "Isolated verification fixture. Not a real product for sale.",
      active: true,
      featured: true,
      newArrival: true,
      tags: "test black everyday",
      material: "Test cotton",
      fit: "Relaxed",
      care: "Test instructions",
      sizeGuide: "Test guide: M 38 inches, L 40 inches.",
      images: ["/hero.jpeg", "/hero1.jpeg"],
      variants: [
        { size: "M", color: "Black", stock: 12 },
        { size: "L", color: "Black", stock: 5 },
        { size: "M", color: "Ivory", stock: 0 },
      ],
    });
console.log("Isolated test fixtures ready. Not connected to live catalogue.");
