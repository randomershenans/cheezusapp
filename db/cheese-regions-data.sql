-- Cheese Producing Regions Data
-- This file contains INSERT statements for well-known cheese producing regions
-- with protected geographical indications that map to the cheese_locations schema.
--
-- Sources of information:
-- - European Commission's Database of Origin and Registration (DOOR)
-- - Protected Designation of Origin (PDO) and Protected Geographical Indication (PGI) official registries
-- - Official consortium websites for various cheese producing regions
-- - Geographic data from OpenStreetMap and national geographic institutes
-- - Historical information from academic publications and regional historical archives
-- - Traditional methods documentation from producer associations and agricultural ministries

-- FRANCE

-- Roquefort (PDO/AOC)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Roquefort-sur-Soulzon',
  'A commune in southern France famous for Roquefort cheese, which is aged in the natural limestone caves of Mont Combalou.',
  ST_SetSRID(ST_MakePoint(2.9833, 43.9667), 4326)::geography,
  630, -- elevation in meters
  'PDO', -- Protected Designation of Origin
  'FR/PDO/0017/0076',
  '1996-06-12', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Roquefort cheese must be made from raw sheep''s milk from the Lacaune breed and aged in the natural limestone caves of Mont Combalou for at least 3 months. The cheese develops its characteristic blue veins when Penicillium roqueforti spores are added to the curd and the cheese is pierced with needles to allow air to enter.',
  'Roquefort has a long history dating back to at least 1070. According to legend, a shepherd left his lunch of bread and sheep''s milk cheese in a cave to chase after a beautiful girl. When he returned months later, the cheese had transformed into Roquefort. The cheese received legal protection as early as 1411 when Charles VI granted a monopoly to the village of Roquefort-sur-Soulzon.'
);

-- Camembert de Normandie (PDO/AOC)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Camembert',
  'A village in Normandy, France that gives its name to the famous soft cheese made from cow''s milk.',
  ST_SetSRID(ST_MakePoint(0.1808, 48.8864), 4326)::geography,
  140, -- elevation in meters
  'AOC', -- Appellation d'Origine Contrôlée
  'FR/PDO/0017/0112',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Camembert de Normandie must be made with raw milk from Normande cows. The curd is ladled by hand into molds, never pumped. The cheese is aged for at least 21 days, during which it develops its characteristic bloomy white rind and creamy texture.',
  'Camembert was first created in 1791 by Marie Harel, a farmer from Normandy, who was allegedly given the recipe by a priest from the Brie region who was seeking refuge during the French Revolution. The cheese became nationally famous when it was included in soldiers'' rations during World War I.'
);

-- Comté (PDO/AOC)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Franche-Comté',
  'A cultural and historical region in eastern France, along the border with Switzerland, known for its Comté cheese production.',
  ST_SetSRID(ST_MakePoint(6.0230, 47.1326), 4326)::geography,
  500, -- average elevation in meters
  'AOC', -- Appellation d'Origine Contrôlée
  'FR/PDO/0017/0087',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Comté must be made from the raw milk of Montbéliarde or French Simmental cows. The cows must be fed only fresh grass or hay, never fermented feed. The cheese is aged in special cellars for a minimum of 4 months, often up to 18 or 24 months. Each wheel weighs between 30-45kg and requires about 450 liters of milk.',
  'Comté has been produced in the Jura mountains since at least the 12th century. Farmers formed cooperatives called "fruitières" to pool their milk for cheese production, as a single wheel required more milk than one farmer could provide. This cooperative system continues today and is one of the oldest in France.'
);

-- ITALY

-- Parmigiano Reggiano (PDO/DOP)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Parmigiano Reggiano Production Area',
  'The production area includes the provinces of Parma, Reggio Emilia, Modena, and parts of Bologna and Mantua in northern Italy.',
  ST_SetSRID(ST_MakePoint(10.6292, 44.6949), 4326)::geography,
  75, -- average elevation in meters
  'DOP', -- Denominazione di Origine Protetta (Italian PDO)
  'IT/PDO/0017/0016',
  '1996-06-12', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Parmigiano Reggiano must be made from raw cow''s milk from cows fed only on grass or hay. The cheese is aged for a minimum of 12 months, though often 24-36 months. The production process has remained virtually unchanged for over 700 years, including the use of copper vats and natural whey cultures. Each wheel is brined for about 20 days and regularly turned during aging.',
  'Parmigiano Reggiano has been produced since the Middle Ages, with documented evidence dating back to 1344. Benedictine and Cistercian monks were the first to produce it, creating a cheese that could be preserved for long periods. The distinctive dotted pattern on the rind was introduced in 1964 to combat counterfeiting.'
);

-- Gorgonzola (PDO/DOP)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Gorgonzola',
  'A town in the Metropolitan City of Milan, Lombardy, Italy, which gives its name to the famous blue-veined cheese.',
  ST_SetSRID(ST_MakePoint(9.1069, 45.5336), 4326)::geography,
  147, -- elevation in meters
  'DOP', -- Denominazione di Origine Protetta (Italian PDO)
  'IT/PDO/0017/0010',
  '1996-06-12', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Gorgonzola is made from whole cow''s milk and inoculated with Penicillium glaucum spores. The cheese is pierced with metal rods to allow air to enter and promote the growth of blue-green mold veins. It is aged for a minimum of 50 days for the sweet variety (dolce) and at least 80 days for the sharp variety (piccante).',
  'Gorgonzola has been produced since the early Middle Ages, with origins dating back to around the year 879. Legend has it that the cheese was accidentally created when a distracted herdsman left curds overnight in a damp cave. The next morning, he mixed these with fresh curds to salvage his work, inadvertently creating the conditions for blue mold to develop.'
);

-- Mozzarella di Bufala Campana (PDO/DOP)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Campania Region',
  'A region in southern Italy known for its buffalo mozzarella production, particularly in the provinces of Caserta and Salerno.',
  ST_SetSRID(ST_MakePoint(14.2500, 41.0000), 4326)::geography,
  50, -- average elevation in meters
  'DOP', -- Denominazione di Origine Protetta (Italian PDO)
  'IT/PDO/0017/0021',
  '1996-06-12', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Mozzarella di Bufala Campana must be made exclusively from the milk of Italian Mediterranean buffalo. The production involves stretching and kneading the curd in hot water (pasta filata technique) until it reaches the desired smooth, elastic texture. The cheese is then formed into various shapes, traditionally by hand.',
  'Water buffalo were introduced to Italy during the Norman conquest of southern Italy in the 12th century, though some theories suggest they may have been brought by Hannibal during the Punic Wars. The first historical references to buffalo mozzarella date back to the 12th century, when monks at the monastery of San Lorenzo in Capua offered it to pilgrims.'
);

-- SPAIN

-- Manchego (PDO/DO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'La Mancha',
  'A natural and historical region in central Spain, known for its Manchego cheese production.',
  ST_SetSRID(ST_MakePoint(-3.0000, 39.4167), 4326)::geography,
  650, -- average elevation in meters
  'DO', -- Denominación de Origen
  'ES/PDO/0017/0087',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Manchego must be made from the whole milk of Manchega sheep. The cheese is pressed in cylindrical molds that impart the distinctive zigzag pattern on the sides, reminiscent of the esparto grass baskets traditionally used to shape the cheese. It is aged for a minimum of 60 days for semi-cured (semicurado) and at least 6 months for cured (curado) varieties.',
  'Manchego cheese has been produced in the La Mancha region for thousands of years. Archaeological remains of pressing tables have been found dating back to the Bronze Age. The cheese is mentioned in Cervantes'' novel "Don Quixote" (1605), where it is described as one of the region''s treasures.'
);

-- Cabrales (PDO/DO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Cabrales',
  'A municipality in the autonomous community of Asturias, Spain, known for its strong blue cheese.',
  ST_SetSRID(ST_MakePoint(-4.8500, 43.3000), 4326)::geography,
  500, -- average elevation in meters
  'DO', -- Denominación de Origen
  'ES/PDO/0017/0088',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Cabrales is made from a mixture of cow''s milk with goat and/or sheep milk, depending on availability. The cheese is aged in natural limestone caves in the Picos de Europa mountains for 2-5 months. The high humidity and cool temperature of these caves promote the growth of the characteristic blue-green molds that give the cheese its strong flavor and appearance.',
  'Cabrales has been produced for centuries by the shepherds of Asturias as a way to preserve excess milk. The cheese was traditionally wrapped in maple leaves, which helped to maintain humidity during aging. Today, it is wrapped in aluminum foil with a leaf pattern printed on it to honor this tradition.'
);

-- SWITZERLAND

-- Gruyère (PDO/AOP)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Gruyère Region',
  'A district in the canton of Fribourg, Switzerland, known for its Gruyère cheese production.',
  ST_SetSRID(ST_MakePoint(7.0833, 46.5833), 4326)::geography,
  800, -- average elevation in meters
  'OTHER', -- Swiss AOP (Appellation d'Origine Protégée)
  'CH/PDO/0005/0341',
  '2001-07-06', -- Swiss registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Gruyère must be made from raw cow''s milk from cows fed on grass in summer and hay in winter, with no silage allowed. The cheese is aged for 5-18 months in cellars with specific humidity and temperature. The curd is cut into small grains and heated to 43-46°C, which gives the cheese its firm texture. Each wheel weighs between 25-40kg.',
  'Gruyère has been produced since at least 1115, when records show that the cheese was used to pay rent to the local monastery. The region''s cheese-making traditions were developed by monks and later passed on to local farmers. The name comes from the town of Gruyères, which was historically the center of cheese trade in the region.'
);

-- Emmentaler (PDO/AOP)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Emmental Valley',
  'A valley in the canton of Bern, Switzerland, which gives its name to the famous cheese with holes.',
  ST_SetSRID(ST_MakePoint(7.7378, 46.9262), 4326)::geography,
  700, -- average elevation in meters
  'OTHER', -- Swiss AOP (Appellation d'Origine Protégée)
  'CH/PDO/0005/0343',
  '2000-09-06', -- Swiss registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Emmentaler must be made from raw cow''s milk. The characteristic holes are formed by carbon dioxide bubbles released by Propionibacterium freudenreichii bacteria during the aging process. The cheese is aged for a minimum of 4 months, with some varieties aged for over a year. Each wheel weighs between 75-120kg, making it one of the largest cheeses in the world.',
  'Emmentaler has been produced since at least the 13th century. The cheese was originally made in small village dairies, but production was centralized in the 19th century. The large size of the wheels was designed to reduce the amount of rind and maximize the amount of cheese that could be preserved for winter.'
);

-- UNITED KINGDOM

-- Stilton (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Stilton Production Area',
  'The counties of Derbyshire, Leicestershire, and Nottinghamshire in England, which are the only areas authorized to produce Stilton cheese.',
  ST_SetSRID(ST_MakePoint(-0.8936, 52.6568), 4326)::geography,
  100, -- average elevation in meters
  'PDO', -- Protected Designation of Origin
  'UK/PDO/0017/0277',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Stilton must be made from pasteurized cow''s milk. The cheese is never pressed but is allowed to form its own crust. It is pierced with stainless steel needles at about 6 weeks of age to allow air to enter and promote the growth of Penicillium roqueforti, which creates the characteristic blue veins. The cheese is aged for a minimum of 9 weeks.',
  'Despite its name, Stilton cheese was never made in the village of Stilton. It was first sold there to travelers on the Great North Road in the 18th century. The first written record of Stilton cheese comes from 1722, when Daniel Defoe mentioned it in his book "A Tour Through the Whole Island of Great Britain." The cheese received legal protection in 1966.'
);

-- Cheddar (West Country Farmhouse PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Cheddar, Somerset',
  'A village in Somerset, England, which gives its name to the world''s most popular cheese type. The West Country Farmhouse Cheddar PDO covers Somerset, Devon, Dorset, and Cornwall.',
  ST_SetSRID(ST_MakePoint(-2.7686, 51.2812), 4326)::geography,
  50, -- elevation in meters
  'PDO', -- Protected Designation of Origin
  'UK/PDO/0005/0341',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'West Country Farmhouse Cheddar must be made by hand using traditional methods from raw cow''s milk produced in the designated counties. The "cheddaring" process involves stacking and turning slabs of curd to expel whey and develop acidity. The cheese is traditionally wrapped in cloth and aged for at least 9 months, often up to 2 years or more.',
  'Cheddar has been produced since at least the 12th century. According to legend, the cheese was discovered when a milkmaid left a pail of milk in the Cheddar Gorge caves, returning to find it had transformed into something delicious. The caves provided the perfect temperature and humidity for aging cheese, and Cheddar was a favorite of several British monarchs, including Queen Victoria.'
);

-- UNITED STATES

-- Wisconsin Cheese (AVA-like regional designation)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Wisconsin Cheese Region',
  'The state of Wisconsin, USA, known as "America''s Dairyland" and famous for its cheese production.',
  ST_SetSRID(ST_MakePoint(-89.5000, 44.5000), 4326)::geography,
  320, -- average elevation in meters
  'AVA', -- American Viticultural Area (similar concept for cheese regions)
  'US-WI-CHEESE-001',
  '1981-06-20', -- Wisconsin Cheese Label Law date
  'Cheese and dairy products',
  'State Protected',
  'Wisconsin cheese production combines European traditions brought by immigrants with modern innovations. The state produces over 600 varieties of cheese, from traditional cheddar and swiss to specialty artisan cheeses. Many producers still use open vats and traditional cultures, while others have developed new hybrid styles unique to the region.',
  'Wisconsin''s cheese-making tradition began in the 1840s when European immigrants, particularly from Switzerland, Germany, and Scandinavia, brought their cheese-making skills to the region. The first cheese factory in Wisconsin opened in 1841, and by 1922, there were over 2,800 cheese factories in the state. Wisconsin became the first state to implement a cheese grading program in 1915, establishing quality standards that helped build its reputation as a premier cheese-producing region.'
);

-- NETHERLANDS

-- Gouda (PGI)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Gouda',
  'A city in the western Netherlands that gives its name to the famous Dutch cheese, though the cheese is produced throughout the country.',
  ST_SetSRID(ST_MakePoint(4.7083, 52.0175), 4326)::geography,
  2, -- elevation in meters
  'PGI', -- Protected Geographical Indication
  'NL/PGI/0005/0329',
  '2010-10-07', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Traditional Dutch Gouda is made from raw cow''s milk and formed into wheels weighing 10-16kg. The cheese is brined and then coated with yellow paraffin wax to prevent it from drying out during aging. Aging periods vary from 4 weeks for young Gouda to over 2 years for extra-aged varieties, which develop a caramel sweetness and crunchy protein crystals.',
  'Gouda has been traded in the city of Gouda since the Middle Ages, with the first mention dating back to 1184. The cheese market in Gouda has been held since 1395, and this tradition continues today with a ceremonial cheese market held during summer months. Historically, farmers would bring their cheeses to the market square to be weighed and sold, with prices set through a ritualized handshake negotiation called "handjeklap."'
);

-- GREECE

-- Feta (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Feta Production Region',
  'The mainland of Greece and the department of Lesvos, which are the only areas authorized to produce authentic Feta cheese.',
  ST_SetSRID(ST_MakePoint(22.0000, 39.0000), 4326)::geography,
  500, -- average elevation in meters
  'PDO', -- Protected Designation of Origin
  'GR/PDO/0017/0427',
  '2002-10-15', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Feta must be made from sheep''s milk, or a mixture of sheep''s and up to 30% goat''s milk from animals raised in the defined geographical area. The cheese is salted and aged in brine for at least 2 months. Traditional production involves using wooden barrels for aging, though metal containers are now more common.',
  'Feta has been produced in Greece for thousands of years. Homer''s "Odyssey" contains references to cheese-making techniques similar to those used for Feta today. The name "feta" (meaning "slice") dates to the 17th century, referring to the practice of slicing the cheese to fit into barrels for storage. After a long legal battle, in 2005 the European Court of Justice ruled that "feta" is a protected designation of origin product that can only be produced in Greece.'
);

-- PORTUGAL

-- Serra da Estrela (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Serra da Estrela',
  'A mountainous region in central Portugal, home to the country''s most famous cheese, made from the milk of Bordaleira Serra da Estrela and Churra Mondegueira sheep.',
  ST_SetSRID(ST_MakePoint(-7.6145, 40.3516), 4326)::geography,
  1200, -- average elevation in meters
  'PDO', -- Protected Designation of Origin
  'PT/PDO/0017/0278',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Serra da Estrela cheese must be made from raw milk of local sheep breeds. The milk is curdled using the dried flowers of the cardoon thistle (Cynara cardunculus) rather than animal rennet. The curd is broken by hand and drained in wicker baskets that give the cheese its characteristic pattern. It is aged for at least 30 days, during which the cheese is regularly turned and rubbed with salt.',
  'Serra da Estrela is one of the oldest cheeses in Portugal, with production methods dating back to the 12th century. It was traditionally made by shepherds in the mountains as a way to preserve milk during winter months. The cheese was so valued that it was used as currency for paying rents and taxes. It is often called the "king of Portuguese cheeses" and has been celebrated in literature and poetry throughout Portuguese history.'
);

-- DENMARK

-- Danablu (Danish Blue) (PGI)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Denmark',
  'The country of Denmark, known for its Danablu (Danish Blue) cheese production.',
  ST_SetSRID(ST_MakePoint(10.3333, 55.6667), 4326)::geography,
  30, -- average elevation in meters
  'PGI', -- Protected Geographical Indication
  'DK/PGI/0017/0329',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Danablu is made from cow''s milk and inoculated with Penicillium roqueforti to create its distinctive blue veins. Unlike many blue cheeses, Danablu is produced without the use of caves for aging. Instead, it is aged in controlled environments for at least 60 days. The cheese is pierced with stainless steel needles to allow oxygen to enter and promote mold growth. It has a creamy, crumbly texture and a sharp, salty flavor.',
  'Danablu was created in the early 20th century by Danish cheese maker Marius Boel, who was inspired by Roquefort but wanted to create a distinctly Danish blue cheese. He developed the cheese around 1915-1927, and it quickly became popular both domestically and internationally. Danablu was granted PGI status by the European Union in 1996, recognizing its unique characteristics and connection to Danish dairy traditions.'
);

-- IRELAND

-- Cashel Blue (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Cashel, County Tipperary',
  'A town in County Tipperary, Ireland, known for its Cashel Blue cheese production.',
  ST_SetSRID(ST_MakePoint(-7.8855, 52.5158), 4326)::geography,
  95, -- elevation in meters
  'OTHER', -- Regional Specialty
  'IE-CASHEL-BLUE-001',
  '1984-11-01', -- Original production date
  'Farmhouse Cheese',
  'Trademark Protected',
  'Cashel Blue is made from the milk of Friesian cows that graze on the lush pastures of the Golden Vale. The cheese is hand-made in small batches and pierced multiple times to create blue veining. It is aged for 6-12 weeks in temperature-controlled rooms, during which it develops from a chalky, mild cheese to a creamier, more robust blue cheese with a distinctive tang.',
  'Cashel Blue was created in 1984 by Jane and Louis Grubb on their family farm, Beechmount, near the historic Rock of Cashel. It was one of Ireland''s first farmhouse blue cheeses and helped spark a revival of traditional cheese-making in Ireland. The cheese is named after the Rock of Cashel, a historic site that was once the seat of the Kings of Munster. Today, Cashel Blue is internationally recognized and has won numerous awards at cheese competitions worldwide.'
);

-- NORWAY

-- Jarlsberg (Protected Name)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Jarlsberg Region',
  'The historical county of Jarlsberg in eastern Norway, which gives its name to the famous Norwegian cheese with distinctive holes.',
  ST_SetSRID(ST_MakePoint(10.2167, 59.4167), 4326)::geography,
  50, -- average elevation in meters
  'OTHER', -- Protected Name
  'NO-JARLSBERG-001',
  '1957-01-01', -- Modern production began
  'Semi-hard Cheese',
  'Trademark Protected',
  'Jarlsberg is made from cow''s milk using a secret recipe known only to a select few Norwegian dairy farmers. The cheese is aged for at least three months, during which Propionibacterium bacteria create the characteristic large, round holes and contribute to its sweet, nutty flavor. The production involves a special washing and heating process that helps develop its distinctive taste and texture.',
  'While Jarlsberg in its modern form was developed in the 1950s by Professor Ole Martin Ystgaard at the Agricultural University of Norway, it was based on an older cheese called Emmentaler that was produced in Norway in the early 1800s. The cheese was named after Count Wedel Jarlsberg, the original landowner where the cheese was first produced. Jarlsberg quickly became Norway''s most famous cheese export and is now produced in several countries under license from Norwegian dairy cooperative TINE.'
);

-- CANADA

-- Oka (Trappist-type)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Oka, Quebec',
  'A municipality in Quebec, Canada, known for its semi-soft Trappist-type cheese originally made by Trappist monks.',
  ST_SetSRID(ST_MakePoint(-74.0747, 45.4700), 4326)::geography,
  46, -- elevation in meters
  'OTHER', -- Regional Specialty
  'CA-OKA-001',
  '1893-01-01', -- Original production date
  'Semi-soft Washed Rind Cheese',
  'Trademark Protected',
  'Oka cheese is made from pasteurized cow''s milk and features a washed rind that gives it a distinctive orange-brown color. The cheese is aged in humidity-controlled cellars for at least 30 days, during which it is regularly turned and washed with brine. This washing process helps develop its complex flavor profile, which includes notes of nuts and fruit with a slightly pungent aroma.',
  'Oka cheese was first created in 1893 by Trappist monks who had settled in the village of Oka, Quebec, bringing cheese-making techniques from their native France. The monks produced the cheese at the Cistercian Abbey of Notre-Dame du Lac for nearly a century before selling the recipe and production rights to Agropur cooperative in 1981. The cheese was instrumental in establishing Quebec''s reputation for fine cheese-making and remains one of Canada''s most famous cheeses.'
);

-- MEXICO

-- Cotija (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Cotija, Michoacán',
  'A town in the Mexican state of Michoacán that gives its name to a hard, crumbly cheese similar to Parmesan.',
  ST_SetSRID(ST_MakePoint(-102.7000, 19.8167), 4326)::geography,
  1700, -- elevation in meters
  'OTHER', -- Regional Specialty
  'MX-COTIJA-001',
  '2005-09-21', -- Date of collective trademark
  'Hard Aged Cheese',
  'Collective Trademark',
  'Traditional Cotija is made from raw cow''s milk from cows that graze on the lush mountain pastures during the rainy season (July to October). The cheese is salted and pressed into large blocks, then aged for 3-12 months. During aging, it develops a hard, granular texture and a strong, salty flavor. Authentic Cotija is still made by hand using wooden molds and natural materials.',
  'Cotija cheese has been produced in the region between Michoacán and Jalisco for over 400 years, since Spanish colonists brought cheese-making techniques to Mexico. The cheese was traditionally made by ranchers as a way to preserve milk during the rainy season when roads became impassable. In 2005, producers obtained a collective trademark for "Cotija Region of Origin" to protect the traditional production methods. The cheese is often called "the Parmesan of Mexico" and is an essential ingredient in many traditional Mexican dishes.'
);

-- AUSTRIA

-- Vorarlberger Bergkäse (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Vorarlberg',
  'The westernmost state of Austria, known for its mountain cheese production in the Alpine region.',
  ST_SetSRID(ST_MakePoint(9.9000, 47.2500), 4326)::geography,
  1800, -- average elevation in meters
  'PDO', -- Protected Designation of Origin
  'AT/PDO/0005/0390',
  '1997-05-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Vorarlberger Bergkäse must be made from raw cow''s milk from cows that graze on Alpine pastures above 800 meters during summer months. The cheese is produced in copper kettles and aged in natural cellars for at least 3 months, often up to 12 months for more intense flavors. During aging, the wheels are regularly washed with brine and turned, developing a distinctive reddish-brown rind and complex flavor profile.',
  'Mountain cheese production in Vorarlberg dates back to the 9th century, when Alpine dairy farming became established in the region. The cheese was traditionally made in small mountain huts called "Sennereien" during the summer months when cows were moved to high Alpine pastures. This transhumance system, known as "Alpwirtschaft," is still practiced today and is an important part of the cultural heritage of the region. Vorarlberger Bergkäse received PDO status in 1997, recognizing its unique characteristics and traditional production methods.'
);

-- BELGIUM

-- Herve (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Herve',
  'A municipality in eastern Belgium''s Liège Province, known for its pungent washed-rind cheese.',
  ST_SetSRID(ST_MakePoint(5.9475, 50.6400), 4326)::geography,
  280, -- elevation in meters
  'PDO', -- Protected Designation of Origin
  'BE/PDO/0017/0295',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Herve cheese is made from cow''s milk and has a distinctive square shape. The cheese is washed repeatedly with salt water or beer during its 2-3 month aging period, which gives it its characteristic orange-red rind and pungent aroma. Traditional production involves using wooden shelves for aging, which contribute to the development of specific microflora that influence the cheese''s flavor.',
  'Herve is one of Belgium''s oldest cheeses, with production dating back to the Middle Ages. The region''s cheese-making tradition developed in the 12th century when local farmers needed to preserve excess milk. The Herve plateau, with its humid climate and rich pastures, proved ideal for dairy farming and cheese production. During the 17th century, the cheese became an important trade item and was transported along the "cheese route" to markets in Liège and beyond. Herve received PDO status in 1996, protecting its traditional production methods and geographical origin.'
);

-- SWEDEN

-- Västerbottensost (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Burträsk, Västerbotten',
  'A village in Västerbotten County, northern Sweden, where the famous Västerbottensost cheese is produced.',
  ST_SetSRID(ST_MakePoint(20.6500, 64.5167), 4326)::geography,
  55, -- elevation in meters
  'OTHER', -- Regional Specialty
  'SE-VASTERBOTTEN-001',
  '1872-01-01', -- Original production date
  'Hard Cheese',
  'Trademark Protected',
  'Västerbottensost is made from cow''s milk and aged for at least 12 months, often up to 14 months. The cheese is turned and salted regularly during aging. What makes the production unique is that it can only be made at the dairy in Burträsk, despite numerous attempts to replicate it elsewhere. The cheese has a complex flavor profile with sweet, bitter, and umami notes, along with small crystals that form during the long aging process.',
  'According to legend, Västerbottensost was created by accident in 1872 when dairy maid Ulrika Eleonora Lindström was distracted by a romantic interest while making cheese, causing temperature fluctuations in the process. This supposedly led to the cheese''s unique character. Whether true or not, the cheese has become an important part of Swedish culinary heritage and is often served at traditional celebrations like midsummer and Christmas. It is sometimes called "the king of Swedish cheeses" and is the only cheese that can be served at Nobel Prize banquets.'
);

-- INDIA

-- Kalari/Kaladi (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Udhampur, Jammu and Kashmir',
  'A district in the Indian union territory of Jammu and Kashmir, known for its indigenous Kalari/Kaladi cheese production.',
  ST_SetSRID(ST_MakePoint(75.1417, 32.9167), 4326)::geography,
  700, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'IN-KALARI-001',
  '2021-01-01', -- Approximate date of GI application
  'Indigenous Cheese',
  'GI Application Filed',
  'Kalari is made from cow or buffalo milk that is ripened and churned to separate the fat. The milk is then heated and acidified to form solid masses, which are separated from the whey and shaped into round, flattened discs. The cheese is then sun-dried, giving it a long shelf life. Before consumption, it is typically pan-fried until golden brown, which gives it a stretchy, mozzarella-like texture and a distinctive smoky flavor.',
  'Kalari cheese has been produced by the Gujjar and Bakarwal communities of Jammu and Kashmir for centuries. It is one of the few indigenous cheeses of India and plays an important role in the local economy and food culture. The cheese was traditionally made as a way to preserve milk during the summer months when nomadic herders moved to higher pastures with their livestock. In recent years, efforts have been made to obtain Geographical Indication (GI) status for Kalari to protect its traditional production methods and promote it as a unique regional specialty.'
);

-- CYPRUS

-- Halloumi (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Cyprus',
  'The island nation of Cyprus in the eastern Mediterranean, known for its Halloumi cheese production.',
  ST_SetSRID(ST_MakePoint(33.4299, 35.1264), 4326)::geography,
  91, -- average elevation in meters
  'PDO', -- Protected Designation of Origin
  'CY/PDO/0005/0090',
  '2021-04-12', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Traditional Halloumi is made from a mixture of goat''s and sheep''s milk, though cow''s milk is now often used as well. The cheese is set with rennet and then the curds are heated before being pressed into molds. What makes Halloumi unique is that the cheese is then poached in whey at high temperature, which gives it its characteristic high melting point. The cheese is folded over and sprinkled with dried mint leaves before being formed into its final shape.',
  'Halloumi has been produced in Cyprus since at least the Byzantine period (AD 395-1191), with records of its production dating back to 1554 during Venetian rule. The name likely comes from the Greek word "almi" meaning salty water. Halloumi was traditionally made by village women in Cyprus and was an important source of protein in the Mediterranean diet. After a long legal battle, Cyprus secured PDO status for Halloumi in 2021, protecting its name and traditional production methods throughout the European Union.'
);

-- GEORGIA

-- Sulguni (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Samegrelo Region',
  'A historical and geographical region in western Georgia, known for its Sulguni cheese production.',
  ST_SetSRID(ST_MakePoint(42.0000, 42.5000), 4326)::geography,
  100, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'GE-SULGUNI-001',
  '2012-01-01', -- Approximate date of national protection
  'Pasta Filata Cheese',
  'Nationally Protected',
  'Sulguni is made from cow''s, buffalo''s, or goat''s milk using a pasta filata (stretched-curd) technique similar to mozzarella. The milk is curdled, and then the curds are heated in hot water and stretched by hand to create layers, giving the cheese its characteristic elastic texture. The cheese is then formed into round wheels and brined, resulting in a tangy, slightly sour flavor. Smoked varieties are also popular, where the cheese is hung over a fire of cherry or apple wood.',
  'Sulguni has been produced in Georgia for centuries, particularly in the western regions of Samegrelo and Abkhazia. The name comes from the Mingrelian language and means "going in different directions," referring to the layered structure created by the stretching process. The cheese plays an important role in Georgian cuisine and culture, being used in many traditional dishes such as khachapuri (cheese-filled bread). In 2012, Sulguni was added to the list of Intangible Cultural Heritage of Georgia, recognizing its cultural significance and traditional production methods.'
);

-- FRANCE (Additional Region)

-- Brie de Meaux (PDO/AOC)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Meaux',
  'A commune in the Seine-et-Marne department in the Île-de-France region, known for its famous soft cow''s milk cheese.',
  ST_SetSRID(ST_MakePoint(2.8783, 48.9600), 4326)::geography,
  60, -- elevation in meters
  'AOC', -- Appellation d'Origine Contrôlée
  'FR/PDO/0017/0110',
  '1996-06-21', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Brie de Meaux must be made from raw cow''s milk from the Île-de-France region. The cheese is formed in large flat discs and aged for at least 4 weeks, during which it develops its characteristic bloomy white rind and creamy interior. The cheese is never turned during ripening, allowing the enzymes to work from the outside in, creating the perfect ripeness gradient from rind to center.',
  'Brie has been produced in the region since at least the 8th century, with records showing that Emperor Charlemagne enjoyed the cheese. In 1814, at the Congress of Vienna, Brie de Meaux was declared "the king of cheeses" during a competition organized by diplomat Talleyrand. The cheese became so important to French culture that there is a saying: "A meal without cheese is like a beautiful woman with only one eye." Brie de Meaux received AOC status in 1980 and PDO status in 1996.'
);

-- ITALY (Additional Region)

-- Pecorino Romano (PDO/DOP)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Lazio and Sardinia Regions',
  'The regions of Lazio and Sardinia in Italy, where Pecorino Romano cheese is produced according to traditional methods.',
  ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography,
  20, -- average elevation in meters
  'DOP', -- Denominazione di Origine Protetta (Italian PDO)
  'IT/PDO/0017/0011',
  '1996-06-12', -- EU registration date
  'Class 1.3. Cheeses',
  'Registered',
  'Pecorino Romano must be made from fresh whole sheep''s milk. The cheese is salted by hand multiple times during the aging process, which lasts at least 5 months for table cheese and at least 8 months for grating cheese. The wheels are marked with a diamond-shaped design bearing the words "Pecorino Romano" and the producer''s identification number. The cheese has a hard texture and a sharp, salty flavor that becomes more pronounced with age.',
  'Pecorino Romano is one of Italy''s oldest cheeses, with production methods dating back to ancient Roman times. It was a staple food for Roman legionaries due to its long shelf life and high nutritional value. Each soldier was allotted 27 grams of cheese per day as part of their rations. While originally produced only in the Lazio region around Rome (hence the name "Romano"), production shifted largely to Sardinia in the late 19th century when many shepherds from Lazio relocated there. The cheese received DOP status in 1996, protecting its traditional production methods.'
);

-- SWITZERLAND (Additional Region)

-- Appenzeller (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Appenzell Region',
  'A region in northeast Switzerland, comprising the cantons of Appenzell Innerrhoden and Appenzell Ausserrhoden, known for its spicy Appenzeller cheese.',
  ST_SetSRID(ST_MakePoint(9.4000, 47.3333), 4326)::geography,
  800, -- average elevation in meters
  'OTHER', -- Protected Name
  'CH-APPENZELLER-001',
  '1981-01-01', -- Approximate date of trademark protection
  'Semi-hard Cheese',
  'Trademark Protected',
  'Appenzeller is made from raw cow''s milk from cows grazing on the herb-rich meadows of the Appenzell region. What makes this cheese unique is the herbal brine, called "Sulz," that is applied to the wheels during the 3-6 month aging process. The exact recipe for this brine is a closely guarded secret, known only to a few people, but it typically includes wine, cider, herbs, spices, and sometimes brandy. This washing process gives the cheese its distinctive spicy flavor and aromatic rind.',
  'Appenzeller has been produced for over 700 years, with the first written mention dating back to 1282 when it was used as a form of currency for paying tithes to local monasteries. The cheese-making tradition is deeply embedded in the cultural identity of the Appenzell region, which is known for maintaining its traditional customs. Today, only about 75 dairies are authorized to produce authentic Appenzeller cheese, all located within the defined geographical area. The name "Appenzeller" is protected by trademark law, and the Appenzeller Cheese Association strictly controls production to maintain quality standards.'
);

-- JAPAN

-- Sakura Cheese (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Hokkaido',
  'Japan''s northernmost island, known for its dairy production and specialty cheeses including Sakura cheese.',
  ST_SetSRID(ST_MakePoint(142.5000, 43.2500), 4326)::geography,
  230, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'JP-SAKURA-001',
  '1980-01-01', -- Approximate date of creation
  'Specialty Cheese',
  'Regionally Recognized',
  'Sakura cheese is a soft white cheese wrapped in a pickled cherry blossom (sakura) leaf, which imparts a delicate, slightly salty flavor and a subtle cherry blossom aroma to the cheese. The cheese itself is typically made from cow''s milk and has a creamy texture similar to Camembert. The cherry blossom leaves are harvested in spring, preserved in salt, and then used to wrap the cheese during the aging process, which usually lasts about 2-3 weeks.',
  'While cheese-making is not traditional to Japanese cuisine, Hokkaido has developed a reputation for dairy production since the Meiji era (1868-1912) when the government encouraged Western agricultural practices. Sakura cheese represents a unique fusion of Western cheese-making techniques with Japanese flavors and aesthetics. The use of cherry blossom leaves draws on the Japanese tradition of using these leaves to preserve and flavor foods, a practice dating back centuries. Today, Sakura cheese is considered a specialty product of Hokkaido and is popular both domestically and increasingly with international cheese enthusiasts.'
);

-- ARGENTINA

-- Quesillo de Corrientes (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Corrientes Province',
  'A province in northeastern Argentina known for its traditional Quesillo cheese production.',
  ST_SetSRID(ST_MakePoint(-58.8344, -28.6348), 4326)::geography,
  70, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'AR-QUESILLO-001',
  '2015-01-01', -- Approximate date of regional recognition
  'Artisanal Cheese',
  'Regionally Protected',
  'Quesillo is made from raw cow''s milk using traditional methods that have been passed down through generations. The milk is curdled using a natural coagulant derived from the stomach of young calves. The curd is then stretched by hand in hot water, similar to pasta filata cheeses, forming thin strings that are woven into braids or coils. The cheese is typically consumed fresh or after a short aging period, and has a mild, slightly acidic flavor with a stringy, elastic texture.',
  'Quesillo has been produced in the Corrientes region for centuries, with techniques brought by Spanish colonists and adapted to local conditions. The cheese became an important part of the regional cuisine and cultural identity, particularly in rural areas where it was made on small family farms. In recent years, there have been efforts to preserve and promote this traditional cheese-making practice, including the establishment of a geographical indication to protect its authenticity. The cheese is often featured in traditional Corrientine dishes and is sold at local markets and festivals.'
);

-- BULGARIA

-- Sirene (White Brined Cheese)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Bulgaria',
  'The country of Bulgaria, known for its traditional white brined cheese called Sirene.',
  ST_SetSRID(ST_MakePoint(25.4858, 42.7339), 4326)::geography,
  470, -- average elevation in meters
  'OTHER', -- Traditional Specialty
  'BG-SIRENE-001',
  '2011-01-01', -- Approximate date of TSG application
  'White Brined Cheese',
  'TSG Application Filed',
  'Sirene is made from sheep''s milk, cow''s milk, goat''s milk, or a mixture of these. The milk is curdled, and the curds are cut, drained, and then shaped into blocks or placed in wooden or metal containers. The cheese is then salted and aged in brine for at least 45 days. This brining process gives the cheese its characteristic tangy, salty flavor and crumbly yet creamy texture. Traditional Sirene has no holes and is pure white in color.',
  'Sirene has been produced in Bulgaria for thousands of years and is deeply embedded in Bulgarian cuisine and culture. It is mentioned in documents dating back to the time of the First Bulgarian Empire (681-1018 AD). The cheese was traditionally made by shepherds and farmers as a way to preserve milk, especially during the summer months when sheep and goats produced more milk than could be consumed fresh. Sirene is used in many traditional Bulgarian dishes, most famously in Shopska salad and banitsa (a layered pastry). In recent years, Bulgaria has sought Traditional Speciality Guaranteed (TSG) status for Sirene from the European Union to protect its traditional production methods.'
);

-- UNITED STATES (Additional Region)

-- Humboldt Fog (Artisanal Cheese)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Humboldt County, California',
  'A county in northern California, USA, known for its artisanal cheese production, particularly Humboldt Fog goat cheese.',
  ST_SetSRID(ST_MakePoint(-124.0000, 40.7450), 4326)::geography,
  100, -- average elevation in meters
  'OTHER', -- Artisanal Specialty
  'US-HUMBOLDT-FOG-001',
  '1992-01-01', -- Original production date
  'Artisanal Goat Cheese',
  'Trademark Protected',
  'Humboldt Fog is made from pasteurized goat''s milk and features a distinctive layer of vegetable ash running through the center, as well as an ash-coated rind. The cheese is formed in a cylindrical shape and aged for about 2-3 weeks. During aging, it develops a bloomy, edible rind similar to Brie or Camembert. The texture changes from creamy and smooth near the rind to firmer and slightly crumbly in the center. The flavor is bright and citrusy when young, becoming more complex and earthy as it ripens.',
  'Humboldt Fog was created in 1992 by Mary Keehn, founder of Cypress Grove Chevre. The cheese was inspired by the French Morbier, which has a layer of ash in the middle, but adapted to use goat''s milk and reflect the terroir of Humboldt County. The name comes from the coastal fog that is common in this part of California. Humboldt Fog is considered one of the pioneering artisanal cheeses in the American cheese renaissance that began in the late 20th century. It has won numerous awards and helped establish the reputation of American goat cheeses internationally. The cheese represents the innovative approach of American artisanal cheese makers who draw on European traditions while creating distinctly American products.'
);-- Additional Cheese Producing Regions Data
-- This file contains INSERT statements for more cheese producing regions
-- to be added to the cheese_locations table.

-- AUSTRALIA

-- King Island Dairy (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'King Island, Tasmania',
  'A small island in the Bass Strait between Tasmania and mainland Australia, known for its exceptional dairy products and cheese production.',
  ST_SetSRID(ST_MakePoint(144.0500, -39.8833), 4326)::geography,
  50, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'AU-KING-ISLAND-001',
  '1992-01-01', -- Approximate date of brand establishment
  'Specialty Cheese',
  'Trademark Protected',
  'King Island cheeses are made from milk produced by cows grazing on the island''s unique pastures, which are influenced by the clean air and salt spray from the surrounding ocean. The island''s isolation has helped maintain a disease-free environment for dairy cattle. The cheese production combines traditional methods with modern technology, focusing on small batch production. Their signature blue cheeses are aged in special maturation rooms where temperature and humidity are carefully controlled.',
  'Dairy farming on King Island began in the late 1800s when the island was first settled. The King Island Dairy company was established in the early 20th century, but gained international recognition in the 1990s when it began focusing on premium and specialty cheeses. The island''s unique microclimate, with prevailing winds known as the "Roaring Forties," creates mineral-rich pastures that contribute to the distinctive flavor of the milk and resulting cheeses. Today, King Island is particularly known for its blue cheeses, brie, and cheddar varieties, which have won numerous awards in international competitions.'
);

-- Yarra Valley Dairy (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Yarra Valley, Victoria',
  'A wine and food producing region east of Melbourne, Australia, known for its artisanal cheese production, particularly fresh goat and cow milk cheeses.',
  ST_SetSRID(ST_MakePoint(145.5167, -37.6500), 4326)::geography,
  120, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'AU-YARRA-VALLEY-001',
  '1995-01-01', -- Approximate date of dairy establishment
  'Artisanal Cheese',
  'Regionally Recognized',
  'Yarra Valley Dairy specializes in fresh, Italian-inspired cheeses made from both cow and goat milk. Their signature Persian Feta is marinated in olive oil with herbs and spices. The cheeses are handmade in small batches using traditional methods, with minimal mechanical intervention. The dairy focuses on fresh cheeses that highlight the quality of the local milk, rather than long-aged varieties.',
  'The Yarra Valley has a long history of dairy farming dating back to the 1800s, but the region became known for artisanal cheese production only in the late 20th century. Yarra Valley Dairy was established in the 1990s in a 100-year-old milking shed, helping to pioneer the artisanal cheese movement in Australia. The dairy works closely with local wine producers, as the region is primarily known for its vineyards, creating a complementary food and wine culture. Their approach represents the modern Australian artisanal cheese movement, which combines European traditions with local innovation and ingredients.'
);

-- NEW ZEALAND

-- Whitestone Cheese (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Oamaru, North Otago',
  'A region in New Zealand''s South Island known for its limestone-rich soil and unique microclimate, which contributes to the distinctive character of Whitestone cheeses.',
  ST_SetSRID(ST_MakePoint(170.9711, -45.0975), 4326)::geography,
  20, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'NZ-WHITESTONE-001',
  '1987-01-01', -- Original establishment date
  'Artisanal Cheese',
  'Trademark Protected',
  'Whitestone produces cheese using traditional open-vat techniques and milk from local farms. Their flagship Windsor Blue and Lindis Pass Brie are aged in temperature and humidity-controlled environments. The company pioneered the use of indigenous New Zealand cultures in cheese making, particularly in their Whitestone Farmhouse cheese. They practice minimal intervention in the cheese-making process, allowing the natural characteristics of the milk to develop during aging.',
  'Whitestone Cheese was founded in 1987 as a diversification project during a period of rural downturn in New Zealand. The North Otago region where it operates is known as "Whitestone Country" due to its distinctive limestone formations, which influence the soil composition and subsequently the pastures and milk produced there. The company has played a significant role in developing New Zealand''s artisanal cheese industry, which was previously dominated by large-scale commercial production. Their cheeses reflect the terroir of the region, with the mineral-rich soil contributing to the distinctive flavor profiles that have won numerous awards internationally.'
);

-- SOUTH AFRICA

-- Fairview Cheese (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Paarl, Western Cape',
  'A wine-producing region in South Africa''s Western Cape province, known for its goat cheese production at the Fairview Estate.',
  ST_SetSRID(ST_MakePoint(18.9717, -33.7219), 4326)::geography,
  120, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'ZA-FAIRVIEW-001',
  '1980-01-01', -- Approximate date of commercial cheese production
  'Goat and Cow Milk Cheese',
  'Trademark Protected',
  'Fairview produces a range of over 50 different cow and goat milk cheeses, combining traditional European methods with local innovation. Their signature cheeses include a Brie made with Jersey cow milk and various goat milk cheeses. The estate maintains its own herd of Saanen dairy goats, ensuring control over the milk quality. Traditional cheese-making techniques are combined with modern food safety practices, and many cheeses are aged in special maturation rooms.',
  'Fairview began commercial cheese production in 1980, focusing on goat cheese at a time when it was virtually unknown in South Africa. The estate''s owner, Charles Back, pioneered goat farming and cheese-making in the region, helping to establish South Africa as a quality cheese producer. The Mediterranean-like climate of the Western Cape, similar to cheese-producing regions in southern Europe, provides ideal conditions for both wine and cheese production. Today, Fairview is one of South Africa''s most recognized artisanal cheese producers, and their combination of winemaking and cheese production reflects the Cape''s cultural heritage, which blends European traditions with African influences.'
);

-- BRAZIL

-- Serra da Canastra (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Serra da Canastra, Minas Gerais',
  'A mountainous region in the state of Minas Gerais, Brazil, known for its traditional Queijo Canastra (Canastra cheese) production.',
  ST_SetSRID(ST_MakePoint(-46.3333, -20.2500), 4326)::geography,
  900, -- average elevation in meters
  'OTHER', -- Regional Specialty with GI
  'BR-CANASTRA-001',
  '2012-12-13', -- Date of geographical indication recognition
  'Artisanal Cheese',
  'Geographical Indication',
  'Queijo Canastra is made from raw cow''s milk using traditional methods passed down through generations. The milk comes from cows of mixed breeds adapted to the local terrain, primarily fed on native grasses. The cheese is produced using a natural fermentation starter called "pingo" (drip), which is collected from the previous day''s production and contains local microorganisms. The curds are pressed by hand in round wooden molds and the cheeses are aged on wooden shelves, developing a natural rind. Traditional production involves using wooden tools and natural ingredients without additives.',
  'Cheese production in Serra da Canastra dates back to the 18th century, introduced by Portuguese settlers and adapted to local conditions. The region''s isolation helped preserve traditional methods that have remained largely unchanged for centuries. Queijo Canastra became an important part of the local economy and cultural identity, with techniques passed down through generations of farming families. In 2008, the cheese-making cultural tradition of the region was recognized as intangible cultural heritage of Brazil, and in 2012, it received geographical indication status. Despite facing challenges from modern food safety regulations that initially threatened traditional raw milk production, artisanal producers have worked to preserve their heritage while meeting contemporary standards.'
);

-- PERU

-- Cajamarca (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Cajamarca Region',
  'A region in northern Peru known for its dairy production and traditional cheese making, particularly Queso Mantecoso (Buttery Cheese).',
  ST_SetSRID(ST_MakePoint(-78.5167, -7.1667), 4326)::geography,
  2750, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'PE-CAJAMARCA-001',
  '2018-01-01', -- Approximate date of regional brand initiative
  'Traditional Cheese',
  'Regionally Protected',
  'Queso Mantecoso is made through a unique process that begins with making a fresh cheese called quesillo, which is then aged for several days until it develops a slight acidity. The aged quesillo is cut into small pieces, washed, kneaded by hand with salt, and pressed into molds. This labor-intensive process gives the cheese its characteristic smooth, creamy texture. The cheese is produced at high altitudes where the climate contributes to its development and flavor profile. Most production is small-scale and family-operated, using milk from cows that graze on the region''s high mountain pastures.',
  'Cheese-making in Cajamarca began after the Spanish colonization, when dairy cattle were introduced to the region. The area''s geography and climate proved ideal for dairy farming, with lush pastures at high elevations. Queso Mantecoso was developed in the early 20th century by a local cheese maker named Rosario Ocampo, who created the technique of reworking aged quesillo to produce a smoother, more refined cheese. The cheese has become an important part of Cajamarca''s cultural identity and economy, with the region now known as "the land of milk" in Peru. In recent years, efforts have been made to protect and promote Cajamarca''s cheese-making heritage, including the development of a regional brand and quality standards.'
);

-- MOROCCO

-- Chefchaouen (Traditional Cheese)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Chefchaouen Province',
  'A mountainous region in northwest Morocco known for its traditional goat cheese production, particularly Jben Chefchaouen, a fresh cheese made by Berber communities.',
  ST_SetSRID(ST_MakePoint(-5.2636, 35.1689), 4326)::geography,
  600, -- average elevation in meters
  'OTHER', -- Traditional Product
  'MA-JBEN-001',
  '2015-01-01', -- Approximate date of regional promotion initiative
  'Traditional Goat Cheese',
  'Culturally Protected',
  'Jben is made from raw goat''s milk from local breeds that graze on the diverse vegetation of the Rif Mountains, including aromatic herbs that influence the cheese''s flavor. The traditional process involves curdling the milk with fig tree latex (a natural coagulant) rather than commercial rennet. The curds are drained in small woven baskets made from local grasses or palm fronds, which impart a distinctive pattern on the cheese. Jben is typically consumed fresh or aged for only a few days, often preserved in olive oil with herbs and spices.',
  'Cheese-making in the Rif Mountains has been practiced by Berber communities for centuries, with techniques passed down through generations. The isolation of mountain villages helped preserve traditional methods that predate modern cheese production. Jben became not just a food but an important part of the local economy and cultural identity. The blue city of Chefchaouen, with its distinctive indigo-washed buildings, has long been a center for trading these cheeses. In recent years, there have been efforts to preserve and promote this traditional cheese-making as part of Morocco''s cultural heritage, with cooperatives of women cheese makers playing a significant role in maintaining these traditions while creating economic opportunities.'
);

-- TURKEY

-- Ezine (PDO)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Ezine, Çanakkale',
  'A district in northwestern Turkey known for its traditional white cheese production, particularly Ezine peyniri, a protected designation of origin cheese.',
  ST_SetSRID(ST_MakePoint(26.3378, 39.7892), 4326)::geography,
  50, -- average elevation in meters
  'OTHER', -- Turkish PDO equivalent
  'TR-EZINE-001',
  '2006-06-08', -- Turkish PDO registration date
  'White Brined Cheese',
  'Protected Designation of Origin',
  'Ezine cheese is made from a specific mixture of milk: 45-55% sheep''s milk, 35-45% goat''s milk, and up to 10% cow''s milk. The animals graze on the natural vegetation of the Kaz Mountains, which includes over 800 plant species that contribute to the milk''s distinctive flavor. The cheese is produced between February and June when the milk is richest. After coagulation, the curds are cut, drained, and pressed into blocks, then aged in brine for at least eight months in marble or granite containers. No artificial additives are permitted in traditional production.',
  'Cheese production in the Ezine region dates back centuries, with techniques influenced by various civilizations that ruled the area, including Greek, Roman, and Ottoman. The region''s location near the ancient city of Troy places it in an area with one of the world''s oldest dairy traditions. The specific method of making Ezine cheese, with its precise milk mixture and aging process, developed over generations of local producers adapting to the available resources and climate. In 2006, Ezine cheese received protected designation of origin status in Turkey, recognizing its unique characteristics and connection to the region. It remains an important part of Turkish cuisine and culture, particularly in the Aegean region.'
);

-- CHINA

-- Yunnan Rubing (Regional Specialty)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Yunnan Province',
  'A southwestern province of China known for its ethnic diversity and unique food traditions, including Rubing, one of China''s few indigenous cheeses.',
  ST_SetSRID(ST_MakePoint(102.7103, 25.0454), 4326)::geography,
  1900, -- average elevation in meters
  'OTHER', -- Regional Specialty
  'CN-RUBING-001',
  '2009-01-01', -- Approximate date of regional recognition
  'Fresh Cheese',
  'Culturally Protected',
  'Rubing is made by curdling fresh goat''s or cow''s milk with a natural acidifier, traditionally the sap of a local wild vine (Sanchuang, Actinidia deliciosa). The curds are then heated, pressed into blocks, and drained. Unlike many Western cheeses, Rubing is not aged but consumed fresh, typically within days of production. It has a firm, tofu-like texture and mild flavor. Traditional preparation involves cutting the cheese into slices, which are either pan-fried or grilled and often seasoned with salt, chili, and local herbs.',
  'Cheese-making is rare in Chinese cuisine, making Rubing a unique cultural exception. It has been produced by the Bai and Sani ethnic minorities in Yunnan for centuries, with some historical records suggesting the tradition dates back over 500 years. The cheese likely developed independently from Western cheese-making traditions. Rubing plays an important role in local festivals and celebrations among the ethnic communities of Yunnan. In recent years, there has been increased interest in preserving and promoting this unique aspect of China''s food heritage, with Rubing gaining recognition beyond Yunnan as a distinctive regional specialty. The cheese represents the cultural diversity of China''s food traditions beyond the more widely known Han Chinese cuisine.'
);

-- MONGOLIA

-- Khorkhog Byaslag (Traditional Cheese)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Mongolian Altai Mountains',
  'A mountain range in western Mongolia where nomadic herders produce traditional hard cheese from yak and cow milk.',
  ST_SetSRID(ST_MakePoint(88.0000, 46.5000), 4326)::geography,
  2500, -- average elevation in meters
  'OTHER', -- Traditional Product
  'MN-BYASLAG-001',
  '2013-01-01', -- Approximate date of cultural heritage recognition
  'Hard Cheese',
  'Culturally Protected',
  'Byaslag is made from raw yak or cow''s milk, or sometimes a mixture of both. The traditional process begins by heating the milk and adding a starter culture, often yogurt from a previous batch. After the milk curdles, the whey is drained, and the curds are pressed into small blocks or rounds. These are then dried in the open air, often by hanging from the top of the ger (traditional Mongolian dwelling). The cheese becomes rock-hard and can be preserved for months or even years, making it an important food source during the harsh Mongolian winters. Before consumption, pieces are often cut off and softened by soaking in tea or soup.',
  'Cheese-making has been an essential part of Mongolian nomadic culture for thousands of years, providing a way to preserve milk from their livestock during the brief summer months for use throughout the year. The techniques have been passed down through generations of herding families. Byaslag and other dairy products were crucial to the diet of Mongol warriors during the time of Genghis Khan and the Mongol Empire, providing portable, long-lasting nutrition during military campaigns. The traditional methods of production are closely tied to the nomadic lifestyle, with techniques adapted to work without permanent facilities. In recent years, efforts have been made to document and preserve these traditional dairy processing methods as part of Mongolia''s intangible cultural heritage, as modernization and urbanization threaten the continuation of nomadic practices.'
);

-- LEBANON

-- Darfiyeh (Traditional Cheese)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'North Lebanon Mountains',
  'A mountainous region in northern Lebanon where traditional Darfiyeh goat cheese is produced by small-scale farmers.',
  ST_SetSRID(ST_MakePoint(35.8900, 34.3000), 4326)::geography,
  1200, -- average elevation in meters
  'OTHER', -- Traditional Product
  'LB-DARFIYEH-001',
  '2008-01-01', -- Approximate date of Slow Food Presidium establishment
  'Goat Cheese',
  'Slow Food Presidium Protected',
  'Darfiyeh is made from raw goat''s milk from the indigenous Baladi goat breed. The cheese has a unique production method where the curd is placed inside a goatskin bag called a "darif" (giving the cheese its name). The skin''s natural properties help control moisture and contribute to the cheese''s flavor development. The filled skins are aged in natural mountain caves for at least 3-4 months. During aging, the cheese develops a complex flavor profile with notes of the wild herbs and plants consumed by the goats. The outer layer becomes firm and golden, while the interior remains creamy.',
  'Darfiyeh cheese has been produced in the mountains of northern Lebanon for centuries, with techniques passed down through generations of farming families. The production method using goatskin bags is believed to have developed as a way to preserve milk in the days before refrigeration, allowing mountain communities to maintain a source of protein throughout the year. The cheese became an important part of the local economy and food culture. In recent years, traditional Darfiyeh production has been threatened by modernization and rural depopulation. In response, the cheese was granted Slow Food Presidium status in 2008, supporting local producers in maintaining this traditional practice. This has helped preserve not only the cheese-making technique but also the raising of the indigenous Baladi goat breed, which is well-adapted to the mountainous terrain but had been declining in numbers.'
);

-- CHILE

-- Chanco (Traditional Cheese)
INSERT INTO cheese_locations (
  name,
  description,
  coordinates,
  elevation,
  gi_type,
  gi_registration_number,
  gi_registration_date,
  gi_product_category,
  gi_protection_status,
  traditional_methods,
  historical_significance
) VALUES (
  'Maule Region',
  'A region in central Chile known for its traditional Queso Chanco production, one of Chile''s oldest and most distinctive cheeses.',
  ST_SetSRID(ST_MakePoint(-72.0000, -35.5000), 4326)::geography,
  150, -- average elevation in meters
  'OTHER', -- Traditional Product
  'CL-CHANCO-001',
  '2011-01-01', -- Approximate date of heritage recognition
  'Semi-hard Cheese',
  'Culturally Protected',
  'Traditional Queso Chanco is made from raw cow''s milk, though some modern versions use pasteurized milk. The cheese-making process involves cutting the curd into small pieces, gentle heating, and then pressing to remove whey. The cheese is formed into large rounds or rectangular blocks and aged for at least 60 days. During aging, the cheese develops a firm but elastic texture and a natural rind. Traditional production uses wooden molds and aging shelves, which contribute to the development of the cheese''s characteristic flavor and microflora.',
  'Queso Chanco originated in the town of Chanco in Chile''s Maule Region during the colonial period, with production dating back to the 18th century. The cheese was developed by Spanish settlers who adapted European cheese-making techniques to local conditions. It became an important part of Chilean rural economy and culinary tradition, particularly in the central regions. By the 19th century, Chanco cheese had gained national recognition and was being transported to urban markets. While industrial production has become common, traditional artisanal methods persist in rural areas. In recent years, there have been efforts to preserve and promote traditional Chanco as part of Chile''s cultural heritage, with some producers seeking geographical indication protection to distinguish authentic regional production from industrial versions.'
);