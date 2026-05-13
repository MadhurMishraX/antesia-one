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

    // 🛡️ BRUTE-FORCE PROTECTION
    // Check for recent failures from this device
    const fingerprint = req.headers['x-device-fingerprint'] as string || 'unknown';
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { count: failCount } = await supabase
      .from('admin_security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint', fingerprint)
      .eq('status', 'fail')
      .gt('created_at', fifteenMinsAgo);

    if (failCount && failCount >= 5) {
      return res.status(429).json({ 
        error: 'Too many failed attempts. Device locked for 15 minutes.' 
      });
    }

    // Compare PIN server-side (the ADMIN_PIN env var has no VITE_ prefix,
    // so it is NEVER bundled into client-side code)
    const serverPin = process.env.ADMIN_PIN;

    if (!serverPin) {
      console.error('ADMIN_PIN environment variable not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Timing-safe comparison to prevent timing attacks
    const isPinCorrect = (pin: string, actual: string) => {
      if (pin.length !== actual.length) return false;
      let result = 0;
      for (let i = 0; i < pin.length; i++) {
        result |= pin.charCodeAt(i) ^ actual.charCodeAt(i);
      }
      return result === 0;
    };

    if (!isPinCorrect(pin, serverPin)) {
      // Log failed PIN attempt
      await supabase.from('admin_security_logs').insert({
        user_id: user.id,
        fingerprint,
        user_agent: req.headers['user-agent'] || 'unknown',
        status: 'fail',
      });

      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // PIN is correct — log success
    await supabase.from('admin_security_logs').insert({
      user_id: user.id,
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
