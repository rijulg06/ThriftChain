/**
 * Test Gemini API endpoint
 *
 * GET /api/test-gemini
 *
 * Tests if the Gemini API key is working
 */

import { NextResponse } from 'next/server';
import { embedText } from '@/lib/ai/embeddings';

export async function GET() {
  try {
    console.log('[test-gemini] Testing Gemini API...');

    // Try to generate a simple embedding
    const result = await embedText('test');

    console.log('[test-gemini] ✅ Gemini API works!');
    console.log('[test-gemini] Embedding dimension:', result.length);

    return NextResponse.json({
      success: true,
      message: 'Gemini API is working correctly',
      embeddingDimension: result.length,
    });
  } catch (error) {
    console.error('[test-gemini] ❌ Gemini API failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Gemini API test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        instructions: 'Get a new API key at: https://makersuite.google.com/app/apikey',
      },
      { status: 500 }
    );
  }
}
