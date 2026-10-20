import { products } from "@/lib/store.mjs";
export const dynamic = "force-dynamic";
export default function sitemap() {
  const origin = process.env.RYLIXS_SITE_URL || "http://localhost:3100";
  return [
    "",
    "/shop",
    "/about",
    "/contact",
    ...products().map((p) => "/product/" + p.slug),
  ].map((p) => ({ url: origin + p }));
}
