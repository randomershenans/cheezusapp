import { supabase } from './supabase';

// Types
export type CheeseCategory = 'Hard' | 'Soft' | 'Semi-soft' | 'Fresh' | 'Blue' | 'Processed';
export type MilkType = 'Cow' | 'Goat' | 'Sheep' | 'Mixed' | 'Buffalo';

export interface CheeseType {
  id: string;
  name: string;
  type: CheeseCategory;
  milk_type?: string;
  origin_country?: string;
  origin_region?: string;
  description?: string;
  flavor_profile?: string;
  texture_notes?: string;
  typical_ageing_period?: string;
  image_url?: string;
  wikipedia_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CheeseTypeWithStats extends CheeseType {
  producer_count: number;
  total_ratings: number;
  average_rating: number;
  unique_raters: number;
  last_rated_at?: string;
}

export interface CreateCheeseTypeInput {
  name: string;
  type: CheeseCategory;
  milk_type?: MilkType;
  origin_country?: string;
  origin_region?: string;
  description?: string;
  flavor_profile?: string;
  texture_notes?: string;
  typical_ageing_period?: string;
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
 * Get all cheese types with optional filtering and stats
 */
export const getCheeseTypes = async (
  withStats: boolean = true,
  filters?: {
    type?: CheeseCategory;
    minRating?: number;
    limit?: number;
    offset?: number;
  }
): Promise<CheeseTypeWithStats[] | CheeseType[]> => {
  try {
    if (withStats) {
      let query = supabase.from('cheese_type_stats').select('*');
      
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.minRating) {
        query = query.gte('average_rating', filters.minRating);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }
      
      const { data, error } = await query.order('total_ratings', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } else {
      let query = supabase.from('cheese_types').select('*');
      
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data || [];
    }
  } catch (error) {
    console.error('Error fetching cheese types:', error);
    return [];
  }
};

/**
 * Get a cheese type by ID with stats
 */
export const getCheeseTypeById = async (id: string): Promise<CheeseTypeWithStats | null> => {
  try {
    const { data, error } = await supabase
      .from('cheese_type_stats')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching cheese type:', error);
    return null;
  }
};

/**
 * Search cheese types by name
 */
export const searchCheeseTypes = async (
  searchTerm: string,
  limit: number = 20
): Promise<CheeseTypeWithStats[]> => {
  try {
    const { data, error } = await supabase
      .rpc('search_cheese_types', { p_search_term: searchTerm });
    
    if (error) throw error;
    return (data || []).slice(0, limit);
  } catch (error) {
    console.error('Error searching cheese types:', error);
    return [];
  }
};

/**
 * Create a new cheese type
 */
export const createCheeseType = async (
  input: CreateCheeseTypeInput
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Capitalize name, country, region
    const capitalizedData = {
      ...input,
      name: capitalizeWords(input.name),
      origin_country: input.origin_country ? capitalizeWords(input.origin_country) : undefined,
      origin_region: input.origin_region ? capitalizeWords(input.origin_region) : undefined,
    };
    
    const { data, error } = await supabase
      .from('cheese_types')
      .insert(capitalizedData)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating cheese type:', error);
    return null;
  }
};

/**
 * Get flavor tags for a cheese type
 */
export const getFlavorTagsForCheeseType = async (
  cheeseTypeId: string
): Promise<Array<{ id: string; name: string }>> => {
  try {
    const { data, error } = await supabase
      .from('cheese_type_flavor_tags')
      .select('flavor_tag_id, flavor_tags(id, name)')
      .eq('cheese_type_id', cheeseTypeId);
    
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
 * Update flavor tags for a cheese type
 */
export const updateFlavorTagsForCheeseType = async (
  cheeseTypeId: string,
  flavorTagIds: string[]
): Promise<boolean> => {
  try {
    // Delete existing tags
    await supabase
      .from('cheese_type_flavor_tags')
      .delete()
      .eq('cheese_type_id', cheeseTypeId);
    
    // Insert new tags
    if (flavorTagIds.length > 0) {
      const { error } = await supabase
        .from('cheese_type_flavor_tags')
        .insert(
          flavorTagIds.map(tagId => ({
            cheese_type_id: cheeseTypeId,
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
