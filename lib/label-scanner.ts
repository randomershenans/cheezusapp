// Label Scanner Service - extracts cheese details from a photographed label.
//
// All model access goes through the `scan-cheese-label` Supabase edge function, which
// holds OPENAI_API_KEY as a server-side secret and carries its own system prompt. The
// client sends only the image. Nothing here should ever talk to api.openai.com directly:
// a key reachable from the client is a key published to everyone who downloads the app.
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

/**
 * Outcome of a label scan.
 *
 * A flat shape rather than a discriminated union. This project compiles with
 * "strict" unset, so TypeScript cannot narrow a union on a boolean literal, and
 * every `if (!result.success) { result.error }` failed to compile even though the
 * runtime logic was correct. Exactly one of data/error is ever populated.
 */
export type ScanOutcome = { success: boolean; data?: LabelScanResult; error?: ScanError };

export async function scanCheeseLabel(imageBase64: string): Promise<ScanOutcome> {
  // Edge function ONLY. There used to be a fallback here that called api.openai.com
  // directly from the client using EXPO_PUBLIC_OPENAI_API_KEY. Anything prefixed
  // EXPO_PUBLIC_ is compiled into the JS bundle and is trivially extractable from the
  // shipped binary, so populating that variable would have published the OpenAI key to
  // anyone who downloaded the app. It was never set, which meant the only live effect
  // was showing end users the developer string
  //   "OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY."
  // The branch is removed rather than left dormant so nobody "fixes" it by adding the key.
  try {
    return await scanViaEdgeFunction(imageBase64);
  } catch (err) {
    console.error("[label-scanner] scan-cheese-label edge function failed:", err);
    return {
      success: false,
      error: {
        type: "api_error",
        message: "We could not scan that label just now. Check your connection and try again.",
      },
    };
  }
}

async function scanViaEdgeFunction(imageBase64: string): Promise<ScanOutcome> {
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

