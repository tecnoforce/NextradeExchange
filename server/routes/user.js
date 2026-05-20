const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({
      id: user.id,
      email: user.email,
      balances: user.balances,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', [
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (email) {
      const existing = await User.findOne({ where: { email } });
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
