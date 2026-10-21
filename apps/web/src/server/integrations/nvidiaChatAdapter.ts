import OpenAI from 'openai';
import { env } from '@/lib/env';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChatParams {
  message: string;
  history?: ChatHistoryMessage[];
  signal?: AbortSignal;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string, tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) => void;
  onError?: (error: Error) => void;
}

export class NvidiaChatServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'NVIDIA_CHAT_ERROR') {
    super(message);
    this.name = 'NvidiaChatServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Reviewed Sentimate System Prompt
 * Adheres strictly to university wellness safety guardrails:
 * - Empathy without pretending to be a human counsellor
 * - No medical or clinical diagnosis, no medication prescription
 * - No guarantees of clinical improvement
 * - Clear crisis triage to 988 and campus emergency services
 * - Concise, natural responses: 2-4 short paragraphs with at most 1 follow-up question
 * - Does not invent counsellor schedules or appointments
 */
export const SENTIMATE_SYSTEM_PROMPT = `You are SentiMate, an empathetic, calm, and supportive wellness companion for university students. You help students reflect on their feelings, stress, sleep, and academic pressures.
Always maintain warm, supportive, and non-judgmental language. You respond warmly and respectfully without pretending to be a human counsellor.
You do NOT provide medical or clinical diagnosis, prescribe medication, or claim guaranteed improvement.
If the student indicates severe acute distress or thoughts of self-harm, gently urge them to reach out to campus emergency services or the 988 Suicide & Crisis Lifeline.
Do not invent counsellor availability, appointments, contact details, or successful referrals.
Keep your responses concise and natural, usually two to four short paragraphs with at most one relevant follow-up question.`;

export class NvidiaChatAdapter {
  private client: OpenAI | null = null;

  /**
   * Reusable server-side OpenAI-compatible client configured for NVIDIA NIM
   */
  private getClient(): OpenAI {
    if (!env.nvidiaApiKey) {
      throw new NvidiaChatServiceError(
        'NVIDIA Chat service is unavailable: NVIDIA_API_KEY is not configured in .env.local. Please configure your key to enable live conversational responses.',
        503,
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey: env.nvidiaApiKey,
        baseURL: env.nvidiaBaseUrl || 'https://integrate.api.nvidia.com/v1',
        timeout: 30000, // 30-second upstream timeout
        maxRetries: 0,  // Controlled retry logic handled explicitly in adapter
      });
    }

    return this.client;
  }

  /**
   * Parse and sanitize upstream provider errors.
   * Strips internal provider UUIDs, account hashes, and raw JSON to prevent leakage,
   * while logging detailed diagnostics server-side and returning human-friendly messages
   * with accurate HTTP status codes (e.g. 502/503 for upstream failures, not 404).
   */
  public parseUpstreamError(upstreamErr: any): { message: string; statusCode: number; code: string } {
    const rawStatus = typeof upstreamErr?.status === 'number' ? upstreamErr.status : undefined;
    const rawMessage = typeof upstreamErr?.message === 'string' ? upstreamErr.message : '';
    let detail = '';

    // Inspect parsed error body if provided by OpenAI SDK
    if (upstreamErr?.error && typeof upstreamErr.error === 'object') {
      detail = upstreamErr.error.detail || upstreamErr.error.message || upstreamErr.error.title || '';
    } else if (rawMessage) {
      const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          detail = parsed.detail || parsed.message || parsed.title || '';
        } catch {
          // ignore parsing error
        }
      }
    }

    // Always log the exact upstream diagnostic on server terminal
    console.error('[NvidiaChatAdapter] Upstream provider error:', {
      status: rawStatus,
      rawMessage,
      detail: detail || undefined,
    });

    // 1. Account access / credits exhaustion / missing function entitlements
    // (e.g., NVIDIA NIM returns 404 "Function '<uuid>': Not found for account '<account_id>'")
    if (
      detail.toLowerCase().includes('not found for account') ||
      rawMessage.toLowerCase().includes('not found for account') ||
      rawStatus === 401 ||
      rawStatus === 403
    ) {
      return {
        statusCode: 503,
        code: 'UPSTREAM_ACCOUNT_ACCESS_ERROR',
        message:
          'The AI conversation service is currently unavailable due to an upstream API account or credit limitation. Please check back later or contact campus support.',
      };
    }

    // 2. Model not found or deprecated
    if (rawStatus === 404 || rawStatus === 410) {
      return {
        statusCode: 502,
        code: 'UPSTREAM_MODEL_UNAVAILABLE',
        message:
          'The configured AI conversation model is currently unavailable upstream. Please try again later.',
      };
    }

    // 3. Upstream rate limiting
    if (rawStatus === 429) {
      return {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message:
          'The conversation service is experiencing high demand right now. Please wait a moment and try again.',
      };
    }

    // 4. Upstream Gateway / Service unavailable / Timeout
    if (rawStatus === 502 || rawStatus === 503 || rawStatus === 504 || rawMessage.toLowerCase().includes('timeout')) {
      return {
        statusCode: 503,
        code: 'UPSTREAM_SERVICE_UNAVAILABLE',
        message:
          'The conversation service is momentarily unavailable. Please try again shortly.',
      };
    }

    // 5. Default fallback for other upstream failures
    return {
      statusCode: 503,
      code: 'UPSTREAM_PROVIDER_ERROR',
      message:
        'Unable to receive a response from the AI companion service. Please try again in a few moments.',
    };
  }

  /**
   * Stream conversational response from NVIDIA Nemotron
   */
  async streamResponse(params: StreamChatParams): Promise<ReadableStream<Uint8Array>> {
    const client = this.getClient();

    // 1. Prepare bounded context budget
    // Bounded to last 8 messages to prevent unbounded token usage while maintaining coherent multi-turn context
    const recentHistory = (params.history || []).slice(-8);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: SENTIMATE_SYSTEM_PROMPT,
      },
      ...recentHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: params.message,
      },
    ];

    const encoder = new TextEncoder();

    const makeStreamRequest = async (currentSignal?: AbortSignal) => {
      const response = await client.chat.completions.create(
        {
          model: env.nvidiaModel || 'nvidia/nemotron-3-super-120b-a12b',
          messages,
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 512,
          stream: true,
          stream_options: {
            include_usage: true,
          },
          ...({
            chat_template_kwargs: {
              enable_thinking: false,
            },
          } as any),
        },
        { signal: currentSignal }
      );
      return response as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    };

    let initialStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> | null = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (params.signal?.aborted) break;
      try {
        initialStream = await makeStreamRequest(params.signal);
        break;
      } catch (err: any) {
        lastError = err;
        const status = err?.status;
        const isRetryable =
          !params.signal?.aborted &&
          (status === 429 || (typeof status === 'number' && status >= 500) || !status || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT');

        if (isRetryable && attempt < 3) {
          const retryAfter = err?.headers?.['retry-after'];
          const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 600;
          await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 2000)));
          continue;
        }
        break;
      }
    }

    if (!initialStream) {
      const parsed = this.parseUpstreamError(lastError);
      throw new NvidiaChatServiceError(parsed.message, parsed.statusCode, parsed.code);
    }

    const self = this;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let accumulatedText = '';
        let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
        let streamStarted = false;

        try {
          for await (const chunk of initialStream) {
            if (params.signal?.aborted) {
              break;
            }

            // Capture token usage if reported by NVIDIA NIM stream
            if (chunk.usage) {
              tokenUsage = {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
                totalTokens: chunk.usage.total_tokens,
              };
            }

            const choice = chunk.choices?.[0];
            if (!choice) continue;

            // Strict invariant: Never display or persist internal reasoning / thinking fields
            // Only stream regular delta content
            const deltaContent = choice.delta?.content;
            if (deltaContent) {
              // Strip accidental leaked <thought>...</thought> blocks or tags if present
              const cleanChunk = deltaContent
                .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
                .replace(/<\/?thought>/gi, '');
              if (cleanChunk) {
                streamStarted = true;
                accumulatedText += cleanChunk;
                params.onToken?.(cleanChunk);
                controller.enqueue(encoder.encode(cleanChunk));
              }
            }
          }

          // Handle empty response fallback gracefully
          if (!accumulatedText.trim() && !params.signal?.aborted) {
            const fallbackMessage =
              "I'm here to support you. Could you tell me a little more about how you're feeling right now?";
            accumulatedText = fallbackMessage;
            controller.enqueue(encoder.encode(fallbackMessage));
          }

          if (params.signal?.aborted) {
            // Mark explicitly as stopped/aborted
            params.onError?.(new Error('Generation stopped by user'));
          } else {
            params.onComplete?.(accumulatedText, tokenUsage);
          }

          controller.close();
        } catch (streamError: any) {
          // If streaming already started, pass sanitized error through
          const parsed = self.parseUpstreamError(streamError);
          const sanitizedError = new NvidiaChatServiceError(parsed.message, parsed.statusCode, parsed.code);
          params.onError?.(sanitizedError);
          controller.error(sanitizedError);
        }
      },
    });
  }
}

export const nvidiaChatAdapter = new NvidiaChatAdapter();
