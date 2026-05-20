const { sequelize } = require('../config/database');
const User = require('./User');
const Order = require('./Order');
const Trade = require('./Trade');
const Transaction = require('./Transaction');

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.hasMany(Trade, { foreignKey: 'buyOrderId', as: 'buyTrades' });
Order.hasMany(Trade, { foreignKey: 'sellOrderId', as: 'sellTrades' });

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('[Database] All models synchronized successfully.');
  } catch (error) {
    console.error('[Database] Sync error:', error.message);
  }
};

module.exports = {
  sequelize,
  User,
  Order,
  Trade,
  Transaction,
  syncDatabase,
};
