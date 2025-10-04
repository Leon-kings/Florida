const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order Details
  orderDetails: {
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['mobile_money', 'cash', 'card', 'bank_transfer'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  },
  
  // Customer Information
  customerInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true
    }
  },
  
  // Cart Items
  cartItems: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    totalPrice: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['food', 'alcohol', 'soft_drink', 'wine', 'cocktail', 'dessert'],
      default: 'food'
    },
    image: {
      type: String
    },
    customizations: {
      type: Map,
      of: String
    }
  }],
  
  // Order Summary
  summary: {
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      default: 0
    },
    serviceCharge: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    itemCount: {
      type: Number,
      required: true
    }
  },
  
  // Delivery Information
  deliveryInfo: {
    deliveryTime: Date,
    estimatedDelivery: Date,
    deliveryAddress: String,
    deliveryInstructions: String
  },
  
  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate order ID before saving
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.orderDetails.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status) {
  return this.find({ 'orderDetails.status': status }).sort({ 'orderDetails.timestamp': -1 });
};

// Static method to get orders by customer phone
orderSchema.statics.getOrdersByCustomer = function(phone) {
  return this.find({ 'customerInfo.phone': phone }).sort({ 'orderDetails.timestamp': -1 });
};

// Static method to get today's orders
orderSchema.statics.getTodaysOrders = function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    'orderDetails.timestamp': {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).sort({ 'orderDetails.timestamp': -1 });
};

// Instance method to calculate ETA
orderSchema.methods.calculateETA = function() {
  const statusTimes = {
    pending: 5,
    confirmed: 10,
    preparing: 20,
    ready: 5,
    completed: 0
  };
  
  return statusTimes[this.orderDetails.status] || 0;
};

module.exports = mongoose.model('Order', orderSchema);