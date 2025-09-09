const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true 
  },
  sessionId: { 
    type: String, 
    required: true,
    index: true 
  },
  messages: [messageSchema],
  lastActive: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  metadata: {
    title: String,
    tags: [String]
  }
}, { timestamps: true });

// Index for faster lookups
chatHistorySchema.index({ userId: 1, sessionId: 1 }, { unique: true });

// Clean up old sessions
chatHistorySchema.statics.cleanupOldSessions = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.deleteMany({ 
    lastActive: { $lt: cutoffDate },
    'metadata.isPinned': { $ne: true }
  });
};

// Add a message to the chat history
chatHistorySchema.methods.addMessage = function(role, content) {
  this.messages.push({ role, content });
  this.lastActive = new Date();
  // Keep only the last 100 messages to prevent document from growing too large
  if (this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
  return this.save();
};

// Get conversation context (last N messages)
chatHistorySchema.methods.getContext = function(limit = 10) {
  return this.messages.slice(-limit);
};

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;
