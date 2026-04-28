// backend/models/History.js — Supabase version
const getClient = () => {
  const sb = require('../config/supabase');
  if (!sb) throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  return sb;
};

const History = {
  async create(data) {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from('history')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async count({ userId }) {
    const supabase = getClient();
    const { count, error } = await supabase
      .from('history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return count || 0;
  },

  async findOldest({ userId }, limit) {
    const supabase = getClient();
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
    const supabase = getClient();
    const { error } = await supabase.from('history').delete().in('id', ids);
    if (error) throw new Error(error.message);
  },

  async findByUser({ userId }) {
    const supabase = getClient();
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
    const supabase = getClient();
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
    const supabase = getClient();
    const { error } = await supabase.from('history').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
};

module.exports = History;
