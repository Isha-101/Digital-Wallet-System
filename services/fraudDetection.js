const Transaction = require('../models/Transaction');
const { sendAlertEmail } = require('./emailService');

// Fraud detection rules configuration
const FRAUD_RULES = {
  HIGH_FREQUENCY_LIMIT: 5, // Max transactions per hour
  LARGE_AMOUNT_THRESHOLD: 10000, // USD
  SUSPICIOUS_PATTERN_TIME_WINDOW: 3600000 // 1 hour in milliseconds
};

/**
 * Check for fraudulent activity based on predefined rules
 */
const checkFraudRules = async (userId, transactionType, amount) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - FRAUD_RULES.SUSPICIOUS_PATTERN_TIME_WINDOW);

  try {
    // Rule 1: High frequency transactions
    const recentTransactions = await Transaction.countDocuments({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
      createdAt: { $gte: oneHourAgo },
      isDeleted: false
    });

    if (recentTransactions >= FRAUD_RULES.HIGH_FREQUENCY_LIMIT) {
      await sendAlertEmail(userId, 'High frequency transactions detected', {
        count: recentTransactions,
        timeWindow: '1 hour'
      });
      
      return {
        isFlagged: true,
        flagReason: 'high_frequency'
      };
    }

    // Rule 2: Large amount transactions
    if (amount >= FRAUD_RULES.LARGE_AMOUNT_THRESHOLD) {
      await sendAlertEmail(userId, 'Large transaction detected', {
        amount,
        type: transactionType
      });
      
      return {
        isFlagged: true,
        flagReason: 'large_amount'
      };
    }

    // Rule 3: Suspicious pattern - multiple large withdrawals
    if (transactionType === 'withdrawal') {
      const recentWithdrawals = await Transaction.find({
        fromUserId: userId,
        type: 'withdrawal',
        createdAt: { $gte: oneHourAgo },
        isDeleted: false
      });

      const totalWithdrawn = recentWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);
      
      if (recentWithdrawals.length >= 3 && totalWithdrawn >= 5000) {
        await sendAlertEmail(userId, 'Suspicious withdrawal pattern detected', {
          count: recentWithdrawals.length,
          totalAmount: totalWithdrawn
        });
        
        return {
          isFlagged: true,
          flagReason: 'suspicious_pattern'
        };
      }
    }

    return {
      isFlagged: false,
      flagReason: null
    };
  } catch (error) {
    console.error('Error in fraud detection:', error);
    return {
      isFlagged: false,
      flagReason: null
    };
  }
};

/**
 * Daily fraud detection job
 */
const fraudDetectionJob = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all transactions from yesterday
    const yesterdayTransactions = await Transaction.find({
      createdAt: { $gte: yesterday, $lt: today },
      isDeleted: false
    }).populate('fromUserId toUserId', 'email username');

    // Analyze patterns
    const userTransactionCount = {};
    const suspiciousUsers = [];

    yesterdayTransactions.forEach(tx => {
      const userId = tx.fromUserId?._id || tx.toUserId?._id;
      if (userId) {
        userTransactionCount[userId] = (userTransactionCount[userId] || 0) + 1;
      }
    });

    // Flag users with excessive transactions
    Object.entries(userTransactionCount).forEach(([userId, count]) => {
      if (count > 20) { // More than 20 transactions per day
        suspiciousUsers.push({
          userId,
          transactionCount: count,
          reason: 'excessive_daily_transactions'
        });
      }
    });

    console.log(`Daily fraud scan completed. Found ${suspiciousUsers.length} suspicious users.`);
    
    // In a real application, you'd store these results or send alerts
    if (suspiciousUsers.length > 0) {
      console.log('Suspicious users:', suspiciousUsers);
    }

    return {
      scannedTransactions: yesterdayTransactions.length,
      suspiciousUsers: suspiciousUsers.length,
      details: suspiciousUsers
    };
  } catch (error) {
    console.error('Error in daily fraud detection job:', error);
    return { error: error.message };
  }
};

module.exports = {
  checkFraudRules,
  fraudDetectionJob
};