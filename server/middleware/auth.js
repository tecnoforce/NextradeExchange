const { User } = require('../models');
const { DEFAULT_USER_ID } = require('../config/constants');

const authMiddleware = async (req, res, next) => {
  try {
    let user = await User.findByPk(DEFAULT_USER_ID);
    if (!user) {
      user = await User.create({
        id: DEFAULT_USER_ID,
        email: 'demo@nextrade.com',
        passwordHash: 'single-user-mode',
        balances: {},
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error.message);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = authMiddleware;