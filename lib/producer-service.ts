import { supabase } from './supabase';

// Types
export interface Producer {
  id: string;
  name: string;
  country?: string;
  region?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProducerWithStats extends Producer {
  cheese_count: number;
  average_rating: number;
  total_ratings: number;
}

export interface ProducerCheeseSummary {
  id: string;
  full_name: string;
  product_name?: string;
  cheese_type_name: string;
  image_url?: string;
  average_rating: number;
  rating_count: number;
  milk_type?: string;
  origin_country?: string;
}

/**
 * Get a producer by ID with their stats
 */
export const getProducerById = async (
  id: string
): Promise<ProducerWithStats | null> => {
  try {
    // Get producer details
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('*')
      .eq('id', id)
      .single();

    if (producerError) throw producerError;
    if (!producer) return null;

    // Get cheese count and aggregate stats
    const { data: cheeses, error: cheesesError } = await supabase
      .from('producer_cheese_stats')
      .select('id, average_rating, rating_count')
      .eq('producer_id', id);

    if (cheesesError) {
      console.error('Error fetching producer cheeses:', cheesesError);
    }

    const cheeseCount = cheeses?.length || 0;
    const totalRatings = cheeses?.reduce((sum, c) => sum + (c.rating_count || 0), 0) || 0;
    const avgRating = cheeseCount > 0
      ? cheeses!.reduce((sum, c) => sum + ((c.average_rating || 0) * (c.rating_count || 0)), 0) / (totalRatings || 1)
      : 0;

    return {
      ...producer,
      cheese_count: cheeseCount,
      average_rating: avgRating,
      total_ratings: totalRatings,
    };
  } catch (error) {
    console.error('Error fetching producer:', error);
    return null;
  }
};

/**
 * Get all cheeses by a producer
 */
export const getProducerCheeses = async (
  producerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ProducerCheeseSummary[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_cheese_stats')
      .select(`
        id,
        full_name,
        product_name,
        cheese_type_name,
        image_url,
        average_rating,
        rating_count,
        milk_type,
        origin_country
      `)
      .eq('producer_id', producerId)
      .order('rating_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching producer cheeses:', error);
    return [];
  }
};

/**
 * Get all producers (for listing)
 */
export const getAllProducers = async (
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string
): Promise<ProducerWithStats[]> => {
  try {
    let query = supabase
      .from('producers')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data: producers, error } = await query;

    if (error) throw error;
    if (!producers) return [];

    // Get stats for each producer
    const producersWithStats = await Promise.all(
      producers.map(async (producer) => {
        const { data: cheeses } = await supabase
          .from('producer_cheese_stats')
          .select('id, average_rating, rating_count')
          .eq('producer_id', producer.id);

        const cheeseCount = cheeses?.length || 0;
        const totalRatings = cheeses?.reduce((sum, c) => sum + (c.rating_count || 0), 0) || 0;
        const avgRating = cheeseCount > 0
          ? cheeses!.reduce((sum, c) => sum + ((c.average_rating || 0) * (c.rating_count || 0)), 0) / (totalRatings || 1)
          : 0;

        return {
          ...producer,
          cheese_count: cheeseCount,
          average_rating: avgRating,
          total_ratings: totalRatings,
        };
      })
    );

    return producersWithStats;
  } catch (error) {
    console.error('Error fetching producers:', error);
    return [];
  }
};

/**
 * Search producers by name
 */
export const searchProducers = async (
  query: string,
  limit: number = 20
): Promise<Producer[]> => {
  try {
    const { data, error } = await supabase
      .from('producers')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching producers:', error);
    return [];
  }
};
