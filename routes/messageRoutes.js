const express = require('express');
const {
  createMessage,
  getAllMessages,
  getMessage,
  updateMessageStatus,
  addResponse,
  assignMessage,
  getMessageStats,
  getTodaysMessages,
  getUnreadCount,
  sendDailyMessagesReport,
  deleteMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/', createMessage);

// Protected routes
// router.use(protect);

router.get('/', getAllMessages);
router.get('/today', getTodaysMessages);
router.get('/unread/count', getUnreadCount);
router.get('/stats/overview', getMessageStats);
router.get('/:id', getMessage);
router.put('/:id/status', updateMessageStatus);
router.post('/:id/response', addResponse);
router.put('/:id/assign', assignMessage);
router.post('/reports/daily', sendDailyMessagesReport);
router.delete('/:id', deleteMessage);

module.exports = router;