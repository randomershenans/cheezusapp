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
  excludeIds: string[] = []
): Promise<PersonalizedFeedResponse> => {
  try {
    const { data, error } = await supabase.rpc('get_personalized_feed', {
      p_user_id: userId || null,
      p_limit: limit,
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
  // If generic and cheese_type_name exists, use it; otherwise use full_name
  if (isGeneric && cheese.cheese_type_name) {
    return cheese.cheese_type_name;
  }
  return cheese.full_name || cheese.cheese_type_name || '';
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
      .select('id, rating, created_at, user_id, cheese_id')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (entriesError || !entries || entries.length === 0) {
      return [];
    }

    // Fetch cheese details separately with cheese_types join
    const cheeseIds = entries.map(e => e.cheese_id).filter(Boolean);
    const { data: cheeses } = await supabase
      .from('producer_cheeses')
      .select(`
        id, 
        full_name, 
        product_name,
        producer_name, 
        image_url, 
        family, 
        origin_country,
        cheese_types (
          name
        )
      `)
      .in('id', cheeseIds);

    // Fetch profile details separately
    const userIds = [...new Set(entries.map(e => e.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds);

    // Create lookup maps
    const cheeseMap = new Map((cheeses || []).map(c => [c.id, c]));
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Group entries by cheese_id to combine multiple friends rating same cheese
    const cheeseGroups = new Map<string, any[]>();
    entries.forEach((entry: any) => {
      const key = entry.cheese_id;
      if (!cheeseGroups.has(key)) {
        cheeseGroups.set(key, []);
      }
      cheeseGroups.get(key)!.push(entry);
    });

    // Convert to FeedCheeseItem format, combining duplicate cheeses
    const results: FeedCheeseItem[] = [];
    cheeseGroups.forEach((groupEntries, cheeseId) => {
      const cheese = cheeseMap.get(cheeseId) as any;
      if (!cheese) return;

      // Get cheese type name from joined table
      const cheeseTypeName = cheese.cheese_types?.name || '';
      
      // Build display name - use product_name or cheese type name, never show "Generic"
      let displayName = cheese.product_name || cheese.full_name || '';
      if (displayName.toLowerCase().includes('generic')) {
        displayName = cheeseTypeName || displayName.replace(/generic\s*/i, '').trim();
      }
      if (!displayName || displayName.toLowerCase() === 'generic') {
        displayName = cheeseTypeName;
      }

      // Build reason text combining all users who rated this cheese
      const userNames = groupEntries.map((entry: any) => {
        const profile = profileMap.get(entry.user_id);
        return profile?.name || 'Someone';
      });
      
      // Get the first entry's rating for display
      const firstEntry = groupEntries[0];
      const firstProfile = profileMap.get(firstEntry.user_id);
      const firstName = firstProfile?.name || 'Someone you follow';
      
      let reason: string;
      if (groupEntries.length > 1) {
        const otherCount = groupEntries.length - 1;
        reason = firstEntry.rating
          ? `${firstName} and ${otherCount} other${otherCount > 1 ? 's' : ''} rated this`
          : `${firstName} and ${otherCount} other${otherCount > 1 ? 's' : ''} tried this`;
      } else {
        reason = firstEntry.rating 
          ? `${firstName} rated this ${Number(firstEntry.rating) % 1 === 0 ? Math.round(firstEntry.rating) : Number(firstEntry.rating).toFixed(1)}/5`
          : `${firstName} tried this cheese`;
      }

      results.push({
        id: `following-${cheeseId}`,
        type: 'following' as const,
        cheese: {
          id: cheese.id || '',
          full_name: displayName,
          cheese_type_name: cheeseTypeName,
          cheese_family: cheese.family,
          producer_name: cheese.producer_name,
          origin_country: cheese.origin_country,
          image_url: cheese.image_url,
          average_rating: firstEntry.rating || 0,
          rating_count: groupEntries.length,
        },
        reason,
        user: {
          id: firstProfile?.id || firstEntry.user_id,
          name: firstName,
          avatar_url: firstProfile?.avatar_url,
        },
      });
    });

    return results;
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
