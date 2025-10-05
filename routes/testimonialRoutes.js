const express = require('express');
const {
  createTestimonial,
  getAllTestimonials,
  getApprovedTestimonials,
  getFeaturedTestimonials,
  getTestimonial,
  updateTestimonial,
  updateTestimonialStatus,
  deleteTestimonial,
  getTestimonialStats,
  getMyTestimonials
} = require('../controllers/testimonialController');
const { protect } = require('../middleware/auth');
const { upload } = require('../cloudinary/cloudinary');

const router = express.Router();

// Public routes
router.get('/', getAllTestimonials);
router.get('/approved', getApprovedTestimonials);
router.get('/featured', getFeaturedTestimonials);
router.get('/:id', getTestimonial);

// Protected routes
// router.use(protect);

router.get('/my/testimonials', getMyTestimonials);
router.post('/create', upload.single('image'), createTestimonial);
router.put('/:id', upload.single('image'), updateTestimonial);
router.delete('/:id', deleteTestimonial);

// Admin routes
router.get('/stats/overview', getTestimonialStats);
router.put('/:id/status', updateTestimonialStatus);

module.exports = router;