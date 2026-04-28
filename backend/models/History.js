// backend/models/History.js — Supabase version
const supabase = require('../config/supabase');

const History = {
  async create(data) {
    const { data: row, error } = await supabase
      .from('history')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async count({ userId }) {
    const { count, error } = await supabase
      .from('history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return count || 0;
  },

  async findOldest({ userId }, limit) {
    const { data, error } = await supabase
      .from('history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async deleteByIds(ids) {
    const { error } = await supabase.from('history').delete().in('id', ids);
    if (error) throw new Error(error.message);
  },

  async findByUser({ userId }) {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async findByIdAndDelete(id, userId) {
    const { data, error } = await supabase
      .from('history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteAll({ userId }) {
    const { error } = await supabase.from('history').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
};

module.exports = History;
