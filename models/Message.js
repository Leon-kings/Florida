const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Contact Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  
  // Booking Information
  date: {
    type: Date,
    required: function() {
      return this.type === 'booking';
    }
  },
  time: {
    type: String,
    required: function() {
      return this.type === 'booking';
    }
  },
  guests: {
    type: Number,
    required: function() {
      return this.type === 'booking';
    },
    min: [1, 'Number of guests must be at least 1'],
    max: [50, 'Number of guests cannot exceed 50']
  },
  
  // Message Type & Status
  type: {
    type: String,
    enum: ['contact', 'booking', 'reservation', 'inquiry', 'complaint'],
    default: 'contact'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed', 'archived'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Response Tracking
  responses: [{
    message: {
      type: String,
      required: true
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: {
      type: Date,
      default: Date.now
    },
    internal: {
      type: Boolean,
      default: false
    }
  }],
  
  // Categorization
  category: {
    type: String,
    enum: ['general', 'booking', 'service', 'product', 'technical', 'billing', 'other'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // System Fields
  source: {
    type: String,
    enum: ['website', 'mobile', 'email', 'phone', 'walk-in'],
    default: 'website'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastRepliedAt: Date
});

// Update updatedAt before saving
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-detect type based on fields
  if (this.date && this.time && this.guests && this.type === 'contact') {
    this.type = 'booking';
  }
  
  // Auto-set category based on message content
  if (this.message) {
    const message = this.message.toLowerCase();
    if (message.includes('book') || message.includes('reserv')) {
      this.category = 'booking';
    } else if (message.includes('service') || message.includes('help')) {
      this.category = 'service';
    } else if (message.includes('product') || message.includes('menu')) {
      this.category = 'product';
    } else if (message.includes('bill') || message.includes('payment') || message.includes('price')) {
      this.category = 'billing';
    } else if (message.includes('technical') || message.includes('website') || message.includes('app')) {
      this.category = 'technical';
    }
  }
  
  next();
});

// Auto-set priority based on type and content
messageSchema.pre('save', function(next) {
  if (this.type === 'booking' || this.type === 'reservation') {
    this.priority = 'high';
  }
  
  const urgentKeywords = ['urgent', 'asap', 'emergency', 'immediately'];
  const message = this.message.toLowerCase();
  
  if (urgentKeywords.some(keyword => message.includes(keyword))) {
    this.priority = 'urgent';
  }
  
  next();
});

// Static method to get messages by status
messageSchema.statics.getMessagesByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get messages by type
messageSchema.statics.getMessagesByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

// Static method to get unread messages count
messageSchema.statics.getUnreadCount = function() {
  return this.countDocuments({ status: 'new' });
};

// Static method to get today's messages
messageSchema.statics.getTodaysMessages = function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).sort({ createdAt: -1 });
};

// Instance method to add response
messageSchema.methods.addResponse = function(response, userId, internal = false) {
  this.responses.push({
    message: response,
    repliedBy: userId,
    internal: internal
  });
  this.status = internal ? this.status : 'replied';
  this.lastRepliedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);