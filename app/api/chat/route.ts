import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Gemini (Google AI Studio free tier)
// https://ai.google.dev
// Add GEMINI_API_KEY to .env.local

async function getAIResponse(userMessage: string, menuContext: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback if no key is set
    return "I'm here to help you with our menu! You can ask me for recommendations, about toppings, prices, or allergen info.";
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `You are a friendly boba tea shop assistant. Keep answers short (2-3 sentences). Here is our current menu:\n${menuContext}`,
          }],
        },
        contents: [{
          parts: [{ text: userMessage }],
        }],
        generationConfig: {
          maxOutputTokens: 200,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini API error:', err);
    return "Sorry, I'm having trouble right now. Please try again in a moment.";
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text
    ?? "Sorry, I couldn't generate a response.";
}

// Route handler

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const [drinksRes, toppingsRes] = await Promise.all([
      pool.query("SELECT name, cost, category FROM drinks WHERE name IS NOT NULL ORDER BY category, name"),
      pool.query("SELECT name, price FROM toppings WHERE is_active = TRUE ORDER BY name"),
    ]);

    const drinkLines = drinksRes.rows.map((d: { name: string; cost: number; category: string }) =>
      `${d.name} ($${Number(d.cost).toFixed(2)}) - ${d.category}`
    );
    const toppingLines = toppingsRes.rows.map((t: { name: string; price: number }) =>
      `${t.name} (+$${Number(t.price).toFixed(2)})`
    );
    const menuContext = `Drinks:\n${drinkLines.join('\n')}\n\nToppings:\n${toppingLines.join('\n')}`;

    const reply = await getAIResponse(message, menuContext);
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
