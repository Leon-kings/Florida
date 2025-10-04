// const express = require('express');
// const {
//   // Authentication
//   register,
//   login,
//   verifyEmail,
//   getMe,
//   updateMe,
  
//   // CRUD Operations
//   getAllUsers,
//   getUser,
//   createUser,
//   updateUser,
//   deleteUser,
  
//   // Statistics
//   getUserStats,
//   getMonthlySignups,
//   sendWeeklyStatsReport,
  
//   // Manager Operations
//   markManagerAttendance,
//   getManagerDashboard
// } = require('../controllers/userController');
// const { protect, restrictTo } = require('../middleware/auth');

// const router = express.Router();

// // ==================== PUBLIC ROUTES ====================

// router.post('/register', register);
// router.post('/login', login);
// router.get('/verify-email/:token', verifyEmail);

// // ==================== PROTECTED ROUTES ====================

// router.use(protect); // All routes below this middleware are protected

// // Current user routes
// router.get('/me', getMe);
// router.patch('/me', updateMe);

// // Manager routes
// router.post('/manager/attendance', restrictTo('manager'), markManagerAttendance);
// router.get('/manager/dashboard', restrictTo('manager'), getManagerDashboard);

// // Admin routes
// router.use(restrictTo('admin'));

// router.get('/', getAllUsers);
// router.get('/stats', getUserStats);
// router.get('/stats/monthly-signups', getMonthlySignups);
// router.post('/stats/send-weekly-report', sendWeeklyStatsReport);
// router.get('/:id', getUser);
// router.post('/', createUser);
// router.patch('/:id', updateUser);
// router.delete('/:id', deleteUser);

// module.exports = router;
const express = require('express');
const {
  // Authentication
  register,
  login,
  verifyEmail,
  getMe,
  updateMe,
  
  // CRUD Operations
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  
  // Statistics
  getUserStats,
  getMonthlySignups,
  sendWeeklyStatsReport,
  
  // Manager Operations
  markManagerAttendance,
  getManagerDashboard
} = require('../controllers/userController');
// const { protect } = require('../middleware/auth'); // Removed restrictTo import

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);

// ==================== PROTECTED ROUTES ====================

// router.use(protect); // All routes below this middleware are protected

// Current user routes
router.get('/me', getMe);
router.patch('/me', updateMe);

// Manager routes - removed restrictTo
router.post('/manager/attendance', markManagerAttendance);
router.get('/manager/dashboard', getManagerDashboard);

// Admin routes - removed restrictTo
router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/stats/monthly-signups', getMonthlySignups);
router.post('/stats/send-weekly-report', sendWeeklyStatsReport);
router.get('/:id', getUser);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;