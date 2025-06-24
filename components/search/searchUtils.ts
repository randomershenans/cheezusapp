import { supabase } from '@/lib/supabase';
import { SearchResult, SearchMode } from './types';

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
    // Prepare promises for concurrent data fetching
    const promises = [];
    
    // Always fetch cheeses unless specifically only searching for pairings
    if (searchMode === 'all' || searchMode === 'cheese') {
      promises.push(
        supabase
          .from('cheeses')
          .select('id, name, description, type')
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }
    
    // Always fetch articles unless specifically only searching for pairings or cheese
    if (searchMode === 'all') {
      promises.push(
        supabase
          .from('cheezopedia_entries')
          .select('id, title, description, content_type')
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }
    
    // Always fetch pairings unless specifically only searching for cheeses
    if (searchMode === 'all' || searchMode === 'pairing') {
      promises.push(
        supabase
          .from('cheese_pairings')
          .select('id, pairing, type')
          .order('pairing')
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
    ...cheeses.map(cheese => ({
      id: cheese.id,
      type: 'cheese' as const,
      title: cheese.name,
      description: cheese.description || '',
      similarity: Math.max(
        calculateSimilarity(searchTerm, cheese.name),
        cheese.description ? calculateSimilarity(searchTerm, cheese.description) : 0
      )
    })),
    ...entries.map(entry => ({
      id: entry.id,
      type: (entry.content_type === 'article' || entry.content_type === 'recipe' 
        ? entry.content_type 
        : 'article') as const,
      title: entry.title,
      description: entry.description || '',
      similarity: Math.max(
        calculateSimilarity(searchTerm, entry.title),
        entry.description ? calculateSimilarity(searchTerm, entry.description) : 0
      )
    })),
    ...pairings.map(pairing => ({
      id: pairing.id,
      type: 'pairing' as const,
      title: pairing.pairing,
      pairingType: pairing.type as 'food' | 'drink',
      similarity: calculateSimilarity(searchTerm, pairing.pairing)
    }))
  ];

  // Filter and sort results
  const exactMatches = processedResults.filter(item => 
    item.title.toLowerCase().includes(searchTerm) || 
    (item.description && item.description.toLowerCase().includes(searchTerm))
  );

  const fuzzyMatches = processedResults
    .filter(item => !exactMatches.find(m => m.id === item.id))
    .filter(item => item.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  // Add score to results
  const resultsWithScores = [
    ...exactMatches.map(r => ({ ...r, score: 1 })),
    ...fuzzyMatches.map(r => ({ ...r, score: r.similarity || 0 }))
  ].sort((a, b) => b.score - a.score);
  
  return resultsWithScores;
}
