import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/verify-pin
 * 
 * Server-side PIN verification for admin two-factor authentication.
 * The actual PIN value never leaves the server.
 * 
 * Body: { pin: string }
 * Headers: Authorization: Bearer <supabase_access_token>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pin } = req.body;

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Extract the access token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const accessToken = authHeader.slice(7);

    // Verify the user is authenticated and is an admin
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    // Compare PIN server-side (the ADMIN_PIN env var has no VITE_ prefix,
    // so it is NEVER bundled into client-side code)
    const serverPin = process.env.ADMIN_PIN;

    if (!serverPin) {
      console.error('ADMIN_PIN environment variable not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (pin !== serverPin) {
      // Log failed PIN attempt
      const fingerprint = req.headers['x-device-fingerprint'] as string || 'unknown';
      await supabase.from('admin_security_logs').insert({
        fingerprint,
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'fail',
      });

      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // PIN is correct — log success
    const fingerprint = req.headers['x-device-fingerprint'] as string || 'unknown';
    await supabase.from('admin_security_logs').insert({
      fingerprint,
      user_agent: req.headers['user-agent'] || 'unknown',
      status: 'success',
    });

    return res.status(200).json({ verified: true });
  } catch (err) {
    console.error('PIN verification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
