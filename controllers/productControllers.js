const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      createdBy: req.user?.id
    });

    // Create initial inventory record
    await Inventory.create({
      product: product._id,
      currentStock: 0,
      minimumStock: req.body.reorderPoint || 0,
      maximumStock: req.body.optimalStock || 1000
    });

    await product.populate('createdBy', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: {
        product
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating product',
      error: error.message
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      type,
      active 
    } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (type) query.type = type;
    if (active !== undefined) query.isActive = active === 'true';

    const products = await Product.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: products.length,
      data: {
        products,
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
      message: 'Error fetching products',
      error: error.message
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Get inventory for this product
    const inventory = await Inventory.findOne({ product: product._id });

    res.status(200).json({
      status: 'success',
      data: {
        product: {
          ...product.toObject(),
          inventory
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching product',
      error: error.message
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: {
        product
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating product',
      error: error.message
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Also delete associated inventory
    await Inventory.deleteOne({ product: req.params.id });

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting product',
      error: error.message
    });
  }
};


exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const products = await Product.find({ 
      category,
      isActive: true 
    })
    .sort({ name: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Product.countDocuments({ category, isActive: true });

    res.status(200).json({
      status: 'success',
      results: products.length,
      data: {
        products,
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
      message: 'Error fetching products by category',
      error: error.message
    });
  }
};