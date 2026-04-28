// backend/controllers/historyController.js — Supabase version
const History = require('../models/History');

exports.createHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const historyData = { ...req.body, user_id: userId };

    // FIFO: keep max 10 entries per user
    const historyCount = await History.count({ userId });
    if (historyCount >= 10) {
      const oldest = await History.findOldest({ userId }, historyCount - 9);
      const idsToDelete = oldest.map(e => e.id);
      await History.deleteByIds(idsToDelete);
    }

    const historyEntry = await History.create(historyData);
    res.status(201).json({ success: true, message: 'History saved successfully', history: historyEntry });
  } catch (error) {
    console.error('Create history error:', error);
    res.status(500).json({ error: 'Failed to save history' });
  }
};

exports.getHistoryByUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await History.findByUser({ userId });
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

exports.deleteHistoryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const entry = await History.findByIdAndDelete(id, userId);
    if (!entry) return res.status(404).json({ error: 'History entry not found' });
    res.json({ success: true, message: 'History entry deleted successfully' });
  } catch (error) {
    console.error('Delete history entry error:', error);
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
};

exports.clearAllHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    await History.deleteAll({ userId });
    res.json({ success: true, message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};
