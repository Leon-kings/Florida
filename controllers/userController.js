const crypto = require('crypto');
const User = require('../models/User');
const { createSendToken } = require('../jwt/jwt');
const { sendVerificationEmail, sendWelcomeEmail, sendWeeklyStatsEmail } = require('../mails/sendEmail');

// ==================== AUTHENTICATION OPERATIONS ====================

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Create verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Send verification email
    await sendVerificationEmail(user, emailVerificationToken);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // Update last login and login count
    user.lastLogin = Date.now();
    user.loginCount += 1;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Verify email
// @route   GET /api/users/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// @desc    Update current user profile
// @route   PATCH /api/users/me
// @access  Private
exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Create filtered object with allowed fields
    const filteredBody = {};
    if (name) filteredBody.name = name;
    if (email) filteredBody.email = email;

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// ==================== CRUD OPERATIONS ====================

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, status } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      status: status || 'user',
      emailVerified: true // Admin created users are automatically verified
    });

    // Remove password from output
    user.password = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PATCH /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, status } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, status },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// ==================== STATISTICS OPERATIONS ====================

// @desc    Get user statistics
// @route   GET /api/users/stats/overview
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Weekly stats
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: startOfWeek }
    });

    const activeUsersThisWeek = await User.countDocuments({
      lastLogin: { $gte: startOfWeek }
    });

    // Users by status
    const usersByStatus = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        newUsersThisWeek,
        activeUsersThisWeek,
        usersByStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
};

// @desc    Get monthly signups
// @route   GET /api/users/stats/monthly-signups
// @access  Private/Admin
exports.getMonthlySignups = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const monthlySignups = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: monthlySignups
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching monthly signups',
      error: error.message
    });
  }
};

// @desc    Send weekly statistics email to admins
// @route   POST /api/users/stats/send-weekly-report
// @access  Private/Admin
exports.sendWeeklyStatsReport = async (req, res) => {
  try {
    // Calculate start and end of current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all admins
    const admins = await User.find({ status: 'admin', emailVerified: true });
    
    if (admins.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No admin users found'
      });
    }

    // Get weekly statistics
    const stats = await this.generateWeeklyStats(startOfWeek, endOfWeek);

    // Send email to all admins
    for (const admin of admins) {
      await sendWeeklyStatsEmail(admin, stats);
    }

    res.status(200).json({
      status: 'success',
      message: 'Weekly statistics report sent to all admins',
      data: {
        recipients: admins.length,
        period: {
          start: startOfWeek,
          end: endOfWeek
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error sending weekly report',
      error: error.message
    });
  }
};

// Helper function to generate weekly statistics
exports.generateWeeklyStats = async (startOfWeek, endOfWeek) => {
  // Total users
  const totalUsers = await User.countDocuments();
  
  // New users this week
  const newUsersThisWeek = await User.countDocuments({
    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
  });

  // Active users this week (users who logged in)
  const activeUsersThisWeek = await User.countDocuments({
    lastLogin: { $gte: startOfWeek, $lte: endOfWeek }
  });

  // Total managers
  const totalManagers = await User.countDocuments({ status: 'manager' });

  // Manager attendance statistics
  const managers = await User.find({ status: 'manager' }).select('name email loginCount lastLogin');
  
  const managerAttendance = managers.map(manager => {
    // Calculate attendance rate based on login count (assuming 5 working days)
    const maxPossibleLogins = 5; // 5 working days in a week
    const attendanceRate = Math.min(100, Math.round((manager.loginCount / maxPossibleLogins) * 100));
    
    return {
      name: manager.name,
      email: manager.email,
      loginCount: manager.loginCount,
      lastLogin: manager.lastLogin,
      attendanceRate: attendanceRate
    };
  });

  // User login activity by day
  const userLogins = await User.aggregate([
    {
      $match: {
        lastLogin: { $gte: startOfWeek, $lte: endOfWeek }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" }
        },
        logins: { $sum: 1 },
        activeUsers: { $addToSet: "$_id" }
      }
    },
    {
      $project: {
        day: "$_id",
        logins: 1,
        activeUsers: { $size: "$activeUsers" }
      }
    },
    {
      $sort: { day: 1 }
    }
  ]);

  // Fill in missing days
  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    daysOfWeek.push(date.toISOString().split('T')[0]);
  }

  const filledUserLogins = daysOfWeek.map(day => {
    const existingDay = userLogins.find(d => d.day === day);
    return existingDay || { day, logins: 0, activeUsers: 0 };
  });

  return {
    startDate: startOfWeek,
    endDate: endOfWeek,
    totalUsers,
    newUsersThisWeek,
    activeUsersThisWeek,
    totalManagers,
    managerAttendance,
    userLogins: filledUserLogins
  };
};

// ==================== MANAGER OPERATIONS ====================

// @desc    Mark manager attendance
// @route   POST /api/users/manager/attendance
// @access  Private/Manager
exports.markManagerAttendance = async (req, res) => {
  try {
    if (req.user.status !== 'manager') {
      return res.status(403).json({
        status: 'error',
        message: 'Only managers can mark attendance'
      });
    }

    // Update last login as attendance mark
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        lastLogin: new Date(),
        $inc: { loginCount: 1 }
      },
      { new: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Attendance marked successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error marking attendance',
      error: error.message
    });
  }
};

// @desc    Get manager dashboard stats
// @route   GET /api/users/manager/dashboard
// @access  Private/Manager
exports.getManagerDashboard = async (req, res) => {
  try {
    // Get basic stats that managers can see
    const totalUsers = await User.countDocuments({ status: 'user' });
    const activeUsers = await User.countDocuments({ 
      status: 'user',
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        activeUsers,
        managerInfo: {
          name: req.user.name,
          lastLogin: req.user.lastLogin,
          loginCount: req.user.loginCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};