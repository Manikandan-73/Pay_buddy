/**
 * Wallet Management Business Logic Service
 */

const WalletRepository = require('../repositories/wallet.repository');
const UserRepository = require('../repositories/user.repository');
const { AppError } = require('../middleware/errorHandler');

const WalletService = {
  async getUserWallets(userId) {
    const wallets = await WalletRepository.findByUserId(userId);
    return wallets.map(w => ({
      id: w.id,
      walletType: w.wallet_type,
      currency: w.currency,
      balance: w.balance,
      status: w.status,
      createdAt: w.created_at
    }));
  },

  async getPrimaryWallet(userId) {
    const wallet = await WalletRepository.findPrimaryByUserId(userId);
    if (!wallet) {
      throw new AppError('Primary wallet not found for user.', 404, 'WALLET_NOT_FOUND');
    }
    return {
      id: wallet.id,
      walletType: wallet.wallet_type,
      currency: wallet.currency,
      balance: wallet.balance,
      status: wallet.status
    };
  },

  /**
   * Resolve a transfer recipient by Phone, Email, or Wallet ID
   */
  async resolveRecipient({ query, currentUserId }) {
    if (!query) {
      throw new AppError('Search query is required.', 400, 'INVALID_QUERY');
    }

    const clean = query.trim().toLowerCase();
    let targetUser = null;
    let targetWallet = null;

    // Check if query is a direct wallet ID
    if (clean.startsWith('pb_wal_')) {
      targetWallet = await WalletRepository.findById(clean);
      if (targetWallet) {
        targetUser = await UserRepository.findById(targetWallet.user_id);
      }
    } else {
      // Look up by Email, Phone, or Name
      targetUser = await UserRepository.findByEmail(clean);
      if (!targetUser) {
        targetUser = await UserRepository.findByPhone(clean);
      }
      if (!targetUser) {
        targetUser = await UserRepository.findByName(clean);
      }
      if (targetUser) {
        targetWallet = await WalletRepository.findPrimaryByUserId(targetUser.id);
      }
    }

    if (!targetUser || !targetWallet) {
      throw new AppError('Recipient not found with provided identifier.', 404, 'RECIPIENT_NOT_FOUND');
    }

    // Prevent transferring to oneself
    if (targetUser.id === currentUserId) {
      throw new AppError('Self-transfers to the same wallet are not permitted.', 400, 'SELF_TRANSFER_NOT_ALLOWED');
    }

    return {
      recipient: {
        userId: targetUser.id,
        fullName: targetUser.full_name,
        email: targetUser.email,
        phone: targetUser.phone
      },
      wallet: {
        id: targetWallet.id,
        walletType: targetWallet.wallet_type,
        currency: targetWallet.currency
      }
    };
  }
};

module.exports = WalletService;
