const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Product Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'alcohol', 'soft_drink', 'wine', 'cocktail', 'dessert', 'ingredient', 'supply'],
    default: 'food'
  },
  subCategory: {
    type: String,
    trim: true
  },
  
  // Pricing Information
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  
  // Product Details
  unit: {
    type: String,
    required: true,
    enum: ['bottle', 'can', 'glass', 'shot', 'piece', 'kg', 'gram', 'liter', 'ml', 'pack'],
    default: 'piece'
  },
  unitSize: {
    type: Number,
    default: 1
  },
  sizeUnit: {
    type: String,
    enum: ['ml', 'cl', 'l', 'oz'],
    default: 'ml'
  },
  
  // Alcohol Specific Fields
  alcoholContent: {
    type: Number,
    min: 0,
    max: 100
  },
  brand: String,
  vintage: Number,
  country: String,
  
  // Stock Information
  reorderPoint: {
    type: Number,
    default: 0
  },
  optimalStock: {
    type: Number,
    default: 0
  },
  
  // Media
  image: String,
  barcode: String,
  
  // Supplier Information
  supplier: {
    name: String,
    contact: String,
    email: String,
    phone: String
  },
  
  // Product Status
  isActive: {
    type: Boolean,
    default: true
  },
  isTaxable: {
    type: Boolean,
    default: true
  },
  
  // System Fields
  createdBy: {
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

// Calculate profit margin before saving
productSchema.pre('save', function(next) {
  if (this.costPrice > 0 && this.sellingPrice > 0) {
    this.profitMargin = ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
  }
  this.updatedAt = Date.now();
  next();
});

// Generate SKU before saving
productSchema.pre('save', function(next) {
  if (this.isNew && !this.sku) {
    const categoryMap = {
      'alcohol': 'ALC',
      'wine': 'WIN',
      'cocktail': 'CKTL',
      'soft_drink': 'SDRK',
      'food': 'FOOD',
      'dessert': 'DSRT',
      'ingredient': 'INGR',
      'supply': 'SUPP'
    };
    const prefix = categoryMap[this.category] || 'PROD';
    this.sku = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
  }
  next();
});

// Static method to find low stock products
productSchema.statics.findLowStock = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'inventories',
        localField: '_id',
        foreignField: 'product',
        as: 'inventory'
      }
    },
    {
      $unwind: '$inventory'
    },
    {
      $match: {
        $expr: {
          $lte: ['$inventory.currentStock', '$reorderPoint']
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Product', productSchema);