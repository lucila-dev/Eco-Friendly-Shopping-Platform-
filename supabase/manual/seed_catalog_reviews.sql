-- Short catalog reviews: random count per product (1–8); text seeded by slug + slot.
-- Prerequisites: migration 013_catalog_seed_reviews.sql applied.

DELETE FROM reviews WHERE catalog_seed = true;

DO $$
DECLARE
  rec record;
  slot int;
  n_reviews int;
  h bigint;
  product_seed bigint;
  rating smallint;
  rname text;
  body text;
  created_ts timestamptz;
  roll int;
  i_c int;
  i_t int;
  cores text[] := ARRAY[
    'good', 'fine', 'ok', 'nice', 'solid', 'decent', 'great', 'useful', 'handy', 'works',
    'happy', 'pleased', 'satisfied', 'impressed', 'surprised', 'relieved', 'content',
    'quick ship', 'fast arrival', 'on time', 'packed well', 'no damage', 'as listed',
    'true to photos', 'matches pic', 'looks like site', 'honest listing', 'accurate blurb',
    'would rebuy', 'might get another', 'second order soon', 'grabbed two', 'stocking up',
    'no regrets', 'zero drama', 'smooth buy', 'easy checkout', 'would recommend',
    'five stars', 'four stars from me', 'does the job', 'gets daily use', 'kitchen staple',
    'kid approved', 'partner likes it', 'roommate stole it', 'gift went over well',
    'better than store brand', 'beats amazon basics', 'nicer in person', 'photos undersell',
    'eco angle real', 'feels less wasteful', 'plastic cut down', 'low guilt purchase',
    'price fair', 'worth it', 'on sale steal', 'budget friendly', 'not overpriced',
    'small biz win', 'will order again', 'repeat customer now', 'third from here',
    'meh but ok', 'fine for what it is', 'nothing fancy', 'basic in a good way',
    'love it', 'obsessed', 'game changer', 'life easier', 'saves time', 'saves space',
    'smells fine', 'no weird smell', 'feels sturdy', 'held up so far', 'weeks in still good',
    'instructions clear', 'self explanatory', 'idiot proof', 'plug and play',
    'travel friendly', 'fits bag', 'lightweight win', 'not bulky', 'compact',
    'seasonal fave', 'summer pick', 'winter essential', 'all year use',
    'vegan household ok', 'sensitive skin ok', 'allergy cautious here — fine',
    'cat ignored it', 'dog approved', 'baby safe enough', 'toddler proof-ish'
  ];
  tails text[] := ARRAY[
    '', ' tbh', ' overall', ' for me', ' fwiw', '.', ' honestly', ' lol', ' yep', ' — quick ship', ' thanks', ' no notes', ' :)', ' !!'
  ];
  names text[] := ARRAY[
    'Mara Chen', 'Jon Ellis', 'Priya Nair', 'Sam Okoro', 'Leo Hart', 'Nina Varga', 'Alex Ruiz', 'Casey Bloom',
    'Jordan Meyers', 'Riley Santos', 'Quinn Brooks', 'Diego Alvarez', 'Hannah Okafor', 'Victor Lin', 'Mei Tanaka',
    'Amara Singh', 'Ben Carter', 'Zoe Whitman', 'Omar Haddad', 'Elena Rossi', 'Marcus Webb', 'Fatima Noor', 'Kenji Mori',
    'Ines Duarte', 'Bianca López', 'Dmitri Volkov', 'Yuki Sato', 'Jamal Rivers', 'Taylor Ng'
  ];
BEGIN
  FOR rec IN
    SELECT id, slug FROM products ORDER BY slug
  LOOP
    product_seed := hashtext(rec.slug::text)::bigint + 2147483648;
    n_reviews := 1 + mod(
      hashtext(rec.slug::text || '|count|v1')::bigint + 2147483648,
      8
    )::int;

    FOR slot IN 1..n_reviews LOOP
      h := hashtext(rec.slug::text || '|' || slot::text)::bigint + 2147483648;
      rating := (
        CASE
          WHEN mod(h, 13) = 0 THEN 3::smallint
          WHEN mod(h, 5) = 0 THEN 4::smallint
          ELSE 5::smallint
        END
      );
      rname := names[(1 + mod(product_seed + h + slot * 17, array_length(names, 1)::bigint))::int];

      roll := mod(h + slot * 31 + product_seed, 100)::int;
      IF roll < 42 THEN
        body := NULL;
      ELSE
        i_c := (1 + mod(product_seed + slot * 50331653 + slot * slot * 9973, array_length(cores, 1)::bigint))::int;
        i_t := (1 + mod(product_seed * 7919 + slot * 19349669 + slot * slot, array_length(tails, 1)::bigint))::int;
        body := trim(both ' ' from (cores[i_c] || tails[i_t]));
        IF body = '' OR body IS NULL THEN
          body := cores[i_c];
        END IF;
      END IF;

      created_ts := now() - make_interval(days => 1 + mod(h, 95)::int + slot * 11);

      INSERT INTO reviews (product_id, user_id, rating, body, reviewer_display_name, catalog_seed, created_at)
      VALUES (rec.id, NULL, rating, body, rname, true, created_ts);
    END LOOP;
  END LOOP;
END $$;
