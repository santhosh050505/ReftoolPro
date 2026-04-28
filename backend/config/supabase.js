const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In local dev without Supabase credentials, return a null client.
// The backend will still serve all Danfoss API proxy routes.
// Auth/project/history routes that need the DB will fail gracefully.
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.');
  console.warn('   Danfoss proxy routes will work. Auth/DB routes will be unavailable.');
  module.exports = null;
  return;
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

module.exports = supabase;
