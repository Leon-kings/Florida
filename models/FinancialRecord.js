const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema({
  // Record Identification
  recordType: {
    type: String,
    required: true,
    enum: ['sale', 'purchase', 'expense', 'revenue', 'adjustment']
  },
  reference: {
    type: String,
    required: true
  },
  
  // Order Reference (if applicable)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Financial Details
  amount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'credit'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Product/Service Details
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    costPrice: Number,
    profit: Number
  }],
  
  // Customer/Supplier Information
  party: {
    name: String,
    type: {
      type: String,
      enum: ['customer', 'supplier', 'internal']
    },
    contact: String
  },
  
  // Date Information
  transactionDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  
  // Additional Information
  description: String,
  category: String,
  notes: String,
  
  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate totals before saving
financialRecordSchema.pre('save', function(next) {
  this.totalAmount = this.amount + this.tax;
  
  // Calculate item profits
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      if (item.unitPrice && item.costPrice && item.quantity) {
        item.profit = (item.unitPrice - item.costPrice) * item.quantity;
      }
    });
  }
  next();
});

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);