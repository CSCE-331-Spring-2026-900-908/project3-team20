import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (per instance)
// For Vercel serverless, each instance handles one request typically
// For production, consider Redis-based rate limiting
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second between requests
const MAX_BATCH_SIZE = 100; // Google Translate limit per request

interface RateLimitEntry {
  lastRequest: number;
  requestCount: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry) {
    rateLimitMap.set(clientId, { lastRequest: now, requestCount: 1 });
    return true;
  }

  if (now - entry.lastRequest > RATE_LIMIT_WINDOW_MS) {
    entry.lastRequest = now;
    entry.requestCount = 1;
    return true;
  }

  if (entry.requestCount >= 5) { // Max 5 batches per second
    return false;
  }

  entry.requestCount++;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.lastRequest > 60000) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

    // Check rate limit
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more requests.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { texts, targetLang } = body;

    // Validate input
    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json(
        { error: 'Invalid request: texts must be an array' },
        { status: 400 }
      );
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: targetLang must be a string' },
        { status: 400 }
      );
    }

    if (texts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: texts array is empty' },
        { status: 400 }
      );
    }

    if (texts.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Too many texts. Maximum batch size is ${MAX_BATCH_SIZE}` },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_TRANSLATE_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Translation service is not configured' },
        { status: 500 }
      );
    }

    // Make request to Google Translate API
    const googleResponse = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          target: targetLang,
          source: 'en',
          format: 'text',
        }),
      }
    );

    // Handle Google API errors
    if (!googleResponse.ok) {
      const errorBody = await googleResponse.json().catch(() => ({}));
      console.error('Google Translate API error:', errorBody);

      if (googleResponse.status === 403) {
        return NextResponse.json(
          { error: 'Translation service authentication failed' },
          { status: 500 }
        );
      }

      if (googleResponse.status === 429) {
        return NextResponse.json(
          { error: 'Translation service rate limit exceeded' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Translation service request failed' },
        { status: 500 }
      );
    }

    const data = await googleResponse.json();

    // Extract translations
    const translations = data.data?.translations;

    if (!translations || !Array.isArray(translations)) {
      console.error('Invalid response from Google Translate API:', data);
      return NextResponse.json(
        { error: 'Invalid response from translation service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      translations: translations.map((t: { translatedText: string }) => t.translatedText),
    });
  } catch (error) {
    console.error('Translation error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Failed to connect to translation service' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during translation' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to translate text.' },
    { status: 405 }
  );
}
