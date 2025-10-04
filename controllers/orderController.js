const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Create new order
// @route   POST /api/orders
// @access  Public
exports.createOrder = async (req, res) => {
  try {
    const { 
      orderDetails, 
      customerInfo, 
      cartItems, 
      summary,
      deliveryInfo 
    } = req.body;

    // Validate required fields
    if (!customerInfo?.name || !customerInfo?.phone || !customerInfo?.location) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name, phone, and location are required'
      });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cart items are required'
      });
    }

    // Create order
    const order = await Order.create({
      orderDetails: {
        ...orderDetails,
        orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      customerInfo,
      cartItems,
      summary: {
        ...summary,
        itemCount: cartItems.length
      },
      deliveryInfo,
      createdBy: req.user?.id
    });

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating order',
      error: error.message
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      date,
      customerPhone 
    } = req.query;
    
    // Build query
    const query = {};
    if (status) query['orderDetails.status'] = status;
    if (customerPhone) query['customerInfo.phone'] = customerPhone;
    
    // Date filter
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query['orderDetails.timestamp'] = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ 'orderDetails.timestamp': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: {
        orders,
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
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// @desc    Get orders by customer phone
// @route   GET /api/orders/customer/:phone
// @access  Private
exports.getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await Order.find({ 'customerInfo.phone': req.params.phone })
      .populate('createdBy', 'name email')
      .sort({ 'orderDetails.timestamp': -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: {
        orders
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching customer orders',
      error: error.message
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const previousStatus = order.orderDetails.status;
    order.orderDetails.status = status;
    
    if (notes) {
      order.customerInfo.notes = notes;
    }
    
    await order.save();

    res.status(200).json({
      status: 'success',
      message: `Order status updated to ${status}`,
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// @desc    Update payment status
// @route   PATCH /api/orders/:id/payment
// @access  Private
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    order.orderDetails.paymentStatus = paymentStatus;
    if (paymentMethod) {
      order.orderDetails.paymentMethod = paymentMethod;
    }
    
    await order.save();

    res.status(200).json({
      status: 'success',
      message: `Payment status updated to ${paymentStatus}`,
      data: {
        order
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating payment status',
      error: error.message
    });
  }
};

// @desc    Get today's orders
// @route   GET /api/orders/today
// @access  Private
exports.getTodaysOrders = async (req, res) => {
  try {
    const orders = await Order.getTodaysOrders()
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: {
        orders
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching today\'s orders',
      error: error.message
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats/overview
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Date range
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Total orders and revenue
    const totalStats = await Order.aggregate([
      {
        $match: {
          'orderDetails.timestamp': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$summary.total' },
          averageOrderValue: { $avg: '$summary.total' }
        }
      }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $match: {
          'orderDetails.timestamp': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$orderDetails.status',
          count: { $sum: 1 },
          revenue: { $sum: '$summary.total' }
        }
      }
    ]);

    // Popular items
    const popularItems = await Order.aggregate([
      {
        $match: {
          'orderDetails.timestamp': { $gte: start, $lte: end }
        }
      },
      { $unwind: '$cartItems' },
      {
        $group: {
          _id: '$cartItems.name',
          name: { $first: '$cartItems.name' },
          quantity: { $sum: '$cartItems.quantity' },
          revenue: { $sum: '$cartItems.totalPrice' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);

    // Daily orders for the period
    const dailyOrders = await Order.aggregate([
      {
        $match: {
          'orderDetails.timestamp': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$orderDetails.timestamp' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$summary.total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const stats = totalStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        ...stats,
        ordersByStatus,
        popularItems,
        dailyOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching order statistics',
      error: error.message
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Order deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting order',
      error: error.message
    });
  }
};