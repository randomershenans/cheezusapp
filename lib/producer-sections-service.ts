import { supabase } from './supabase';

export type SectionType = 'story' | 'process' | 'team' | 'gallery' | 'awards' | 'quote';

export interface ProducerSection {
  id: string;
  producer_id: string;
  section_type: SectionType;
  sort_order: number;
  title?: string;
  subtitle?: string;
  body_text?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  background_color?: string;
  metadata: Record<string, any>;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image_url?: string;
  bio?: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  image_url?: string;
}

export interface GalleryImage {
  url: string;
  caption?: string;
}

export interface AwardEntry {
  name: string;
  medal?: string;
  year?: string;
  image_url?: string;
  cheese_name?: string;
}

/**
 * Fetch all visible sections for a producer, ordered by sort_order
 */
export const getProducerSections = async (
  producerId: string
): Promise<ProducerSection[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_sections')
      .select('*')
      .eq('producer_id', producerId)
      .eq('visible', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching producer sections:', error);
    return [];
  }
};

/**
 * Fetch enhanced producer data (with new showcase fields)
 */
export const getProducerShowcaseData = async (
  producerId: string
): Promise<{
  hero_video_url?: string;
  logo_url?: string;
  tagline?: string;
  founded_year?: number;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('producers')
      .select('hero_video_url, logo_url, tagline, founded_year, latitude, longitude, is_verified')
      .eq('id', producerId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching producer showcase data:', error);
    return null;
  }
};
