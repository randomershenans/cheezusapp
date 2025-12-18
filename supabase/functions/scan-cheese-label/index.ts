// Supabase Edge Function to scan cheese labels using OpenAI Vision
// Deploy with: supabase functions deploy scan-cheese-label

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const SYSTEM_PROMPT = `You are an expert cheese monger and label analyzer. Your job is to:
1. Extract information from cheese product labels
2. ENRICH that data with your expert knowledge about the cheese

WORKFLOW:
1. First, read the label to identify the cheese name and producer
2. Then, use your knowledge to fill in accurate details about that specific cheese
3. Don't just trust what's on the label - if you recognize the cheese, use what you KNOW about it

For example:
- If you see "President Brie" - you know it's French (not just "EU"), made by Lactalis, soft-ripened, cow's milk
- If you see "Manchego" - you know it's Spanish, sheep's milk, semi-firm to hard
- If the label shows an EU flag but you recognize the cheese as Slovenian, put Slovenia as origin

EXTRACT AND ENRICH:
- Cheese name: The product name from the label
- Producer/Brand: The company (look this up if you recognize it)
- Origin country: Where it's ACTUALLY from based on your cheese knowledge, not just flags/labels
- Cheese type: Soft, Semi-soft, Semi-firm, Hard, Blue, Fresh, or Processed
- Milk type(s): Cow, Goat, Sheep, Buffalo, or Mixed
- Description: Write a brief, appealing description like a cheese monger would - what does it taste like? What's special about it? How is it made?

IMPORTANT RULES:
1. Prioritize your cheese knowledge over generic label info (EU flag doesn't mean origin is "EU")
2. If you recognize the cheese/producer, use what you know about the real origin and characteristics
3. Write descriptions that are informative and appetizing - you're a cheese expert!
4. If this is NOT a cheese label, indicate that clearly
5. Confidence should reflect how well you could identify AND enrich the cheese info

Respond in JSON format:
{
  "isCheeseLabel": true/false,
  "confidence": "high" | "medium" | "low",
  "cheeseName": "string or empty",
  "producerName": "string or empty", 
  "originCountry": "string - be specific, not 'EU'",
  "cheeseType": "string or empty",
  "milkTypes": ["array of strings"],
  "description": "Expert cheese monger description - taste, texture, pairings, what makes it special",
  "error": "error message if not a cheese label or unclear"
}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const { image } = await req.json()

    if (!image) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'api_error',
            message: 'No image provided',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure base64 has proper prefix
    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this cheese label and extract all visible information.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'api_error',
            message: 'Failed to analyze the label. Please try again.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'api_error',
            message: 'No response from AI. Please try again.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the response
    const result = parseOpenAIResponse(content)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Label scan error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          type: 'api_error',
          message: error.message || 'Failed to process the label. Please try again.',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function parseOpenAIResponse(content: string): {
  success: boolean
  data?: {
    cheeseName: string
    producerName: string
    originCountry: string
    cheeseType: string
    milkTypes: string[]
    description: string
    confidence: 'high' | 'medium' | 'low'
  }
  error?: {
    type: string
    message: string
  }
} {
  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    if (!parsed.isCheeseLabel) {
      return {
        success: false,
        error: {
          type: 'no_cheese',
          message: parsed.error || "This doesn't appear to be a cheese label. Please take a photo of a cheese product label.",
        },
      }
    }

    if (parsed.confidence === 'low' && !parsed.cheeseName) {
      return {
        success: false,
        error: {
          type: 'unclear',
          message: 'The label is hard to read. Please try again with better lighting and make sure the label is in focus.',
        },
      }
    }

    return {
      success: true,
      data: {
        cheeseName: parsed.cheeseName || '',
        producerName: parsed.producerName || '',
        originCountry: parsed.originCountry || '',
        cheeseType: parsed.cheeseType || '',
        milkTypes: parsed.milkTypes || [],
        description: parsed.description || '',
        confidence: parsed.confidence || 'medium',
      },
    }
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content, parseError)
    return {
      success: false,
      error: {
        type: 'api_error',
        message: 'Failed to process the label. Please try again.',
      },
    }
  }
}
