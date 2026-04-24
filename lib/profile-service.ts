import { supabase } from '@/lib/supabase';
import { tierFromCheeseCount, type Tier } from '@/constants/Tiers';

export type PublicProfile = {
  id: string;
  name: string | null;
  tagline: string | null;
  location: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
  vanity_url: string | null;
};

export type ProfileStats = {
  cheese_count: number;
  country_count: number;
  avg_rating: number | null;
  followers: number;
};

export type TopShelfCheese = {
  cheese_id: string;
  name: string;
  producer_name: string | null;
  image_url: string | null;
  rating: number | null;
  country: string | null;
};

export type CountryCount = {
  country: string;
  count: number;
};

export type FlavorFingerprint = Partial<Record<
  'Creamy' | 'Nutty' | 'Sharp' | 'Earthy' | 'Funky' | 'Sweet',
  number
>>;

export type FeaturedBadge = {
  id: string;
  name: string;
  description: string | null;
  img_url: string | null;
  category: string;
};

export type PublicProfilePayload = {
  profile: PublicProfile | null;
  stats: ProfileStats;
  top_shelf: TopShelfCheese[];
  countries: CountryCount[];
  flavor_fingerprint: FlavorFingerprint;
  featured_badges: FeaturedBadge[];
  tier: Tier;
};

const EMPTY_STATS: ProfileStats = {
  cheese_count: 0,
  country_count: 0,
  avg_rating: null,
  followers: 0,
};

export async function fetchPublicProfile(userId: string): Promise<PublicProfilePayload | null> {
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[profile-service] get_public_profile failed, falling back:', error);
    return await fetchPublicProfileFallback(userId);
  }

  if (!data || !(data as any).profile) {
    return null;
  }

  const payload = data as Omit<PublicProfilePayload, 'tier'>;
  return {
    ...payload,
    stats: payload.stats ?? EMPTY_STATS,
    top_shelf: payload.top_shelf ?? [],
    countries: payload.countries ?? [],
    flavor_fingerprint: payload.flavor_fingerprint ?? {},
    featured_badges: payload.featured_badges ?? [],
    tier: tierFromCheeseCount(payload.stats?.cheese_count ?? 0),
  };
}

/**
 * Fallback path if the RPC isn't loaded yet (e.g., migration not applied in dev).
 * Fires the old sequence of queries. Feature-parity, not performance-parity.
 */
async function fetchPublicProfileFallback(userId: string): Promise<PublicProfilePayload | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, tagline, location, avatar_url, is_public, created_at, vanity_url')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const [{ count: cheeseCount }, { count: followersCount }, topShelfRes, badgesRes] = await Promise.all([
    supabase.from('cheese_box_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase
      .from('cheese_box_entries')
      .select('id, rating, created_at, cheese_id, producer_cheese:producer_cheeses!cheese_id(id, full_name, producer_name, image_url)')
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .order('rating', { ascending: false })
      .limit(4),
    supabase
      .from('user_badges')
      .select('badge:badges(id, name, description, img_url, category)')
      .eq('user_id', userId)
      .eq('completed', true)
      .limit(10),
  ]);

  const topShelf: TopShelfCheese[] = (topShelfRes.data ?? []).map((r: any) => ({
    cheese_id: r.producer_cheese?.id ?? r.cheese_id,
    name: r.producer_cheese?.full_name ?? 'Cheese',
    producer_name: r.producer_cheese?.producer_name ?? null,
    image_url: r.producer_cheese?.image_url ?? null,
    rating: r.rating,
    country: null,
  }));

  const stats: ProfileStats = {
    cheese_count: cheeseCount ?? 0,
    country_count: 0,
    avg_rating: null,
    followers: followersCount ?? 0,
  };

  return {
    profile,
    stats,
    top_shelf: topShelf,
    countries: [],
    flavor_fingerprint: {},
    featured_badges: (badgesRes.data ?? []).map((r: any) => r.badge).filter(Boolean).slice(0, 4),
    tier: tierFromCheeseCount(stats.cheese_count),
  };
}
