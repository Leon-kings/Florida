const express = require('express');
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  updatePreferences,
  getSubscriptions,
  getSubscription,
  deleteSubscription
} = require('../controllers/subscriptionController');

// Public routes
router.post('/', subscribe);
router.put('/unsubscribe', unsubscribe);
router.put('/preferences', updatePreferences);
router.get('/:email', getSubscription);

// Admin routes
router.get('/', getSubscriptions);
router.delete('/:id', deleteSubscription);

module.exports = router;