const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const orderService = require('../services/orderService');
const { MAX_ORDERS_PER_USER } = require('../config/constants');
const { Order } = require('../models');

const router = express.Router();

router.use(authMiddleware);

router.get('/open', async (req, res, next) => {
  try {
    const { pair } = req.query;
    const orders = await orderService.getOpenOrders(req.user.id, pair || null);
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { pair, page, limit } = req.query;
    const result = await orderService.getOrderHistory(
      req.user.id,
      pair || null,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/', [
  body('pair').notEmpty().withMessage('Pair is required'),
  body('side').isIn(['buy', 'sell']).withMessage('Side must be buy or sell'),
  body('type').isIn(['limit', 'market', 'stop_limit']).withMessage('Invalid order type'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('stopPrice').optional().isFloat({ min: 0 }).withMessage('Stop price must be positive'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const openOrders = await Order.count({
      where: { userId: req.user.id, status: ['pending', 'partial'] },
    });

    if (openOrders >= MAX_ORDERS_PER_USER) {
      return res.status(400).json({ error: `Maximum ${MAX_ORDERS_PER_USER} open orders allowed` });
    }

    const { pair, side, type, price, amount, stopPrice } = req.body;

    const order = await orderService.createOrder({
      userId: req.user.id,
      pair,
      side,
      type,
      price: price ? parseFloat(price) : null,
      amount: parseFloat(amount),
      stopPrice: stopPrice ? parseFloat(stopPrice) : null,
    });

    res.status(201).json(order);
  } catch (error) {
    if (error.message.includes('Insufficient') || error.message.includes('Order value') || error.message.includes('insufficient')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/cancel-all', async (req, res, next) => {
  try {
    const { pair } = req.query;
    const orders = await orderService.cancelAllOrders(req.user.id, pair || null);
    res.json({ cancelled: orders.length, orders });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.user.id, req.params.id);
    res.json(order);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('cannot be cancelled')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;
