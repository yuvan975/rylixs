import Link from "next/link";
export default function About() {
  return (
    <section className="store-section narrow">
      <p className="eyebrow">THE RYLIXS POINT OF VIEW</p>
      <h1>Wear your style.</h1>
      <p className="intro">
        A wardrobe is personal. We believe choosing it should be, too.
      </p>
      <p>
        Explore the RYLIXS collection, find your fit and connect with our team
        on WhatsApp to confirm your order.
      </p>
      <Link className="button" href="/shop">
        Discover the collection ↗
      </Link>
    </section>
  );
}
