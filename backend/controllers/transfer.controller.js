/**
 * Transfer HTTP Controller
 */

const TransferService = require('../services/transfer.service');

const TransferController = {
  async executeTransfer(req, res, next) {
    try {
      const { receiverWalletId, amount, currency } = req.body;
      const result = await TransferService.executeTransfer({
        senderUserId: req.user.id,
        receiverWalletId,
        amount,
        currency
      });

      res.status(200).json({
        success: true,
        message: 'Transfer completed successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = TransferController;
