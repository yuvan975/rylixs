// Compare against trusted configuration, not forwarded headers supplied by callers.
export function isAllowedMutationOrigin(request, config = {}) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  const url = new URL(request.url);
  const allowed = new Set([url.origin]);
  if (config.siteUrl) {
    try {
      const publicUrl = new URL(config.siteUrl);
      if (["http:", "https:"].includes(publicUrl.protocol))
        allowed.add(publicUrl.origin);
    } catch {
      /* Invalid configuration must not widen access. */
    }
  }
  // Next.js can normalize its request URL to localhost while a local browser
  // sends 127.0.0.1. Permit these exact aliases only for explicit local HTTP mode.
  if (
    config.localHttp === true &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    const port = url.port ? ":" + url.port : "";
    for (const host of ["localhost", "127.0.0.1", "[::1]"])
      allowed.add("http://" + host + port);
  }
  return allowed.has(origin);
}
