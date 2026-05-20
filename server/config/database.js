const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', '..', process.env.DB_PATH || './data/nextrade.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('[Database] SQLite connection established successfully.');
  } catch (error) {
    console.error('[Database] Unable to connect to SQLite:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
