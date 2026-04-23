/**
 * Central configuration for the application.
 * Supports switching between Testing and Deployment environments.
 */

export const CONFIG = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  admin: {
    password: import.meta.env.VITE_ADMIN_PASSWORD || '',
    pin: import.meta.env.VITE_ADMIN_PIN || '',
    email: 'admin@antesia.internal',
  }
};
