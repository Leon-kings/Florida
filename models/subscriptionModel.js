const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    subscriptionDate: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ isActive: 1 });
subscriptionSchema.index({ createdAt: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
