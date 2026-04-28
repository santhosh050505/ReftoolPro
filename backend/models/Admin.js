// backend/models/Admin.js — Supabase version
const bcrypt = require('bcryptjs');

const getClient = () => {
  const sb = require('../config/supabase');
  if (!sb) throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  return sb;
};

const Admin = {
  async findOne({ username }) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();
    if (error || !data) return null;
    return { ...data, comparePassword: async (pwd) => bcrypt.compare(pwd, data.password) };
  }
};

module.exports = Admin;