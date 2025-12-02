import { supabase } from './supabase';

// Types
export interface FeedCheese {
  id: string;
  full_name: string;
  cheese_type_name: string;
  cheese_family?: string;
  producer_name?: string;
  producer_id?: string;
  origin_country?: string;
  image_url?: string;
  awards_image_url?: string;
  average_rating: number;
  rating_count: number;
}

export interface FeedCheeseItem {
  id: string;
  type: 'recommendation' | 'trending' | 'discovery' | 'award_winner';
  cheese: FeedCheese;
  reason: string;
}

export interface FeedArticle {
  id: string;
  type: 'article';
  title: string;
  description?: string;
  image_url?: string;
  content_type: string;
  reading_time?: number;
}

export interface FeedSponsored {
  id: string;
  type: 'sponsored';
  pairing: string;
  pairing_type: string;
  description?: string;
  image_url?: string;
  featured_image_url?: string;
  brand_name?: string;
  brand_logo_url?: string;
  product_name?: string;
}

export interface UserTasteProfile {
  cheese_count: number;
  tier: 'new' | 'starting' | 'building' | 'connoisseur';
  avg_rating: number;
  favorite_families: string[] | null;
  favorite_countries: string[] | null;
  favorite_milk_types: string[] | null;
  favorite_producers: string[] | null;
  tried_cheese_ids: string[] | null;
}

export interface PersonalizedFeedResponse {
  profile: UserTasteProfile | null;
  recommendations: FeedCheeseItem[];
  trending: FeedCheeseItem[];
  discovery: FeedCheeseItem[];
  awards: FeedCheeseItem[];
  articles: FeedArticle[];
  sponsored: FeedSponsored[];
}

export type FeedItem = FeedCheeseItem | FeedArticle | FeedSponsored;

/**
 * Get personalized feed for a user
 */
export const getPersonalizedFeed = async (
  userId?: string,
  limit: number = 20,
  offset: number = 0,
  excludeIds: string[] = []
): Promise<PersonalizedFeedResponse> => {
  try {
    const { data, error } = await supabase.rpc('get_personalized_feed', {
      p_user_id: userId || null,
      p_limit: limit,
      p_offset: offset,
      p_exclude_ids: excludeIds,
    });

    if (error) throw error;

    return {
      profile: data?.profile || null,
      recommendations: data?.recommendations || [],
      trending: data?.trending || [],
      discovery: data?.discovery || [],
      awards: data?.awards || [],
      articles: data?.articles || [],
      sponsored: data?.sponsored || [],
    };
  } catch (error) {
    console.error('Error fetching personalized feed:', error);
    return {
      profile: null,
      recommendations: [],
      trending: [],
      discovery: [],
      awards: [],
      articles: [],
      sponsored: [],
    };
  }
};

/**
 * Get user's taste profile
 */
export const getUserTasteProfile = async (
  userId: string
): Promise<UserTasteProfile | null> => {
  try {
    const { data, error } = await supabase.rpc('get_user_taste_profile', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user taste profile:', error);
    return null;
  }
};

/**
 * Interleave feed items for a mixed experience
 * Simple approach: just concatenate all items in a sensible order
 */
export const interleaveFeedItems = (
  response: PersonalizedFeedResponse
): FeedItem[] => {
  const items: FeedItem[] = [];
  const { recommendations, trending, discovery, awards, articles, sponsored } = response;
  
  // Simple interleaving: add items in rounds
  const cheeses = [...(recommendations || []), ...(trending || []), ...(discovery || []), ...(awards || [])];
  const articleList = [...(articles || [])];
  const sponsoredList = [...(sponsored || [])];
  
  // Track seen IDs to avoid duplicates
  const seenIds = new Set<string>();
  
  let cheeseIndex = 0;
  let articleIndex = 0;
  let sponsoredIndex = 0;
  
  // Pattern: 3 cheeses, 1 article, 3 cheeses, 1 sponsored, repeat
  while (cheeseIndex < cheeses.length || articleIndex < articleList.length || sponsoredIndex < sponsoredList.length) {
    // Add up to 3 cheeses
    for (let i = 0; i < 3 && cheeseIndex < cheeses.length; i++) {
      const cheese = cheeses[cheeseIndex++];
      if (!seenIds.has(cheese.id)) {
        seenIds.add(cheese.id);
        items.push(cheese);
      }
    }
    
    // Add 1 article
    if (articleIndex < articleList.length) {
      const article = articleList[articleIndex++];
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        items.push(article);
      }
    }
    
    // Add up to 3 more cheeses
    for (let i = 0; i < 3 && cheeseIndex < cheeses.length; i++) {
      const cheese = cheeses[cheeseIndex++];
      if (!seenIds.has(cheese.id)) {
        seenIds.add(cheese.id);
        items.push(cheese);
      }
    }
    
    // Add 1 sponsored
    if (sponsoredIndex < sponsoredList.length) {
      const sponsoredItem = sponsoredList[sponsoredIndex++];
      if (!seenIds.has(sponsoredItem.id)) {
        seenIds.add(sponsoredItem.id);
        items.push(sponsoredItem);
      }
    }
  }
  
  return items;
};

/**
 * Get display name for cheese (hides generic producers)
 */
export const getCheeseDisplayName = (cheese: FeedCheese): string => {
  const isGeneric = cheese.producer_name?.toLowerCase().includes('generic') ||
                    cheese.producer_name?.toLowerCase().includes('unknown');
  return isGeneric ? cheese.cheese_type_name : cheese.full_name;
};
