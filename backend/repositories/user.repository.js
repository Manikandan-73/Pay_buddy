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
    const raw = String(phone).trim();
    const digits = raw.replace(/[^0-9]/g, '');
    const last10 = digits.slice(-10);
    const variants = Array.from(new Set([raw, `+${digits}`, `+91${last10}`, last10, `+91 ${last10}`]));

    const placeholders = variants.map(() => '?').join(', ');
    const sql = `SELECT * FROM users WHERE phone IN (${placeholders}) LIMIT 1`;
    if (connection) {
      const [rows] = await connection.execute(sql, variants);
      return rows[0] || null;
    }
    const rows = await db.query(sql, variants);
    return rows[0] || null;
  },

  async findByName(name, connection = null) {
    const clean = String(name).trim().toLowerCase();
    const sql = 'SELECT * FROM users WHERE LOWER(full_name) = ? OR LOWER(full_name) LIKE ? LIMIT 1';
    const params = [clean, `%${clean}%`];
    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows[0] || null;
    }
    const rows = await db.query(sql, params);
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
