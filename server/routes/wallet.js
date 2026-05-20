const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Transaction, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const priceService = require('../services/priceService');

const router = express.Router();

router.use(authMiddleware);

router.get('/balances', async (req, res, next) => {
  try {
    const dataSource = process.env.DATA_SOURCE || 'simulated';

    if (dataSource === 'real' && priceService.exchange) {
      try {
        const binanceBalance = await priceService.exchange.fetchBalance();
        const result = [];

        Object.entries(binanceBalance.total).forEach(([currency, amount]) => {
          if (amount > 0) {
            result.push({
              currency,
              total: parseFloat(amount.toFixed(8)),
              available: parseFloat((binanceBalance.free[currency] || 0).toFixed(8)),
              inOrders: parseFloat(((binanceBalance.total[currency] || 0) - (binanceBalance.free[currency] || 0)).toFixed(8)),
            });
          }
        });

        return res.json(result);
      } catch (apiError) {
        console.error('[Wallet] Failed to fetch Binance balance, falling back to local:', apiError.message);
      }
    }

    const user = await User.findByPk(req.user.id);
    const balances = user.balances || {};

    const result = Object.entries(balances).map(([currency, amount]) => ({
      currency,
      total: parseFloat(amount),
      available: parseFloat(amount),
      inOrders: 0,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/deposit', [
  body('currency').notEmpty().withMessage('Currency is required'),
  body('amount').isFloat({ min: 0.00000001 }).withMessage('Amount must be positive'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currency, amount } = req.body;
    const user = await User.findByPk(req.user.id);
    const balances = { ...user.balances };

    balances[currency] = (balances[currency] || 0) + parseFloat(amount);

    await user.update({ balances });

    const transaction = await Transaction.create({
      userId: user.id,
      type: 'deposit',
      currency,
      amount: parseFloat(amount),
      status: 'completed',
    });

    res.status(201).json({
      transaction,
      newBalance: balances[currency],
    });
  } catch (error) {
    next(error);
  }
});

router.post('/withdraw', [
  body('currency').notEmpty().withMessage('Currency is required'),
  body('amount').isFloat({ min: 0.00000001 }).withMessage('Amount must be positive'),
  body('address').notEmpty().withMessage('Address is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currency, amount, address } = req.body;
    const user = await User.findByPk(req.user.id);
    const balances = { ...user.balances };

    if ((balances[currency] || 0) < parseFloat(amount)) {
      return res.status(400).json({ error: `Insufficient ${currency} balance` });
    }

    balances[currency] -= parseFloat(amount);
    await user.update({ balances });

    const transaction = await Transaction.create({
      userId: user.id,
      type: 'withdraw',
      currency,
      amount: parseFloat(amount),
      address,
      status: 'completed',
    });

    res.status(201).json({
      transaction,
      newBalance: balances[currency],
    });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const { page, limit, type } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;

    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20;
    const offset = (pageNum - 1) * pageSize;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    res.json({
      transactions: rows,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
