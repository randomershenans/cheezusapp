import { supabase } from './supabase';

// Types for cheese data
export type CheeseType = 'Hard' | 'Soft' | 'Semi-soft' | 'Fresh' | 'Blue' | 'Processed';
export type MilkType = 'Cow' | 'Goat' | 'Sheep' | 'Mixed' | 'Buffalo';

export interface CheeseData {
  id?: string;
  name: string;
  type: CheeseType;
  milk: MilkType;
  origin_country: string;
  origin_region?: string;
  description: string;
  ageing_period?: string;
  image_url: string;
  flavor_tags?: string[];
  created_at?: string;
  updated_at?: string;
  added_by?: string; // UUID of the user who added this cheese
}

/**
 * Create a new cheese or update an existing one
 */
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

export const saveCheeseEntry = async (cheeseData: CheeseData): Promise<string | null> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Capitalize cheese name, origin region and country
    const capitalizedData = {
      ...cheeseData,
      name: capitalizeWords(cheeseData.name),
      origin_country: capitalizeWords(cheeseData.origin_country),
      origin_region: cheeseData.origin_region ? capitalizeWords(cheeseData.origin_region) : cheeseData.origin_region
    };
    
    // We'll directly use table operations based on the available schema
    if (capitalizedData.id) {
      // Update existing cheese
      const { data: updatedCheese, error: updateError } = await supabase
        .from('cheeses')
        .update({
          name: capitalizedData.name,
          type: capitalizedData.type,
          milk: capitalizedData.milk,
          origin_country: capitalizedData.origin_country,
          origin_region: capitalizedData.origin_region,
          description: capitalizedData.description,
          ageing_period: capitalizedData.ageing_period,
          image_url: capitalizedData.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', cheeseData.id)
        .eq('added_by', user.id) // Use added_by instead of user_id
        .select('id')
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      await manageFlavorTags(updatedCheese.id, cheeseData.flavor_tags || []);
      return updatedCheese.id;
    } else {
      // Create new cheese
      const { data: newCheese, error: insertError } = await supabase
        .from('cheeses')
        .insert({
          name: capitalizedData.name,
          type: capitalizedData.type,
          milk: capitalizedData.milk,
          origin_country: capitalizedData.origin_country,
          origin_region: capitalizedData.origin_region || null,
          description: capitalizedData.description,
          ageing_period: capitalizedData.ageing_period || null,
          image_url: capitalizedData.image_url,
          added_by: user.id  // Track which user added this cheese
        })
        .select('id')
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      await manageFlavorTags(newCheese.id, cheeseData.flavor_tags || []);
      return newCheese.id;
    }
  } catch (error) {
    console.error('Error saving cheese:', error);
    return null;
  }
};

// According to the database information we received, there might not be a separate
// flavor_tags table or cheese_flavor_tags junction table yet.

// We'll keep this simple placeholder to prevent syntax errors
const manageFlavorTags = async (cheeseId: string, flavorTags: string[]): Promise<void> => {
  // This function would manage flavor tags if we implement them in the future
  console.log(`Would manage ${flavorTags.length} flavor tags for cheese ${cheeseId}`);
};

/**
 * Get a cheese by ID
 */
export const getCheeseById = async (cheeseId: string): Promise<CheeseData | null> => {
  try {
    const { data: cheese, error: cheeseError } = await supabase
      .from('cheeses')
      .select('*')
      .eq('id', cheeseId)
      .single();
    
    if (cheeseError) {
      throw cheeseError;
    }
    
    // For now, return the cheese without flavor tags as we haven't confirmed
    // if those tables exist in the current schema
    return cheese;
  } catch (error) {
    console.error('Error fetching cheese:', error);
    return null;
  }
};

/**
 * Get all cheeses with optional filtering
 */
export const getCheeses = async (
  limit: number = 20, 
  type?: CheeseType, 
  milkType?: MilkType
): Promise<CheeseData[]> => {
  try {
    let query = supabase.from('cheeses').select('*');
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (milkType) {
      query = query.eq('milk', milkType);
    }
    
    const { data, error } = await query.limit(limit).order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching cheeses:', error);
    return [];
  }
};

/**
 * Delete a cheese by ID
 */
export const deleteCheese = async (cheeseId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('cheeses')
      .delete()
      .eq('id', cheeseId);
    
    return !error;
  } catch (error) {
    console.error('Error deleting cheese:', error);
    return false;
  }
};

// If you decide to implement flavor tags in the future, you can uncomment and use this function
/*
export const getFlavorTags = async (searchTerm?: string): Promise<string[]> => {
  try {
    let query = supabase.from('flavor_tags').select('name');
    
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }
    
    const { data, error } = await query.limit(20);
    
    if (error) {
      throw error;
    }
    
    return data.map(tag => tag.name);
  } catch (error) {
    console.error('Error fetching flavor tags:', error);
    return [];
  }
};
*/
