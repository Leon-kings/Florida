const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  image: {
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  email: {
    type: String,
    required: [true, 'Email is required']
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
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