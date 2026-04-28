// backend/models/Project.js — Supabase version
const supabase = require('../config/supabase');

const Project = {
  async create(data) {
    const { data: row, error } = await supabase
      .from('projects')
      .insert({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async find({ userId }) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async findOne({ id, userId }) {
    const query = supabase.from('projects').select('*');
    if (id) query.eq('id', id);
    if (userId) query.eq('user_id', userId);
    const { data, error } = await query.single();
    if (error || !data) return null;
    return data;
  },

  async findByIdAndUpdate(id, userId, updates) {
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
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', pattern);
    if (error) return [];
    return data || [];
  },

  async deleteOne(id, userId) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
};

module.exports = Project;
