/**
 * User Data Access Repository
 */

const db = require('../config/database');

const UserRepository = {
  async findByEmail(email, connection = null) {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    if (connection) {
      const [rows] = await connection.execute(sql, [email]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [email]);
    return rows[0] || null;
  },

  async findByPhone(phone, connection = null) {
    const sql = 'SELECT * FROM users WHERE phone = ? LIMIT 1';
    if (connection) {
      const [rows] = await connection.execute(sql, [phone]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [phone]);
    return rows[0] || null;
  },

  async findById(id, connection = null) {
    const sql = 'SELECT id, full_name, email, phone, status, created_at FROM users WHERE id = ? LIMIT 1';
    if (connection) {
      const [rows] = await connection.execute(sql, [id]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create(user, connection) {
    const sql = `
      INSERT INTO users (id, full_name, email, phone, password_hash, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(sql, [
      user.id,
      user.fullName,
      user.email,
      user.phone,
      user.passwordHash,
      user.status || 'ACTIVE'
    ]);
    return user;
  }
};

module.exports = UserRepository;
