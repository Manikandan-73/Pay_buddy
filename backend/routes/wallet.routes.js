/**
 * Wallet Route Definitions
 */

const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/wallet.controller');
const FundingController = require('../controllers/funding.controller');
const { authenticate } = require('../middleware/auth.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const { validateBody } = require('../middleware/requestValidator');

router.use(authenticate);

router.get('/', WalletController.getMyWallets);
router.get('/primary', WalletController.getPrimaryWallet);
router.get('/lookup', WalletController.lookupRecipient);

// Simulated Gateway Funding
router.post(
  '/fund',
  validateBody({ amount: { required: true } }),
  idempotency('WALLET_FUNDING'),
  FundingController.fundWallet
);

module.exports = router;
