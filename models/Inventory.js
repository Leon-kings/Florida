const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  
  // Stock Information
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Stock Limits
  minimumStock: {
    type: Number,
    default: 0
  },
  maximumStock: {
    type: Number,
    default: 1000
  },
  
  // Location Information
  location: {
    warehouse: {
      type: String,
      default: 'main'
    },
    shelf: String,
    section: String
  },
  
  // Stock Value
  totalValue: {
    type: Number,
    default: 0
  },
  averageCost: {
    type: Number,
    default: 0
  },
  
  // Status
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'over_stock'],
    default: 'in_stock'
  },
  
  // System Fields
  lastRestocked: Date,
  lastSold: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate available stock and update status before saving
inventorySchema.pre('save', function(next) {
  this.availableStock = this.currentStock - this.reservedStock;
  
  // Update stock status
  if (this.currentStock === 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.stockStatus = 'low_stock';
  } else if (this.currentStock >= this.maximumStock * 0.9) {
    this.stockStatus = 'over_stock';
  } else {
    this.stockStatus = 'in_stock';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Update total value based on product cost
inventorySchema.methods.updateValue = async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  
  if (product) {
    this.totalValue = this.currentStock * product.costPrice;
    this.averageCost = product.costPrice;
    await this.save();
  }
};

// Static method to find low stock items
inventorySchema.statics.findLowStock = function() {
  return this.find({ stockStatus: 'low_stock' })
    .populate('product', 'name category reorderPoint unit');
};

module.exports = mongoose.model('Inventory', inventorySchema);