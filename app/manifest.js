export default function manifest() {
  return {
    name: "RYLIXS — Wear Your Style",
    short_name: "RYLIXS",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: "/logo-icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
