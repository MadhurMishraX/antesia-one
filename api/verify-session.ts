import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/verify-session
 * 
 * Validates if the current authenticated admin has verified their PIN
 * on this device within the last 4 hours.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract the access token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const accessToken = authHeader.slice(7);

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for a recent SUCCESSFUL PIN log for this user and device
    const fingerprint = req.headers['x-device-fingerprint'] as string || 'unknown';
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data: recentLogs, error: logError } = await supabase
      .from('admin_security_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('fingerprint', fingerprint)
      .eq('status', 'success')
      .gt('created_at', fourHoursAgo)
      .limit(1);

    if (logError || !recentLogs || recentLogs.length === 0) {
      return res.status(401).json({ verified: false, error: 'PIN verification required' });
    }

    return res.status(200).json({ verified: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
