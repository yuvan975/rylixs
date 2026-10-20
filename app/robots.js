export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/account",
        "/orders",
        "/checkout",
        "/cart",
        "/login",
        "/register",
        "/invoice",
        "/notifications",
      ],
    },
  };
}
