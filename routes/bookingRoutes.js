// const express = require('express');
// const router = express.Router();
// const bookingController = require('../controllers/bookingController');

// // Public routes
// router.post('/', bookingController.createBooking);
// router.get('/:date', bookingController.getAvailableSlots);

// // Admin routes (you can add auth middleware later)
// router.get('/', bookingController.getAllBookings);
// router.get('/:id', bookingController.getBookingById);
// router.put('/:id/status', bookingController.updateBookingStatus);
// router.delete('/:id', bookingController.deleteBooking);

// module.exports = router;
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
// const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/', bookingController.createBooking);
router.get('/available-slots/:date', bookingController.getAvailableSlots);
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Booking routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Protected admin routes
router.get('/', bookingController.getAllBookings);
router.get('/stats', bookingController.getBookingStats);
router.get('/monthly-overview', bookingController.getMonthlyOverview);
router.get('/:id', bookingController.getBookingById);
router.put('/:id/status', bookingController.updateBookingStatus);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;