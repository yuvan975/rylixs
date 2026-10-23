"use client";
import "./AdminWorkspace.css";
import ResourceManager, { Reports } from "./AdminModules";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Shirt,
  Layers,
  Boxes,
  Users,
  PanelsTopLeft,
  Settings,
  LogOut,
} from "lucide-react";
import { api, price, Photo, Skeleton, useStore } from "./StoreShell";
const sections = [
 ["dashboard","Overview",LayoutDashboard],["orders","Manage Orders",Package],
 ["products","Products",Shirt],["categories","Categories",Layers],["inventory","Inventory & Stock",Boxes],
 ["page-banners","Page Banners",PanelsTopLeft],["lookbook","Lookbook launches",PanelsTopLeft],["home-banners","Home Banners",PanelsTopLeft],["shop-banners","Shop Banners",PanelsTopLeft],["category-banners","Category Banners",PanelsTopLeft],
 ["coupons","All Coupons",PanelsTopLeft],["add-coupon","Add Coupon",PanelsTopLeft],["category-coupons","Category Coupons",PanelsTopLeft],
 ["offers","Offers & Sales",PanelsTopLeft],["customers","Customers",Users],["reviews","Reviews",PanelsTopLeft],["notifications","Notifications",PanelsTopLeft],["reports","Sales Reports",PanelsTopLeft],["settings","Store Settings",Settings]
];
const resourceScreens = {"page-banners":{kind:"banners"},"lookbook":{kind:"lookbook"},"home-banners":{kind:"banners",placement:"Home"},"shop-banners":{kind:"banners",placement:"Shop"},"category-banners":{kind:"banners",placement:"CategoryPage"},"category-coupons":{kind:"coupons",categoryOnly:true},"add-coupon":{kind:"coupons",createOnly:true}};
const blankProduct = {
  name: "",
  slug: "",
  sku: "",
  category: "",
  subcategory: "",
  description: "",
  price: 0,
  compareAt: 0,
  tags: "",
  material: "",
  fit: "",
  care: "",
  sizeGuide: "",
  images: [],
  variants: [{ size: "", color: "", stock: 0, image: "" }],
  active: false,
  featured: false,
  newArrival: false,
};
function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      {label}
      {required ? " *" : ""}
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows="3"
        />
      ) : type === "checkbox" ? (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : (
        <input
          required={required}
          type={type}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "0.01" : undefined}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              type === "number" ? Number(e.target.value) : e.target.value,
            )
          }
        />
      )}
    </label>
  );
}
export default function Admin({ section }) {

  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [edit, setEdit] = useState(null),
    [selected, setSelected] = useState(null),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1);
  const router = useRouter(),
    { refresh, setUser } = useStore();
  const load = async () => {
    try {
      setData(await api("admin/data"));
    } catch (e) {
      setError(e.message);
      if (e.status === 403) router.push("/admin/login");
    }
  };
  useEffect(() => {
    load();
    setEdit(null);
    setSelected(null);
    setQ("");
    setPage(1);
  }, [section]);
  async function mutate(url, method, body) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(url, method, body);
      await load();
      await refresh();
      setMessage("Changes saved.");
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function upload(file, onDone) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPEG, PNG or WebP image.");
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose an image smaller than 5 MB.");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onDone(d.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const field = (key, label = key, type = "text", required = false) => (
    <Field
      key={key}
      label={label}
      type={type}
      required={required}
      value={edit?.[key]}
      onChange={(v) => setEdit({ ...edit, [key]: v })}
    />
  );
  const filteredOrders =
    data?.orders.filter(
      (o) =>
        (!status || o.status === status) &&
        [
          o.id,
          o.customerName,
          o.phone,
          o.createdAt,
          ...o.items.map((i) => i.productNameSnapshot),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
    ) || [];
  const filteredProducts =
    data?.products.filter((p) =>
      [p.name, p.sku, p.category]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
    ) || [];
  return (
    <div className="admin-shell admin-workspace">
      <aside className="admin-sidebar">
        <Link className="view-store" href="/">
          View Store ↗
        </Link>
        <Link className="wordmark" href="/admin/dashboard">
          RYLIXS<span>STORE MANAGEMENT</span>
        </Link>
        <nav>
          {sections.map(([key, label, Icon]) => (
            <Link
              key={key}
              href={"/admin/" + key}
              aria-current={key === section ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={async () => {
            await api("auth/logout", "POST", {});
            setUser(null);
            router.push("/admin/login");
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="section-heading">
          <div>
            <p className="eyebrow">RYLIXS / WORKSPACE</p>
            <h1>
              {sections.find((s) => s[0] === section)?.[1] || "Dashboard"}
            </h1>
          </div>
          <button className="button secondary" onClick={load}>
            Refresh
          </button>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        {!data ? (
          <Skeleton />
        ) : (
          <>
            {resourceScreens[section] && <ResourceManager key={section} {...resourceScreens[section]} data={data} mutate={mutate} upload={upload} busy={busy}/>}
            {[
              "coupons",
              "offers",
              "banners",
              "reviews",
              "notifications",
            ].includes(section) && (
              <ResourceManager
                key={section}
                kind={section}
                data={data}
                mutate={mutate}
                upload={upload}
                busy={busy}
              />
            )}
            {section === "reports" && <Reports data={data} />}
            {section === "dashboard" && (
              <>
                <Reports data={data} />
                <div className="stats">
                  {[
                    [
                      "Today’s order value",
                      price(
                        data.orders
                          .filter(
                            (o) =>
                              o.createdAt.slice(0, 10) ===
                                new Date().toISOString().slice(0, 10) &&
                              o.status !== "Cancelled",
                          )
                          .reduce((n, o) => n + o.total, 0),
                      ),
                    ],
                    ["Customers", data.customers.length],
                    ["Total orders", data.orders.length],
                    [
                      "Pending orders",
                      data.orders.filter((o) => o.status === data.statuses[0])
                        .length,
                    ],
                    [
                      "Confirmed",
                      data.orders.filter((o) => o.status === "Confirmed")
                        .length,
                    ],
                    [
                      "Processing",
                      data.orders.filter((o) =>
                        [
                          "Processing",
                          "Packed",
                          "Shipped",
                          "Out for Delivery",
                        ].includes(o.status),
                      ).length,
                    ],
                    [
                      "Delivered",
                      data.orders.filter((o) => o.status === "Delivered")
                        .length,
                    ],
                    [
                      "Cancelled",
                      data.orders.filter((o) => o.status === "Cancelled")
                        .length,
                    ],
                    ["Products", data.products.length],
                    [
                      "Low stock variants",
                      data.products
                        .flatMap((p) => p.variants)
                        .filter((v) => v.stock > 0 && v.stock <= 5).length,
                    ],
                    [
                      "Out of stock variants",
                      data.products
                        .flatMap((p) => p.variants)
                        .filter((v) => !v.stock).length,
                    ],
                    [
                      "Order value (excl. cancelled)",
                      price(
                        data.orders
                          .filter((o) => o.status !== "Cancelled")
                          .reduce((sum, o) => sum + o.total, 0),
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <h2>Recent orders</h2>
                {data.orders.slice(0, 6).map((o) => (
                  <Link className="order-card" href="/admin/orders" key={o.id}>
                    <strong>{o.id}</strong>
                    <p>
                      {o.customerName} · {o.status} · {price(o.total)}
                    </p>
                  </Link>
                ))}
                {!data.orders.length && <p>No orders yet.</p>}
                <h2>Top products by units ordered</h2>
                {Object.entries(
                  data.orders
                    .filter((o) => o.status !== "Cancelled")
                    .flatMap((o) => o.items)
                    .reduce(
                      (a, i) => ({
                        ...a,
                        [i.productNameSnapshot]:
                          (a[i.productNameSnapshot] || 0) + i.quantity,
                      }),
                      {},
                    ),
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, n]) => (
                    <p key={name}>
                      {name} · {n} units
                    </p>
                  ))}
              </>
            )}
            {["orders", "products", "inventory", "customers"].includes(
              section,
            ) && (
              <div className="search-row">
                <label className="search-field">
                  Search
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder={
                      section === "orders"
                        ? "Order, customer, phone, product or YYYY-MM-DD"
                        : "Search records"
                    }
                  />
                </label>
                {section === "orders" && (
                  <label>
                    Status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      {data.statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {section === "orders" && (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order / date</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>WhatsApp</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.slice(0, page * 25).map((o) => (
                        <tr key={o.id}>
                          <td>
                            {o.id}
                            <small>
                              {new Date(o.createdAt).toLocaleString()}
                            </small>
                          </td>
                          <td>
                            {o.customerName}
                            <small>{o.phone}</small>
                          </td>
                          <td>{price(o.total)}</td>
                          <td>{o.status}</td>
                          <td>{o.whatsappStatus}</td>
                          <td>
                            <button onClick={() => setSelected(o.id)}>
                              View order
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filteredOrders.length && <p>No matching orders.</p>}
                {filteredOrders.length > page * 25 && (
                  <button onClick={() => setPage(page + 1)}>Load more</button>
                )}
                {selected &&
                  (() => {
                    const o = data.orders.find((o) => o.id === selected);
                    return (
                      <section className="panel">
                        <div className="section-heading">
                          <h2>{o.id}</h2>
                          <button onClick={() => setSelected(null)}>
                            Close details
                          </button>
                        </div>
                        <p>
                          {o.customerName} · {o.phone} · {o.email}
                        </p>
                        <p>
                          {Object.values(o.deliveryAddress)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {o.items.map((i, n) => (
                          <div key={n} className="review-line">
                            <span>
                              {i.productNameSnapshot} · {i.size} / {i.color} ·{" "}
                              {i.quantity} × {price(i.unitPrice)}
                            </span>
                            <strong>{price(i.totalPrice)}</strong>
                          </div>
                        ))}
                        <p>
                          Subtotal {price(o.subtotal)} · Discount{" "}
                          {price(o.discount)} · Delivery{" "}
                          {price(o.deliveryCharge)}
                        </p>
                        <h3>Total {price(o.total)}</h3>
                        <a
                          className="button secondary"
                          href={"/invoice/" + o.id}
                        >
                          View invoice
                        </a>
                        <form
                          className="form-grid"
                          onSubmit={(e) => {
                            e.preventDefault();
                            mutate("admin/orders/" + o.id, "PUT", {
                              status: o.status,
                              ...Object.fromEntries(
                                new FormData(e.currentTarget),
                              ),
                            });
                          }}
                        >
                          <label>
                            Payment status
                            <select
                              name="paymentStatus"
                              defaultValue={o.paymentStatus || "Unpaid"}
                            >
                              <option>Unpaid</option>
                              <option>Paid</option>
                            </select>
                          </label>
                          <label>
                            Refund status
                            <select
                              name="refundStatus"
                              defaultValue={o.refundStatus || "Not requested"}
                            >
                              {[
                                "Not requested",
                                "Requested",
                                "Processing",
                                "Refunded",
                              ].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Estimated delivery
                            <input
                              name="estimatedDelivery"
                              defaultValue={o.estimatedDelivery || ""}
                              maxLength={100}
                            />
                          </label>
                          <button disabled={busy} className="button">
                            Update payment / delivery
                          </button>
                        </form>
                        <ol className="timeline">
                          {o.statusHistory.map((h, i) => (
                            <li key={i}>
                              {h.status}
                              <span>{new Date(h.at).toLocaleString()}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="actions">
                          {!["Delivered", "Cancelled"].includes(o.status) && (
                            <>
                              <button
                                disabled={busy}
                                className="button"
                                onClick={() =>
                                  mutate("admin/orders/" + o.id, "PUT", {
                                    status:
                                      data.statuses[
                                        data.statuses.indexOf(o.status) + 1
                                      ],
                                  })
                                }
                              >
                                Mark{" "}
                                {
                                  data.statuses[
                                    data.statuses.indexOf(o.status) + 1
                                  ]
                                }
                              </button>
                              <button
                                disabled={busy}
                                className="button secondary"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Cancel this order and restore its reserved stock?",
                                    )
                                  )
                                    mutate("admin/orders/" + o.id, "PUT", {
                                      status: "Cancelled",
                                    });
                                }}
                              >
                                Cancel order
                              </button>
                            </>
                          )}
                        </div>
                      </section>
                    );
                  })()}
              </>
            )}
            {section === "products" && (
              <>
                <button
                  className="button"
                  onClick={() =>
                    setEdit({
                      ...blankProduct,
                      category: data.categories[0]?.id || "",
                    })
                  }
                >
                  + New product
                </button>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product / SKU</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Visibility</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.slice(0, page * 25).map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.name}
                            <small>{p.sku}</small>
                          </td>
                          <td>{price(p.price)}</td>
                          <td>{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
                          <td>{p.active ? "Active" : "Inactive"}</td>
                          <td>
                            <button
                              onClick={() =>
                                setEdit(JSON.parse(JSON.stringify(p)))
                              }
                            >
                              Edit
                            </button>{" "}
                            ·{" "}
                            <button
                              disabled={busy}
                              onClick={() =>
                                mutate("admin/products", "POST", {
                                  ...p,
                                  active: !p.active,
                                })
                              }
                            >
                              {p.active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                mutate("admin/products/" + p.id, "DELETE", {})
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredProducts.length > page * 25 && (
                  <button onClick={() => setPage(page + 1)}>Load more</button>
                )}
                {edit && (
                  <form
                    className="panel editor"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await mutate("admin/products", "POST", edit))
                        setEdit(null);
                    }}
                  >
                    <div className="section-heading">
                      <h2>{edit.id ? "Edit product" : "New product"}</h2>
                      <button type="button" onClick={() => setEdit(null)}>
                        Close
                      </button>
                    </div>
                    <div className="form-grid">
                      {field("name", "Product name", "text", true)}
                      {field("slug", "URL slug", "text", true)}
                      {field("sku", "SKU", "text", true)}
                      {field("brand", "Brand")}
                      <label>
                        Category *
                        <select
                          required
                          value={edit.category}
                          onChange={(e) =>
                            setEdit({ ...edit, category: e.target.value })
                          }
                        >
                          <option value="">Select category</option>
                          {data.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {field("subcategory", "Subcategory")}
                      {field("price", "Selling price (INR)", "number", true)}
                      {field(
                        "compareAt",
                        "Original price (0 = none)",
                        "number",
                      )}
                      {field("tags", "Search tags")}
                      {field("material", "Material")}
                      {field("fit", "Fit")}
                    </div>
                    {field("description", "Description", "textarea")}
                    {field("care", "Care instructions", "textarea")}
                    {field("sizeGuide", "Size guide", "textarea")}
                    {field("deliveryInfo", "Delivery information", "textarea")}
                    {field("returnPolicy", "Return policy", "textarea")}
                    <h3>Images</h3>
                    <div className="image-editor">
                      {edit.images.map((src, i) => (
                        <div key={i}>
                          <Photo src={src} alt={"Product image " + (i + 1)} />
                          <button
                            type="button"
                            onClick={() =>
                              setEdit({
                                ...edit,
                                images: edit.images.filter((_, j) => i !== j),
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <label>
                      Upload image (JPEG, PNG, WebP; max 5 MB)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          upload(e.target.files[0], (url) =>
                            setEdit({ ...edit, images: [...edit.images, url] }),
                          )
                        }
                      />
                    </label>
                    <label>
                      Add HTTPS image URL
                      <input
                        type="url"
                        placeholder="https://…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (e.currentTarget.value) {
                              setEdit({
                                ...edit,
                                images: [...edit.images, e.currentTarget.value],
                              });
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                    </label>
                    <p className="quiet">
                      Press Enter to add an image URL. The first image is used
                      on product cards.
                    </p>
                    <h3>Variants and stock</h3>
                    <p>
                      Leave size or colour blank only when the product does not
                      require that option.
                    </p>
                    {edit.variants.map((v, i) => (
                      <div className="variant-row" key={i}>
                        {["size", "color", "stock", "image"].map((k) => (
                          <Field
                            key={k}
                            label={
                              k === "color"
                                ? "Colour"
                                : k === "image"
                                  ? "Variant image URL"
                                  : k
                            }
                            type={k === "stock" ? "number" : "text"}
                            value={v[k]}
                            onChange={(value) =>
                              setEdit({
                                ...edit,
                                variants: edit.variants.map((x, j) =>
                                  j === i ? { ...x, [k]: value } : x,
                                ),
                              })
                            }
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setEdit({
                              ...edit,
                              variants: edit.variants.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setEdit({
                          ...edit,
                          variants: [
                            ...edit.variants,
                            { size: "", color: "", stock: 0, image: "" },
                          ],
                        })
                      }
                    >
                      + Add variant
                    </button>
                    <div className="form-grid">
                      {field("active", "Active", "checkbox")}
                      {field("featured", "Featured", "checkbox")}
                      {field("newArrival", "New arrival", "checkbox")}
                    </div>
                    <button disabled={busy} className="button">
                      {busy ? "Saving…" : "Save product"}
                    </button>
                  </form>
                )}
              </>
            )}
            {section === "categories" && (
              <>
                <button
                  className="button"
                  onClick={() =>
                    setEdit({
                      name: "",
                      slug: "",
                      image: "",
                      order: 0,
                      active: true,
                    })
                  }
                >
                  + New category
                </button>
                {data.categories.map((c) => (
                  <div className="order-card" key={c.id}>
                    <h3>{c.name}</h3>
                    <p>
                      {c.active ? "Active" : "Inactive"} · Position {c.order}
                    </p>
                    <button onClick={() => setEdit({ ...c })}>
                      Edit category
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        mutate("admin/categories/" + c.id, "DELETE", {})
                      }
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {edit && (
                  <form
                    className="panel"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await mutate("admin/categories", "POST", edit))
                        setEdit(null);
                    }}
                  >
                    {field("name", "Category name", "text", true)}
                    {!edit.id && field("slug", "Category slug", "text", true)}
                    {field("image", "Image URL")}
                    <label>
                      Upload category image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          upload(e.target.files[0], (url) =>
                            setEdit({ ...edit, image: url }),
                          )
                        }
                      />
                    </label>
                    {field("order", "Display order", "number")}
                    {field("active", "Active", "checkbox")}
                    <button className="button" disabled={busy}>
                      Save category
                    </button>
                    <button type="button" onClick={() => setEdit(null)}>
                      Close
                    </button>
                  </form>
                )}
              </>
            )}
            {section === "inventory" && (
              <>
                <p>
                  Available stock excludes reserved orders. Cancellation
                  restores stock once.
                </p>
                <div className="table-wrap inventory-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product / SKU</th>
                        <th>Size</th>
                        <th>Colour</th>
                        <th>Available</th>
                        <th>Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.slice(0, page * 25).flatMap((p) =>
                        p.variants.map((v, i) => (
                          <tr key={p.id + i}>
                            <td data-label="Product / SKU">
                              {p.name}
                              <small>{p.sku}</small>
                            </td>
                            <td data-label="Size">{v.size || "—"}</td>
                            <td data-label="Colour">{v.color || "—"}</td>
                            <td data-label="Available stock">
                              {v.stock}{" "}
                              {v.stock === 0
                                ? " / Out of stock"
                                : v.stock <= 5
                                  ? " / Low stock"
                                  : ""}
                            </td>
                            <td data-label="Update stock">
                              <form
                                className="inline-form"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const stock = Number(
                                    new FormData(e.currentTarget).get("stock"),
                                  );
                                  await mutate("admin/products", "POST", {
                                    ...p,
                                    variants: p.variants.map((x, j) =>
                                      i === j ? { ...x, stock } : x,
                                    ),
                                  });
                                }}
                              >
                                <input
                                  key={v.stock}
                                  aria-label={
                                    "Stock for " +
                                    p.name +
                                    " " +
                                    v.size +
                                    " " +
                                    v.color
                                  }
                                  name="stock"
                                  type="number"
                                  min="0"
                                  max="100000"
                                  step="1"
                                  defaultValue={v.stock}
                                  required
                                />
                                <button disabled={busy}>Save</button>
                              </form>
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredProducts.length > page * 25 && (
                  <button onClick={() => setPage(page + 1)}>Load more</button>
                )}
              </>
            )}
            {section === "customers" && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers
                      .filter((c) =>
                        [c.name, c.email, c.phone]
                          .join(" ")
                          .toLowerCase()
                          .includes(q.toLowerCase()),
                      )
                      .map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{c.email}</td>
                          <td>
                            {c.phone || "—"}
                            <details>
                              <summary>Customer details</summary>
                              <p>
                                Account: {c.blocked ? "Suspended" : "Active"}
                              </p>
                              <p>
                                Last login:{" "}
                                {c.lastLogin
                                  ? new Date(c.lastLogin).toLocaleString()
                                  : "Not recorded"}
                              </p>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  mutate("admin/customers/" + c.id, "PUT", {
                                    blocked: !c.blocked,
                                  })
                                }
                              >
                                {c.blocked ? "Reactivate" : "Suspend"} customer
                              </button>
                              <p>
                                Sign-in:{" "}
                                {c.email.endsWith("@rylixs.test")
                                  ? "Local preview"
                                  : "Google"}
                              </p>
                              <p>
                                Purchase amount:{" "}
                                {price(
                                  data.orders
                                    .filter(
                                      (o) =>
                                        o.customerId === c.id &&
                                        o.status !== "Cancelled",
                                    )
                                    .reduce((n, o) => n + o.total, 0),
                                )}
                              </p>
                              <p>Addresses: {c.addresses}</p>
                              {data.orders
                                .filter((o) => o.customerId === c.id)
                                .map((o) => (
                                  <p key={o.id}>
                                    {o.id} · {o.status} · {price(o.total)}
                                  </p>
                                ))}
                            </details>
                          </td>
                          <td>
                            {
                              data.orders.filter((o) => o.customerId === c.id)
                                .length
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {["settings"].includes(section) && (
              <SettingsEditor
                key={section + data.settings.whatsappNumber}
                settings={data.settings}
                homepage={section === "homepage"}
                busy={busy}
                save={(body) => mutate("admin/settings", "PUT", body)}
                upload={upload}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
function SettingsEditor({ settings, homepage, busy, save, upload }) {
  const [s, setS] = useState(settings);
  const fields = homepage
    ? [
        ["heroTitle", "Hero title"],
        ["heroSubtitle", "Hero subtitle"],
        ["heroImage", "Hero image URL"],
        ["heroButton", "Button text"],
        ["heroDestination", "Button destination"],
        ["heroActive", "Show hero", "checkbox"],
        ["collectionTitle", "Collection title"],
        ["collectionSubtitle", "Collection subtitle"],
        ["collectionImage", "Collection image URL"],
        ["collectionDestination", "Collection destination"],
        ["collectionActive", "Show collection", "checkbox"],
      ]
    : [
        ["businessName", "Business name"],
        ["storyTitle", "Our story heading"], ["storyText", "Our story text", "textarea"],
        ["contactTitle", "Contact heading"], ["contactText", "Contact text", "textarea"],
        ["lookbookTitle", "Lookbook heading"], ["lookbookText", "Lookbook introduction", "textarea"],
        ["whatsappNumber", "WhatsApp number (country code + digits)"],
        ["contactEmail", "Contact email"],
        ["businessAddress", "Business address", "textarea"],
        ["deliveryCharge", "Delivery charge (INR)", "number"],
        [
          "freeDeliveryAbove",
          "Free delivery threshold (0 = disabled)",
          "number",
        ],
        ["instagram", "Instagram profile URL"],
      ];
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        save(s);
      }}
    >
      {fields.map(([key, label, type]) => (
        <div key={key}>
          <Field
            label={label}
            type={type}
            value={s[key]}
            onChange={(value) => setS({ ...s, [key]: value })}
          />
          {key.endsWith("Image") && (
            <label>
              Upload image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  upload(e.target.files[0], (url) => setS({ ...s, [key]: url }))
                }
              />
            </label>
          )}
        </div>
      ))}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
