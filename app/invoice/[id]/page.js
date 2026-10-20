import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { sessionUser, getOrder, settings } from "@/lib/store.mjs";
import PrintButton from "@/components/PrintButton";
export const dynamic = "force-dynamic";
export default async function Invoice({ params }) {
  const { id } = await params,
    u = sessionUser((await cookies()).get("rylixs_session")?.value);
  if (!u) redirect("/login?next=/invoice/" + id);
  let o;
  try {
    o = getOrder(u, id);
  } catch {
    notFound();
  }
  const s = settings(),
    money = (n) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(n || 0);
  return (
    <section className="store-section invoice">
      <p className="eyebrow">RYLIXS / ORDER INVOICE</p>
      <h1>{o.id}</h1>
      <p>
        {s.businessName}
        <br />
        {s.businessAddress}
        <br />
        {s.contactEmail}
      </p>
      <p>
        Issued {new Date(o.createdAt).toLocaleString()}
        <br />
        Payment: {o.paymentStatus || "Unpaid"}
      </p>
      <h2>Bill to</h2>
      <p>
        {o.customerName} · {o.phone}
        <br />
        {o.email}
        <br />
        {Object.values(o.deliveryAddress).filter(Boolean).join(", ")}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Options</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={n}>
                <td>{i.productNameSnapshot}</td>
                <td>
                  {i.size} / {i.color}
                </td>
                <td>{i.quantity}</td>
                <td>{money(i.unitPrice)}</td>
                <td>{money(i.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Subtotal: {money(o.subtotal)}
        <br />
        Coupon {o.couponCode}: −{money(o.discount)}
        <br />
        Delivery: {money(o.deliveryCharge)}
      </p>
      <h2>Total: {money(o.total)}</h2>
      <p>
        This order invoice records the order amount. Payment status is shown
        above.
      </p>
      <PrintButton />
    </section>
  );
}
