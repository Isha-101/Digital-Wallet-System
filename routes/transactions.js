const express = require('express');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * /api/transactions/history:
 *   get:
 *     summary: Get user transaction history
 *     tags: [Transactions]
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
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, transfer]
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    
    const query = {
      $or: [
        { fromUserId: req.user._id },
        { toUserId: req.user._id }
      ],
      isDeleted: false
    };

    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .populate('fromUserId', 'username email')
      .populate('toUserId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

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
 * /api/transactions/{id}:
 *   get:
 *     summary: Get transaction details
 *     tags: [Transactions]
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
 *         description: Transaction details retrieved successfully
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      $or: [
        { fromUserId: req.user._id },
        { toUserId: req.user._id }
      ],
      isDeleted: false
    })
    .populate('fromUserId', 'username email')
    .populate('toUserId', 'username email');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;