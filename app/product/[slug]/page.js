import { notFound } from "next/navigation";
import { product } from "@/lib/store.mjs";
import ProductView from "@/components/ProductView";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  params = await params;
  const p = product(params.slug);
  if (!p?.active) return { title: "Product unavailable" };
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    alternates: { canonical: "/product/" + p.slug },
    openGraph: { title: p.name, description: p.description, images: p.images },
  };
}
export default async function Page({ params }) {
  params = await params;
  const p = product(params.slug);
  if (!p?.active) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description,
            image: p.images,
            sku: p.sku,
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: "INR",
              availability: p.variants.some((v) => v.stock > 0)
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
      <ProductView product={p} />
    </>
  );
}
