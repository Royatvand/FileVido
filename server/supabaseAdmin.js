const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export function getSupabaseAdminConfig() {
  if (!SUPABASE_URL) return { ok: false, reason: 'missing_url' }
  if (!SUPABASE_ADMIN_KEY) return { ok: false, reason: 'missing_key' }

  // Supabase secret API keys are opaque, not JWTs: send them only as apikey.
  if (/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(SUPABASE_ADMIN_KEY)) {
    return { ok: true, url: SUPABASE_URL, key: SUPABASE_ADMIN_KEY, headers: { apikey: SUPABASE_ADMIN_KEY } }
  }

  // Backward compatibility for the legacy JWT-based service_role key.
  if (SUPABASE_ADMIN_KEY.startsWith('eyJ') && SUPABASE_ADMIN_KEY.split('.').length === 3) {
    return {
      ok: true,
      url: SUPABASE_URL,
      key: SUPABASE_ADMIN_KEY,
      headers: { apikey: SUPABASE_ADMIN_KEY, Authorization: `Bearer ${SUPABASE_ADMIN_KEY}` },
    }
  }

  return { ok: false, reason: 'invalid_key' }
}

export function getSupabaseAdminConfigMessage(config) {
  if (config?.reason === 'missing_url') return 'SUPABASE_URL یا VITE_SUPABASE_URL روی سرور تنظیم نشده است.'
  if (config?.reason === 'missing_key') return 'کلید سروری Supabase تنظیم نشده است؛ SUPABASE_SECRET_KEY را در Vercel قرار دهید.'
  if (config?.reason === 'invalid_key') return 'کلید سروری Supabase معتبر نیست؛ باید sb_secret_ یا کلید قدیمی service_role با قالب JWT باشد.'
  return 'تنظیمات سروری Supabase کامل نیست.'
}
