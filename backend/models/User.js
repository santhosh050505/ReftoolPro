// backend/models/User.js — Supabase version
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const User = {
  async findOne({ username }) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (error || !data) return null;
    return { ...data, comparePassword: async (pwd) => bcrypt.compare(pwd, data.password) };
  },

  async create({ username, password }) {
    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ username, password: hashed, role: 'user' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
};

module.exports = User;