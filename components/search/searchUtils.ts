import { supabase } from '@/lib/supabase';
import { SearchResult, SearchMode } from './types';

// Synonym mapping for smart search (includes common misspellings)
const CHEESE_SYNONYMS: Record<string, string[]> = {
  'goat': ['goat', 'goats', 'chèvre', 'chevre', "goat's", 'capra'],
  'blue': ['blue', 'bleu', 'gorgonzola', 'roquefort', 'stilton', 'veined'],
  'sheep': ['sheep', 'sheeps', 'pecorino', 'manchego', "sheep's", 'ewe', 'ovine'],
  'cow': ['cow', 'cows', "cow's", 'bovine', 'milk'],
  'soft': ['soft', 'fresh', 'creamy', 'spreadable'],
  'hard': ['hard', 'aged', 'mature', 'firm', 'dense'],
  'french': ['french', 'france'],
  'italian': ['italian', 'italy', 'italiano'],
  'swiss': ['swiss', 'switzerland', 'gruyere', 'emmental'],
  'english': ['english', 'england', 'british'],
  'spanish': ['spanish', 'spain', 'espana'],
  'dutch': ['dutch', 'netherlands', 'holland', 'gouda'],
  'cheddar': ['cheddar', 'cheder', 'cheedar', 'chedar', 'chedder'],
  'mozzarella': ['mozzarella', 'mozarella', 'mozzerella', 'mozza', 'mozerella'],
  'parmesan': ['parmesan', 'parmigiano', 'reggiano', 'parm', 'parmasean'],
  'brie': ['brie', 'bree', 'bri'],
  'feta': ['feta', 'fetta', 'feeta'],
  'camembert': ['camembert', 'camembear', 'camember', 'camambert', 'camenbert'],
  'ricotta': ['ricotta', 'ricota'],
  'provolone': ['provolone', 'provoloni', 'provelone'],
  'gruyere': ['gruyere', 'gruyère', 'gruyer', 'gruyear'],
  'gouda': ['gouda', 'guda', 'gooda'],
  'emmental': ['emmental', 'emmenthal', 'emmenthaler'],
  'gorgonzola': ['gorgonzola', 'gorganzola'],
  'stilton': ['stilton', 'stiliton'],
  'roquefort': ['roquefort', 'rocquefort', 'roquefor'],
  'havarti': ['havarti', 'havarthi'],
  'mild': ['mild', 'subtle', 'delicate', 'gentle'],
  'strong': ['strong', 'sharp', 'pungent', 'intense', 'tangy'],
  'nutty': ['nutty', 'hazelnut', 'almond'],
  'creamy': ['creamy', 'smooth', 'buttery', 'rich'],
};

// Expand search term with synonyms
function expandSearchTerm(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const expanded = [lower];
  
  // Check if term matches any synonym group
  for (const [key, synonyms] of Object.entries(CHEESE_SYNONYMS)) {
    if (synonyms.some(s => s === lower || lower.includes(s) || s.includes(lower))) {
      expanded.push(...synonyms);
      break;
    }
  }
  
  return [...new Set(expanded)];
}

// Levenshtein distance implementation for fuzzy search
export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
}

// Calculate similarity score between two strings
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

// Fetch data from Supabase for search
export async function fetchSearchData(searchTerm: string, searchMode: SearchMode) {
  try {
    // Expand search terms with synonyms
    const searchTerms = expandSearchTerm(searchTerm);
    
    // Prepare promises for concurrent data fetching
    const promises = [];
    
    // Always fetch cheeses unless specifically only searching for pairings
    if (searchMode === 'all' || searchMode === 'cheese') {
      // Build OR queries for all search terms and all fields
      const orConditions = searchTerms.flatMap(term => [
        `full_name.ilike.%${term}%`,
        `cheese_type_name.ilike.%${term}%`,
        `producer_name.ilike.%${term}%`,
        `origin_country.ilike.%${term}%`,
        `cheese_family.ilike.%${term}%`,
        `flavor_profile.ilike.%${term}%`,
        `description.ilike.%${term}%`,
      ]).join(',');
      
      promises.push(
        supabase
          .from('producer_cheese_stats')
          .select('id, full_name, cheese_type_name, producer_name, description, origin_country, cheese_family, flavor_profile, image_url')
          .or(orConditions)
          .limit(30)
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }
    
    // Always fetch articles unless specifically only searching for pairings or cheese
    if (searchMode === 'all') {
      const articleOrConditions = searchTerms.flatMap(term => [
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
      ]).join(',');
      
      promises.push(
        supabase
          .from('cheezopedia_entries')
          .select('id, title, description, content_type')
          .or(articleOrConditions)
          .limit(10)
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }
    
    // Always fetch pairings unless specifically only searching for cheeses
    if (searchMode === 'all' || searchMode === 'pairing') {
      const pairingOrConditions = searchTerms.map(term => `pairing.ilike.%${term}%`).join(',');
      
      promises.push(
        supabase
          .from('cheese_pairings')
          .select('id, pairing, type')
          .or(pairingOrConditions)
          .order('pairing')
          .limit(10)
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }
    
    // Execute all promises concurrently
    const [{ data: cheeses }, { data: entries }, { data: pairings }] = await Promise.all(promises);
    
    if (!cheeses && !entries && !pairings) {
      throw new Error('Failed to fetch search data');
    }
    
    return { cheeses: cheeses || [], entries: entries || [], pairings: pairings || [] };
  } catch (error) {
    console.error('Error fetching search data:', error);
    throw error;
  }
}

// Process search results with fuzzy matching and scoring
export function processSearchResults(
  searchTerm: string, 
  cheeses: any[], 
  entries: any[], 
  pairings: any[]
): SearchResult[] {
  // Process all items with fuzzy matching
  const processedResults = [
    ...cheeses.map(cheese => {
      // Hide generic/unknown producers
      const isGeneric = cheese.producer_name?.toLowerCase().includes('generic') || 
                        cheese.producer_name?.toLowerCase().includes('unknown');
      const displayTitle = isGeneric ? cheese.cheese_type_name : cheese.full_name;
      
      return {
        id: cheese.id,
        type: 'cheese' as const,
        title: displayTitle,
        description: cheese.description || `${cheese.cheese_type_name} • ${cheese.origin_country || ''}`,
        similarity: Math.max(
          calculateSimilarity(searchTerm, cheese.full_name),
          calculateSimilarity(searchTerm, cheese.cheese_type_name),
          cheese.description ? calculateSimilarity(searchTerm, cheese.description) : 0,
          cheese.flavor_profile ? calculateSimilarity(searchTerm, cheese.flavor_profile) : 0
        )
      };
    }),
    ...entries.map(entry => {
      const contentType = entry.content_type === 'article' || entry.content_type === 'recipe' 
        ? entry.content_type 
        : 'article';
      
      return {
        id: entry.id,
        type: contentType as 'article' | 'recipe',
        title: entry.title,
        description: entry.description || '',
        similarity: Math.max(
          calculateSimilarity(searchTerm, entry.title),
          entry.description ? calculateSimilarity(searchTerm, entry.description) : 0
        )
      };
    }),
    ...pairings.map(pairing => ({
      id: pairing.id,
      type: 'pairing' as const,
      title: pairing.pairing,
      description: `${pairing.type === 'food' ? '🍽️' : '🍷'} ${pairing.type}`,
      pairingType: pairing.type as 'food' | 'drink',
      similarity: calculateSimilarity(searchTerm, pairing.pairing)
    }))
  ];

  // Filter and sort results  
  const searchLower = searchTerm.toLowerCase();
  
  const exactMatches = processedResults.filter(item => 
    item.title.toLowerCase().includes(searchLower) || 
    (item.description && item.description.toLowerCase().includes(searchLower))
  );

  const fuzzyMatches = processedResults
    .filter(item => !exactMatches.find(m => m.id === item.id))
    .filter(item => item.similarity > 0.5) // More lenient threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5); // Show more fuzzy matches

  // Add score to results
  const resultsWithScores = [
    ...exactMatches.map(r => ({ ...r, score: 1 })),
    ...fuzzyMatches.map(r => ({ ...r, score: r.similarity || 0 }))
  ].sort((a, b) => b.score - a.score);
  
  return resultsWithScores;
}
