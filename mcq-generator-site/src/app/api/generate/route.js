import { NextResponse } from 'next/server';

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

function getRateLimitInfo(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetIn = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 60000);
    return { allowed: false, remaining: 0, resetInMinutes: resetIn };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
}

async function callAnthropicWithRetry(apiKey, body) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { success: true, data: await response.json() };
    }

    const err = await response.json().catch(() => ({}));
    const message = err?.error?.message || `API error: ${response.status}`;

    // Retry on overloaded (529) or rate limit (429)
    if ((response.status === 529 || response.status === 429) && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }

    // Return user-friendly errors
    if (response.status === 529 || response.status === 429) {
      return { success: false, error: 'The AI service is temporarily busy. Please wait a minute and try again.', status: 429 };
    }
    if (response.status === 401) {
      return { success: false, error: 'API authentication error. Contact your TA.', status: 503 };
    }
    if (message.includes('spending') || message.includes('limit') || message.includes('credit')) {
      return { success: false, error: 'The question generator is temporarily paused. Contact your TA.', status: 503 };
    }

    return { success: false, error: message, status: response.status };
  }

  return { success: false, error: 'The AI service is temporarily busy. Please try again in a minute.', status: 429 };
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured. Contact your TA.' },
      { status: 503 }
    );
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimit = getRateLimitInfo(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. You can generate up to ${MAX_REQUESTS_PER_WINDOW} question sets per hour. Try again in ~${rateLimit.resetInMinutes} minutes.` },
      { status: 429 }
    );
  }

  // Parse request
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { messages, system, max_tokens } = body;
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing messages.' }, { status: 400 });
  }

  // Call Anthropic with retry
  try {
    const result = await callAnthropicWithRetry(apiKey, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: Math.min(max_tokens || 8000, 8000),
      system: system || '',
      messages,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, {
      headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
