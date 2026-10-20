import "./globals.css";
import "./store.css";
import Pwa from "@/components/Pwa";
import StoreShell from "@/components/StoreShell";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
export const metadata = {
  metadataBase: new URL(process.env.RYLIXS_SITE_URL || "http://localhost:3100"),
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "RYLIXS",
    title: "RYLIXS — Wear Your Style",
    description: "Considered essentials. Confident silhouettes.",
    images: ["/hero.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RYLIXS — Wear Your Style",
    images: ["/hero.jpeg"],
  },
  title: { default: "RYLIXS — Wear Your Style", template: "%s | RYLIXS" },
  description:
    "Discover the RYLIXS clothing collection. Find your fit and request your order through WhatsApp.",
};
export const viewport = { themeColor: "#161a17" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Pwa />
        <CartProvider>
          <WishlistProvider>
            <StoreShell>{children}</StoreShell>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
