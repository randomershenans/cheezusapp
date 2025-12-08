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
  type: 'recommendation' | 'trending' | 'discovery' | 'award_winner' | 'following';
  cheese: FeedCheese;
  reason: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
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
  following: FeedCheeseItem[];
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

    // Fetch following activity separately
    let followingItems: FeedCheeseItem[] = [];
    if (userId) {
      followingItems = await getFollowingActivity(userId);
    }

    return {
      profile: data?.profile || null,
      recommendations: data?.recommendations || [],
      trending: data?.trending || [],
      discovery: data?.discovery || [],
      awards: data?.awards || [],
      following: followingItems,
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
      following: [],
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
  const { recommendations, trending, discovery, awards, following, articles, sponsored } = response;
  
  // Put following items first (social content is prioritized)
  const followingItems = [...(following || [])];
  
  // Simple interleaving: add items in rounds
  const cheeses = [...followingItems, ...(recommendations || []), ...(trending || []), ...(discovery || []), ...(awards || [])];
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

/**
 * Get recent cheese activity from users you follow
 */
export const getFollowingActivity = async (userId: string): Promise<FeedCheeseItem[]> => {
  try {
    // Get list of users this person follows
    const { data: following, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followError || !following || following.length === 0) {
      return [];
    }

    const followingIds = following.map(f => f.following_id);

    // Get recent cheese box entries from followed users
    const { data: entries, error: entriesError } = await supabase
      .from('cheese_box_entries')
      .select(`
        id,
        rating,
        created_at,
        user_id,
        profiles!user_id (
          id,
          name,
          avatar_url
        ),
        producer_cheese:producer_cheeses!cheese_id (
          id,
          full_name,
          producer_name,
          image_url,
          cheese_type:cheese_types!cheese_type_id (
            name,
            family
          )
        )
      `)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (entriesError || !entries) {
      return [];
    }

    // Convert to FeedCheeseItem format
    return entries.map((entry: any) => {
      const cheese = entry.producer_cheese;
      const profile = entry.profiles;
      const userName = profile?.name || 'Someone you follow';
      
      return {
        id: `following-${entry.id}`,
        type: 'following' as const,
        cheese: {
          id: cheese?.id || '',
          full_name: cheese?.full_name || '',
          cheese_type_name: cheese?.cheese_type?.name || '',
          cheese_family: cheese?.cheese_type?.family,
          producer_name: cheese?.producer_name,
          image_url: cheese?.image_url,
          average_rating: entry.rating || 0,
          rating_count: 1,
        },
        reason: entry.rating 
          ? `${userName} rated this ${entry.rating}/5`
          : `${userName} tried this cheese`,
        user: {
          id: profile?.id || entry.user_id,
          name: userName,
          avatar_url: profile?.avatar_url,
        },
      };
    });
  } catch (error) {
    console.error('Error fetching following activity:', error);
    return [];
  }
};

/**
 * Search for users by name or vanity URL
 */
export const searchUsers = async (query: string): Promise<Array<{
  id: string;
  name: string | null;
  vanity_url: string | null;
  avatar_url: string | null;
  tagline: string | null;
}>> => {
  try {
    const cleanQuery = query.trim().replace('@', '');
    
    if (cleanQuery.length < 2) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, vanity_url, avatar_url, tagline')
      .or(`name.ilike.%${cleanQuery}%,vanity_url.ilike.%${cleanQuery}%`)
      .eq('is_public', true)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};
