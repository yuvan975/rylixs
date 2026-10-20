import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedMutationOrigin as allowed } from "../lib/request-origin.mjs";
const req = (
  origin,
  url = "http://localhost:3100/api/admin/login",
  extra = {},
) => ({
  url,
  headers: new Headers({ ...extra, ...(origin ? { origin } : {}) }),
});
test("same origin accepted", () =>
  assert.equal(allowed(req("http://localhost:3100")), true));
test("explicit local HTTP mode accepts exact loopback aliases", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"])
    assert.equal(
      allowed(req("http://" + host + ":3100"), { localHttp: true }),
      true,
    );
});
test("loopback alias is rejected outside local HTTP mode", () =>
  assert.equal(allowed(req("http://127.0.0.1:3100")), false));
test("missing, null, unrelated origins, ports and schemes are rejected", () => {
  for (const origin of [
    undefined,
    "null",
    "https://evil.example",
    "http://localhost:3101",
    "https://127.0.0.1:3100",
    "http://127.0.0.1.evil.example:3100",
  ])
    assert.equal(allowed(req(origin), { localHttp: true }), false);
});
test("configured HTTPS origin works behind an internal proxy", () =>
  assert.equal(
    allowed(
      req("https://shop.example", "http://internal:3000/api/admin/login"),
      { siteUrl: "https://shop.example" },
    ),
    true,
  ));
test("untrusted forwarded headers and cross-site context cannot widen access", () => {
  assert.equal(
    allowed(
      req("https://evil.example", undefined, {
        "x-forwarded-host": "evil.example",
      }),
    ),
    false,
  );
  assert.equal(
    allowed(
      req("http://localhost:3100", undefined, {
        "sec-fetch-site": "cross-site",
      }),
    ),
    false,
  );
});
