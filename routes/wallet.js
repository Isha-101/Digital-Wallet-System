const express = require('express');
const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validation');
const { checkFraudRules } = require('../services/fraudDetection');
const router = express.Router();

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get user wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      userId: req.user._id,
      isDeleted: false
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      balances: wallet.balances,
      totalBalanceUSD: wallet.balances.find(b => b.currency === 'USD')?.amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit money to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, BTC, ETH]
 *                 default: USD
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Deposit successful
 */
router.post('/deposit', authenticateToken, validateTransaction, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, currency = 'USD', description } = req.body;

    // Check fraud rules
    const fraudCheck = await checkFraudRules(req.user._id, 'deposit', amount);
    
    // Create transaction record
    const transaction = new Transaction({
      toUserId: req.user._id,
      type: 'deposit',
      amount,
      currency,
      description,
      isFlagged: fraudCheck.isFlagged,
      flagReason: fraudCheck.flagReason
    });

    // Update wallet balance
    const wallet = await Wallet.findOne({ userId: req.user._id });
    const balanceIndex = wallet.balances.findIndex(b => b.currency === currency);
    
    if (balanceIndex >= 0) {
      wallet.balances[balanceIndex].amount += amount;
    } else {
      wallet.balances.push({ currency, amount });
    }

    await wallet.save({ session });
    transaction.status = 'completed';
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      message: 'Deposit successful',
      transaction: {
        id: transaction._id,
        amount,
        currency,
        status: transaction.status,
        isFlagged: transaction.isFlagged
      },
      newBalance: wallet.balances.find(b => b.currency === currency).amount
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw money from wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, BTC, ETH]
 *                 default: USD
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Withdrawal successful
 */
router.post('/withdraw', authenticateToken, validateTransaction, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, currency = 'USD', description } = req.body;

    // Check fraud rules
    const fraudCheck = await checkFraudRules(req.user._id, 'withdrawal', amount);

    // Get wallet and check balance
    const wallet = await Wallet.findOne({ userId: req.user._id });
    const balance = wallet.balances.find(b => b.currency === currency);
    
    if (!balance || balance.amount < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Create transaction record
    const transaction = new Transaction({
      fromUserId: req.user._id,
      type: 'withdrawal',
      amount,
      currency,
      description,
      isFlagged: fraudCheck.isFlagged,
      flagReason: fraudCheck.flagReason
    });

    // Update wallet balance
    balance.amount -= amount;
    await wallet.save({ session });
    
    transaction.status = 'completed';
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      message: 'Withdrawal successful',
      transaction: {
        id: transaction._id,
        amount,
        currency,
        status: transaction.status,
        isFlagged: transaction.isFlagged
      },
      newBalance: balance.amount
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

/**
 * @swagger
 * /api/wallet/transfer:
 *   post:
 *     summary: Transfer money to another user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - toUserId
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               toUserId:
 *                 type: string
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, BTC, ETH]
 *                 default: USD
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Transfer successful
 */
router.post('/transfer', authenticateToken, validateTransaction, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, toUserId, currency = 'USD', description } = req.body;

    if (req.user._id.toString() === toUserId) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    // Check fraud rules
    const fraudCheck = await checkFraudRules(req.user._id, 'transfer', amount);

    // Get sender and receiver wallets
    const [senderWallet, receiverWallet] = await Promise.all([
      Wallet.findOne({ userId: req.user._id }),
      Wallet.findOne({ userId: toUserId })
    ]);

    if (!receiverWallet) {
      return res.status(404).json({ error: 'Recipient wallet not found' });
    }

    // Check sender balance
    const senderBalance = senderWallet.balances.find(b => b.currency === currency);
    if (!senderBalance || senderBalance.amount < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Create transaction record
    const transaction = new Transaction({
      fromUserId: req.user._id,
      toUserId,
      type: 'transfer',
      amount,
      currency,
      description,
      isFlagged: fraudCheck.isFlagged,
      flagReason: fraudCheck.flagReason
    });

    // Update balances
    senderBalance.amount -= amount;
    
    const receiverBalanceIndex = receiverWallet.balances.findIndex(b => b.currency === currency);
    if (receiverBalanceIndex >= 0) {
      receiverWallet.balances[receiverBalanceIndex].amount += amount;
    } else {
      receiverWallet.balances.push({ currency, amount });
    }

    await Promise.all([
      senderWallet.save({ session }),
      receiverWallet.save({ session })
    ]);

    transaction.status = 'completed';
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      message: 'Transfer successful',
      transaction: {
        id: transaction._id,
        amount,
        currency,
        toUserId,
        status: transaction.status,
        isFlagged: transaction.isFlagged
      },
      newBalance: senderBalance.amount
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
