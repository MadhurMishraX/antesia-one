/**
 * Central configuration for the application.
 * Supports switching between Testing and Deployment environments.
 */

const isDeployment = import.meta.env.VITE_USE_DEPLOYMENT_CONFIG === 'true';

export const CONFIG = {
  isDeployment,
  supabase: {
    url: isDeployment 
      ? import.meta.env.VITE_DEPLOY_SUPABASE_URL 
      : import.meta.env.VITE_SUPABASE_URL,
    anonKey: isDeployment 
      ? import.meta.env.VITE_DEPLOY_SUPABASE_ANON_KEY 
      : import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  admin: {
    password: isDeployment 
      ? import.meta.env.VITE_DEPLOY_ADMIN_PASSWORD 
      : import.meta.env.VITE_ADMIN_PASSWORD,
    pin: isDeployment 
      ? import.meta.env.VITE_DEPLOY_ADMIN_PIN 
      : import.meta.env.VITE_ADMIN_PIN,
    email: 'admin@antesia.internal',
  }
};
