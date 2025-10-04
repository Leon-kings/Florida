const Testimonial = require('../models/Testimonial');
const { deleteImage } = require('../cloudinary/cloudinary');
const { 
  sendTestimonialConfirmation, 
  sendTestimonialApproval, 
  sendTestimonialRejection 
} = require('../mails/sendEmail');

// @desc    Create testimonial
// @route   POST /api/testimonials
// @access  Private
exports.createTestimonial = async (req, res) => {
  try {
    const { name, role, content, rating, email, image } = req.body;

    let imageData = {};
    
    // Check if image was uploaded via file or provided as URL
    if (req.file) {
      // File upload
      imageData = {
        public_id: req.file.filename,
        url: req.file.path
      };
    } else if (image) {
      // URL provided (from frontend)
      imageData = {
        public_id: null, // or generate a custom ID
        url: image
      };
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Image is required'
      });
    }

    // Create testimonial
    const testimonial = await Testimonial.create({
      name,
      role,
      content,
      rating: parseInt(rating),
      email,
      image: imageData,
      createdBy: req.user.id
    });

    // Send confirmation email
    await sendTestimonialConfirmation(testimonial);

    res.status(201).json({
      status: 'success',
      message: 'Testimonial created successfully. Confirmation email sent.',
      data: {
        testimonial
      }
    });
  } catch (error) {
    // Delete uploaded image if testimonial creation fails
    if (req.file) {
      await deleteImage(req.file.filename);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error creating testimonial',
      error: error.message
    });
  }
};

// @desc    Get all testimonials
// @route   GET /api/testimonials
// @access  Public
exports.getAllTestimonials = async (req, res) => {
  try {
    const { status, featured, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (featured !== undefined) query.featured = featured === 'true';
    
    // Execute query with pagination
    const testimonials = await Testimonial.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Testimonial.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: testimonials.length,
      data: {
        testimonials,
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
      message: 'Error fetching testimonials',
      error: error.message
    });
  }
};

// @desc    Get approved testimonials
// @route   GET /api/testimonials/approved
// @access  Public
exports.getApprovedTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.getApprovedTestimonials()
      .populate('createdBy', 'name email');

    res.status(200).json({
      status: 'success',
      results: testimonials.length,
      data: {
        testimonials
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching approved testimonials',
      error: error.message
    });
  }
};

// @desc    Get featured testimonials
// @route   GET /api/testimonials/featured
// @access  Public
exports.getFeaturedTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.getFeaturedTestimonials()
      .populate('createdBy', 'name email');

    res.status(200).json({
      status: 'success',
      results: testimonials.length,
      data: {
        testimonials
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching featured testimonials',
      error: error.message
    });
  }
};

// @desc    Get testimonial by ID
// @route   GET /api/testimonials/:id
// @access  Public
exports.getTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!testimonial) {
      return res.status(404).json({
        status: 'error',
        message: 'Testimonial not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        testimonial
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching testimonial',
      error: error.message
    });
  }
};

// @desc    Update testimonial
// @route   PATCH /api/testimonials/:id
// @access  Private
exports.updateTestimonial = async (req, res) => {
  try {
    const { name, role, content, rating, email, featured } = req.body;
    
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        status: 'error',
        message: 'Testimonial not found'
      });
    }

    // Check if user is the creator or admin
    if (testimonial.createdBy.toString() !== req.user.id && req.user.status !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own testimonials'
      });
    }

    // Update fields
    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (content) updateData.content = content;
    if (rating) updateData.rating = parseInt(rating);
    if (email) updateData.email = email;
    if (featured !== undefined && req.user.status === 'admin') {
      updateData.featured = featured;
    }

    // Handle image update if new file is uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      await deleteImage(testimonial.image.public_id);
      
      updateData.image = {
        public_id: req.file.filename,
        url: req.file.path
      };
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.status(200).json({
      status: 'success',
      data: {
        testimonial: updatedTestimonial
      }
    });
  } catch (error) {
    // Delete new uploaded image if update fails
    if (req.file) {
      await deleteImage(req.file.filename);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error updating testimonial',
      error: error.message
    });
  }
};

// @desc    Update testimonial status (Admin only)
// @route   PATCH /api/testimonials/:id/status
// @access  Private/Admin
exports.updateTestimonialStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        status: 'error',
        message: 'Testimonial not found'
      });
    }

    testimonial.status = status;
    await testimonial.save();

    // Send appropriate email based on status
    if (status === 'approved') {
      await sendTestimonialApproval(testimonial);
    } else if (status === 'rejected') {
      await sendTestimonialRejection(testimonial, reason);
    }

    res.status(200).json({
      status: 'success',
      message: `Testimonial ${status} successfully`,
      data: {
        testimonial
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating testimonial status',
      error: error.message
    });
  }
};

// @desc    Delete testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        status: 'error',
        message: 'Testimonial not found'
      });
    }

    // Check if user is the creator or admin
    if (testimonial.createdBy.toString() !== req.user.id && req.user.status !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own testimonials'
      });
    }

    // Delete image from Cloudinary
    await deleteImage(testimonial.image.public_id);

    // Delete testimonial from database
    await Testimonial.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Testimonial deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting testimonial',
      error: error.message
    });
  }
};

// @desc    Get testimonial statistics
// @route   GET /api/testimonials/stats/overview
// @access  Private/Admin
exports.getTestimonialStats = async (req, res) => {
  try {
    const totalTestimonials = await Testimonial.countDocuments();
    const approvedTestimonials = await Testimonial.countDocuments({ status: 'approved' });
    const pendingTestimonials = await Testimonial.countDocuments({ status: 'pending' });
    const rejectedTestimonials = await Testimonial.countDocuments({ status: 'rejected' });
    const featuredTestimonials = await Testimonial.countDocuments({ featured: true });

    // Average rating
    const ratingStats = await Testimonial.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Testimonials by status
    const testimonialsByStatus = await Testimonial.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly testimonials
    const currentYear = new Date().getFullYear();
    const monthlyTestimonials = await Testimonial.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalTestimonials,
        approvedTestimonials,
        pendingTestimonials,
        rejectedTestimonials,
        featuredTestimonials,
        averageRating: ratingStats[0]?.averageRating || 0,
        testimonialsByStatus,
        monthlyTestimonials
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching testimonial statistics',
      error: error.message
    });
  }
};

// @desc    Get my testimonials
// @route   GET /api/testimonials/my-testimonials
// @access  Private
exports.getMyTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: testimonials.length,
      data: {
        testimonials
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching your testimonials',
      error: error.message
    });
  }
};