// Supabase Edge Function to scan cheese labels using OpenAI Vision
// Deploy with: supabase functions deploy scan-cheese-label

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const SYSTEM_PROMPT = `You are a cheese label analyzer. Your job is to extract information from cheese product labels.

Analyze the image and extract the following information if visible:
- Cheese name (the specific product name)
- Producer/Brand name (the company that makes it)
- Origin country (where it's made)
- Cheese type (Soft, Semi-soft, Semi-firm, Hard, Blue, Fresh, or Processed)
- Milk type(s) (Cow, Goat, Sheep, Buffalo, or Mixed)
- Brief description (from the label or inferred from the cheese type)

IMPORTANT RULES:
1. Only extract information that is clearly visible on the label
2. If you can't read something clearly, leave it empty
3. For cheese type, infer from the cheese name if not explicitly stated (e.g., "Brie" = Soft, "Cheddar" = Hard)
4. For milk type, infer if not stated (most common is Cow unless otherwise indicated)
5. If this is NOT a cheese label or no label is visible, indicate that clearly

Respond in JSON format:
{
  "isCheeseLabel": true/false,
  "confidence": "high" | "medium" | "low",
  "cheeseName": "string or empty",
  "producerName": "string or empty",
  "originCountry": "string or empty",
  "cheeseType": "string or empty",
  "milkTypes": ["array of strings"],
  "description": "brief description or empty",
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
