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
