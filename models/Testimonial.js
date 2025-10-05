const mongoose = require('mongoose');

// In your Testimonial model
const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    default: "Customer"
  },
  content: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  email: {
    type: String,
    required: true
  },
  image: {
    public_id: String,
    url: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make this optional
  }
}, {
  timestamps: true
});

// Update updatedAt before saving
testimonialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get approved testimonials
testimonialSchema.statics.getApprovedTestimonials = function() {
  return this.find({ status: 'approved' }).sort({ createdAt: -1 });
};

// Static method to get featured testimonials
testimonialSchema.statics.getFeaturedTestimonials = function() {
  return this.find({ status: 'approved', featured: true }).sort({ createdAt: -1 });
};

// Static method to get testimonials by status
testimonialSchema.statics.getTestimonialsByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Testimonial', testimonialSchema);