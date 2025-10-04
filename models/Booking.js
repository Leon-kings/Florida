const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  service: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['fine-dining', 'chef-table', 'wine-pairing', 'private-events', 'catering']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  guests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'At least 1 guest is required'],
    max: [10, 'Maximum 10 guests allowed'] // Updated to match your frontend which shows 1-10 guests
  },
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
    required: [true, 'Phone number is required'],
    trim: true
  },
  specialRequests: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for better query performance
bookingSchema.index({ date: 1, time: 1 });
bookingSchema.index({ email: 1 });

module.exports = mongoose.model('Booking', bookingSchema);