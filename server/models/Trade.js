const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trade = sequelize.define('Trade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  buyOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id',
    },
  },
  sellOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id',
    },
  },
  pair: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
  },
  fee: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
  },
}, {
  tableName: 'trades',
  indexes: [
    { fields: ['pair'] },
    { fields: ['buy_order_id'] },
    { fields: ['sell_order_id'] },
  ],
});

module.exports = Trade;
