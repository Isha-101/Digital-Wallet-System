const express = require('express');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/flagged-transactions:
 *   get:
 *     summary: Get all flagged transactions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Flagged transactions retrieved successfully
 */
router.get('/flagged-transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const transactions = await Transaction.find({
      isFlagged: true,
      isDeleted: false
    })
    .populate('fromUserId', 'username email')
    .populate('toUserId', 'username email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Transaction.countDocuments({
      isFlagged: true,
      isDeleted: false
    });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/total-balances:
 *   get:
 *     summary: Get aggregated total user balances
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total balances retrieved successfully
 */
router.get('/total-balances', async (req, res) => {
  try {
    const result = await Wallet.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$balances' },
      {
        $group: {
          _id: '$balances.currency',
          totalAmount: { $sum: '$balances.amount' },
          userCount: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalUsers = await User.countDocuments({ isDeleted: false });
    const activeWallets = await Wallet.countDocuments({ isDeleted: false });

    res.json({
      totalBalancesByCurrency: result,
      totalUsers,
      activeWallets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/top-users:
 *   get:
 *     summary: Get top users by balance or transaction volume
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [balance, transactions]
 *           default: balance
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top users retrieved successfully
 */
router.get('/top-users', async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'balance';
    const limit = parseInt(req.query.limit) || 10;

    if (sortBy === 'balance') {
      const topUsersByBalance = await Wallet.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: '$balances' },
        { $match: { 'balances.currency': 'USD' } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$userId',
            username: '$user.username',
            email: '$user.email',
            balance: '$balances.amount'
          }
        },
        { $sort: { balance: -1 } },
        { $limit: limit }
      ]);

      res.json({ topUsers: topUsersByBalance, sortedBy: 'balance' });
    } else {
      const topUsersByTransactions = await Transaction.aggregate([
        { $match: { isDeleted: false, status: 'completed' } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$type', 'transfer'] },
                '$fromUserId',
                { $ifNull: ['$fromUserId', '$toUserId'] }
              ]
            },
            transactionCount: { $sum: 1 },
            totalVolume: { $sum: '$amount' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            username: '$user.username',
            email: '$user.email',
            transactionCount: 1,
            totalVolume: 1
          }
        },
        { $sort: { transactionCount: -1 } },
        { $limit: limit }
      ]);

      res.json({ topUsers: topUsersByTransactions, sortedBy: 'transactions' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/soft-delete:
 *   patch:
 *     summary: Soft delete a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User soft deleted successfully
 */
router.patch('/users/:id/soft-delete', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();

    // Also soft delete the wallet
    await Wallet.findOneAndUpdate(
      { userId: req.params.id },
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    );

    res.json({ message: 'User account soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      flaggedTransactions,
      totalVolume
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isActive: true, isDeleted: false }),
      Transaction.countDocuments({ isDeleted: false }),
      Transaction.countDocuments({ isFlagged: true, isDeleted: false }),
      Transaction.aggregate([
        { $match: { status: 'completed', isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      transactions: {
        total: totalTransactions,
        flagged: flaggedTransactions
      },
      totalVolume: totalVolume[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
