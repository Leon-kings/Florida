const FinancialRecord = require('../models/FinancialRecord');
const Order = require('../models/Order');
const StockMovement = require('../models/StockMovement');
const DailySummary = require('../models/DailySummary');

// @desc    Create financial record from order
// @route   POST /api/financial/records/from-order/:orderId
// @access  Private
exports.createRecordFromOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check if record already exists
    const existingRecord = await FinancialRecord.findOne({ order: order._id });
    if (existingRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Financial record already exists for this order'
      });
    }

    // Calculate cost of goods sold
    const itemsWithCost = await Promise.all(
      order.cartItems.map(async (item) => {
        // Find the product to get cost price
        const stockMovement = await StockMovement.findOne({
          order: order._id,
          'product': item.id
        });

        const costPrice = stockMovement ? stockMovement.unitCost : 0;

        return {
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.totalPrice,
          costPrice: costPrice,
          profit: (item.price - costPrice) * item.quantity
        };
      })
    );

    const totalCost = itemsWithCost.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalProfit = itemsWithCost.reduce((sum, item) => sum + item.profit, 0);

    const financialRecord = await FinancialRecord.create({
      recordType: 'sale',
      reference: order.orderDetails.orderId,
      order: order._id,
      amount: order.summary.subtotal,
      tax: order.summary.tax,
      totalAmount: order.summary.total,
      paymentMethod: order.orderDetails.paymentMethod,
      paymentStatus: order.orderDetails.paymentStatus,
      items: itemsWithCost,
      party: {
        name: order.customerInfo.name,
        type: 'customer',
        contact: order.customerInfo.phone
      },
      description: `Order ${order.orderDetails.orderId}`,
      category: 'food_sales',
      transactionDate: order.orderDetails.timestamp,
      createdBy: req.user?.id
    });

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(201).json({
      status: 'success',
      message: 'Financial record created successfully',
      data: {
        record: financialRecord,
        summary: {
          totalRevenue: order.summary.total,
          totalCost,
          totalProfit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating financial record',
      error: error.message
    });
  }
};

// @desc    Get financial records
// @route   GET /api/financial/records
// @access  Private
exports.getFinancialRecords = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      startDate, 
      endDate 
    } = req.query;
    
    const query = {};
    if (type) query.recordType = type;
    
    // Date range
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const records = await FinancialRecord.find(query)
      .populate('order')
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FinancialRecord.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: records.length,
      data: {
        records,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching financial records',
      error: error.message
    });
  }
};

// @desc    Get financial dashboard statistics
// @route   GET /api/financial/stats/dashboard
// @access  Private
exports.getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Revenue statistics
    const revenueStats = await FinancialRecord.aggregate([
      {
        $match: {
          recordType: 'sale',
          transactionDate: { $gte: start, $lte: end },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 },
          averageSale: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Expense statistics
    const expenseStats = await FinancialRecord.aggregate([
      {
        $match: {
          recordType: { $in: ['purchase', 'expense'] },
          transactionDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // Profit calculation
    const costStats = await FinancialRecord.aggregate([
      {
        $match: {
          recordType: 'sale',
          transactionDate: { $gte: start, $lte: end },
          paymentStatus: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
          totalProfit: { $sum: '$items.profit' }
        }
      }
    ]);

    // Daily revenue
    const dailyRevenue = await FinancialRecord.aggregate([
      {
        $match: {
          recordType: 'sale',
          transactionDate: { $gte: start, $lte: end },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' }
          },
          revenue: { $sum: '$totalAmount' },
          sales: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, totalSales: 0, averageSale: 0 };
    const expenses = expenseStats[0] || { totalExpenses: 0, totalTransactions: 0 };
    const costs = costStats[0] || { totalCost: 0, totalProfit: 0 };

    const netProfit = revenue.totalRevenue - expenses.totalExpenses;

    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        revenue: {
          total: revenue.totalRevenue,
          salesCount: revenue.totalSales,
          average: revenue.averageSale
        },
        costs: {
          cogs: costs.totalCost,
          expenses: expenses.totalExpenses,
          grossProfit: costs.totalProfit,
          netProfit
        },
        dailyRevenue,
        profitMargin: revenue.totalRevenue > 0 ? (netProfit / revenue.totalRevenue) * 100 : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching financial statistics',
      error: error.message
    });
  }
};

// @desc    Create expense record
// @route   POST /api/financial/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    const { amount, description, category, paymentMethod, notes } = req.body;

    if (!amount || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount and description are required'
      });
    }

    const financialRecord = await FinancialRecord.create({
      recordType: 'expense',
      reference: `EXP-${Date.now()}`,
      amount: amount,
      totalAmount: amount,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'completed',
      description: description,
      category: category || 'operating_expense',
      notes: notes,
      transactionDate: new Date(),
      createdBy: req.user?.id
    });

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(201).json({
      status: 'success',
      message: 'Expense recorded successfully',
      data: {
        record: financialRecord
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating expense record',
      error: error.message
    });
  }
};

// @desc    Create purchase record
// @route   POST /api/financial/purchases
// @access  Private
exports.createPurchase = async (req, res) => {
  try {
    const { amount, description, supplier, items, paymentMethod, notes } = req.body;

    if (!amount || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount and description are required'
      });
    }

    const financialRecord = await FinancialRecord.create({
      recordType: 'purchase',
      reference: `PUR-${Date.now()}`,
      amount: amount,
      totalAmount: amount,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'completed',
      items: items,
      party: {
        name: supplier,
        type: 'supplier'
      },
      description: description,
      category: 'inventory_purchase',
      notes: notes,
      transactionDate: new Date(),
      createdBy: req.user?.id
    });

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(201).json({
      status: 'success',
      message: 'Purchase recorded successfully',
      data: {
        record: financialRecord
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating purchase record',
      error: error.message
    });
  }
};