import { supabase } from './supabase';

// Types
export interface FlavorTag {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

/**
 * Get all flavor tags
 */
export const getAllFlavorTags = async (): Promise<FlavorTag[]> => {
  try {
    const { data, error } = await supabase
      .from('flavor_tags')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching flavor tags:', error);
    return [];
  }
};

/**
 * Search flavor tags by name
 */
export const searchFlavorTags = async (
  searchTerm: string,
  limit: number = 20
): Promise<FlavorTag[]> => {
  try {
    const { data, error } = await supabase
      .from('flavor_tags')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching flavor tags:', error);
    return [];
  }
};

/**
 * Get a flavor tag by ID
 */
export const getFlavorTagById = async (id: string): Promise<FlavorTag | null> => {
  try {
    const { data, error } = await supabase
      .from('flavor_tags')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching flavor tag:', error);
    return null;
  }
};

/**
 * Get common/popular flavor tags (most used)
 */
export const getPopularFlavorTags = async (limit: number = 20): Promise<FlavorTag[]> => {
  try {
    // Get flavor tags ordered by usage count
    const { data, error } = await supabase
      .from('flavor_tags')
      .select(`
        *,
        cheese_type_flavor_tags(count),
        producer_cheese_flavor_tags(count)
      `)
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular flavor tags:', error);
    // Fallback: just return all tags
    return getAllFlavorTags();
  }
};

/**
 * Create a new flavor tag (admin/power users only)
 */
export const createFlavorTag = async (
  name: string,
  description?: string
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Capitalize first letter of each word
    const capitalizedName = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const { data, error } = await supabase
      .from('flavor_tags')
      .insert({
        name: capitalizedName,
        description: description || null,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating flavor tag:', error);
    return null;
  }
};
