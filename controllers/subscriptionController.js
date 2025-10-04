const Subscription = require("../models/subscriptionModel");
const asyncHandler = require("express-async-handler");

// @desc    Subscribe to newsletter
// @route   POST /api/subscriptions
// @access  Public
const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if email already exists
  const existingSubscription = await Subscription.findOne({ email });

  if (existingSubscription) {
    if (existingSubscription.isActive) {
      res.status(400);
      throw new Error("Email is already subscribed");
    } else {
      // Reactivate existing subscription
      existingSubscription.isActive = true;
      existingSubscription.email = email || existingSubscription.email;
      existingSubscription.unsubscribedAt = undefined;

      await existingSubscription.save();

      res.status(200).json({
        success: true,
        message: "Subscription reactivated successfully",
        data: existingSubscription,
      });
      return;
    }
  }

  // Create new subscription
  const subscription = await Subscription.create({
    email,
  });

  res.status(201).json({
    success: true,
    message: "Subscribed successfully",
    data: subscription,
  });
});

// @desc    Unsubscribe from newsletter
// @route   PATCH /api/subscriptions/unsubscribe
// @access  Public
const unsubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const subscription = await Subscription.findOne({ email });

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  if (!subscription.isActive) {
    res.status(400);
    throw new Error("Email is already unsubscribed");
  }

  subscription.isActive = false;
  subscription.unsubscribedAt = new Date();
  await subscription.save();

  res.json({
    success: true,
    message: "Unsubscribed successfully",
  });
});

// @desc    Update subscription preferences
// @route   PATCH /api/subscriptions/preferences
// @access  Public
const updatePreferences = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const subscription = await Subscription.findOne({ email });

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  if (!subscription.isActive) {
    res.status(400);
    throw new Error("Cannot update preferences for inactive subscription");
  }

  subscription.email = email;
  await subscription.save();

  res.json({
    success: true,
    message: "Preferences updated successfully",
    data: subscription,
  });
});

// @desc    Get all subscriptions (Admin)
// @route   GET /api/subscriptions
// @access  Private/Admin
const getSubscriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, active } = req.query;

  const query = {};
  if (active !== undefined) {
    query.isActive = active === "true";
  }

  const subscriptions = await Subscription.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Subscription.countDocuments(query);

  res.json({
    success: true,
    data: subscriptions,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: subscriptions.length,
      totalRecords: total,
    },
  });
});

// @desc    Get subscription by email
// @route   GET /api/subscriptions/:email
// @access  Public
const getSubscription = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const subscription = await Subscription.findOne({ email });

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  res.json({
    success: true,
    data: subscription,
  });
});

// @desc    Delete subscription (Admin)
// @route   DELETE /api/subscriptions/:id
// @access  Private/Admin
const deleteSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id);

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }

  await Subscription.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Subscription deleted successfully",
  });
});

module.exports = {
  subscribe,
  unsubscribe,
  updatePreferences,
  getSubscriptions,
  getSubscription,
  deleteSubscription,
};
