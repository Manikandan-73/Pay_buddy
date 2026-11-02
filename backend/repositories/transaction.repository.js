/**
 * Transaction Data Access Repository
 */

const db = require('../config/database');

const TransactionRepository = {
  async create(tx, connection) {
    const sql = `
      INSERT INTO transactions 
      (id, reference, sender_wallet_id, receiver_wallet_id, amount, currency, transaction_type, status, failure_reason, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(sql, [
      tx.id,
      tx.reference,
      tx.senderWalletId || null,
      tx.receiverWalletId,
      tx.amount,
      tx.currency || 'INR',
      tx.transactionType,
      tx.status || 'PENDING',
      tx.failureReason || null,
      tx.completedAt || null
    ]);
    return tx;
  },

  async updateStatus(id, { status, failureReason = null, completedAt = null }, connection) {
    const sql = `
      UPDATE transactions 
      SET status = ?, failure_reason = ?, completed_at = ?
      WHERE id = ?
    `;
    await connection.execute(sql, [status, failureReason, completedAt, id]);
  },

  async findById(id, connection = null) {
    const sql = `
      SELECT t.*, 
             u_send.full_name AS sender_name, u_send.phone AS sender_phone,
             u_rec.full_name AS receiver_name, u_rec.phone AS receiver_phone
      FROM transactions t
      LEFT JOIN wallets w_send ON t.sender_wallet_id = w_send.id
      LEFT JOIN users u_send ON w_send.user_id = u_send.id
      JOIN wallets w_rec ON t.receiver_wallet_id = w_rec.id
      JOIN users u_rec ON w_rec.user_id = u_rec.id
      WHERE t.id = ?
      LIMIT 1
    `;
    if (connection) {
      const [rows] = await connection.execute(sql, [id]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async findByReference(reference, connection = null) {
    const sql = 'SELECT * FROM transactions WHERE reference = ? LIMIT 1';
    if (connection) {
      const [rows] = await connection.execute(sql, [reference]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [reference]);
    return rows[0] || null;
  },

  async listUserTransactions(walletId, { limit = 20, offset = 0, status = null, type = null }) {
    let whereClause = 'WHERE (t.sender_wallet_id = ? OR t.receiver_wallet_id = ?)';
    const params = [walletId, walletId];

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND t.transaction_type = ?';
      params.push(type);
    }

    const sql = `
      SELECT t.id, t.reference, t.sender_wallet_id, t.receiver_wallet_id,
             t.amount, t.currency, t.transaction_type, t.status, t.created_at, t.completed_at,
             u_send.full_name AS sender_name,
             u_rec.full_name AS receiver_name,
             CASE WHEN t.receiver_wallet_id = ? THEN 'CREDIT' ELSE 'DEBIT' END AS direction
      FROM transactions t
      LEFT JOIN wallets w_send ON t.sender_wallet_id = w_send.id
      LEFT JOIN users u_send ON w_send.user_id = u_send.id
      JOIN wallets w_rec ON t.receiver_wallet_id = w_rec.id
      JOIN users u_rec ON w_rec.user_id = u_rec.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // params ordering: direction comparison first, then whereClause, then limit/offset
    const fullParams = [walletId, ...params, parseInt(limit, 10), parseInt(offset, 10)];
    return await db.query(sql, fullParams);
  }
};

module.exports = TransactionRepository;
