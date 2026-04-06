import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Translate API Rate Limiter
 *
 * Google Translate API quotas:
 * - Per-request limit: 100 texts max (5MB total)
 * - Per-project limit: 100 requests/second (QPS)
 * - Per-project limit: 200,000 characters/second (CPS)
 *
 * This implementation provides:
 * 1. Per-client rate limiting (sliding window)
 * 2. Per-API-key rate limiting to stay within Google's quotas
 * 3. Burst protection to prevent quota exhaustion
 */

const MAX_BATCH_SIZE = 100; // Google Translate hard limit per request

// Client rate limits (per IP)
const CLIENT_RATE_LIMIT = {
  WINDOW_MS: 1000,          // 1 second window
  MAX_REQUESTS: 10,          // Max 10 requests per client per second
};

// API key rate limits (shared across all clients)
const API_KEY_RATE_LIMIT = {
  WINDOW_MS: 1000,           // 1 second window
  MAX_REQUESTS: 80,          // Stay under Google's 100 QPS limit (with headroom)
  MAX_CHARACTERS_PER_SEC: 150000, // Stay under 200K CPS limit (with headroom)
};

// Sliding window rate limiter
interface SlidingWindowEntry {
  timestamps: number[];      // Array of request timestamps
}

const clientRateLimitMap = new Map<string, SlidingWindowEntry>();
const apiKeyRateLimitState = {
  timestamps: [] as number[],
  lastCleanup: Date.now(),
};

// Estimated characters per text (average, for burst protection)
const ESTIMATED_CHARS_PER_TEXT = 100;

function cleanupStaleEntries(map: Map<string, SlidingWindowEntry>, windowMs: number) {
  const now = Date.now();
  const cutoff = now - windowMs;

  for (const [key, entry] of map.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      map.delete(key);
    }
  }
}

function cleanupApiKeyState() {
  const now = Date.now();
  const cutoff = now - API_KEY_RATE_LIMIT.WINDOW_MS;
  apiKeyRateLimitState.timestamps = apiKeyRateLimitState.timestamps.filter(t => t > cutoff);
  apiKeyRateLimitState.lastCleanup = now;
}

function checkRateLimit(clientId: string, textCount: number): { allowed: boolean; retryAfter?: number; limitType?: string } {
  const now = Date.now();

  // Cleanup old entries periodically
  if (now - apiKeyRateLimitState.lastCleanup > 10000) {
    cleanupApiKeyState();
    cleanupStaleEntries(clientRateLimitMap, CLIENT_RATE_LIMIT.WINDOW_MS);
  }

  // Check client rate limit (sliding window)
  let clientEntry = clientRateLimitMap.get(clientId);
  if (!clientEntry) {
    clientEntry = { timestamps: [] };
    clientRateLimitMap.set(clientId, clientEntry);
  }

  // Remove timestamps outside the window
  const clientCutoff = now - CLIENT_RATE_LIMIT.WINDOW_MS;
  clientEntry.timestamps = clientEntry.timestamps.filter(t => t > clientCutoff);

  if (clientEntry.timestamps.length >= CLIENT_RATE_LIMIT.MAX_REQUESTS) {
    const oldestInWindow = Math.min(...clientEntry.timestamps);
    const retryAfter = Math.ceil((oldestInWindow + CLIENT_RATE_LIMIT.WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter), limitType: 'client' };
  }

  // Check API key rate limit (requests per second)
  const apiKeyCutoff = now - API_KEY_RATE_LIMIT.WINDOW_MS;
  const validApiKeyTimestamps = apiKeyRateLimitState.timestamps.filter(t => t > apiKeyCutoff);

  if (validApiKeyTimestamps.length >= API_KEY_RATE_LIMIT.MAX_REQUESTS) {
    const oldestInWindow = Math.min(...validApiKeyTimestamps);
    const retryAfter = Math.ceil((oldestInWindow + API_KEY_RATE_LIMIT.WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter), limitType: 'api_key' };
  }

  // Check API key character rate limit
  const estimatedChars = textCount * ESTIMATED_CHARS_PER_TEXT;
  const recentChars = validApiKeyTimestamps.length * ESTIMATED_CHARS_PER_TEXT * (CLIENT_RATE_LIMIT.MAX_REQUESTS / 2);
  if (recentChars + estimatedChars > API_KEY_RATE_LIMIT.MAX_CHARACTERS_PER_SEC) {
    return { allowed: false, retryAfter: 1, limitType: 'api_quota' };
  }

  // Record this request
  clientEntry.timestamps.push(now);
  apiKeyRateLimitState.timestamps.push(now);

  return { allowed: true };
}

// Cleanup old client entries periodically
setInterval(() => {
  cleanupStaleEntries(clientRateLimitMap, CLIENT_RATE_LIMIT.WINDOW_MS);
}, 30000);

export async function POST(request: NextRequest) {
  try {
    // Parse request body first (need text count for rate limiting)
    const body = await request.json();
    const { texts, targetLang } = body;

    // Validate input early (before rate limit check)
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

    // Get client IP for rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

    // Check rate limit with text count for character estimation
    const rateLimitResult = checkRateLimit(clientId, texts.length);
    if (!rateLimitResult.allowed) {
      const headers = {
        'Retry-After': String(rateLimitResult.retryAfter || 1),
        'X-RateLimit-Type': rateLimitResult.limitType || 'unknown',
      };
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more requests.' },
        { status: 429, headers }
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
