/**
 * Wallet HTTP Controller
 */

const WalletService = require('../services/wallet.service');

const WalletController = {
  async getMyWallets(req, res, next) {
    try {
      const wallets = await WalletService.getUserWallets(req.user.id);
      res.status(200).json({
        success: true,
        data: wallets
      });
    } catch (err) {
      next(err);
    }
  },

  async getPrimaryWallet(req, res, next) {
    try {
      const wallet = await WalletService.getPrimaryWallet(req.user.id);
      res.status(200).json({
        success: true,
        data: wallet
      });
    } catch (err) {
      next(err);
    }
  },

  async lookupRecipient(req, res, next) {
    try {
      const { query } = req.query;
      const result = await WalletService.resolveRecipient({
        query,
        currentUserId: req.user.id
      });
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = WalletController;
