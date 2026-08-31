import assert from "node:assert/strict";
import test from "node:test";

import sitemap from "../../src/app/sitemap";

test("sitemap still renders static routes when DATABASE_URL is unavailable", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalVercelUrl = process.env.VERCEL_URL;

  delete process.env.DATABASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  process.env.VERCEL_URL = "preview.example.com";

  try {
    const routes = await sitemap();

    assert.equal(routes.length, 8);
    assert.equal(routes[0]?.url, "https://preview.example.com/");
    assert.ok(routes.every((route) => route.url.startsWith("https://preview.example.com/")));
  } finally {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }

    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = originalVercelUrl;
    }
  }
});
