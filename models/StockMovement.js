const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Movement Details
  type: {
    type: String,
    required: true,
    enum: ['in', 'out', 'adjustment', 'transfer', 'return']
  },
  quantity: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    required: true
  },
  
  // Source/Destination
  source: {
    type: String,
    enum: ['supplier', 'customer_return', 'warehouse', 'adjustment', 'order'],
    required: true
  },
  destination: {
    type: String,
    enum: ['customer', 'supplier_return', 'warehouse', 'waste', 'order'],
    required: true
  },
  
  // Order Reference (if applicable)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Financial Information
  unitCost: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  
  // Movement Details
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  
  // Additional Information
  reason: String,
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

// Calculate total cost before saving
stockMovementSchema.pre('save', function(next) {
  this.totalCost = this.quantity * this.unitCost;
  next();
});

// Update inventory after stock movement
stockMovementSchema.post('save', async function() {
  try {
    const Inventory = mongoose.model('Inventory');
    const inventory = await Inventory.findOne({ product: this.product });
    
    if (inventory) {
      // Update the inventory value
      await inventory.updateValue();
    }
  } catch (error) {
    console.error('Error updating inventory value:', error);
  }
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);