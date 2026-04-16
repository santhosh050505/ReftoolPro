const History = require('../models/History');

// Create new history entry with 10-entry FIFO limit
exports.createHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const historyData = {
      ...req.body,
      userId,
      createdAt: new Date()
    };

    // 1. Get current history count for this user
    const historyCount = await History.countDocuments({ userId });

    // 2. If 10 or more, delete the oldest one(s)
    if (historyCount >= 10) {
      // Find the oldest entries that exceed the 10-limit
      const oldestEntries = await History.find({ userId })
        .sort({ createdAt: 1 })
        .limit(historyCount - 9); // Remove enough to make room for 1

      const idsToDelete = oldestEntries.map(entry => entry._id);
      await History.deleteMany({ _id: { $in: idsToDelete } });
    }

    // 3. Create new entry
    const historyEntry = new History(historyData);
    await historyEntry.save();

    res.status(201).json({
      success: true,
      message: 'History saved successfully',
      history: historyEntry
    });
  } catch (error) {
    console.error('Create history error:', error);
    res.status(500).json({ error: 'Failed to save history' });
  }
};

// Get history for the logged-in user (latest 10)
exports.getHistoryByUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const history = await History.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

// Delete a specific history entry
exports.deleteHistoryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const entry = await History.findOneAndDelete({ _id: id, userId });

    if (!entry) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json({
      success: true,
      message: 'History entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete history entry error:', error);
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
};

// Clear all history for the user
exports.clearAllHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    await History.deleteMany({ userId });

    res.json({
      success: true,
      message: 'All history cleared successfully'
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};
