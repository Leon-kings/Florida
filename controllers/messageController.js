const Message = require('../models/Message');
const User = require('../models/User');
const { 
  sendMessageConfirmation, 
  sendNewMessageNotification, 
  sendMessageResponse,
  sendDailyMessagesReport 
} = require('../mails/sendEmail');

// @desc    Create new message
// @route   POST /api/messages
// @access  Public
exports.createMessage = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      message, 
      date, 
      time, 
      guests,
      type,
      category,
      source 
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, phone, and message are required'
      });
    }

    // Create message
    const newMessage = await Message.create({
      name,
      email,
      phone,
      message,
      date: date ? new Date(date) : undefined,
      time,
      guests: guests ? parseInt(guests) : undefined,
      type: type || 'contact',
      category,
      source: source || 'website',
      createdBy: req.user?.id
    });

    // Send confirmation email to customer
    await sendMessageConfirmation(newMessage);

    // Send notification to all admins
    const admins = await User.find({ status: 'admin', emailVerified: true });
    for (const admin of admins) {
      await sendNewMessageNotification(admin, newMessage);
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully. Confirmation email sent.',
      data: {
        message: newMessage
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error sending message',
      error: error.message
    });
  }
};

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private
exports.getAllMessages = async (req, res) => {
  try {
    const { 
      type, 
      status, 
      category, 
      priority,
      page = 1, 
      limit = 20,
      startDate,
      endDate
    } = req.query;
    
    // Build query
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Execute query with pagination
    const messages = await Message.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responses.repliedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Message.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responses.repliedBy', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    // Mark as read if it's new
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching message',
      error: error.message
    });
  }
};

// @desc    Update message status
// @route   PATCH /api/messages/:id/status
// @access  Private
exports.updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Message status updated to ${status}`,
      data: {
        message
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating message status',
      error: error.message
    });
  }
};

// @desc    Add response to message
// @route   POST /api/messages/:id/response
// @access  Private
exports.addResponse = async (req, res) => {
  try {
    const { response, internal = false } = req.body;

    if (!response) {
      return res.status(400).json({
        status: 'error',
        message: 'Response message is required'
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    // Add response
    await message.addResponse(response, req.user.id, internal);

    // Send response email to customer if not internal
    if (!internal) {
      const staff = await User.findById(req.user.id);
      await sendMessageResponse(message, response, staff.name);
    }

    // Populate and return updated message
    const updatedMessage = await Message.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responses.repliedBy', 'name email');

    res.status(200).json({
      status: 'success',
      message: 'Response added successfully',
      data: {
        message: updatedMessage
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error adding response',
      error: error.message
    });
  }
};

// @desc    Assign message to staff
// @route   PATCH /api/messages/:id/assign
// @access  Private
exports.assignMessage = async (req, res) => {
  try {
    const { staffId } = req.body;

    const message = await Message.findById(req.params.id);
    const staff = await User.findById(staffId);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    message.assignedTo = staffId;
    await message.save();

    await message.populate('assignedTo', 'name email');

    res.status(200).json({
      status: 'success',
      message: `Message assigned to ${staff.name}`,
      data: {
        message
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error assigning message',
      error: error.message
    });
  }
};

// @desc    Get message statistics
// @route   GET /api/messages/stats/overview
// @access  Private
exports.getMessageStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Date range
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Total messages and unread count
    const totalStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] }
          }
        }
      }
    ]);

    // Messages by type
    const messagesByType = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Messages by status
    const messagesByStatus = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Messages by priority
    const messagesByPriority = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Daily messages for the period
    const dailyMessages = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          messages: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const stats = totalStats[0] || {
      totalMessages: 0,
      unreadCount: 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        ...stats,
        messagesByType: messagesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        messagesByStatus: messagesByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        messagesByPriority: messagesByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        dailyMessages
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching message statistics',
      error: error.message
    });
  }
};

// @desc    Get today's messages
// @route   GET /api/messages/today
// @access  Private
exports.getTodaysMessages = async (req, res) => {
  try {
    const messages = await Message.getTodaysMessages()
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: {
        messages
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching today\'s messages',
      error: error.message
    });
  }
};

// @desc    Get unread messages count
// @route   GET /api/messages/unread/count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.getUnreadCount();

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount: count
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};

// @desc    Send daily messages report
// @route   POST /api/messages/reports/daily
// @access  Private
exports.sendDailyMessagesReport = async (req, res) => {
  try {
    const date = new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all admins
    const admins = await User.find({ status: 'admin', emailVerified: true });
    
    if (admins.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No admin users found'
      });
    }

    // Get today's statistics
    const totalStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] }
          }
        }
      }
    ]);

    const messagesByType = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const messagesByStatus = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = totalStats[0] || { totalMessages: 0, unreadCount: 0 };

    const reportData = {
      date: date.toDateString(),
      totalMessages: stats.totalMessages,
      unreadCount: stats.unreadCount,
      messagesByType: messagesByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      messagesByStatus: messagesByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    // Send email to all admins
    for (const admin of admins) {
      await sendDailyMessagesReport(admin, reportData);
    }

    res.status(200).json({
      status: 'success',
      message: 'Daily messages report sent to all admins',
      data: {
        recipients: admins.length,
        report: reportData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error sending daily report',
      error: error.message
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Message deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting message',
      error: error.message
    });
  }
};