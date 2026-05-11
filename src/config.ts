/**
 * Central configuration for the application.
 * Supports switching between Testing and Deployment environments.
 * 
 * SECURITY NOTE: Only VITE_-prefixed env vars are exposed client-side.
 * Sensitive values like ADMIN_PIN use no prefix and stay server-side only.
 */

export const CONFIG = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
};

// Admin email is not sensitive — it's a fixed internal identifier
export const ADMIN_EMAIL = 'admin@antesia.internal';
