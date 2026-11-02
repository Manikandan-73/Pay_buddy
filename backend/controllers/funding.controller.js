/**
 * Funding HTTP Controller
 */

const FundingService = require('../services/funding.service');

const FundingController = {
  async fundWallet(req, res, next) {
    try {
      const { amount, paymentMethod, simulateFailure } = req.body;
      const result = await FundingService.fundWallet({
        userId: req.user.id,
        amount,
        paymentMethod,
        simulateFailure
      });

      res.status(200).json({
        success: true,
        message: 'Simulated wallet top-up completed successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = FundingController;
