import { env } from '@/lib/env';
import type { MlAnalyzeRequest, MlAnalyzeResponse } from '@sentimate/contracts';

export class MlServiceAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.mlServiceUrl;
    this.apiKey = env.mlServiceApiKey;
  }

  async checkHealth(): Promise<{ isHealthy: boolean; details?: any }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return { isHealthy: false };
      const data = await res.json();
      return { isHealthy: true, details: data };
    } catch {
      return { isHealthy: false };
    }
  }

  async analyze(data: MlAnalyzeRequest): Promise<MlAnalyzeResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          text: data.text,
          student_context: data.studentContext
            ? {
                current_semester: data.studentContext.currentSemester,
                sgpa_avg: data.studentContext.sgpaAvg,
                recent_mood_avg: data.studentContext.recentMoodAvg,
                recent_stress_avg: data.studentContext.recentStressAvg,
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`ML service responded with status ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.warn('ML Service call unavailable, returning honest offline fallback:', err.message);
      return {
        isAvailable: false,
        serviceStatus: 'unavailable',
        notice: 'ML analysis service is currently offline or unreachable. No automated scores generated.',
      };
    }
  }
}

export const mlServiceAdapter = new MlServiceAdapter();
