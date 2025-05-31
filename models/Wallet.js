const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balances: [{
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Initialize with default USD balance
walletSchema.pre('save', function(next) {
  if (this.isNew && this.balances.length === 0) {
    this.balances.push({ currency: 'USD', amount: 0 });
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);