
DO $$
DECLARE
  seed_owner uuid := '233e1ebc-f347-4986-8583-e930cece660a';
BEGIN
  -- Idempotency marker: bail out cleanly if we've already seeded.
  IF EXISTS (SELECT 1 FROM public.companies WHERE slug = 'nile-delta-agri') THEN
    RAISE NOTICE 'Marketplace seed already present, skipping.';
    RETURN;
  END IF;

  -- 1. Product categories --------------------------------------------------
  INSERT INTO public.product_categories (name, slug, icon) VALUES
    ('Grains',         'grains',         'wheat'),
    ('Fruits',         'fruits',         'apple'),
    ('Vegetables',     'vegetables',     'carrot'),
    ('Softs',          'softs',          'coffee'),
    ('Nuts & Seeds',   'nuts-seeds',     'nut'),
    ('Oils',           'oils',           'droplet'),
    ('Legumes',        'legumes',        'bean'),
    ('Herbs & Spices', 'herbs-spices',   'leaf');

  -- 2. Supplier companies --------------------------------------------------
  INSERT INTO public.companies
    (owner_id, name, slug, type, country, city, verified, rating, description, employees, founded, website)
  VALUES
    (seed_owner, 'Nile Delta Agri',        'nile-delta-agri',        'exporter', 'EG', 'Alexandria', true, 4.8,
     'Premium Egyptian fruits, vegetables and olive oil for global retail and wholesale markets.', 240, 2008, 'https://niledelta.example'),
    (seed_owner, 'Andes Highland Coffee',  'andes-highland-coffee',  'exporter', 'CO', 'Bogotá',     true, 4.9,
     'Single-origin Colombian arabica sourced directly from smallholder cooperatives in the Andes.', 180, 2011, 'https://andeshighland.example'),
    (seed_owner, 'Indus Grain Trading',    'indus-grain-trading',    'exporter', 'IN', 'Mumbai',     true, 4.6,
     'Long-grain basmati rice, pulses and spices from certified Indian farms.', 320, 2003, 'https://indusgrain.example'),
    (seed_owner, 'Serra Verde Agroexport', 'serra-verde-agroexport', 'exporter', 'BR', 'São Paulo',  true, 4.7,
     'Brazilian soybeans, sugar, coffee and cassava for global distribution.', 410, 2005, 'https://serraverde.example'),
    (seed_owner, 'Kenya Rift Growers',     'kenya-rift-growers',     'exporter', 'KE', 'Nairobi',    true, 4.5,
     'Fresh produce, tea and macadamia nuts from the Great Rift Valley.', 150, 2014, 'https://kenyarift.example');

  -- 3. Products -------------------------------------------------------------
  INSERT INTO public.products
    (supplier_company_id, category_id, name, sku, description, origin_country, unit, price_usd, moq, stock, images, active)
  SELECT co.id, cat.id, p.name, p.sku, p.description, p.origin_country, p.unit, p.price_usd, p.moq, p.stock, p.images, true
  FROM (VALUES
    -- Nile Delta Agri (EG)
    ('nile-delta-agri','fruits',        'Valencia Oranges (Grade A)', 'NDA-ORG-VAL', 'Hand-picked Grade-A Valencia oranges from the Nile Delta. High juice yield, uniform 70-90mm calibre. Available in 15kg cartons or 1MT wooden bins.', 'EG', 'MT',    780.00,  20, 240, ARRAY['https://picsum.photos/seed/valencia-oranges/800/600']),
    ('nile-delta-agri','vegetables',    'White Onions',                'NDA-ONI-WHT', 'Sun-cured Egyptian white onions, 50-70mm calibre. Long shelf life, uniform size, packed in 25kg mesh bags.', 'EG', 'MT',    420.00,  20, 600, ARRAY['https://picsum.photos/seed/white-onions/800/600']),
    ('nile-delta-agri','vegetables',    'Fresh Garlic',                'NDA-GAR-01',  'Purple-skin fresh garlic bulbs, 55mm+ diameter. Cured 14 days, packed in 10kg cartons.', 'EG', 'MT',   1200.00,  10, 180, ARRAY['https://picsum.photos/seed/fresh-garlic/800/600']),
    ('nile-delta-agri','fruits',        'Pomegranates (Wonderful)',    'NDA-POM-01',  'Wonderful cultivar pomegranates, 250-400g. Deep-ruby arils, high brix. Cold-stored, 4kg cartons.', 'EG', 'MT',   1450.00,  15, 220, ARRAY['https://picsum.photos/seed/pomegranates/800/600']),
    ('nile-delta-agri','oils',          'Extra Virgin Olive Oil',      'NDA-OIL-EVOO','Cold-pressed extra virgin olive oil from Siwa Oasis. Acidity <0.4%. Available in 5L tins and 1L glass bottles.', 'EG', 'L',       6.80, 500, 8000, ARRAY['https://picsum.photos/seed/olive-oil/800/600']),

    -- Andes Highland Coffee (CO)
    ('andes-highland-coffee','softs',   'Colombian Arabica Green Beans', 'AHC-ARB-01', 'Single-origin Excelso Colombian arabica, screen 15+. SCA cupping score 84+. Packed in GrainPro 60kg bags.', 'CO', 'MT',   5400.00,   5,  60, ARRAY['https://picsum.photos/seed/arabica-green/800/600']),
    ('andes-highland-coffee','softs',   'Roasted Colombian Blend',       'AHC-BLD-01', 'Medium-dark roast, notes of caramel, chocolate and citrus. Ground or whole bean. Private-label ready.', 'CO', 'KG',     12.50, 500,15000, ARRAY['https://picsum.photos/seed/roasted-coffee/800/600']),
    ('andes-highland-coffee','softs',   'Decaf Green Coffee Beans',      'AHC-DEC-01', 'Swiss-water decaffeinated Colombian arabica. 99.9% caffeine-free. Screen 15+.', 'CO', 'MT',   6200.00,   5,  40, ARRAY['https://picsum.photos/seed/decaf-coffee/800/600']),

    -- Indus Grain Trading (IN)
    ('indus-grain-trading','grains',    'Basmati Rice 1121 (Steam)',  'IGT-BAS-1121','Extra-long-grain 1121 basmati, 8.30mm+ average. Steam-processed, aged 12 months. 25kg PP bags.', 'IN', 'MT',   1350.00,  25, 800, ARRAY['https://picsum.photos/seed/basmati-rice/800/600']),
    ('indus-grain-trading','legumes',   'Kabuli Chickpeas 12mm',      'IGT-CHK-KAB', 'Premium Kabuli white chickpeas, 12mm+ calibre. Cleaned, machine-sorted. 50kg PP bags.', 'IN', 'MT',    980.00,  20, 500, ARRAY['https://picsum.photos/seed/chickpeas/800/600']),
    ('indus-grain-trading','legumes',   'Yellow Lentils (Split)',     'IGT-LEN-YEL', 'Split yellow lentils (moong dal). Bright colour, low broken grain. 25kg PP bags.', 'IN', 'MT',    890.00,  20, 420, ARRAY['https://picsum.photos/seed/yellow-lentils/800/600']),
    ('indus-grain-trading','herbs-spices','Cumin Seeds (Singapore)',  'IGT-CUM-01',  'Machine-cleaned cumin seeds, 99% purity, 2% max moisture. 25kg jute bags.', 'IN', 'MT',   3200.00,   5,  90, ARRAY['https://picsum.photos/seed/cumin/800/600']),
    ('indus-grain-trading','fruits',    'Alphonso Mangoes',           'IGT-MAN-ALP', 'GI-tagged Alphonso mangoes from Ratnagiri. Air-freight, 220-320g. 3kg wooden boxes.', 'IN', 'MT',   2100.00,  10, 140, ARRAY['https://picsum.photos/seed/alphonso-mangoes/800/600']),
    ('indus-grain-trading','nuts-seeds','Natural Sesame Seeds',       'IGT-SES-01',  'Hulled natural white sesame seeds, 99.95% purity. NON-GMO. 25kg PP bags.', 'IN', 'MT',   2400.00,  10, 260, ARRAY['https://picsum.photos/seed/sesame-seeds/800/600']),
    ('indus-grain-trading','herbs-spices','Green Cardamom Pods',      'IGT-CAR-01',  'Alleppey green cardamom, 7mm+ bold. Vacuum-packed 5kg cartons. Premium aroma.', 'IN', 'MT',  24000.00,   1,  12, ARRAY['https://picsum.photos/seed/cardamom/800/600']),

    -- Serra Verde Agroexport (BR)
    ('serra-verde-agroexport','grains', 'Soybeans (Non-GMO)',         'SVA-SOY-01',  'Brazilian non-GMO soybeans, 34%+ protein, <14% moisture. Bulk vessel or 1MT bags.', 'BR', 'MT',    540.00,  50,2200, ARRAY['https://picsum.photos/seed/soybeans/800/600']),
    ('serra-verde-agroexport','grains', 'Yellow Corn (Feed Grade)',   'SVA-COR-YEL', 'Feed-grade yellow corn, 14% max moisture, aflatoxin <20 ppb. Bulk vessel.', 'BR', 'MT',    315.00,  50,3400, ARRAY['https://picsum.photos/seed/yellow-corn/800/600']),
    ('serra-verde-agroexport','softs',  'Raw Cane Sugar VHP',         'SVA-SUG-01',  'Very-High-Polarity raw cane sugar, 99.4+ pol. Bulk vessel, ex Santos.', 'BR', 'MT',    480.00, 100,1800, ARRAY['https://picsum.photos/seed/cane-sugar/800/600']),
    ('serra-verde-agroexport','softs',  'Arabica Coffee (Santos NY2)','SVA-COF-01',  'Brazilian arabica, screen 17/18, NY2 grade. Natural process. GrainPro 60kg bags.', 'BR', 'MT',   4900.00,   5, 150, ARRAY['https://picsum.photos/seed/brazilian-coffee/800/600']),
    ('serra-verde-agroexport','grains', 'Cassava Starch (Native)',    'SVA-CAS-01',  'Native cassava starch, food grade, 13% max moisture. 25kg multi-wall bags.', 'BR', 'MT',    730.00,  20, 620, ARRAY['https://picsum.photos/seed/cassava-starch/800/600']),

    -- Kenya Rift Growers (KE)
    ('kenya-rift-growers','softs',      'Loose-Leaf Black Tea (BP1)', 'KRG-TEA-01',  'Kenyan BP1 grade black tea, bright liquor, briskness. 25kg foil-lined paper sacks.', 'KE', 'KG',      8.40, 500,12000, ARRAY['https://picsum.photos/seed/black-tea/800/600']),
    ('kenya-rift-growers','fruits',     'Hass Avocados',              'KRG-AVO-01',  'Export-grade Hass avocados, 12-24 count, 4kg cartons. Sea or air freight available.', 'KE', 'MT',   2650.00,  10, 180, ARRAY['https://picsum.photos/seed/hass-avocado/800/600']),
    ('kenya-rift-growers','nuts-seeds', 'Macadamia Nuts (Style I)',   'KRG-MAC-01',  'Kenyan Style-I macadamia kernels, 18mm+ whole. Vacuum-packed 11.34kg cartons.', 'KE', 'MT',   8900.00,   3,  45, ARRAY['https://picsum.photos/seed/macadamia/800/600']),
    ('kenya-rift-growers','vegetables', 'French Beans (Fine)',        'KRG-FRB-01',  'Air-freight fine French beans, 6-9mm diameter. Trimmed and topped, 250g packs in 5kg cartons.', 'KE', 'MT',   3100.00,   8,  96, ARRAY['https://picsum.photos/seed/french-beans/800/600'])
  ) AS p(company_slug, category_slug, name, sku, description, origin_country, unit, price_usd, moq, stock, images)
  JOIN public.companies co               ON co.slug  = p.company_slug
  JOIN public.product_categories cat     ON cat.slug = p.category_slug;

  -- 4. A handful of product certifications ---------------------------------
  INSERT INTO public.product_certifications (product_id, cert_type, issuer, issued_date, expiry_date, verified)
  SELECT p.id, c.cert_type, c.issuer, c.issued_date::date, c.expiry_date::date, true
  FROM (VALUES
    ('NDA-ORG-VAL', 'GlobalGAP',            'GlobalGAP Council',        '2025-01-15', '2027-01-14'),
    ('NDA-OIL-EVOO','Organic (EU)',         'ECOCERT',                  '2024-11-01', '2026-10-31'),
    ('AHC-ARB-01',  'Fair Trade',           'Fair Trade International', '2024-09-01', '2026-08-31'),
    ('IGT-BAS-1121','SGS Quality',          'SGS',                      '2025-02-10', '2026-02-09'),
    ('SVA-COF-01',  'Rainforest Alliance',  'Rainforest Alliance',      '2024-06-15', '2026-06-14'),
    ('KRG-AVO-01',  'GlobalGAP',            'GlobalGAP Council',        '2025-03-05', '2027-03-04')
  ) AS c(sku, cert_type, issuer, issued_date, expiry_date)
  JOIN public.products p ON p.sku = c.sku;
END $$;
