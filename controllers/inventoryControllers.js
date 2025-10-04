const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Order = require('../models/Order');
const DailySummary = require('../models/DailySummary');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category,
      lowStock 
    } = req.query;
    
    const query = {};
    if (status) query.stockStatus = status;
    if (lowStock === 'true') query.stockStatus = 'low_stock';

    const inventory = await Inventory.find(query)
      .populate('product')
      .sort({ 'product.name': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by category if specified
    let filteredInventory = inventory;
    if (category) {
      filteredInventory = inventory.filter(item => 
        item.product && item.product.category === category
      );
    }

    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: filteredInventory.length,
      data: {
        inventory: filteredInventory,
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
      message: 'Error fetching inventory',
      error: error.message
    });
  }
};

// @desc    Get inventory item by product ID
// @route   GET /api/inventory/product/:productId
// @access  Private
exports.getInventoryByProduct = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ 
      product: req.params.productId 
    }).populate('product');

    if (!inventory) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        inventory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching inventory item',
      error: error.message
    });
  }
};

// @desc    Simple stock in - Add stock to inventory
// @route   POST /api/inventory/stock-in
// @access  Private
exports.simpleStockIn = async (req, res) => {
  try {
    const { productId, quantity, costPrice, supplier, notes } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID and quantity are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Find or create inventory
    let inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      inventory = await Inventory.create({
        product: productId,
        currentStock: 0
      });
    }

    const previousStock = inventory.currentStock;
    inventory.currentStock += quantity;
    inventory.lastRestocked = new Date();
    await inventory.save();

    // Update product cost price if provided
    if (costPrice && costPrice !== product.costPrice) {
      product.costPrice = costPrice;
      await product.save();
    }

    // Create stock movement record
    const movement = await StockMovement.create({
      product: productId,
      type: 'in',
      quantity: quantity,
      reference: `STOCK-IN-${Date.now()}`,
      source: 'supplier',
      destination: 'warehouse',
      unitCost: costPrice || product.costPrice,
      totalCost: quantity * (costPrice || product.costPrice),
      previousStock,
      newStock: inventory.currentStock,
      reason: 'Stock purchase',
      notes: notes || `Added ${quantity} ${product.unit} of ${product.name}`,
      createdBy: req.user?.id
    });

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(200).json({
      status: 'success',
      message: `Stock added successfully for ${product.name}`,
      data: {
        product: product.name,
        quantityAdded: quantity,
        previousStock,
        newStock: inventory.currentStock,
        movement
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error adding stock',
      error: error.message
    });
  }
};

// @desc    Simple stock out - Remove stock (for waste, damage, etc.)
// @route   POST /api/inventory/stock-out
// @access  Private
exports.simpleStockOut = async (req, res) => {
  try {
    const { productId, quantity, reason, notes } = req.body;

    if (!productId || !quantity || !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID, quantity, and reason are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory not found for this product'
      });
    }

    if (inventory.currentStock < quantity) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient stock. Available: ${inventory.currentStock}, Requested: ${quantity}`
      });
    }

    const previousStock = inventory.currentStock;
    inventory.currentStock -= quantity;
    await inventory.save();

    // Create stock movement record
    const movement = await StockMovement.create({
      product: productId,
      type: 'out',
      quantity: quantity,
      reference: `STOCK-OUT-${Date.now()}`,
      source: 'warehouse',
      destination: 'waste',
      unitCost: product.costPrice,
      totalCost: quantity * product.costPrice,
      previousStock,
      newStock: inventory.currentStock,
      reason: reason,
      notes: notes || `Removed ${quantity} ${product.unit} of ${product.name} due to ${reason}`,
      createdBy: req.user?.id
    });

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(200).json({
      status: 'success',
      message: `Stock removed successfully for ${product.name}`,
      data: {
        product: product.name,
        quantityRemoved: quantity,
        previousStock,
        newStock: inventory.currentStock,
        reason,
        movement
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error removing stock',
      error: error.message
    });
  }
};

// @desc    Quick stock adjustment
// @route   POST /api/inventory/quick-adjust
// @access  Private
exports.quickStockAdjust = async (req, res) => {
  try {
    const { productId, newQuantity, reason } = req.body;

    if (!productId || newQuantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID and new quantity are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    let inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      inventory = await Inventory.create({
        product: productId,
        currentStock: 0
      });
    }

    const previousStock = inventory.currentStock;
    const quantityDifference = newQuantity - previousStock;
    
    inventory.currentStock = newQuantity;
    await inventory.save();

    // Create stock movement record for adjustment
    const movement = await StockMovement.create({
      product: productId,
      type: 'adjustment',
      quantity: Math.abs(quantityDifference),
      reference: `ADJ-${Date.now()}`,
      source: 'adjustment',
      destination: 'warehouse',
      unitCost: product.costPrice,
      totalCost: Math.abs(quantityDifference) * product.costPrice,
      previousStock,
      newStock: newQuantity,
      reason: reason || 'Stock adjustment',
      notes: `Stock adjusted from ${previousStock} to ${newQuantity}`,
      createdBy: req.user?.id
    });

    res.status(200).json({
      status: 'success',
      message: `Stock adjusted successfully for ${product.name}`,
      data: {
        product: product.name,
        previousStock,
        newStock: newQuantity,
        adjustment: quantityDifference,
        movement
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error adjusting stock',
      error: error.message
    });
  }
};

// @desc    Bulk stock in for multiple products
// @route   POST /api/inventory/bulk-stock-in
// @access  Private
exports.bulkStockIn = async (req, res) => {
  try {
    const { items, supplier, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Items array is required and cannot be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const { productId, quantity, costPrice } = item;

        if (!productId || !quantity) {
          errors.push(`Missing productId or quantity for item: ${JSON.stringify(item)}`);
          continue;
        }

        const product = await Product.findById(productId);
        if (!product) {
          errors.push(`Product not found: ${productId}`);
          continue;
        }

        let inventory = await Inventory.findOne({ product: productId });
        if (!inventory) {
          inventory = await Inventory.create({
            product: productId,
            currentStock: 0
          });
        }

        const previousStock = inventory.currentStock;
        inventory.currentStock += quantity;
        inventory.lastRestocked = new Date();
        await inventory.save();

        // Update product cost price if provided
        if (costPrice && costPrice !== product.costPrice) {
          product.costPrice = costPrice;
          await product.save();
        }

        // Create stock movement record
        const movement = await StockMovement.create({
          product: productId,
          type: 'in',
          quantity: quantity,
          reference: `BULK-IN-${Date.now()}`,
          source: 'supplier',
          destination: 'warehouse',
          unitCost: costPrice || product.costPrice,
          totalCost: quantity * (costPrice || product.costPrice),
          previousStock,
          newStock: inventory.currentStock,
          reason: 'Bulk stock purchase',
          notes: notes || `Added ${quantity} ${product.unit} of ${product.name}`,
          createdBy: req.user?.id
        });

        results.push({
          product: product.name,
          quantity,
          previousStock,
          newStock: inventory.currentStock,
          success: true
        });

      } catch (error) {
        errors.push(`Error processing ${item.productId}: ${error.message}`);
      }
    }

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(200).json({
      status: 'success',
      message: `Bulk stock in completed with ${results.length} successes and ${errors.length} errors`,
      data: {
        processed: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing bulk stock in',
      error: error.message
    });
  }
};

// @desc    Get daily stock movements
// @route   GET /api/inventory/movements/daily
// @access  Private
exports.getDailyMovements = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const movements = await StockMovement.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('product', 'name category unit')
    .sort({ createdAt: -1 });

    // Calculate summary
    const summary = {
      stockIn: movements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0),
      stockOut: movements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0),
      adjustments: movements.filter(m => m.type === 'adjustment').reduce((sum, m) => sum + m.quantity, 0),
      totalMovements: movements.length
    };

    res.status(200).json({
      status: 'success',
      data: {
        date: targetDate,
        summary,
        movements,
        total: movements.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching daily movements',
      error: error.message
    });
  }
};

// @desc    Get low stock alerts
// @route   GET /api/inventory/alerts/low-stock
// @access  Private
exports.getLowStockAlerts = async (req, res) => {
  try {
    const lowStockItems = await Inventory.findLowStock();
    
    res.status(200).json({
      status: 'success',
      results: lowStockItems.length,
      data: {
        alerts: lowStockItems
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching low stock alerts',
      error: error.message
    });
  }
};

// @desc    Get inventory statistics
// @route   GET /api/inventory/stats/overview
// @access  Private
exports.getInventoryStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalInventory = await Inventory.countDocuments();
    
    const stockStatus = await Inventory.aggregate([
      {
        $group: {
          _id: '$stockStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalInventoryValue = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);

    const categoryStats = await Inventory.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $group: {
          _id: '$product.category',
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          averageStock: { $avg: '$currentStock' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalProducts,
        totalInventory,
        stockStatus,
        totalValue: totalInventoryValue[0]?.totalValue || 0,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching inventory statistics',
      error: error.message
    });
  }
};

// @desc    Process order and update inventory
// @route   POST /api/inventory/process-order/:orderId
// @access  Private
exports.processOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    if (order.orderDetails.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Order already completed'
      });
    }

    const stockMovements = [];
    const errors = [];

    // Process each item in the order
    for (const item of order.cartItems) {
      try {
        // Find product by name or ID
        const product = await Product.findOne({ 
          $or: [
            { _id: item.id },
            { name: item.name }
          ]
        });

        if (!product) {
          errors.push(`Product not found: ${item.name}`);
          continue;
        }

        const inventory = await Inventory.findOne({ product: product._id });
        
        if (!inventory) {
          errors.push(`Inventory not found for product: ${item.name}`);
          continue;
        }

        if (inventory.currentStock < item.quantity) {
          errors.push(`Insufficient stock for: ${item.name}. Available: ${inventory.currentStock}, Required: ${item.quantity}`);
          continue;
        }

        // Update inventory
        const previousStock = inventory.currentStock;
        inventory.currentStock -= item.quantity;
        inventory.lastSold = new Date();
        await inventory.save();

        // Create stock movement
        const movement = await StockMovement.create({
          product: product._id,
          type: 'out',
          quantity: item.quantity,
          reference: order.orderDetails.orderId,
          source: 'order',
          destination: 'customer',
          order: order._id,
          unitCost: product.costPrice,
          totalCost: item.quantity * product.costPrice,
          previousStock,
          newStock: inventory.currentStock,
          reason: 'Order fulfillment',
          createdBy: req.user?.id
        });

        stockMovements.push(movement);
      } catch (error) {
        errors.push(`Error processing ${item.name}: ${error.message}`);
      }
    }

    if (errors.length > 0 && stockMovements.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to process order',
        errors
      });
    }

    // Update order status if at least some items were processed
    if (stockMovements.length > 0) {
      order.orderDetails.status = 'completed';
      await order.save();
    }

    // Update daily summary
    const dailySummary = await DailySummary.getTodaysSummary();
    await dailySummary.updateSummary();

    res.status(200).json({
      status: 'success',
      message: `Order processed with ${stockMovements.length} items successful, ${errors.length} errors`,
      data: {
        processedItems: stockMovements.length,
        errors: errors.length > 0 ? errors : undefined,
        stockMovements
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error processing order',
      error: error.message
    });
  }
};