import { supabase } from './supabase';

// Types
export interface ProducerCheese {
  id: string;
  cheese_type_id: string;
  producer_id?: string;
  producer_name: string;
  product_name?: string;
  full_name: string;
  origin_country?: string;
  origin_region?: string;
  milk_type?: string;
  ageing_period?: string;
  description?: string;
  producer_location?: string;
  price_range?: number; // 1-5
  availability?: string;
  image_url?: string;
  awards_image_url?: string;
  verified: boolean;
  added_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProducerCheeseWithStats extends ProducerCheese {
  cheese_type_name: string;
  rating_count: number;
  average_rating: number;
  last_rated_at?: string;
}

export interface CreateProducerCheeseInput {
  cheese_type_id: string;
  producer_name: string;
  product_name?: string;
  origin_country?: string;
  origin_region?: string;
  milk_type?: string;
  ageing_period?: string;
  description?: string;
  producer_location?: string;
  price_range?: number;
  availability?: string;
  image_url?: string;
}

/**
 * Capitalizes the first letter of each word in a string
 */
const capitalizeWords = (str: string): string => {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Get producer cheeses for a specific cheese type
 */
export const getProducerCheesesByType = async (
  cheeseTypeId: string,
  filters?: {
    minRating?: number;
    verifiedOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<ProducerCheeseWithStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_producer_cheeses_by_type', {
      p_cheese_type_id: cheeseTypeId,
      p_min_rating: filters?.minRating || 0,
      p_verified_only: filters?.verifiedOnly || false,
      p_limit: filters?.limit || 50,
      p_offset: filters?.offset || 0,
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching producer cheeses:', error);
    return [];
  }
};

/**
 * Get top rated producer cheeses for a cheese type
 */
export const getTopProducersByType = async (
  cheeseTypeId: string,
  limit: number = 10,
  minRatings: number = 1
): Promise<ProducerCheeseWithStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_top_producer_cheeses', {
      p_cheese_type_id: cheeseTypeId,
      p_limit: limit,
      p_min_ratings: minRatings,
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching top producers:', error);
    return [];
  }
};

/**
 * Get a producer cheese by ID with stats
 */
export const getProducerCheeseById = async (
  id: string
): Promise<ProducerCheeseWithStats | null> => {
  try {
    const { data, error } = await supabase
      .from('producer_cheese_stats')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching producer cheese:', error);
    return null;
  }
};

/**
 * Create a new producer cheese
 */
export const createProducerCheese = async (
  input: CreateProducerCheeseInput
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Capitalize names and locations
    const capitalizedData = {
      ...input,
      producer_name: capitalizeWords(input.producer_name),
      product_name: input.product_name ? capitalizeWords(input.product_name) : undefined,
      origin_country: input.origin_country ? capitalizeWords(input.origin_country) : undefined,
      origin_region: input.origin_region ? capitalizeWords(input.origin_region) : undefined,
      producer_location: input.producer_location ? capitalizeWords(input.producer_location) : undefined,
      added_by: user.id,
    };
    
    const { data, error } = await supabase
      .from('producer_cheeses')
      .insert(capitalizedData)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating producer cheese:', error);
    return null;
  }
};

/**
 * Update a producer cheese
 */
export const updateProducerCheese = async (
  id: string,
  input: Partial<CreateProducerCheeseInput>
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Capitalize if provided
    const capitalizedData: any = { ...input };
    if (input.producer_name) {
      capitalizedData.producer_name = capitalizeWords(input.producer_name);
    }
    if (input.product_name) {
      capitalizedData.product_name = capitalizeWords(input.product_name);
    }
    if (input.origin_country) {
      capitalizedData.origin_country = capitalizeWords(input.origin_country);
    }
    if (input.origin_region) {
      capitalizedData.origin_region = capitalizeWords(input.origin_region);
    }
    
    const { error } = await supabase
      .from('producer_cheeses')
      .update(capitalizedData)
      .eq('id', id)
      .eq('added_by', user.id); // Only update if user owns it
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating producer cheese:', error);
    return false;
  }
};

/**
 * Get flavor tags for a producer cheese
 */
export const getFlavorTagsForProducerCheese = async (
  producerCheeseId: string
): Promise<Array<{ id: string; name: string }>> => {
  try {
    const { data, error } = await supabase
      .from('producer_cheese_flavor_tags')
      .select('flavor_tag_id, flavor_tags(id, name)')
      .eq('producer_cheese_id', producerCheeseId);
    
    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      id: item.flavor_tags.id,
      name: item.flavor_tags.name,
    }));
  } catch (error) {
    console.error('Error fetching flavor tags:', error);
    return [];
  }
};

/**
 * Update flavor tags for a producer cheese
 */
export const updateFlavorTagsForProducerCheese = async (
  producerCheeseId: string,
  flavorTagIds: string[]
): Promise<boolean> => {
  try {
    // Delete existing tags
    await supabase
      .from('producer_cheese_flavor_tags')
      .delete()
      .eq('producer_cheese_id', producerCheeseId);
    
    // Insert new tags
    if (flavorTagIds.length > 0) {
      const { error } = await supabase
        .from('producer_cheese_flavor_tags')
        .insert(
          flavorTagIds.map(tagId => ({
            producer_cheese_id: producerCheeseId,
            flavor_tag_id: tagId,
          }))
        );
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating flavor tags:', error);
    return false;
  }
};

/**
 * Add a producer cheese to user's cheese box (with rating)
 */
export const addProducerCheeseToBox = async (
  producerCheeseId: string,
  rating: number,
  notes?: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { error } = await supabase
      .from('cheese_box_entries')
      .insert({
        user_id: user.id,
        cheese_id: producerCheeseId,
        rating,
        notes: notes || null,
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding to cheese box:', error);
    return false;
  }
};

/**
 * Get reviews for a producer cheese
 */
export const getReviewsForProducerCheese = async (
  producerCheeseId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Array<{
  id: string;
  user_id: string;
  rating: number;
  notes?: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}>> => {
  try {
    const { data, error } = await supabase
      .from('cheese_box_entries')
      .select(`
        id,
        user_id,
        rating,
        notes,
        created_at
      `)
      .eq('cheese_id', producerCheeseId)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      rating: item.rating,
      notes: item.notes,
      created_at: item.created_at,
      username: item.profiles?.username,
      avatar_url: item.profiles?.avatar_url,
    }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};
