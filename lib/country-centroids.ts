/**
 * Centroid coordinates for cheese-producing countries, used by the
 * profile PassportMap. Names must match `producer_cheese_stats.origin_country`
 * values — if the DB uses a different spelling, add an alias entry.
 *
 * Coordinates are approximate geographic centers, not population weighted.
 * Good enough for a passport-style dot map.
 */

export type CountryCentroid = {
  name: string;
  lat: number;
  lng: number;
  aliases?: string[];
};

export const COUNTRY_CENTROIDS: CountryCentroid[] = [
  // Europe — the cheese heartland
  { name: 'France',        lat: 46.2, lng: 2.2 },
  { name: 'Italy',         lat: 41.9, lng: 12.5 },
  { name: 'United Kingdom', lat: 55.4, lng: -3.4, aliases: ['UK', 'Great Britain', 'England', 'Scotland', 'Wales'] },
  { name: 'Ireland',       lat: 53.4, lng: -8.2 },
  { name: 'Spain',         lat: 40.5, lng: -3.7 },
  { name: 'Portugal',      lat: 39.4, lng: -8.2 },
  { name: 'Switzerland',   lat: 46.8, lng: 8.2 },
  { name: 'Netherlands',   lat: 52.1, lng: 5.3, aliases: ['Holland'] },
  { name: 'Belgium',       lat: 50.5, lng: 4.5 },
  { name: 'Germany',       lat: 51.2, lng: 10.5 },
  { name: 'Austria',       lat: 47.5, lng: 14.6 },
  { name: 'Denmark',       lat: 56.3, lng: 9.5 },
  { name: 'Norway',        lat: 60.5, lng: 8.5 },
  { name: 'Sweden',        lat: 60.1, lng: 18.6 },
  { name: 'Finland',       lat: 61.9, lng: 25.7 },
  { name: 'Iceland',       lat: 64.9, lng: -19.0 },
  { name: 'Greece',        lat: 39.1, lng: 21.8 },
  { name: 'Poland',        lat: 51.9, lng: 19.1 },
  { name: 'Czech Republic', lat: 49.8, lng: 15.5, aliases: ['Czechia'] },
  { name: 'Slovakia',      lat: 48.7, lng: 19.7 },
  { name: 'Hungary',       lat: 47.2, lng: 19.5 },
  { name: 'Romania',       lat: 45.9, lng: 24.9 },
  { name: 'Bulgaria',      lat: 42.7, lng: 25.5 },
  { name: 'Serbia',        lat: 44.0, lng: 21.0 },
  { name: 'Croatia',       lat: 45.1, lng: 15.2 },
  { name: 'Slovenia',      lat: 46.2, lng: 15.0 },

  // Americas
  { name: 'United States', lat: 39.8, lng: -98.6, aliases: ['USA', 'US', 'America'] },
  { name: 'Canada',        lat: 56.1, lng: -106.3 },
  { name: 'Mexico',        lat: 23.6, lng: -102.6 },
  { name: 'Argentina',     lat: -38.4, lng: -63.6 },
  { name: 'Chile',         lat: -35.7, lng: -71.5 },
  { name: 'Brazil',        lat: -14.2, lng: -51.9 },
  { name: 'Uruguay',       lat: -32.5, lng: -55.8 },

  // Oceania
  { name: 'Australia',     lat: -25.3, lng: 133.8 },
  { name: 'New Zealand',   lat: -40.9, lng: 174.9 },

  // Asia / Middle East / Africa
  { name: 'India',         lat: 20.6, lng: 78.9 },
  { name: 'Turkey',        lat: 39.0, lng: 35.2 },
  { name: 'Iran',          lat: 32.4, lng: 53.7 },
  { name: 'Israel',        lat: 31.0, lng: 34.8 },
  { name: 'Lebanon',       lat: 33.9, lng: 35.9 },
  { name: 'Morocco',       lat: 31.8, lng: -7.1 },
  { name: 'South Africa',  lat: -30.6, lng: 22.9 },
  { name: 'Russia',        lat: 61.5, lng: 105.3 },
  { name: 'Japan',         lat: 36.2, lng: 138.3 },
  { name: 'China',         lat: 35.9, lng: 104.2 },
  { name: 'Mongolia',      lat: 46.9, lng: 103.8 },
];

const LOOKUP: Record<string, CountryCentroid> = {};
for (const c of COUNTRY_CENTROIDS) {
  LOOKUP[c.name.toLowerCase()] = c;
  if (c.aliases) {
    for (const alias of c.aliases) {
      LOOKUP[alias.toLowerCase()] = c;
    }
  }
}

export function findCentroid(countryName: string): CountryCentroid | null {
  return LOOKUP[countryName.toLowerCase()] ?? null;
}

export const TOTAL_COUNTRIES_IN_WORLD = 195;
