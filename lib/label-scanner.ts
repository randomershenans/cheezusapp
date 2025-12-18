// Label Scanner Service - Uses OpenAI Vision to extract cheese details from labels
import { supabase } from './supabase';

export interface LabelScanResult {
  cheeseName: string;
  producerName: string;
  originCountry: string;
  cheeseType: string;
  milkTypes: string[];
  description: string;
  weight?: string;
  ingredients?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScanError {
  type: 'no_label' | 'unclear' | 'api_error' | 'no_cheese';
  message: string;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

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
}`;

export async function scanCheeseLabel(imageBase64: string): Promise<{ success: true; data: LabelScanResult } | { success: false; error: ScanError }> {
  // Try Supabase Edge Function first (preferred for keeping API key secure)
  try {
    const result = await scanViaEdgeFunction(imageBase64);
    return result;
  } catch (edgeFunctionError) {
    console.log('Edge function not available, trying direct API call');
  }

  // Fallback to direct API call (requires EXPO_PUBLIC_OPENAI_API_KEY)
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: {
        type: 'api_error',
        message: 'OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY.',
      },
    };
  }

  try {
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
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return {
        success: false,
        error: {
          type: 'api_error',
          message: 'Failed to analyze the label. Please try again.',
        },
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: {
          type: 'api_error',
          message: 'No response from AI. Please try again.',
        },
      };
    }

    return parseOpenAIResponse(content);
  } catch (error) {
    console.error('Label scan error:', error);
    return {
      success: false,
      error: {
        type: 'api_error',
        message: 'Failed to connect to AI service. Please check your connection.',
      },
    };
  }
}

async function scanViaEdgeFunction(imageBase64: string): Promise<{ success: true; data: LabelScanResult } | { success: false; error: ScanError }> {
  const { data, error } = await supabase.functions.invoke('scan-cheese-label', {
    body: { image: imageBase64 },
  });

  if (error) {
    throw error;
  }

  if (!data.success) {
    return {
      success: false,
      error: data.error,
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

function parseOpenAIResponse(content: string): { success: true; data: LabelScanResult } | { success: false; error: ScanError } {
  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.isCheeseLabel) {
      return {
        success: false,
        error: {
          type: 'no_cheese',
          message: parsed.error || 'This doesn\'t appear to be a cheese label. Please take a photo of a cheese product label.',
        },
      };
    }

    if (parsed.confidence === 'low' && !parsed.cheeseName) {
      return {
        success: false,
        error: {
          type: 'unclear',
          message: 'The label is hard to read. Please try again with better lighting and make sure the label is in focus.',
        },
      };
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
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content, parseError);
    return {
      success: false,
      error: {
        type: 'api_error',
        message: 'Failed to process the label. Please try again.',
      },
    };
  }
}
