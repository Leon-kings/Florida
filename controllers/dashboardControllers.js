const DailySummary = require('../models/DailySummary');
const Order = require('../models/Order');
const StockMovement = require('../models/StockMovement');
const FinancialRecord = require('../models/FinancialRecord');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

// @desc    Get today's dashboard overview
// @route   GET /api/dashboard/today
// @access  Private
exports.getTodayDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get or create today's summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    // Get today's orders for real-time data
    const todaysOrders = await Order.find({
      'orderDetails.timestamp': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ 'orderDetails.timestamp': -1 });

    // Get low stock alerts
    const lowStockItems = await Inventory.find({
      stockStatus: 'low_stock'
    }).populate('product', 'name category reorderPoint unit');

    // Get recent stock movements
    const recentMovements = await StockMovement.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('product', 'name category')
    .sort({ createdAt: -1 })
    .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        date: today,
        summary: dailySummary,
        realTime: {
          pendingOrders: todaysOrders.filter(order => 
            ['pending', 'confirmed', 'preparing'].includes(order.orderDetails.status)
          ).length,
          completedOrders: todaysOrders.filter(order => 
            order.orderDetails.status === 'completed'
          ).length,
          totalOrders: todaysOrders.length
        },
        alerts: {
          lowStock: lowStockItems.length,
          items: lowStockItems.map(item => ({
            product: item.product.name,
            currentStock: item.currentStock,
            reorderPoint: item.product.reorderPoint,
            category: item.product.category,
            unit: item.product.unit
          }))
        },
        recentMovements
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching today\'s dashboard',
      error: error.message
    });
  }
};

// @desc    Get monthly statistics
// @route   GET /api/dashboard/monthly
// @access  Private
exports.getMonthlyStats = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const targetDate = new Date();
    if (year && month) {
      targetDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
    } else {
      targetDate.setDate(1);
    }

    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get all daily summaries for the month
    const monthlySummaries = await DailySummary.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).sort({ date: 1 });

    // Calculate monthly totals
    const monthlyStats = {
      totalRevenue: monthlySummaries.reduce((sum, day) => sum + day.sales.totalRevenue, 0),
      totalOrders: monthlySummaries.reduce((sum, day) => sum + day.sales.totalOrders, 0),
      totalItemsSold: monthlySummaries.reduce((sum, day) => sum + day.sales.totalItemsSold, 0),
      totalStockIn: monthlySummaries.reduce((sum, day) => sum + day.stock.totalStockIn, 0),
      totalStockOut: monthlySummaries.reduce((sum, day) => sum + day.stock.totalStockOut, 0),
      totalProfit: monthlySummaries.reduce((sum, day) => sum + day.financials.netProfit, 0),
      totalExpenses: monthlySummaries.reduce((sum, day) => sum + day.financials.expenses, 0)
    };

    // Revenue by category for the month
    const revenueByCategory = {
      food: monthlySummaries.reduce((sum, day) => sum + day.revenueByCategory.food, 0),
      alcohol: monthlySummaries.reduce((sum, day) => sum + day.revenueByCategory.alcohol, 0),
      wine: monthlySummaries.reduce((sum, day) => sum + day.revenueByCategory.wine, 0),
      cocktail: monthlySummaries.reduce((sum, day) => sum + day.revenueByCategory.cocktail, 0),
      soft_drink: monthlySummaries.reduce((sum, day) => sum + day.revenueByCategory.soft_drink, 0),
      dessert: monthlySummaries.reduce((sum, day) => sum + day.revenueByCategory.dessert, 0)
    };

    // Daily trends
    const dailyTrends = monthlySummaries.map(day => ({
      date: day.date,
      revenue: day.sales.totalRevenue,
      orders: day.sales.totalOrders,
      profit: day.financials.netProfit
    }));

    // Get top selling items for the month
    const allTopItems = monthlySummaries.flatMap(day => day.topSellingItems);
    const monthlyTopItems = allTopItems.reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.name);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    res.status(200).json({
      status: 'success',
      data: {
        period: {
          start: startOfMonth,
          end: endOfMonth,
          month: targetDate.getMonth() + 1,
          year: targetDate.getFullYear()
        },
        summary: monthlyStats,
        revenueByCategory,
        dailyTrends,
        topSellingItems: monthlyTopItems,
        dailyBreakdown: monthlySummaries.map(day => ({
          date: day.date,
          revenue: day.sales.totalRevenue,
          orders: day.sales.totalOrders,
          profit: day.financials.netProfit,
          stockIn: day.stock.totalStockIn,
          stockOut: day.stock.totalStockOut
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching monthly statistics',
      error: error.message
    });
  }
};

// @desc    Get profit & loss statement
// @route   GET /api/dashboard/profit-loss
// @access  Private
exports.getProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get financial records for the period
    const financialRecords = await FinancialRecord.find({
      transactionDate: {
        $gte: start,
        $lte: end
      }
    }).populate('order');

    // Calculate revenue
    const sales = financialRecords.filter(record => record.recordType === 'sale');
    const totalRevenue = sales.reduce((sum, record) => sum + record.totalAmount, 0);

    // Calculate cost of goods sold
    const costOfGoodsSold = sales.reduce((sum, record) => 
      sum + (record.items?.reduce((itemSum, item) => 
        itemSum + ((item.costPrice || 0) * (item.quantity || 0)), 0) || 0), 0
    );

    // Calculate expenses
    const expenses = financialRecords
      .filter(record => ['purchase', 'expense'].includes(record.recordType))
      .reduce((sum, record) => sum + record.totalAmount, 0);

    // Calculate profits
    const grossProfit = totalRevenue - costOfGoodsSold;
    const netProfit = grossProfit - expenses;

    // Revenue by category
    const revenueByCategory = {
      food: 0, alcohol: 0, wine: 0, cocktail: 0, soft_drink: 0, dessert: 0
    };

    sales.forEach(record => {
      if (record.items) {
        record.items.forEach(item => {
          const category = item.name?.toLowerCase().includes('wine') ? 'wine' : 
                          item.name?.toLowerCase().includes('beer') || item.name?.toLowerCase().includes('whiskey') || item.name?.toLowerCase().includes('vodka') ? 'alcohol' :
                          item.name?.toLowerCase().includes('cocktail') ? 'cocktail' :
                          item.name?.toLowerCase().includes('drink') || item.name?.toLowerCase().includes('soda') ? 'soft_drink' :
                          item.name?.toLowerCase().includes('cake') || item.name?.toLowerCase().includes('dessert') ? 'dessert' : 'food';
          
          revenueByCategory[category] = (revenueByCategory[category] || 0) + (item.totalPrice || 0);
        });
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        revenue: {
          total: totalRevenue,
          costOfGoodsSold,
          grossProfit,
          grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        },
        expenses: {
          total: expenses,
          breakdown: {
            purchases: financialRecords
              .filter(record => record.recordType === 'purchase')
              .reduce((sum, record) => sum + record.totalAmount, 0),
            other: financialRecords
              .filter(record => record.recordType === 'expense')
              .reduce((sum, record) => sum + record.totalAmount, 0)
          }
        },
        netProfit: {
          amount: netProfit,
          margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        },
        revenueByCategory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error generating profit & loss statement',
      error: error.message
    });
  }
};

// @desc    Get stock input/output report
// @route   GET /api/dashboard/stock-report
// @access  Private
exports.getStockReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const stockMovements = await StockMovement.find({
      createdAt: {
        $gte: start,
        $lte: end
      }
    })
    .populate('product', 'name category unit')
    .sort({ createdAt: -1 });

    // Categorize movements
    const stockIn = stockMovements.filter(m => m.type === 'in');
    const stockOut = stockMovements.filter(m => m.type === 'out');
    const adjustments = stockMovements.filter(m => m.type === 'adjustment');

    // Calculate totals
    const summary = {
      totalStockIn: stockIn.reduce((sum, m) => sum + m.quantity, 0),
      totalStockOut: stockOut.reduce((sum, m) => sum + m.quantity, 0),
      totalAdjustments: adjustments.reduce((sum, m) => sum + m.quantity, 0),
      totalMovements: stockMovements.length,
      totalCost: stockMovements.reduce((sum, m) => sum + m.totalCost, 0)
    };

    // Group by product
    const productSummary = {};
    stockMovements.forEach(movement => {
      const productId = movement.product._id.toString();
      if (!productSummary[productId]) {
        productSummary[productId] = {
          product: movement.product,
          stockIn: 0,
          stockOut: 0,
          adjustments: 0,
          netChange: 0,
          totalCost: 0
        };
      }

      if (movement.type === 'in') {
        productSummary[productId].stockIn += movement.quantity;
        productSummary[productId].netChange += movement.quantity;
      } else if (movement.type === 'out') {
        productSummary[productId].stockOut += movement.quantity;
        productSummary[productId].netChange -= movement.quantity;
      } else if (movement.type === 'adjustment') {
        productSummary[productId].adjustments += movement.quantity;
        // Adjustments can be positive or negative based on quantity difference
        productSummary[productId].netChange += movement.quantity;
      }

      productSummary[productId].totalCost += movement.totalCost;
    });

    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        summary,
        productSummary: Object.values(productSummary),
        movements: stockMovements
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error generating stock report',
      error: error.message
    });
  }
};

// @desc    Get dashboard overview with all key metrics
// @route   GET /api/dashboard/overview
// @access  Private
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get today's summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    // Get monthly summary
    const monthlySummaries = await DailySummary.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    const monthlyStats = {
      totalRevenue: monthlySummaries.reduce((sum, day) => sum + day.sales.totalRevenue, 0),
      totalOrders: monthlySummaries.reduce((sum, day) => sum + day.sales.totalOrders, 0),
      totalProfit: monthlySummaries.reduce((sum, day) => sum + day.financials.netProfit, 0)
    };

    // Get low stock count
    const lowStockCount = await Inventory.countDocuments({ stockStatus: 'low_stock' });

    // Get out of stock count
    const outOfStockCount = await Inventory.countDocuments({ stockStatus: 'out_of_stock' });

    // Get today's pending orders
    const todaysPendingOrders = await Order.countDocuments({
      'orderDetails.timestamp': {
        $gte: startOfDay,
        $lte: endOfDay
      },
      'orderDetails.status': { $in: ['pending', 'confirmed', 'preparing'] }
    });

    res.status(200).json({
      status: 'success',
      data: {
        today: {
          revenue: dailySummary.sales.totalRevenue,
          orders: dailySummary.sales.totalOrders,
          profit: dailySummary.financials.netProfit,
          pendingOrders: todaysPendingOrders
        },
        month: monthlyStats,
        alerts: {
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          pendingOrders: todaysPendingOrders
        },
        quickStats: {
          totalProducts: await Product.countDocuments(),
          totalInventoryValue: await Inventory.aggregate([
            { $group: { _id: null, total: { $sum: '$totalValue' } } }
          ]).then(result => result[0]?.total || 0),
          monthlyGrowth: await this.calculateMonthlyGrowth()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard overview',
      error: error.message
    });
  }
};

// Helper method to calculate monthly growth
exports.calculateMonthlyGrowth = async function() {
  const currentMonth = new Date();
  const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

  const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  const currentMonthRevenue = await FinancialRecord.aggregate([
    {
      $match: {
        recordType: 'sale',
        transactionDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
        paymentStatus: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  const lastMonthRevenue = await FinancialRecord.aggregate([
    {
      $match: {
        recordType: 'sale',
        transactionDate: { $gte: lastMonthStart, $lte: lastMonthEnd },
        paymentStatus: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  const current = currentMonthRevenue[0]?.total || 0;
  const previous = lastMonthRevenue[0]?.total || 0;

  if (previous === 0) return current > 0 ? 100 : 0;
  
  return ((current - previous) / previous) * 100;
};