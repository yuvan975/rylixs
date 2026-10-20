import * as commerce from "@/lib/commerce.mjs";

import { startOAuth, finishOAuth, previewUser } from "@/lib/google-auth.mjs";

import { NextResponse } from "next/server";

import { cookies } from "next/headers";

import * as store from "@/lib/store.mjs";

import { mkdir, writeFile, readFile } from "node:fs/promises";

import { randomUUID } from "node:crypto";

import path from "node:path";

import { isAllowedMutationOrigin } from "@/lib/request-origin.mjs";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

function response(data, status = 200) {
  return NextResponse.json(data, {
    status,

    headers: {
      "Cache-Control": "no-store",

      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readLimited(req, limit) {
  if (Number(req.headers.get("content-length") || 0) > limit)
    store.fail("Request is too large.", 413);

  if (!req.body) return Buffer.alloc(0);

  const reader = req.body.getReader();

  const chunks = [];

  let length = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    length += value.byteLength;

    if (length > limit) {
      await reader.cancel();

      store.fail("Request is too large.", 413);
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks, length);
}

async function handler(req, { params }) {
  try {
    params = await params;

    const route = params.path.join("/"),
      method = req.method;

    if (method !== "GET") {
      if (
        !isAllowedMutationOrigin(req, {
          siteUrl: process.env.RYLIXS_SITE_URL,

          localHttp: process.env.RYLIXS_INSECURE_LOCAL_HTTP === "true",
        })
      )
        store.fail("Request origin is not allowed.", 403);
    }

    const token = (await cookies()).get("rylixs_session")?.value,
      user = store.sessionUser(token);

    if (
      route.startsWith("admin/") &&
      route !== "admin/login" &&
      user?.role !== "admin"
    )
      store.fail("Administrator authentication required.", 403);

    if (route.startsWith("media/") && method === "GET") {
      const name = params.path[1];

      if (params.path.length !== 2 || !/^[0-9a-f-]{36}\.webp$/.test(name))
        store.fail("Image not found.", 404);

      let file;

      try {
        file = await readFile(
          path.join(process.cwd(), "public", "uploads", name),
        );
      } catch {
        store.fail("Image not found.", 404);
      }

      return new NextResponse(file, {
        headers: {
          "Content-Type": "image/webp",

          "Cache-Control": "public, max-age=31536000, immutable",

          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const secureCookie =
      process.env.NODE_ENV === "production" &&
      process.env.RYLIXS_INSECURE_LOCAL_HTTP !== "true";

    const sessionResponse = (u) => {
      const res = response({ user: u });
      res.cookies.set("rylixs_session", store.createSession(u.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: 604800,
      });
      return res;
    };

    if (route === "auth/options" && method === "GET")
      return response({
        google: !!(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ),
        preview: process.env.RYLIXS_PUBLIC_DEMO === "true" || (
          process.env.RYLIXS_LOCAL_PREVIEW === "true" &&
          process.env.RYLIXS_INSECURE_LOCAL_HTTP === "true"),
      });

    if (route === "auth/preview" && method === "POST")
      return sessionResponse(previewUser());

    if (route === "auth/google" && method === "GET") {
      const auth = startOAuth(new URL(req.url).searchParams.get("next"));
      const res = NextResponse.redirect(auth.url);
      res.cookies.set("rylixs_oauth", auth.state, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: 600,
      });
      return res;
    }

    if (route === "auth/google/callback" && method === "GET") {
      const q = new URL(req.url).searchParams;
      const auth = await finishOAuth(
        q.get("state"),
        q.get("code"),
        (await cookies()).get("rylixs_oauth")?.value,
      );
      const res = NextResponse.redirect(
        new URL(auth.next, process.env.RYLIXS_SITE_URL || req.url),
      );
      res.cookies.set("rylixs_session", store.createSession(auth.user.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: 604800,
      });
      res.cookies.set("rylixs_oauth", "", { path: "/", maxAge: 0 });
      return res;
    }

    if (route === "reviews" && method === "GET")
      return response({ reviews: commerce.resources("reviews") });

    if (route === "health" && method === "GET")
      return response({ app: "RYLIXS", status: "ok" });

    if (route === "catalog" && method === "GET")
      return response({
        products: commerce.enrichedProducts(store.products()),

        banners: commerce.resources("banners"),
        coupons: commerce.resources("coupons"),
        offers: commerce.resources("offers"),

        categories: store.categories(),

        preview: process.env.RYLIXS_LOCAL_PREVIEW === "true" || process.env.RYLIXS_PUBLIC_DEMO === "true",
        settings: store.settings(),
      });

    if (route === "auth/me" && method === "GET") return response({ user });

    if (route === "admin/upload" && method === "POST") {
      if (Number(req.headers.get("content-length") || 0) > 6 * 1024 * 1024)
        store.fail("Image must be smaller than 5 MB.", 413);

      const bytes = await readLimited(req, 6 * 1024 * 1024);

      const form = await new Request(req.url, {
          method: "POST",

          headers: req.headers,

          body: bytes,
        }).formData(),
        file = form.get("file");

      if (
        !file ||
        typeof file.arrayBuffer !== "function" ||
        file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        store.fail("Choose an image smaller than 5 MB.");

      const sharp = (await import("sharp")).default;

      let output;

      try {
        output = await sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 25000000,
        })
          .rotate()

          .resize({
            width: 3200,

            height: 3200,

            fit: "inside",

            withoutEnlargement: true,
          })

          .webp({ quality: 95 })

          .toBuffer();
      } catch {
        store.fail("Choose a valid JPEG, PNG or WebP image.");
      }

      const name = randomUUID() + ".webp",
        dir = path.join(process.cwd(), "public", "uploads");

      await mkdir(dir, { recursive: true });

      await writeFile(path.join(dir, name), output);

      return response({ url: "/api/media/" + name });
    }

    let input = {};

    if (method !== "GET") {
      const raw = (await readLimited(req, 150000)).toString("utf8");

      if (raw.length > 150000) store.fail("Request is too large.", 413);

      try {
        input = raw ? JSON.parse(raw) : {};
      } catch {
        store.fail("Invalid request.");
      }

      if (!input || typeof input !== "object" || Array.isArray(input))
        store.fail("Invalid request.");
    }

    if (
      ["auth/login", "auth/register", "admin/login"].includes(route) &&
      method === "POST"
    ) {
      if (route !== "admin/login")
        store.fail("Customer sign-in is Google only.", 403);

      const u =
        route === "auth/register"
          ? store.register(input)
          : store.login(input, route === "admin/login");

      const res = response({ user: u });

      res.cookies.set("rylixs_session", store.createSession(u.id), {
        httpOnly: true,

        sameSite: "lax",

        secure:
          process.env.NODE_ENV === "production" &&
          process.env.RYLIXS_INSECURE_LOCAL_HTTP !== "true",

        path: "/",

        maxAge: 604800,
      });

      return res;
    }

    if (route === "auth/logout" && method === "POST") {
      store.logout(token);

      const res = response({ ok: true });

      res.cookies.set("rylixs_session", "", { maxAge: 0, path: "/" });

      return res;
    }

    if (!user) store.fail("Please sign in to continue.", 401);

    if (route === "reviews" && method === "POST")
      return response({ review: commerce.submitReview(user, input) }, 201);

    if (route === "notifications" && method === "GET")
      return response({
        notifications: [
          ...commerce.resources("notifications"),
          ...store.orderList({ ...user, role: "customer" }).map((o) => ({
            id: o.id,
            title: o.id + " · " + o.status,
            description: "Your order status has been updated.",
            createdAt: o.updatedAt,
          })),
        ],
      });

    if (route === "admin/banner-order" && method === "POST") {
      store.transaction(() =>
        commerce.reorderBanner(input.id, input.direction),
      );
      return response({ ok: true });
    }
    if (route.startsWith("admin/resources/")) {
      const kind = params.path[2];
      if (method === "POST")
        return response({ resource: commerce.saveResource(kind, input) });
      if (method === "DELETE") {
        commerce.deleteResource(kind, params.path[3]);
        return response({ ok: true });
      }
    }

    if (route.startsWith("admin/products/") && method === "DELETE") {
      commerce.removeProduct(params.path[2]);
      return response({ ok: true });
    }

    if (route.startsWith("admin/categories/") && method === "DELETE") {
      commerce.removeCategory(params.path[2]);
      return response({ ok: true });
    }

    if (route.startsWith("admin/customers/") && method === "PUT") {
      const id = params.path[2];
      if (
        !store.db
          .prepare("SELECT id FROM users WHERE id=? AND role='customer'")
          .get(id)
      )
        store.fail("Customer not found.", 404);
      store.db
        .prepare(
          "INSERT INTO account_flags(userId,blocked) VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET blocked=excluded.blocked",
        )
        .run(id, input.blocked === true ? 1 : 0);
      return response({ ok: true });
    }
    if (route === "profile" && method === "PUT")
      return response({ user: store.updateProfile(user, input) });

    if (route === "orders/quote" && method === "POST")
      return response(store.quote(input));

    if (route === "orders" && method === "POST") {
      const order = store.createOrder(user, input);

      return response({ order, whatsappUrl: store.whatsappLink(order) }, 201);
    }

    if (route === "orders" && method === "GET")
      return response({
        orders: store.orderList({ ...user, role: "customer" }),
      });

    if (route.startsWith("orders/") && method === "GET") {
      const order = store.getOrder(
        { ...user, role: "customer" },

        params.path[1],
      );

      return response({ order, whatsappUrl: store.whatsappLink(order) });
    }

    if (route === "admin/data" && method === "GET")
      return response({
        ...Object.fromEntries(
          commerce.resourceKinds.map((k) => [k, commerce.resources(k, true)]),
        ),

        products: store.products(true),

        categories: store.categories(true),

        settings: store.settings(),

        orders: store.orderList(user),

        statuses: store.statuses,

        customers: store.db

          .prepare(
            "SELECT u.id,u.name,u.email,u.phone,u.addresses,coalesce(f.blocked,0) blocked,f.lastLogin FROM users u LEFT JOIN account_flags f ON f.userId=u.id WHERE u.role='customer'",
          )

          .all(),
      });

    if (route === "admin/products" && method === "POST")
      return response({
        product: store.transaction(() => store.saveProduct(input)),
      });

    if (route === "admin/categories" && method === "POST")
      return response({ category: store.saveCategory(input) });

    if (route === "admin/settings" && method === "PUT")
      return response({ settings: store.saveSettings(input) });

    if (route.startsWith("admin/orders/") && method === "PUT")
      return response({
        order: store.updateOrder(user, params.path[2], input),
      });

    return response({ error: "Not found." }, 404);
  } catch (e) {
    if (!e.status) console.error("Request failed:", e);

    return response(
      {
        error: e.status ? e.message : "Something went wrong. Please try again.",
      },

      e.status || 500,
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
