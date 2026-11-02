/**
 * Transaction HTTP Controller
 */

const TransactionService = require('../services/transaction.service');

const TransactionController = {
  async getMyTransactions(req, res, next) {
    try {
      const { limit, offset, status, type } = req.query;
      const transactions = await TransactionService.getUserTransactions(req.user.id, {
        limit,
        offset,
        status,
        type
      });

      res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions
      });
    } catch (err) {
      next(err);
    }
  },

  async getTransactionById(req, res, next) {
    try {
      const transaction = await TransactionService.getTransactionDetails(req.user.id, req.params.id);
      res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = TransactionController;
