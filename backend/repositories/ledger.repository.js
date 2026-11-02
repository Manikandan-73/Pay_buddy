/**
 * Double-Entry Ledger Repository
 * Authoritative financial audit trail
 */

const db = require('../config/database');

const LedgerRepository = {
  async createEntry(entry, connection) {
    const sql = `
      INSERT INTO ledger_entries (id, transaction_id, wallet_id, entry_type, amount, currency, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(sql, [
      entry.id,
      entry.transactionId,
      entry.walletId,
      entry.entryType, // 'DEBIT' or 'CREDIT'
      entry.amount,
      entry.currency || 'INR',
      entry.description || null
    ]);
    return entry;
  },

  async getEntriesByTransactionId(transactionId, connection = null) {
    const sql = 'SELECT * FROM ledger_entries WHERE transaction_id = ? ORDER BY created_at ASC';
    if (connection) {
      const [rows] = await connection.execute(sql, [transactionId]);
      return rows;
    }
    return await db.query(sql, [transactionId]);
  },

  /**
   * Sum all credits and subtract all debits to compute true authoritative balance
   */
  async calculateAuthoritativeBalance(walletId, connection = null) {
    const sql = `
      SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits
      FROM ledger_entries
      WHERE wallet_id = ?
    `;
    const rows = connection 
      ? (await connection.execute(sql, [walletId]))[0]
      : await db.query(sql, [walletId]);

    const credits = parseFloat(rows[0]?.total_credits || 0);
    const debits = parseFloat(rows[0]?.total_debits || 0);
    return (credits - debits).toFixed(4);
  }
};

module.exports = LedgerRepository;
