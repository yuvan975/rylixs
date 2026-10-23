"use client";
import { useState } from "react";
import BannerManager from "./BannerManager";
import { Photo, price } from "./StoreShell";
export default function ResourceManager({ kind, data, mutate, upload, busy, placement, categoryOnly = false, createOnly = false }) {
  const [edit, setEdit] = useState(createOnly ? {title:"",description:"",active:false,type:"Percentage",value:10,code:"",minimum:0,limit:0,categoryId:""} : null);
  const rows = (data[kind] || []).filter(r => (!placement || (placement === "Home" ? ["Hero","Offer","Category"].includes(r.placement) : r.placement === placement)) && (!categoryOnly || !!r.categoryId));
  const initial = {
      title: "",
      description: "",
      active: false,
      type: kind === "notifications" ? "General" : "Percentage",
      value: 10,
      code: "",
      minimum: 0,
      limit: 0,
      starts: "",
      expires: "",
      scope: "All",
      target: "",
      priority: 0,
      campaign: "Season",
      image: "",
      mobileImage: "",
      placement: placement && placement !== "Home" ? placement : "Hero",
      categoryId: "",
      eyebrow: "",
      buttonText: "Shop Now",
      badge: "",
      textPosition: "Left",
      tone: "Dark",
      order: rows.length,
      destination: "/shop",
    };
  const start = () => setEdit({...initial});
  function field(key, label, type = "text", options) {
    return (
      <label key={key}>
        {label}
        {options ? (
          <select
            required={key === "categoryId" && (categoryOnly || edit.placement === "CategoryPage")}
            value={edit[key] || ""}
            onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
          >
            {options.map((o) => (
              <option
                key={typeof o === "string" ? o : o.id}
                value={typeof o === "string" ? o : o.id}
              >
                {typeof o === "string" ? o : o.name}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            value={edit[key] || ""}
            maxLength={2000}
            onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
          />
        ) : (
          <input
            type={type}
            checked={type === "checkbox" ? !!edit[key] : undefined}
            value={
              type === "checkbox"
                ? undefined
                : type === "datetime-local"
                  ? edit[key]?.slice(0, 16) || ""
                  : (edit[key] ?? "")
            }
            min={type === "number" ? 0 : undefined}
            step={type === "number" ? "0.01" : undefined}
            required={["title", "code"].includes(key)}
            onChange={(e) =>
              setEdit({
                ...edit,
                [key]:
                  type === "checkbox"
                    ? e.target.checked
                    : type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
              })
            }
          />
        )}
      </label>
    );
  }
  if (kind === "banners") return <BannerManager {...{ data, mutate, upload, busy, placement }} />;
  return (
    <>
      <p className="quiet">
        {kind === "notifications"
          ? "Publish announcements to the customer’s in-app inbox."
          : kind === "reviews"
            ? "Only verified, delivered purchases can submit reviews."
            : "Manage " + kind + " shown in your storefront."}
      </p>
      {kind !== "reviews" && !createOnly && !edit && (
        <button className="button" onClick={start}>
          + Create {(kind === "lookbook" ? "edition" : kind.slice(0, -1))}
        </button>
      )}
      {!createOnly && !edit && <div className="resource-grid">
        {rows.map((r) => (
          <article className="panel" key={r.id}>
            {r.image && <Photo src={r.image} alt={r.title} />}
            <p className="eyebrow">
              {r.status || (r.active ? "Active" : "Inactive")}{" "}
              {r.code && " / " + r.code}
            </p>
            <h3>{r.title || r.name + " · " + r.rating + " stars"}</h3>
            {kind === "banners" && (
              <small>
                {r.placement} · Position {r.order} · {r.textPosition || "Left"}{" "}
                text
              </small>
            )}
            <p>{r.description}</p>{r.categoryId && <p className="resource-category">Category: {data.categories.find(c=>c.id===r.categoryId)?.name || r.categoryId}</p>}
            {r.expires && (
              <small>Until {new Date(r.expires).toLocaleString()}</small>
            )}
            <div className="actions">
              <button onClick={() => setEdit({ ...r })}>Edit</button>
              <button
                disabled={busy}
                onClick={() =>
                  mutate("admin/resources/" + kind + "/" + r.id, "DELETE", {})
                }
              >
                Delete
              </button>
              {kind === "banners" && (
                <>
                  <button
                    disabled={busy || r.order === 0}
                    onClick={() =>
                      mutate("admin/banner-order", "POST", {
                        id: r.id,
                        direction: "up",
                      })
                    }
                  >
                    Move up
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      mutate("admin/banner-order", "POST", {
                        id: r.id,
                        direction: "down",
                      })
                    }
                  >
                    Move down
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>}
      {!createOnly && !rows.length && <p className="panel">No {kind} yet.</p>}
      {edit && (
        <form
          className="panel editor"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await mutate("admin/resources/" + kind, "POST", {...edit, ...(placement && placement !== "Home" ? {placement} : {})}))
              setEdit(createOnly ? {...initial} : null);
          }}
        >
          <div className="section-heading">
            <h2>
              {edit.id ? "Edit" : "Create"} {(kind === "lookbook" ? "edition" : kind.slice(0, -1))}
            </h2>
            <button type="button" onClick={() => setEdit(createOnly ? {...initial} : null)}>
              Close
            </button>
          </div>
          {kind === "reviews" ? (
            <>
              {field("status", "Moderation status", "text", [
                "Pending",
                "Approved",
                "Rejected",
              ])}
              {field("reply", "Reply", "textarea")}
            </>
          ) : (
            <>
              {field("title", "Title", kind === "banners" ? "textarea" : "text")}
              {field("description", "Description", "textarea")}
              {field("active", "Publish / active", "checkbox")}
            </>
          )}
          {["coupons", "offers"].includes(kind) && (
            <div className="form-grid">
              {field("type", "Discount type", "text", ["Percentage", "Flat"])}
              {field("value", "Discount value", "number")}
              {field("starts", "Starts at (UTC)", "datetime-local")}
              {field("expires", "Expires at (UTC)", "datetime-local")}
            </div>
          )}
          {kind === "coupons" && (
            <div className="form-grid">
              {field("code", "Coupon code")}
              {field("categoryId", "Applies to category", "text", [{id:"",name:categoryOnly?"Select category":"All categories"}, ...data.categories])}
              {field("minimum", "Minimum purchase (INR)", "number")}
              {field("limit", "Usage limit (0 = unlimited)", "number")}
            </div>
          )}
          {kind === "offers" && (
            <>
              {field("campaign", "Campaign", "text", [
                "Festival",
                "Season",
                "Flash",
              ])}
              {field("scope", "Applies to", "text", [
                "All",
                "Category",
                "Product",
              ])}
              {edit.scope !== "All" &&
                field("target", "Target", "text", [
                  { id: "", name: "Select" },
                  ...(edit.scope === "Product"
                    ? data.products
                    : data.categories),
                ])}
              {field("priority", "Priority (highest wins)", "number")}
            </>
          )}
          {kind === "banners" && (
            <>
              {["image", "mobileImage"].map((k) => (
                <div key={k}>
                  {edit[k] && (
                    <>
                      <Photo
                        className="banner-preview"
                        src={edit[k]}
                        alt="Banner preview"
                      />
                      <button
                        type="button"
                        onClick={() => setEdit({ ...edit, [k]: "" })}
                      >
                        Remove image
                      </button>
                    </>
                  )}
                  <label>
                    {k === "image"
                      ? "Desktop / primary banner"
                      : "Mobile banner (optional)"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        upload(e.target.files[0], (url) =>
                          setEdit({ ...edit, [k]: url }),
                        )
                      }
                    />
                  </label>
                </div>
              ))}
              {(!placement || placement === "Home") && field("placement", "Banner position", "text", placement === "Home" ? ["Hero","Offer","Category"] : ["Hero","Shop","CategoryPage","Offer","Category"])}
              {edit.placement === "CategoryPage" && field("categoryId", "Category page", "text", [{id:"",name:"Select category"}, ...data.categories])}
              {field("order", "Display order", "number")}
              {field("destination", "Store destination")}
              {field("eyebrow", "Small heading / season label")}
              {field("buttonText", "Button text")}
              {field("badge", "Offer badge (optional)", "textarea")}
              {field("textPosition", "Text position", "text", [
                "Left",
                "Right",
              ])}
              {field("tone", "Text colour", "text", ["Dark", "Light"])}
              <p className="quiet">
                Shop banners appear above the shop product grid. Hero banners appear at the top of the home page. Offer and Category banners
                appear in the two-column collection row. Upload clean artwork
                without text; titles and buttons are added by the storefront.
              </p>
            </>
          )}
          {kind === "lookbook" && <>
            <label>Edition image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>upload(e.target.files[0],url=>setEdit({...edit,image:url}))}/></label>
            {edit.image && <Photo className="banner-preview" src={edit.image} alt="Edition preview"/>}
            {field("launchAt", "Launch date and time (UTC)", "datetime-local")}
            {field("order", "Display order", "number")}
          </>}
          {kind === "notifications" &&
            field("type", "Notification type", "text", [
              "General",
              "Offer",
              "Product",
            ])}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </>
  );
}
export function Reports({ data }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const orders = data.orders.filter((o) => o.createdAt.startsWith(month)),
    valid = orders.filter((o) => o.status !== "Cancelled"),
    paid = valid.filter((o) => o.paymentStatus === "Paid");
  const metrics = [
    ["Orders", orders.length],
    ["Order value", price(valid.reduce((n, o) => n + o.total, 0))],
    ["Collected payments", price(paid.reduce((n, o) => n + o.total, 0))],
    ["Customers", data.customers.length],
    ["Products", data.products.length],
    ["Coupon redemptions", valid.filter((o) => o.couponCode).length],
    ["Coupon discounts", price(valid.reduce((n, o) => n + o.discount, 0))],
    ["Offers", data.offers.length],
  ];
  const days = Array.from(
    {
      length: new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)),
        0,
      ).getDate(),
    },
    (_, i) => {
      const day = month + "-" + String(i + 1).padStart(2, "0");
      return {
        day,
        total: valid
          .filter((o) => o.createdAt.startsWith(day))
          .reduce((n, o) => n + o.total, 0),
      };
    },
  );
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <>
      <label>
        Reporting month (UTC)
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </label>
      <div className="stats">
        {metrics.map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Daily order value</h2>
        <div
          className="sales-chart"
          role="img"
          aria-label="Daily order value chart"
        >
          {days.map((d) => (
            <div key={d.day} title={d.day + " · " + price(d.total)}>
              <span style={{ height: Math.max(2, (d.total / max) * 150) }} />
              <small>{Number(d.day.slice(-2))}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <caption>Monthly orders</caption>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Coupon</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.createdAt.slice(0, 10)}</td>
                <td>{o.status}</td>
                <td>{o.paymentStatus || "Unpaid"}</td>
                <td>{o.couponCode || "—"}</td>
                <td>{price(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="button secondary"
        onClick={() => {
          const csv = [
            ["Order", "Date", "Status", "Payment", "Coupon", "Total"],
            ...orders.map((o) => [
              o.id,
              o.createdAt,
              o.status,
              o.paymentStatus || "Unpaid",
              o.couponCode || "",
              o.total,
            ]),
          ]
            .map((row) =>
              row
                .map((x) => '"' + String(x).replaceAll('"', '""') + '"')
                .join(","),
            )
            .join("\r\n");
          const a = document.createElement("a"),
            url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          a.href = url;
          a.download = "rylixs-" + month + ".csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export monthly report
      </button>
    </>
  );
}



