export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  mlServiceApiKey: process.env.ML_SERVICE_API_KEY || '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  isConfigured: {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    mlService: Boolean(process.env.ML_SERVICE_URL && process.env.ML_SERVICE_API_KEY),
  },
};
