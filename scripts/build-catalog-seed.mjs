import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import fashion from './catalog-data/fashion.mjs';
import home from './catalog-data/home.mjs';
import personalCare from './catalog-data/personal-care.mjs';
import kitchen from './catalog-data/kitchen.mjs';
import beauty from './catalog-data/beauty.mjs';
import outdoors from './catalog-data/outdoors.mjs';
import kids from './catalog-data/kids.mjs';
import foodDrink from './catalog-data/food-drink.mjs';
import tech from './catalog-data/tech.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const bySlug = {
  fashion,
  home,
  'personal-care': personalCare,
  kitchen,
  beauty,
  outdoors,
  kids,
  'food-drink': foodDrink,
  tech,
};

const SLUG_ORDER = ['fashion', 'home', 'personal-care', 'kitchen', 'beauty', 'outdoors', 'kids', 'food-drink', 'tech'];

function sqlEsc(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlStrArr(arr) {
  const lines = arr.map(sqlEsc);
  const chunk = 4;
  const parts = [];
  for (let i = 0; i < lines.length; i += chunk) {
    parts.push(lines.slice(i, i + chunk).join(', '));
  }
  return `ARRAY[\n          ${parts.join(',\n          ')}\n        ]`;
}

function sqlNumArr(arr) {
  const s = arr.map((x) => Number(x).toFixed(2)).join(', ');
  return `ARRAY[\n          ${s}\n        ]`;
}

function loadPhotoUrls() {
  const raw = readFileSync(join(ROOT, 'scripts/catalog-unsplash-pool.txt'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (raw.length !== 252) {
    throw new Error(`Expected 252 photo pool lines, got ${raw.length}`);
  }
  return raw.map((line) => {
    const id = line.trim();
    if (!/^photo-[0-9]+-[a-f0-9]+$/.test(id)) {
      throw new Error(`Bad photo id line: ${id}`);
    }
    return `https://images.unsplash.com/${id}?w=400`;
  });
}

function buildGeneratedBody(photoUrls) {
  const photoArray =
    'ARRAY[\n          ' +
    photoUrls.map(sqlEsc).join(',\n          ') +
    '\n        ]';

  const priceCases = SLUG_ORDER.map((slug) => {
    const p = bySlug[slug].prices;
    return `        WHEN '${slug}' THEN (${sqlNumArr(p)})[n]`;
  }).join('\n');

  const nameCases = SLUG_ORDER.map((slug) => {
    const p = bySlug[slug].names;
    return `        WHEN '${slug}' THEN (${sqlStrArr(p)})[n]`;
  }).join('\n');

  const descCases = SLUG_ORDER.map((slug) => {
    const p = bySlug[slug].descriptions;
    return `        WHEN '${slug}' THEN (${sqlStrArr(p)})[n]`;
  }).join('\n');

  const matCases = SLUG_ORDER.map((slug) => {
    const p = bySlug[slug].materials;
    return `        WHEN '${slug}' THEN (${sqlStrArr(p)})[n]`;
  }).join('\n');

  const baseIdx =
    `CASE c.slug\n` +
    SLUG_ORDER.map((slug, i) => `          WHEN '${slug}' THEN ${i * 28}`).join('\n') +
    '\n        END';

  return `-- Generate 252 category-specific products across 9 categories (28 per category)
WITH category_map AS (
  SELECT id, slug
  FROM categories
  WHERE slug IN ('fashion','home','personal-care','kitchen','beauty','outdoors','kids','food-drink','tech')
), generated AS (
  SELECT
    c.id AS category_id,
    t.item_name AS name,
    c.slug || '-' || regexp_replace(lower(t.item_name), '[^a-z0-9]+', '-', 'g') || '-' || n AS slug,
    t.item_description AS description,
    round((
      (CASE c.slug
${priceCases}
        ELSE 12.99
      END)::numeric
      + ((n - 1) % 4) * 0.25
    ), 2) AS price,
    (${photoArray})[( ${baseIdx} ) + n] AS image_url,
    (5 + (n % 6))::smallint AS sustainability_score,
    t.item_materials AS materials,
    round((0.6 + (n % 15) * 0.35)::numeric, 2) AS carbon_footprint_saving_kg
  FROM category_map c
  CROSS JOIN generate_series(1, 28) AS n
  CROSS JOIN LATERAL (
    SELECT
      CASE c.slug
${nameCases}
      END AS item_name,
      CASE c.slug
${descCases}
      END AS item_description,
      CASE c.slug
${matCases}
      END AS item_materials
  ) t
)
INSERT INTO products (category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg)
SELECT category_id, name, slug, description, price, image_url, sustainability_score, materials, carbon_footprint_saving_kg
FROM generated
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  materials = EXCLUDED.materials,
  sustainability_score = EXCLUDED.sustainability_score,
  carbon_footprint_saving_kg = EXCLUDED.carbon_footprint_saving_kg;
`;
}

function patchSeedAndRunAll(relPath, bodyWithComment) {
  const full = readFileSync(join(ROOT, relPath), 'utf8');
  const anchor =
    /(-- Remove old generic generated products from previous seed versions\r?\nDELETE FROM products\r?\nWHERE slug LIKE '%-eco-product-%';\r?\n\r?\n)[\s\S]*/;
  if (!anchor.test(full)) throw new Error(`delete anchor not found in ${relPath}`);
  if (relPath.includes('run-all')) {
    const re = /(-- Remove old generic generated products from previous seed versions\r?\nDELETE FROM products\r?\nWHERE slug LIKE '%-eco-product-%';\r?\n\r?\n)[\s\S]*?(?=\r?\n-- ========== STORAGE:)/;
    writeFileSync(join(ROOT, relPath), full.replace(re, `$1${bodyWithComment}\n\n`));
  } else {
    writeFileSync(join(ROOT, relPath), full.replace(anchor, `$1${bodyWithComment}\n`));
  }
}

const photoUrls = loadPhotoUrls();
const bodyWithComment = buildGeneratedBody(photoUrls);

patchSeedAndRunAll('supabase/seed.sql', bodyWithComment);
patchSeedAndRunAll('supabase/run-all.sql', bodyWithComment);

const pasteHeader = `-- Copy ALL of this file into Supabase → SQL Editor → Run once.
-- Refreshes generated product names, descriptions, prices, image_url, materials, scores, and carbon for matching slugs.

`;
writeFileSync(join(ROOT, 'supabase/manual/paste_catalog_refresh_supabase.sql'), pasteHeader + bodyWithComment + '\n');

console.log('Updated supabase/seed.sql, supabase/run-all.sql, supabase/manual/paste_catalog_refresh_supabase.sql');
