/**
 * Wallet Data Access Repository
 * Implements pessimistic row-level locking for concurrency protection
 */

const db = require('../config/database');

const WalletRepository = {
  async findByUserId(userId, connection = null) {
    const sql = 'SELECT * FROM wallets WHERE user_id = ?';
    if (connection) {
      const [rows] = await connection.execute(sql, [userId]);
      return rows;
    }
    return await db.query(sql, [userId]);
  },

  async findPrimaryByUserId(userId, connection = null) {
    const sql = "SELECT * FROM wallets WHERE user_id = ? AND wallet_type = 'MAIN' LIMIT 1";
    if (connection) {
      const [rows] = await connection.execute(sql, [userId]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [userId]);
    return rows[0] || null;
  },

  async findById(walletId, connection = null) {
    const sql = 'SELECT * FROM wallets WHERE id = ? LIMIT 1';
    if (connection) {
      const [rows] = await connection.execute(sql, [walletId]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [walletId]);
    return rows[0] || null;
  },

  /**
   * Acquire an exclusive row lock on a single wallet.
   * MUST be executed inside an active database transaction.
   */
  async findByIdWithLock(walletId, connection) {
    const sql = 'SELECT * FROM wallets WHERE id = ? FOR UPDATE';
    const [rows] = await connection.execute(sql, [walletId]);
    return rows[0] || null;
  },

  /**
   * Deterministic Two-Wallet Row Lock to eliminate deadlocks.
   * Always locks the lower wallet ID first, followed by the higher wallet ID.
   */
  async findTwoWithDeterministicLock(walletIdA, walletIdB, connection) {
    const [firstId, secondId] = [walletIdA, walletIdB].sort();

    const sql = 'SELECT * FROM wallets WHERE id = ? FOR UPDATE';
    const [firstRows] = await connection.execute(sql, [firstId]);
    const [secondRows] = await connection.execute(sql, [secondId]);

    const walletMap = new Map();
    if (firstRows[0]) walletMap.set(firstRows[0].id, firstRows[0]);
    if (secondRows[0]) walletMap.set(secondRows[0].id, secondRows[0]);

    return {
      senderWallet: walletMap.get(walletIdA) || null,
      receiverWallet: walletMap.get(walletIdB) || null
    };
  },

  async create(wallet, connection) {
    const sql = `
      INSERT INTO wallets (id, user_id, wallet_type, currency, balance, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(sql, [
      wallet.id,
      wallet.userId,
      wallet.walletType || 'MAIN',
      wallet.currency || 'INR',
      wallet.balance || '0.0000',
      wallet.status || 'ACTIVE'
    ]);
    return wallet;
  },

  async updateBalance(walletId, newBalance, connection) {
    const sql = 'UPDATE wallets SET balance = ? WHERE id = ?';
    await connection.execute(sql, [newBalance, walletId]);
  }
};

module.exports = WalletRepository;
