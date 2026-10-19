import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Check if Gemini API key is configured
    if (!env.geminiApiKey) {
      // Truthful unavailable state when API key is not yet configured in environment
      const encoder = new TextEncoder();
      const fallbackText =
        "Thank you for sharing. SentiMate is running in local demonstration mode because GEMINI_API_KEY is not yet configured in .env.local. You can configure your key to enable live Gemini streaming responses, or access campus counselling and emergency hotlines using the navigation menu.";

      const stream = new ReadableStream({
        start(controller) {
          // Stream the notification message smoothly
          const words = fallbackText.split(' ');
          let index = 0;
          const interval = setInterval(() => {
            if (index < words.length) {
              controller.enqueue(encoder.encode(words[index] + ' '));
              index++;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 35);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: env.geminiModel,
      systemInstruction:
        "You are SentiMate, an empathetic, calm, and supportive wellness companion for university students. You help students reflect on their feelings, stress, sleep, and academic pressures. Always maintain warm, supportive, and non-judgmental language. You do NOT provide medical or clinical diagnosis. If the student indicates severe acute distress or thoughts of self-harm, gently urge them to reach out to campus emergency services or the 988 Lifeline.",
    });

    const result = await model.generateContentStream(message);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error processing chat' },
      { status: 500 }
    );
  }
}
