// backend/models/Calculation.js — Supabase version
const getClient = () => {
  const sb = require('../config/supabase');
  if (!sb) throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  return sb;
};

const Calculation = {
  async create(data) {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from('calculations')
      .insert({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async find({ projectId, userId }) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('order', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async findOne(filter) {
    const supabase = getClient();
    let query = supabase.from('calculations').select('*');
    if (filter.id) query = query.eq('id', filter.id);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.projectId) query = query.eq('project_id', filter.projectId);
    if (filter.refrigerant && filter.refrigerant.$ne) query = query.neq('refrigerant', filter.refrigerant.$ne);
    if (filter.isManual && filter.isManual.$ne !== undefined) query = query.neq('is_manual', filter.isManual.$ne);
    query = query.order('created_at', { ascending: true }).limit(1).single();
    const { data, error } = await query;
    if (error || !data) return null;
    return data;
  },

  async count({ projectId, userId }) {
    const supabase = getClient();
    const { count, error } = await supabase
      .from('calculations')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return count || 0;
  },

  async findLast({ projectId, userId }) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('calculations')
      .select('order')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('order', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return data;
  },

  async findByIdAndUpdate(id, userId, updates) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('calculations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async findByIdAndDelete(id, userId) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('calculations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteMany({ projectId, userId }) {
    const supabase = getClient();
    const { error } = await supabase
      .from('calculations')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async insertMany(rows) {
    const supabase = getClient();
    const { error } = await supabase.from('calculations').insert(rows);
    if (error) throw new Error(error.message);
  },

  async bulkUpdate(updates, userId) {
    const supabase = getClient();
    const results = await Promise.all(
      updates.map(({ id, data }) =>
        supabase
          .from('calculations')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
      )
    );
    const failed = results.find(r => r.error);
    if (failed) throw new Error(failed.error.message);
  }
};

module.exports = Calculation;
