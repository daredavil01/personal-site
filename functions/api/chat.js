// functions/api/chat.js
// Cloudflare Pages Function — proxies chat requests to Claude API with streaming.
// Requires env var: ANTHROPIC_API_KEY (set in Cloudflare Pages > Settings > Environment Variables)

import { SYSTEM_PROMPT } from '../lib/site-context.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_MESSAGES = 20;
const MAX_BODY_BYTES = 32_768; // 32 KB

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  // Body size guard
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Cap history and per-message content length
  const trimmedMessages = messages
    .slice(-MAX_MESSAGES)
    .map(({ role, content }) => ({
      role: role === 'user' ? 'user' : 'assistant',
      content: String(content).slice(0, 4096),
    }));

  const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: trimmedMessages,
      stream: true,
    }),
  });

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text();
    return new Response(JSON.stringify({ error: 'Claude API error', detail: errText }), {
      status: 502,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Pass the SSE stream body straight through to the client
  return new Response(anthropicResponse.body, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
