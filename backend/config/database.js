// backend/config/database.js
// Replaced MongoDB/Mongoose with Supabase.
// Supabase uses HTTP — no persistent TCP connection needed.
// This file now simply verifies the Supabase connection on startup.

const supabase = require('./supabase');

const connectDB = async () => {
  try {
    // Lightweight ping: list tables (returns empty on new project, still succeeds)
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table not found (OK if tables not yet created)
      throw new Error(error.message);
    }
    console.log('✅ Supabase Connected Successfully');

    // Create default admin if env flag is set
    if (process.env.INITIALIZE_DEFAULT_ADMIN === 'true') {
      const bcrypt = require('bcryptjs');
      const adminUser = process.env.DEFAULT_ADMIN_USER || 'Vectarc';
      const adminPass = process.env.DEFAULT_ADMIN_PASSWORD;

      if (adminPass) {
        const { data: existing } = await supabase
          .from('admins')
          .select('id')
          .eq('username', adminUser)
          .single();

        if (!existing) {
          const hashed = await bcrypt.hash(adminPass, 10);
          await supabase.from('admins').insert({ username: adminUser, password: hashed, role: 'admin' });
          console.log('✅ Default Admin Created');
        }
      }
    }
  } catch (error) {
    console.error('❌ Supabase Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;