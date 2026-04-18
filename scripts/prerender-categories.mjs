/**
 * Prerender static category pages for SEO.
 * Output: dist/category/{slug}/index.html
 *
 * Runs AFTER `vite build`. Pulls categories + products from Supabase
 * (anon key, public read) and emits lightweight SEO HTML that links
 * back to the SPA. Nginx will serve these directly on first hit.
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://wgkckhtqnqvkbqihtnmq.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indna2NraHRxbnF2a2JxaWh0bm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODk5NzQsImV4cCI6MjA5MTY2NTk3NH0.8peEDu5d0lwt77OeHrbZDa9PuMpeRwow4fih1j74T1Q";

const SITE_URL = process.env.SITE_URL || "https://books.hn-driver.online";
const SITE_NAME = "HN Book";

if (!existsSync(DIST)) {
  console.error("[prerender] dist/ not found — run `vite build` first.");
  process.exit(0); // soft-exit so build doesn't fail
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const escape = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function loadIndexShell() {
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error("dist/index.html missing");
  }
  return await readFile(indexPath, "utf-8");
}

function injectSEO(shell, { title, description, canonical, jsonLd, h1Block }) {
  let html = shell;
  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`);
  // Inject meta + canonical + JSON-LD before </head>
  const headInject = `
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${escape(canonical)}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${escape(canonical)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `;
  html = html.replace(/<\/head>/i, `${headInject}</head>`);
  // Inject SEO H1 + product list in a hidden noscript-friendly block right after <body>
  // (visible to crawlers; SPA mounts and overrides on hydration)
  html = html.replace(
    /(<div id="root">)/i,
    `<div id="prerender-seo" style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">${h1Block}</div>$1`
  );
  return html;
}

async function generateCategoryPage(category, products) {
  const title = `${category.name} — ${SITE_NAME}`;
  const description =
    category.description ||
    `تصفح ${products.length} منتج في تصنيف ${category.name} على ${SITE_NAME}.`;
  const canonical = `${SITE_URL}/category/${category.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "ar",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/product/${p.slug || p.id}`,
        name: p.name,
      })),
    },
  };

  const productLinks = products
    .slice(0, 100)
    .map(
      (p) =>
        `<li><a href="/product/${escape(p.slug || p.id)}">${escape(p.name)}</a>${
          p.short_description ? ` — ${escape(p.short_description)}` : ""
        }</li>`
    )
    .join("");

  const h1Block = `
    <h1>${escape(category.name)}</h1>
    <p>${escape(description)}</p>
    <nav><a href="/">${escape(SITE_NAME)}</a> / <a href="/category/${escape(
    category.slug
  )}">${escape(category.name)}</a></nav>
    <ul>${productLinks || "<li>لا توجد منتجات حالياً.</li>"}</ul>
  `;

  return { title, description, canonical, jsonLd, h1Block };
}

async function main() {
  console.log("[prerender] fetching categories…");
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("is_active", true);

  if (catErr) {
    console.error("[prerender] categories fetch failed:", catErr.message);
    process.exit(0);
  }
  if (!categories?.length) {
    console.log("[prerender] no active categories — skipping.");
    return;
  }

  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, slug, short_description, category_id, category, is_active")
    .eq("is_active", true);
  if (prodErr) {
    console.error("[prerender] products fetch failed:", prodErr.message);
  }

  const productsByCategory = new Map();
  for (const p of products || []) {
    const key = p.category_id || null;
    if (!productsByCategory.has(key)) productsByCategory.set(key, []);
    productsByCategory.get(key).push(p);
  }

  const shell = await loadIndexShell();
  const sitemapUrls = [];

  for (const cat of categories) {
    const items = productsByCategory.get(cat.id) || [];
    const meta = await generateCategoryPage(cat, items);
    const html = injectSEO(shell, meta);

    const outDir = join(DIST, "category", cat.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html, "utf-8");
    sitemapUrls.push(meta.canonical);
    console.log(`[prerender] ✓ /category/${cat.slug} (${items.length} products)`);
  }

  // Generate a basic sitemap.xml augmenting category URLs
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
${sitemapUrls
  .map(
    (u) =>
      `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
  )
  .join("\n")}
</urlset>`;
  await writeFile(join(DIST, "sitemap.xml"), sitemap, "utf-8");
  console.log(`[prerender] ✓ sitemap.xml (${sitemapUrls.length} category URLs)`);
  console.log(`[prerender] done — ${categories.length} pages generated.`);
}

main().catch((e) => {
  console.error("[prerender] fatal:", e);
  process.exit(0); // soft-fail
});
