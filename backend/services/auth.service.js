/**
 * Authentication Business Logic Service
 * Enforces atomic user and wallet provisioning
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('crypto');
const { withTransaction } = require('../config/database');
const UserRepository = require('../repositories/user.repository');
const WalletRepository = require('../repositories/wallet.repository');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

const AuthService = {
  async register({ fullName, email, phone, password }) {
    // 1. Check duplicate email
    const existingEmail = await UserRepository.findByEmail(email.toLowerCase().trim());
    if (existingEmail) {
      throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // 2. Check duplicate phone
    const existingPhone = await UserRepository.findByPhone(phone.trim());
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists.', 409, 'DUPLICATE_PHONE');
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = `pb_usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const walletId = `pb_wal_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    // 4. Atomic MySQL Transaction: Create User + Provision MAIN Wallet
    await withTransaction(async (connection) => {
      await UserRepository.create({
        id: userId,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        passwordHash,
        status: 'ACTIVE'
      }, connection);

      await WalletRepository.create({
        id: walletId,
        userId,
        walletType: 'MAIN',
        currency: 'INR',
        balance: '0.0000',
        status: 'ACTIVE'
      }, connection);
    });

    // 5. Issue JWT credentials
    const tokenPayload = { userId, email: email.toLowerCase().trim(), walletId };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: userId,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim()
      },
      wallet: {
        id: walletId,
        walletType: 'MAIN',
        currency: 'INR',
        balance: '0.0000'
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  },

  async login({ email, password }) {
    const user = await UserRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is suspended or deactivated.', 403, 'ACCOUNT_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const primaryWallet = await WalletRepository.findPrimaryByUserId(user.id);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      walletId: primaryWallet ? primaryWallet.id : null
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone
      },
      wallet: primaryWallet ? {
        id: primaryWallet.id,
        walletType: primaryWallet.wallet_type,
        currency: primaryWallet.currency,
        balance: primaryWallet.balance
      } : null,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  },

  async getMe(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    const primaryWallet = await WalletRepository.findPrimaryByUserId(userId);

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.created_at,
      primaryWallet: primaryWallet ? {
        id: primaryWallet.id,
        walletType: primaryWallet.wallet_type,
        currency: primaryWallet.currency,
        balance: primaryWallet.balance
      } : null
    };
  }
};

module.exports = AuthService;
