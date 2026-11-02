/**
 * JWT Authentication & Authorization Middleware
 */

const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('./errorHandler');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
  }

  // Attach user payload to request
  req.user = {
    id: decoded.userId,
    email: decoded.email,
    walletId: decoded.walletId
  };

  next();
}

module.exports = {
  authenticate
};
