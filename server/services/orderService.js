const priceService = require('./priceService');
const notificationService = require('./notificationService');
const { Order, Trade, User } = require('../models');
const { MIN_ORDER_USDT } = require('../config/constants');

class OrderService {
  constructor() {
    this.pendingSync = new Map();
  }

  async createOrder(orderData) {
    return this.executeRealOrder(orderData);
  }

  async executeRealOrder(orderData) {
    const { userId, pair, side, type, price, amount, stopPrice } = orderData;
    const exchange = priceService.exchange;

    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const baseCurrency = pair.split('/')[0];
    const quoteCurrency = pair.split('/')[1];

    let ccxtType = type === 'stop_limit' ? 'stop_limit' : type;
    let ccxtPrice = price;
    let params = {};

    if (type === 'market') {
      const ticker = await exchange.fetchTicker(pair);
      ccxtPrice = undefined;

      if (side === 'buy') {
        const cost = amount * ticker.last;
        if ((user.balances[quoteCurrency] || 0) < cost) {
          throw new Error(`Insufficient ${quoteCurrency} balance. Need: ${cost.toFixed(2)}, Have: ${(user.balances[quoteCurrency] || 0).toFixed(2)}`);
        }
      } else {
        if ((user.balances[baseCurrency] || 0) < amount) {
          throw new Error(`Insufficient ${baseCurrency} balance`);
        }
      }
    } else if (type === 'limit') {
      if (!price) throw new Error('Price required for limit order');
      if (price * amount < MIN_ORDER_USDT) {
        throw new Error(`Order value must be at least ${MIN_ORDER_USDT} USDT`);
      }

      if (side === 'buy') {
        const cost = price * amount;
        if ((user.balances[quoteCurrency] || 0) < cost) {
          throw new Error(`Insufficient ${quoteCurrency} balance. Need: ${cost.toFixed(2)}, Have: ${(user.balances[quoteCurrency] || 0).toFixed(2)}`);
        }
      } else {
        if ((user.balances[baseCurrency] || 0) < amount) {
          throw new Error(`Insufficient ${baseCurrency} balance`);
        }
      }
    } else if (type === 'stop_limit') {
      if (!price || !stopPrice) throw new Error('Price and stopPrice required for stop-limit order');
      params = { stopPrice };
      ccxtType = 'stop_limit';
    }

    let binanceOrder;
    try {
      binanceOrder = await exchange.createOrder(pair, ccxtType, side, amount, ccxtPrice, params);
    } catch (apiError) {
      if (apiError.message && apiError.message.includes('insufficient')) {
        throw new Error(`Insufficient balance: ${apiError.message}`);
      }
      throw apiError;
    }

    const order = await Order.create({
      userId,
      pair,
      side,
      type,
      price: binanceOrder.price || price || 0,
      stopPrice: stopPrice || null,
      amount: parseFloat(binanceOrder.amount || amount),
      filled: parseFloat(binanceOrder.filled || 0),
      status: this.mapBinanceStatus(binanceOrder.status),
      exchangeOrderId: binanceOrder.id,
      exchangeInfo: JSON.stringify(binanceOrder),
    });

    this.pendingSync.set(order.id, {
      exchangeOrderId: binanceOrder.id,
      pair,
      userId,
    });

    await this.syncBalances(userId);

    notificationService.emitOrderUpdate(userId, {
      orderId: order.id,
      status: order.status,
      filled: order.filled,
      exchangeId: binanceOrder.id,
    });

    return this.formatOrder(order);
  }

  async cancelOrder(userId, orderId) {
    return this.cancelRealOrder(userId, orderId);
  }

  async cancelRealOrder(userId, orderId) {
    const exchange = priceService.exchange;
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) throw new Error('Order not found');
    if (order.status === 'filled' || order.status === 'cancelled') {
      throw new Error('Order cannot be cancelled');
    }
    if (!order.exchangeOrderId) {
      throw new Error('Order has no exchange ID');
    }

    // SYNC primero: verificar estado real en Binance antes de cancelar
    try {
      const fetched = await exchange.fetchOrder(order.exchangeOrderId, order.pair);
      const realStatus = this.mapBinanceStatus(fetched.status);

      if (realStatus === 'filled') {
        await order.update({ status: 'filled', filled: parseFloat(fetched.filled || 0) });
        await this.syncBalances(userId);
        throw new Error('Order already filled on exchange');
      }
      if (realStatus === 'cancelled') {
        await order.update({ status: 'cancelled' });
        await this.syncBalances(userId);
        throw new Error('Order already cancelled on exchange');
      }
    } catch (fetchError) {
      if (fetchError.message && (fetchError.message.includes('Unknown order') || fetchError.message.includes('Order does not exist'))) {
        await order.update({ status: 'cancelled' });
        await this.syncBalances(userId);
        throw new Error('Order not found on exchange (already cancelled or expired)');
      }
      if (fetchError.message && (fetchError.message.includes('already filled') || fetchError.message.includes('already cancelled'))) {
        throw fetchError;
      }
    }

    // Ahora sí cancelar
    try {
      const result = await exchange.cancelOrder(order.exchangeOrderId, order.pair);

      await order.update({
        status: result.status === 'canceled' ? 'cancelled' : result.status,
        filled: parseFloat(result.filled || 0),
        exchangeInfo: JSON.stringify(result),
      });

      await this.syncBalances(userId);

      notificationService.emitOrderUpdate(userId, {
        orderId: order.id,
        status: order.status,
      });

      return this.formatOrder(order);
    } catch (apiError) {
      if (apiError.message && (apiError.message.includes('Unknown order') || apiError.message.includes('Order does not exist'))) {
        await order.update({ status: 'cancelled' });
        await this.syncBalances(userId);
        return this.formatOrder(order);
      }
      throw apiError;
    }
  }

  async cancelAllOrders(userId, pair = null) {
    return this.cancelAllRealOrders(userId, pair);
  }

  async cancelAllRealOrders(userId, pair = null) {
    const exchange = priceService.exchange;
    const where = { userId, status: ['pending', 'partial'] };
    if (pair) where.pair = pair;

    const orders = await Order.findAll({ where });
    const results = [];

    for (const order of orders) {
      try {
        if (order.exchangeOrderId) {
          // SYNC primero: verificar estado real
          try {
            const fetched = await exchange.fetchOrder(order.exchangeOrderId, order.pair);
            const realStatus = this.mapBinanceStatus(fetched.status);
            if (realStatus === 'filled' || realStatus === 'cancelled') {
              await order.update({ status: realStatus, filled: parseFloat(fetched.filled || 0) });
              results.push(this.formatOrder(order));
              continue;
            }
          } catch (fetchErr) {
            if (fetchErr.message && (fetchErr.message.includes('Unknown order') || fetchErr.message.includes('Order does not exist'))) {
              await order.update({ status: 'cancelled' });
              results.push(this.formatOrder(order));
              continue;
            }
          }

          // Cancelar
          const result = await exchange.cancelOrder(order.exchangeOrderId, order.pair);
          await order.update({
            status: result.status === 'canceled' ? 'cancelled' : result.status,
            filled: parseFloat(result.filled || 0),
          });
        } else {
          await order.update({ status: 'cancelled' });
        }
        results.push(this.formatOrder(order));
      } catch (e) {
        if (e.message && (e.message.includes('Unknown order') || e.message.includes('Order does not exist'))) {
          await order.update({ status: 'cancelled' });
          results.push(this.formatOrder(order));
        } else {
          console.error(`[OrderService] Failed to cancel order ${order.id}:`, e.message);
          await order.update({ status: 'cancelled' });
          results.push(this.formatOrder(order));
        }
      }
    }

    await this.syncBalances(userId);
    return results;
  }

  async syncOrderStatus(userId, orderId) {
    const exchange = priceService.exchange;
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order || !order.exchangeOrderId) return;

    try {
      const fetched = await exchange.fetchOrder(order.exchangeOrderId, order.pair);
      const newStatus = this.mapBinanceStatus(fetched.status);
      const newFilled = parseFloat(fetched.filled || 0);

      if (order.status !== newStatus || order.filled !== newFilled) {
        await order.update({
          status: newStatus,
          filled: newFilled,
          price: fetched.price || order.price,
          exchangeInfo: JSON.stringify(fetched),
        });

        if (newStatus === 'filled' || newStatus === 'partial') {
          await this.syncBalances(userId);
        }

        notificationService.emitOrderUpdate(userId, {
          orderId: order.id,
          status: newStatus,
          filled: newFilled,
        });
      }
    } catch (e) {
      console.error(`[OrderService] Sync error for order ${orderId}:`, e.message);
    }
  }

  async syncAllOpenOrders(userId) {
    const exchange = priceService.exchange;
    const openOrders = await Order.findAll({
      where: { userId, status: ['pending', 'partial'] },
    });

    for (const order of openOrders) {
      if (order.exchangeOrderId) {
        await this.syncOrderStatus(userId, order.id);
      }
    }

    await this.syncBalances(userId);
  }

  async syncBalances(userId) {
    const exchange = priceService.exchange;
    const user = await User.findByPk(userId);
    if (!user) return;

    try {
      const binanceBalance = await exchange.fetchBalance();
      const newBalances = {};

      Object.entries(binanceBalance.total).forEach(([currency, amount]) => {
        if (amount > 0) {
          newBalances[currency] = parseFloat(amount.toFixed(8));
        }
      });

      if (JSON.stringify(user.balances) !== JSON.stringify(newBalances)) {
        await user.update({ balances: newBalances });

        notificationService.emitBalanceUpdate(userId, newBalances);
      }
    } catch (e) {
      console.error('[OrderService] Balance sync error:', e.message);
    }
  }

  async getOpenOrders(userId, pair = null) {
    const where = { userId, status: ['pending', 'partial'] };
    if (pair) where.pair = pair;

    await this.syncAllOpenOrders(userId);

    const orders = await Order.findAll({ where, order: [['createdAt', 'DESC']] });
    return orders.map(o => this.formatOrder(o));
  }

  async getOrderHistory(userId, pair = null, page = 1, limit = 20) {
    const where = { userId };
    if (pair) where.pair = pair;

    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20;
    const offset = (pageNum - 1) * pageSize;

    const { count, rows } = await Order.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return {
      orders: rows.map(o => this.formatOrder(o)),
      total: count,
      page: pageNum,
      pages: Math.ceil(count / pageSize),
    };
  }

  mapBinanceStatus(status) {
    const map = {
      'open': 'pending',
      'closed': 'filled',
      'canceled': 'cancelled',
      'cancelled': 'cancelled',
      'expired': 'cancelled',
      'rejected': 'cancelled',
      'partial': 'partial',
    };
    return map[status] || status;
  }

  formatOrder(order) {
    const data = order.toJSON ? order.toJSON() : order;
    return {
      id: data.id,
      userId: data.userId,
      pair: data.pair,
      side: data.side,
      type: data.type,
      price: data.price ? parseFloat(data.price) : null,
      stopPrice: data.stopPrice ? parseFloat(data.stopPrice) : null,
      amount: parseFloat(data.amount),
      filled: parseFloat(data.filled || 0),
      status: data.status,
      exchangeOrderId: data.exchangeOrderId || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

module.exports = new OrderService();
