export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  chatProvider: process.env.CHAT_PROVIDER || 'nvidia',
  nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
  nvidiaBaseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  nvidiaModel: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  mlServiceApiKey: process.env.ML_SERVICE_API_KEY || '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SUPPORT_FROM_EMAIL || '"SentiMate Support" <support.sentimate@gmail.com>',
  },
  isConfigured: {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
    ),
    nvidia: Boolean(process.env.NVIDIA_API_KEY),
    mlService: Boolean(process.env.ML_SERVICE_URL && process.env.ML_SERVICE_API_KEY),
    smtp: Boolean(process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)),
  },
};
