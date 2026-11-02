/**
 * Authentication HTTP Controller
 */

const AuthService = require('../services/auth.service');

const AuthController = {
  async register(req, res, next) {
    try {
      const { fullName, email, phone, password } = req.body;
      const result = await AuthService.register({ fullName, email, phone, password });
      res.status(201).json({
        success: true,
        message: 'Account created successfully with primary wallet.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await AuthService.getMe(req.user.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;
