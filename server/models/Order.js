const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  pair: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  side: {
    type: DataTypes.ENUM('buy', 'sell'),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('limit', 'market', 'stop_limit'),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
  },
  stopPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
  },
  filled: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'partial', 'filled', 'cancelled'),
    defaultValue: 'pending',
  },
  exchangeOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  exchangeInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['pair'] },
    { fields: ['status'] },
    { fields: ['exchange_order_id'] },
  ],
});

module.exports = Order;
