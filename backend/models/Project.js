// backend/models/Project.js — Supabase version
const getClient = () => {
  const sb = require('../config/supabase');
  if (!sb) throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  return sb;
};

const Project = {
  async create(data) {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from('projects')
      .insert({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async find({ userId }) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async findOne({ id, userId }) {
    const supabase = getClient();
    let query = supabase.from('projects').select('*');
    if (id) query = query.eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.single();
    if (error || !data) return null;
    return data;
  },

  async findByIdAndUpdate(id, userId, updates) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async findByNamePattern(userId, pattern) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', pattern);
    if (error) return [];
    return data || [];
  },

  async deleteOne(id, userId) {
    const supabase = getClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
};

module.exports = Project;
