// backend/models/Admin.js — Supabase version
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const Admin = {
  async findOne({ username }) {
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