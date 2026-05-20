require('dotenv').config();

const { sequelize, User } = require('../server/models');
const { DEFAULT_BALANCES, DEFAULT_USER_ID } = require('../server/config/constants');

async function seed() {
  try {
    console.log('[Seed] Connecting to database...');
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('[Seed] Database synchronized.');

    const demoUser = await User.create({
      id: DEFAULT_USER_ID,
      email: 'demo@nextrade.com',
      passwordHash: 'single-user-mode',
      balances: { ...DEFAULT_BALANCES },
    });

    console.log('[Seed] Demo user created: demo@nextrade.com');
    console.log('[Seed] User ID:', demoUser.id);
    console.log('[Seed] Balances:', JSON.stringify(demoUser.balances, null, 2));

    console.log('[Seed] Database seeded successfully!');
    console.log('[Seed] Run `npm run dev` to start the server.');
  } catch (error) {
    console.error('[Seed] Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
