// backend/config/database.js
// Supabase connection check on startup.
// Non-fatal when credentials are missing (local dev without Supabase).

const connectDB = async () => {
  const supabase = require('./supabase');

  if (!supabase) {
    console.warn('⚠️  Supabase not configured. Running in LOCAL mode.');
    console.warn('   Auth, projects, history routes will not work until Supabase is set up.');
    console.warn('   All refrigerant calculation routes work normally via Danfoss API.');
    return; // Allow server to start
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
    console.log('✅ Supabase Connected Successfully');

    // Create default admin if env flag is set
    const shouldInitAdmin = String(process.env.INITIALIZE_DEFAULT_ADMIN) === 'true';
    
    if (shouldInitAdmin) {
      const bcrypt = require('bcryptjs');
      const adminUser = process.env.DEFAULT_ADMIN_USER || 'Vectarc';
      const adminPass = process.env.DEFAULT_ADMIN_PASSWORD;

      if (!adminPass) {
        console.warn('⚠️  DEFAULT_ADMIN_PASSWORD not set. Skipping admin creation.');
      } else {
        const { data: existing, error: findError } = await supabase
          .from('admins')
          .select('id')
          .eq('username', adminUser)
          .maybeSingle();

        if (!existing) {
          const hashed = await bcrypt.hash(adminPass, 10);
          const { error: insertError } = await supabase
            .from('admins')
            .insert({ username: adminUser, password: hashed, role: 'admin' });
          
          if (insertError) {
            console.error('❌ Failed to create default admin:', insertError.message);
          } else {
            console.log('✅ Default Admin Created Successfully');
          }
        } else {
          console.log('ℹ️  Admin user already exists. Skipping creation.');
        }
      }
    }
  } catch (error) {
    // Non-fatal in dev — log and continue
    console.error('❌ Supabase Connection Error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing in dev mode without database. Fix SUPABASE_URL to enable auth.');
    }
  }
};

module.exports = connectDB;