// Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
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
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return track[str2.length][str1.length];
}

// Calculate similarity score (0-1) where 1 is exact match
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create Supabase client using native fetch
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get all cheeses for fuzzy matching
    const cheeseResponse = await fetch(`${supabaseUrl}/rest/v1/cheeses?select=id,name,description,type`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!cheeseResponse.ok) {
      throw new Error('Failed to fetch cheeses');
    }

    const allCheeses = await cheeseResponse.json();

    // Search in cheezopedia_entries table
    const entryResponse = await fetch(
      `${supabaseUrl}/rest/v1/cheezopedia_entries?select=id,title,description,content_type&or=(title.ilike.%${encodeURIComponent(query)}%,description.ilike.%${encodeURIComponent(query)}%)&limit=5`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!entryResponse.ok) {
      throw new Error('Failed to fetch entries');
    }

    const entryResults = await entryResponse.json();

    // Process cheese results with fuzzy matching
    const cheeseResults = allCheeses
      .map(cheese => ({
        ...cheese,
        similarity: Math.max(
          calculateSimilarity(query, cheese.name),
          calculateSimilarity(query, cheese.description)
        )
      }))
      .filter(cheese => cheese.similarity > 0.6) // Adjust threshold as needed
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    // Format results
    const results = [
      ...cheeseResults.map((cheese) => ({
        id: cheese.id,
        type: 'cheese',
        title: cheese.name,
        description: cheese.description,
        score: cheese.similarity,
      })),
      ...entryResults.map((entry) => ({
        id: entry.id,
        type: entry.content_type,
        title: entry.title,
        description: entry.description,
        score: 1, // Exact matches from SQL get full score
      })),
    ].sort((a, b) => b.score - a.score);

    return new Response(
      JSON.stringify(results),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});