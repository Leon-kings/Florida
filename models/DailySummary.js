const mongoose = require('mongoose');

const dailySummarySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  
  // Sales Summary
  sales: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalItemsSold: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    }
  },
  
  // Revenue by Category
  revenueByCategory: {
    food: { type: Number, default: 0 },
    alcohol: { type: Number, default: 0 },
    wine: { type: Number, default: 0 },
    cocktail: { type: Number, default: 0 },
    soft_drink: { type: Number, default: 0 },
    dessert: { type: Number, default: 0 }
  },
  
  // Stock Movements
  stock: {
    totalStockIn: { type: Number, default: 0 },
    totalStockOut: { type: Number, default: 0 },
    stockAdjustments: { type: Number, default: 0 },
    waste: { type: Number, default: 0 }
  },
  
  // Financial Summary
  financials: {
    totalCost: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 }
  },
  
  // Popular Items
  topSellingItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    revenue: Number
  }],
  
  // Stock Alerts
  lowStockItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    currentStock: Number,
    reorderPoint: Number
  }],
  
  // System Fields
  generatedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for date queries
dailySummarySchema.index({ date: 1 });

// Static method to get or create today's summary
dailySummarySchema.statics.getTodaysSummary = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let summary = await this.findOne({ date: today });
  
  if (!summary) {
    summary = await this.create({ date: today });
  }
  
  return summary;
};

// Method to update summary with new data
dailySummarySchema.methods.updateSummary = async function() {
  const Order = mongoose.model('Order');
  const StockMovement = mongoose.model('StockMovement');
  const FinancialRecord = mongoose.model('FinancialRecord');
  const Inventory = mongoose.model('Inventory');
  
  const startOfDay = new Date(this.date);
  const endOfDay = new Date(this.date);
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    // Get today's orders
    const todaysOrders = await Order.find({
      'orderDetails.timestamp': {
        $gte: startOfDay,
        $lte: endOfDay
      },
      'orderDetails.status': 'completed'
    });

    // Calculate sales data
    this.sales.totalOrders = todaysOrders.length;
    this.sales.totalRevenue = todaysOrders.reduce((sum, order) => sum + (order.summary?.total || 0), 0);
    this.sales.totalItemsSold = todaysOrders.reduce((sum, order) => 
      sum + (order.cartItems?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    );
    this.sales.averageOrderValue = this.sales.totalOrders > 0 ? 
      this.sales.totalRevenue / this.sales.totalOrders : 0;

    // Calculate revenue by category
    this.revenueByCategory = { food: 0, alcohol: 0, wine: 0, cocktail: 0, soft_drink: 0, dessert: 0 };
    todaysOrders.forEach(order => {
      if (order.cartItems) {
        order.cartItems.forEach(item => {
          const category = item.type || 'food';
          if (this.revenueByCategory[category] !== undefined) {
            this.revenueByCategory[category] += (item.totalPrice || 0);
          }
        });
      }
    });

    // Get stock movements
    const todaysMovements = await StockMovement.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Calculate stock data
    this.stock.totalStockIn = todaysMovements
      .filter(movement => movement.type === 'in')
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0);

    this.stock.totalStockOut = todaysMovements
      .filter(movement => movement.type === 'out')
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0);

    this.stock.stockAdjustments = todaysMovements
      .filter(movement => movement.type === 'adjustment')
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0);

    this.stock.waste = todaysMovements
      .filter(movement => movement.reason?.toLowerCase().includes('waste'))
      .reduce((sum, movement) => sum + (movement.quantity || 0), 0);

    // Get financial records
    const todaysFinancials = await FinancialRecord.find({
      transactionDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // Calculate financial data
    this.financials.totalRevenue = this.sales.totalRevenue;
    this.financials.totalCost = todaysFinancials
      .filter(record => record.recordType === 'sale')
      .reduce((sum, record) => sum + (record.items?.reduce((itemSum, item) => 
        itemSum + ((item.costPrice || 0) * (item.quantity || 0)), 0) || 0), 0);

    this.financials.expenses = todaysFinancials
      .filter(record => ['purchase', 'expense'].includes(record.recordType))
      .reduce((sum, record) => sum + (record.totalAmount || 0), 0);

    this.financials.grossProfit = this.financials.totalRevenue - this.financials.totalCost;
    this.financials.netProfit = this.financials.grossProfit - this.financials.expenses;

    // Get top selling items
    const itemSales = {};
    todaysOrders.forEach(order => {
      if (order.cartItems) {
        order.cartItems.forEach(item => {
          if (!itemSales[item.name]) {
            itemSales[item.name] = {
              name: item.name,
              quantity: 0,
              revenue: 0
            };
          }
          itemSales[item.name].quantity += (item.quantity || 0);
          itemSales[item.name].revenue += (item.totalPrice || 0);
        });
      }
    });

    this.topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Get low stock items
    const lowStockInventory = await Inventory.find({
      stockStatus: 'low_stock'
    }).populate('product', 'name reorderPoint');

    this.lowStockItems = lowStockInventory.map(item => ({
      product: item.product._id,
      name: item.product.name,
      currentStock: item.currentStock,
      reorderPoint: item.product.reorderPoint
    }));

    this.updatedAt = new Date();
    await this.save();
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
};

module.exports = mongoose.model('DailySummary', dailySummarySchema);