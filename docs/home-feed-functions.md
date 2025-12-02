-- ============================================
-- FUNCTION 1: Get User Taste Profile
-- Analyzes user's cheese box to build preferences
-- ============================================
CREATE OR REPLACE FUNCTION get_user_taste_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_cheese_count INT;
  v_profile JSON;
BEGIN
  -- Count user's rated cheeses
  SELECT COUNT(*) INTO v_cheese_count
  FROM cheese_box_entries
  WHERE user_id = p_user_id AND rating IS NOT NULL;

  -- If not enough data, return null (cold start)
  IF v_cheese_count < 1 THEN
    RETURN NULL;
  END IF;

  -- Build taste profile from their ratings
  SELECT json_build_object(
    'cheese_count', v_cheese_count,
    'tier', CASE 
      WHEN v_cheese_count >= 10 THEN 'connoisseur'
      WHEN v_cheese_count >= 4 THEN 'building'
      WHEN v_cheese_count >= 1 THEN 'starting'
      ELSE 'new'
    END,
    'avg_rating', ROUND(AVG(cbe.rating)::numeric, 2),
    'favorite_families', (
      SELECT json_agg(family) FROM (
        SELECT pcs.cheese_family as family, AVG(cbe2.rating) as avg_r
        FROM cheese_box_entries cbe2
        JOIN producer_cheese_stats pcs ON cbe2.cheese_id = pcs.id
        WHERE cbe2.user_id = p_user_id AND cbe2.rating >= 4 AND pcs.cheese_family IS NOT NULL
        GROUP BY pcs.cheese_family
        ORDER BY avg_r DESC, COUNT(*) DESC
        LIMIT 3
      ) top_families
    ),
    'favorite_countries', (
      SELECT json_agg(country) FROM (
        SELECT pcs.origin_country as country, AVG(cbe2.rating) as avg_r
        FROM cheese_box_entries cbe2
        JOIN producer_cheese_stats pcs ON cbe2.cheese_id = pcs.id
        WHERE cbe2.user_id = p_user_id AND cbe2.rating >= 4 AND pcs.origin_country IS NOT NULL
        GROUP BY pcs.origin_country
        ORDER BY avg_r DESC, COUNT(*) DESC
        LIMIT 3
      ) top_countries
    ),
    'favorite_milk_types', (
      SELECT json_agg(milk) FROM (
        SELECT pcs.milk_type as milk, AVG(cbe2.rating) as avg_r
        FROM cheese_box_entries cbe2
        JOIN producer_cheese_stats pcs ON cbe2.cheese_id = pcs.id
        WHERE cbe2.user_id = p_user_id AND cbe2.rating >= 4 AND pcs.milk_type IS NOT NULL
        GROUP BY pcs.milk_type
        ORDER BY avg_r DESC, COUNT(*) DESC
        LIMIT 2
      ) top_milk
    ),
    'favorite_producers', (
      SELECT json_agg(producer_id) FROM (
        SELECT pcs.producer_id, AVG(cbe2.rating) as avg_r
        FROM cheese_box_entries cbe2
        JOIN producer_cheese_stats pcs ON cbe2.cheese_id = pcs.id
        WHERE cbe2.user_id = p_user_id AND cbe2.rating >= 4 AND pcs.producer_id IS NOT NULL
        GROUP BY pcs.producer_id
        ORDER BY avg_r DESC, COUNT(*) DESC
        LIMIT 3
      ) top_producers
    ),
    'tried_cheese_ids', (
      SELECT json_agg(cheese_id)
      FROM cheese_box_entries
      WHERE user_id = p_user_id
    )
  ) INTO v_profile
  FROM cheese_box_entries cbe
  WHERE cbe.user_id = p_user_id AND cbe.rating IS NOT NULL;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- FUNCTION 2: Get Personalized Feed
-- Returns mixed feed based on user profile
-- ============================================
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_profile JSON;
  v_result JSON;
  v_tried_ids UUID[];
  v_fav_families TEXT[];
  v_fav_countries TEXT[];
  v_fav_milk TEXT[];
  v_fav_producers UUID[];
  v_recommendations JSON;
  v_trending JSON;
  v_discovery JSON;
  v_awards JSON;
  v_articles JSON;
  v_sponsored JSON;
BEGIN
  -- Get user profile if logged in
  IF p_user_id IS NOT NULL THEN
    v_profile := get_user_taste_profile(p_user_id);
  END IF;

  -- Extract arrays from profile for querying
  IF v_profile IS NOT NULL THEN
    SELECT COALESCE(ARRAY(SELECT json_array_elements_text(v_profile->'tried_cheese_ids'))::UUID[], '{}') INTO v_tried_ids;
    SELECT COALESCE(ARRAY(SELECT json_array_elements_text(v_profile->'favorite_families')), '{}') INTO v_fav_families;
    SELECT COALESCE(ARRAY(SELECT json_array_elements_text(v_profile->'favorite_countries')), '{}') INTO v_fav_countries;
    SELECT COALESCE(ARRAY(SELECT json_array_elements_text(v_profile->'favorite_milk_types')), '{}') INTO v_fav_milk;
    SELECT COALESCE(ARRAY(SELECT json_array_elements_text(v_profile->'favorite_producers'))::UUID[], '{}') INTO v_fav_producers;
  ELSE
    v_tried_ids := '{}';
    v_fav_families := '{}';
    v_fav_countries := '{}';
    v_fav_milk := '{}';
    v_fav_producers := '{}';
  END IF;

  -- Combine exclude_ids with tried_ids
  v_tried_ids := v_tried_ids || p_exclude_ids;

  -- PERSONALIZED RECOMMENDATIONS (only if profile exists)
  IF v_profile IS NOT NULL AND array_length(v_fav_families, 1) > 0 THEN
    SELECT json_agg(item) INTO v_recommendations
    FROM (
      SELECT json_build_object(
        'id', pcs.id,
        'type', 'recommendation',
        'cheese', json_build_object(
          'id', pcs.id,
          'full_name', pcs.full_name,
          'cheese_type_name', pcs.cheese_type_name,
          'cheese_family', pcs.cheese_family,
          'producer_name', pcs.producer_name,
          'producer_id', pcs.producer_id,
          'origin_country', pcs.origin_country,
          'image_url', pcs.image_url,
          'awards_image_url', pcs.awards_image_url,
          'average_rating', pcs.average_rating,
          'rating_count', pcs.rating_count
        ),
        'reason', CASE
          WHEN pcs.producer_id = ANY(v_fav_producers) THEN 'From a producer you love'
          WHEN pcs.cheese_family = ANY(v_fav_families) THEN 'Matches your taste'
          WHEN pcs.origin_country = ANY(v_fav_countries) THEN 'From a region you enjoy'
          ELSE 'Recommended for you'
        END
      ) as item
      FROM producer_cheese_stats pcs
      WHERE pcs.id != ALL(v_tried_ids)
        AND (
          pcs.cheese_family = ANY(v_fav_families)
          OR pcs.origin_country = ANY(v_fav_countries)
          OR pcs.milk_type = ANY(v_fav_milk)
          OR pcs.producer_id = ANY(v_fav_producers)
        )
      ORDER BY random()
      LIMIT GREATEST(p_limit * 4 / 10, 2)
    ) rec;
  END IF;

  -- TRENDING/POPULAR
  SELECT json_agg(item) INTO v_trending
  FROM (
    SELECT json_build_object(
      'id', pcs.id,
      'type', 'trending',
      'cheese', json_build_object(
        'id', pcs.id,
        'full_name', pcs.full_name,
        'cheese_type_name', pcs.cheese_type_name,
        'cheese_family', pcs.cheese_family,
        'producer_name', pcs.producer_name,
        'producer_id', pcs.producer_id,
        'origin_country', pcs.origin_country,
        'image_url', pcs.image_url,
        'awards_image_url', pcs.awards_image_url,
        'average_rating', pcs.average_rating,
        'rating_count', pcs.rating_count
      ),
      'reason', 'Popular choice'
    ) as item
    FROM producer_cheese_stats pcs
    WHERE pcs.id != ALL(v_tried_ids)
      AND pcs.rating_count > 0
    ORDER BY pcs.rating_count DESC, pcs.average_rating DESC
    LIMIT CASE WHEN v_profile IS NULL THEN p_limit * 4 / 10 ELSE p_limit * 25 / 100 END
  ) trend;

  -- DISCOVERY
  SELECT json_agg(item) INTO v_discovery
  FROM (
    SELECT json_build_object(
      'id', pcs.id,
      'type', 'discovery',
      'cheese', json_build_object(
        'id', pcs.id,
        'full_name', pcs.full_name,
        'cheese_type_name', pcs.cheese_type_name,
        'cheese_family', pcs.cheese_family,
        'producer_name', pcs.producer_name,
        'producer_id', pcs.producer_id,
        'origin_country', pcs.origin_country,
        'image_url', pcs.image_url,
        'awards_image_url', pcs.awards_image_url,
        'average_rating', pcs.average_rating,
        'rating_count', pcs.rating_count
      ),
      'reason', 'Discover something new'
    ) as item
    FROM producer_cheese_stats pcs
    WHERE pcs.id != ALL(v_tried_ids)
    ORDER BY random()
    LIMIT p_limit * 2 / 10
  ) disc;

  -- AWARD WINNERS
  SELECT json_agg(item) INTO v_awards
  FROM (
    SELECT json_build_object(
      'id', pcs.id,
      'type', 'award_winner',
      'cheese', json_build_object(
        'id', pcs.id,
        'full_name', pcs.full_name,
        'cheese_type_name', pcs.cheese_type_name,
        'cheese_family', pcs.cheese_family,
        'producer_name', pcs.producer_name,
        'producer_id', pcs.producer_id,
        'origin_country', pcs.origin_country,
        'image_url', pcs.image_url,
        'awards_image_url', pcs.awards_image_url,
        'average_rating', pcs.average_rating,
        'rating_count', pcs.rating_count
      ),
      'reason', 'Award winner'
    ) as item
    FROM producer_cheese_stats pcs
    WHERE pcs.id != ALL(v_tried_ids)
      AND pcs.awards_image_url IS NOT NULL
    ORDER BY pcs.average_rating DESC
    LIMIT CASE WHEN v_profile IS NULL THEN p_limit * 2 / 10 ELSE p_limit * 1 / 10 END
  ) awards;

  -- ARTICLES
  SELECT json_agg(article) INTO v_articles
  FROM (
    SELECT json_build_object(
      'id', ce.id,
      'type', 'article',
      'title', ce.title,
      'description', ce.description,
      'image_url', ce.image_url,
      'content_type', ce.content_type,
      'reading_time', ce.reading_time_minutes
    ) as article
    FROM cheezopedia_entries ce
    WHERE ce.visible_in_feed = true
    ORDER BY ce.published_at DESC
    LIMIT p_limit * 2 / 10
  ) arts;

  -- SPONSORED
  SELECT json_agg(sponsored) INTO v_sponsored
  FROM (
    SELECT json_build_object(
      'id', cp.id,
      'type', 'sponsored',
      'pairing', cp.pairing,
      'pairing_type', cp.type,
      'description', cp.description,
      'image_url', cp.image_url,
      'featured_image_url', cp.featured_image_url,
      'brand_name', cp.brand_name,
      'brand_logo_url', cp.brand_logo_url,
      'product_name', cp.product_name
    ) as sponsored
    FROM cheese_pairings cp
    WHERE cp.show_in_feed = true
      AND cp.feed_until >= NOW()
    ORDER BY random()
    LIMIT GREATEST(p_limit * 1 / 10, 1)
  ) spons;

  -- Build final result
  v_result := json_build_object(
    'profile', v_profile,
    'recommendations', COALESCE(v_recommendations, '[]'::json),
    'trending', COALESCE(v_trending, '[]'::json),
    'discovery', COALESCE(v_discovery, '[]'::json),
    'awards', COALESCE(v_awards, '[]'::json),
    'articles', COALESCE(v_articles, '[]'::json),
    'sponsored', COALESCE(v_sponsored, '[]'::json)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;