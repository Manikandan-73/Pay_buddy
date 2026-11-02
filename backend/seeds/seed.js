/**
 * Deterministic & Safe Database Seeder
 * Populates 3 demo users with MAIN wallets preloaded with simulated ₹10,000 and balanced ledger records.
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('crypto');
const mysql = require('mysql2/promise');
const config = require('../config/env');
const logger = require('../utils/logger');

const DEMO_USERS = [
  {
    id: 'pb_usr_alice_001',
    fullName: 'Alice Johnson',
    email: 'alice@paybuddy.local',
    phone: '+919876543210',
    walletId: 'pb_wal_alice_main_01',
    initialBalance: '10000.0000'
  },
  {
    id: 'pb_usr_bob_002',
    fullName: 'Bob Smith',
    email: 'bob@paybuddy.local',
    phone: '+919876543211',
    walletId: 'pb_wal_bob_main_02',
    initialBalance: '10000.0000'
  },
  {
    id: 'pb_usr_charlie_003',
    fullName: 'Charlie Brown',
    email: 'charlie@paybuddy.local',
    phone: '+919876543212',
    walletId: 'pb_wal_charlie_main_03',
    initialBalance: '10000.0000'
  }
];

async function seedDatabase() {
  if (config.env === 'production') {
    logger.warn('Seeder aborted: Running demo seed scripts in production is strictly prohibited.');
    return;
  }

  logger.info('Starting deterministic database seeding...');

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  try {
    const passwordHash = await bcrypt.hash('Password@123', 10);

    for (const user of DEMO_USERS) {
      // Check if user already exists
      const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [user.email]);
      if (existing.length > 0) {
        logger.info(`User ${user.email} already exists. Skipping.`);
        continue;
      }

      await connection.beginTransaction();

      try {
        // 1. Insert User
        await connection.query(
          'INSERT INTO users (id, full_name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, user.fullName, user.email, user.phone, passwordHash, 'ACTIVE']
        );

        // 2. Insert MAIN INR Wallet
        await connection.query(
          'INSERT INTO wallets (id, user_id, wallet_type, currency, balance, status) VALUES (?, ?, ?, ?, ?, ?)',
          [user.walletId, user.id, 'MAIN', 'INR', user.initialBalance, 'ACTIVE']
        );

        // 3. Create simulated funding transaction
        const txId = `pb_tx_seed_${user.id.slice(-3)}`;
        const reference = `UTR-SEED-${user.fullName.split(' ')[0].toUpperCase()}-10000`;
        await connection.query(
          `INSERT INTO transactions 
           (id, reference, sender_wallet_id, receiver_wallet_id, amount, currency, transaction_type, status, completed_at) 
           VALUES (?, ?, NULL, ?, ?, 'INR', 'WALLET_FUNDING', 'SUCCESS', CURRENT_TIMESTAMP)`,
          [txId, reference, user.walletId, user.initialBalance]
        );

        // 4. Create matching double-entry ledger record
        const ledgerId = `pb_led_seed_${user.id.slice(-3)}`;
        await connection.query(
          `INSERT INTO ledger_entries 
           (id, transaction_id, wallet_id, entry_type, amount, currency, description) 
           VALUES (?, ?, ?, 'CREDIT', ?, 'INR', 'Initial Simulated Wallet Deposit')`,
          [ledgerId, txId, user.walletId, user.initialBalance]
        );

        await connection.commit();
        logger.info(`Successfully seeded demo account: ${user.fullName} (${user.email}) with ₹10,000.`);
      } catch (err) {
        await connection.rollback();
        logger.error(`Failed to seed user ${user.email}: ${err.message}`);
        throw err;
      }
    }

    logger.info('Database seeding completed successfully.');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
